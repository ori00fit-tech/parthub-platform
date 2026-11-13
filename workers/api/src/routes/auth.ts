import { Hono } from "hono";
import type { Env, HonoVariables } from "../types";
import { authMiddleware } from "../middlewares/auth";
import { ok, fail, created } from "../utils/response";
import { hashPassword, verifyPassword, needsRehash, signToken } from "../utils/auth";
import { dbFirst, dbRun } from "../utils/db";
import { LEGAL_VERSION } from "../utils/legal";
import { passwordProblem } from "../utils/password-policy";
import { runInBackground } from "../utils/whatsapp";
import { waPasswordChanged } from "../utils/wa-events";
import { applyReset, checkCode, checkLink, findAccount, sendResetCode } from "../utils/password-reset";
import { GRACE_DAYS, cancelDeletion, deletionBlockers, requestDeletion } from "../utils/account-deletion";
import { LIMITS, blockedFor, clearAttempts, clientIp, pruneAttempts, recordAttempt } from "../utils/rate-limit";

const TOO_MANY = "Too many attempts. Try again in a few minutes.";

export const authRoutes = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

authRoutes.post("/register", async (c) => {
  const body = await c.req.json<{
    name: string;
    email: string;
    password: string;
    phone?: string;
    role?: "buyer" | "seller";
    accept_terms?: boolean;
  }>();

  if (!body.name || !body.email || !body.password) {
    return fail(c, "name, email and password are required");
  }

  // Sign-up spam: at most LIMITS.registerIp attempts per network per hour.
  const ipKey = `register:ip:${clientIp(c.req.raw.headers)}`;
  const wait = await blockedFor(c.env.DB, [ipKey]);
  if (wait) {
    c.header("Retry-After", String(wait * 60));
    return fail(c, TOO_MANY, 429);
  }
  await recordAttempt(c.env.DB, ipKey, LIMITS.registerIp);
  const weak = passwordProblem(body.password, { email: body.email, name: body.name });
  if (weak) return fail(c, weak);

  const existing = await dbFirst(c.env.DB, "SELECT id FROM users WHERE email = ?", [body.email]);
  if (existing) return fail(c, "Email already registered", 409);

  const hashed = await hashPassword(body.password);
  const role = body.role === "seller" ? "seller" : "buyer";

  // Acceptance of the terms of use, recorded with the version of the text.
  const accepted = body.accept_terms === true;
  const result = await dbRun(
    c.env.DB,
    `INSERT INTO users (name, email, password_hash, phone, role, terms_accepted_at, terms_version)
     VALUES (?, ?, ?, ?, ?, ${accepted ? "datetime('now')" : "NULL"}, ?)`,
    [body.name, body.email, hashed, body.phone ?? null, role, accepted ? LEGAL_VERSION : null]
  );

  const user = await dbFirst<{ id: number; name: string; email: string; role: string }>(
    c.env.DB,
    "SELECT id, name, email, role FROM users WHERE id = ?",
    [result.lastRowId]
  );

  return created(c, { user });
});

authRoutes.post("/login", async (c) => {
  const body = await c.req.json<{ email: string; password: string }>();

  if (!body.email || !body.password) {
    return fail(c, "email and password are required");
  }

  // Password guessing: failures count per account and per network.
  const emailKey = `login:email:${String(body.email).trim().toLowerCase()}`;
  const ipKey = `login:ip:${clientIp(c.req.raw.headers)}`;
  const wait = await blockedFor(c.env.DB, [emailKey, ipKey]);
  if (wait) {
    c.header("Retry-After", String(wait * 60));
    return fail(c, TOO_MANY, 429);
  }
  const failed = async () => {
    await recordAttempt(c.env.DB, emailKey, LIMITS.loginEmail);
    await recordAttempt(c.env.DB, ipKey, LIMITS.loginIp);
    await pruneAttempts(c.env.DB);
    return fail(c, "Invalid credentials", 401);
  };

  const user = await dbFirst<{
    id: number;
    name: string;
    email: string;
    phone: string | null;
    role: "buyer" | "seller" | "admin";
    password_hash: string;
    is_active: number;
    token_version: number;
    deletion_requested_at: string | null;
    seller_id: number | null;
  }>(
    c.env.DB,
    `SELECT u.id, u.name, u.email, u.phone, u.role, u.password_hash, u.is_active, u.token_version, u.deletion_requested_at,
            s.id as seller_id
     FROM users u
     LEFT JOIN sellers s ON s.user_id = u.id
     WHERE u.email = ?`,
    [body.email]
  );

  if (!user) return failed();

  const valid = await verifyPassword(body.password, user.password_hash);
  if (!valid) return failed();
  await clearAttempts(c.env.DB, emailKey);
  if (!user.is_active) return fail(c, "Account suspended", 403);
  // Signing in during the 30 days cancels the account's deletion.
  const deletionCancelled = user.deletion_requested_at ? await cancelDeletion(c.env.DB, user.id) : false;

  // Transparently upgrade legacy (unsalted SHA-256) hashes to PBKDF2.
  if (needsRehash(user.password_hash)) {
    await dbRun(c.env.DB, "UPDATE users SET password_hash = ? WHERE id = ?", [
      await hashPassword(body.password),
      user.id,
    ]);
  }

  const tv = Number(user.token_version || 0);
  const payload =
    user.seller_id != null
      ? { user_id: user.id, role: user.role, seller_id: user.seller_id, tv }
      : { user_id: user.id, role: user.role, tv };

  if (!c.env.JWT_SECRET) {
    return fail(c, "JWT_SECRET is not configured", 500);
  }

  const token = await signToken(payload, c.env.JWT_SECRET);

  return ok(c, {
    access_token: token,
    // The password still works but would be refused today (e.g. an old
    // sample password): the apps ask to change it.
    password_weak: Boolean(passwordProblem(body.password, { email: user.email, name: user.name, role: user.role })),
    ...(deletionCancelled ? { deletion_cancelled: true, message: "Welcome back: your account will not be deleted." } : {}),
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      seller_id: user.seller_id,
    },
  });
});

authRoutes.get("/me", authMiddleware, async (c) => {
  const userId = c.get("user_id");
  const user = await dbFirst(
    c.env.DB,
    "SELECT id, name, email, phone, role, avatar_url, created_at FROM users WHERE id = ?",
    [userId]
  );
  if (!user) return fail(c, "User not found", 404);
  return ok(c, user);
});

// Signing out ends every session of this account (all devices): the
// tokens issued before carry the old token_version.
authRoutes.post("/logout", authMiddleware, async (c) => {
  await dbRun(c.env.DB, "UPDATE users SET token_version = token_version + 1, updated_at = datetime('now') WHERE id = ?", [c.get("user_id")]);
  return ok(c, { message: "Logged out" });
});

// POST /api/v1/auth/password { current_password, new_password }
// Changes the password of the signed-in account. Every other session (any
// device, including someone who knew the old password) is signed out:
// token_version + 1; this one gets a new token.
authRoutes.post("/password", authMiddleware, async (c) => {
  const userId = Number(c.get("user_id"));
  const key = `pwd:user:${userId}`;
  const wait = await blockedFor(c.env.DB, [key]);
  if (wait) {
    c.header("Retry-After", String(wait * 60));
    return fail(c, TOO_MANY, 429);
  }
  const body = await c.req.json<{ current_password?: unknown; new_password?: unknown }>().catch(() => ({}) as { current_password?: unknown; new_password?: unknown });
  const current = typeof body.current_password === "string" ? body.current_password : "";
  const next = typeof body.new_password === "string" ? body.new_password : "";
  const user = await dbFirst<{ id: number; email: string; name: string; role: "buyer" | "seller" | "admin"; password_hash: string; token_version: number; seller_id: number | null }>(
    c.env.DB,
    `SELECT u.id, u.email, u.name, u.role, u.password_hash, u.token_version, s.id AS seller_id
     FROM users u LEFT JOIN sellers s ON s.user_id = u.id WHERE u.id = ?`,
    [userId]
  );
  if (!user) return fail(c, "User not found", 404);
  if (!current || !(await verifyPassword(current, user.password_hash))) {
    await recordAttempt(c.env.DB, key, LIMITS.passwordUser);
    return fail(c, "The current password is wrong", 400);
  }
  await clearAttempts(c.env.DB, key);
  if (next === current) return fail(c, "The new password must be different");
  const weak = passwordProblem(next, { email: user.email, name: user.name, role: user.role });
  if (weak) return fail(c, weak);
  if (!c.env.JWT_SECRET) return fail(c, "JWT_SECRET is not configured", 500);

  const tv = Number(user.token_version || 0) + 1;
  await dbRun(c.env.DB, "UPDATE users SET password_hash = ?, token_version = ?, updated_at = datetime('now') WHERE id = ?", [
    await hashPassword(next),
    tv,
    user.id,
  ]);
  // A WhatsApp warning too: if it was not them, they know at once.
  runInBackground(c, waPasswordChanged(c.env, user.id, tv));
  const payload = user.seller_id != null ? { user_id: user.id, role: user.role, seller_id: user.seller_id, tv } : { user_id: user.id, role: user.role, tv };
  return ok(c, { access_token: await signToken(payload, c.env.JWT_SECRET), message: "Password changed. Other devices are signed out." });
});

// ── Forgot password (utils/password-reset.ts) ──────────────────────────
const FORGOT_ANSWER =
  "If an account matches, a 6-digit code was sent on WhatsApp to its number. No code within 2 minutes? Write to PartHub on WhatsApp.";

// POST /api/v1/auth/forgot { identifier } — e-mail or phone. Same answer
// whether an account exists or not.
authRoutes.post("/forgot", async (c) => {
  const body = await c.req.json<{ identifier?: unknown }>().catch(() => ({}) as { identifier?: unknown });
  const identifier = typeof body.identifier === "string" ? body.identifier.trim().slice(0, 200) : "";
  if (!identifier) return fail(c, "Enter your e-mail or phone number");
  const ipKey = `reset:ip:${clientIp(c.req.raw.headers)}`;
  if (await blockedFor(c.env.DB, [ipKey])) return fail(c, TOO_MANY, 429);
  await recordAttempt(c.env.DB, ipKey, LIMITS.resetIp);
  const account = await findAccount(c.env, identifier);
  if (account) {
    const accountKey = `reset:account:${account.id}`;
    if (!(await blockedFor(c.env.DB, [accountKey]))) {
      await recordAttempt(c.env.DB, accountKey, LIMITS.resetAccount);
      await sendResetCode(c.env, account);
    }
  }
  return ok(c, { message: FORGOT_ANSWER });
});

// POST /api/v1/auth/reset { identifier, code, new_password }
authRoutes.post("/reset", async (c) => {
  const body = await c.req.json<{ identifier?: unknown; code?: unknown; new_password?: unknown }>().catch(() => ({}) as Record<string, unknown>);
  const identifier = typeof body.identifier === "string" ? body.identifier.trim().slice(0, 200) : "";
  const next = typeof body.new_password === "string" ? body.new_password : "";
  const account = identifier ? await findAccount(c.env, identifier) : null;
  if (!account) return fail(c, "This code is wrong or has expired. Ask for a new one.");
  const weak = passwordProblem(next, { email: account.email, name: account.name, role: account.role as "buyer" | "seller" | "admin" });
  if (weak) return fail(c, weak);
  const check = await checkCode(c.env, account, String(body.code ?? ""));
  if (!check.ok) return fail(c, check.error);
  if (!(await applyReset(c.env, check.resetId, account.id, next))) return fail(c, "This code is wrong or has expired. Ask for a new one.");
  runInBackground(c, waPasswordChanged(c.env, account.id, Number(account.token_version) + 1));
  return ok(c, { email: account.email, message: "Password changed. Sign in with the new one." });
});

// POST /api/v1/auth/reset-link { token, new_password } — the link an admin sent.
authRoutes.post("/reset-link", async (c) => {
  const body = await c.req.json<{ token?: unknown; new_password?: unknown }>().catch(() => ({}) as Record<string, unknown>);
  const next = typeof body.new_password === "string" ? body.new_password : "";
  const ipKey = `reset:ip:${clientIp(c.req.raw.headers)}`;
  if (await blockedFor(c.env.DB, [ipKey])) return fail(c, TOO_MANY, 429);
  const link = await checkLink(c.env, String(body.token ?? ""));
  if (!link) {
    await recordAttempt(c.env.DB, ipKey, LIMITS.resetIp);
    return fail(c, "This link is not valid any more. Ask PartHub for a new one.");
  }
  const user = await dbFirst<{ id: number; name: string; email: string; role: "buyer" | "seller" | "admin"; token_version: number }>(
    c.env.DB, "SELECT id, name, email, role, token_version FROM users WHERE id = ?", [link.userId]
  );
  if (!user) return fail(c, "This link is not valid any more. Ask PartHub for a new one.");
  const weak = passwordProblem(next, { email: user.email, name: user.name, role: user.role });
  if (weak) return fail(c, weak);
  if (!(await applyReset(c.env, link.resetId, user.id, next))) return fail(c, "This link is not valid any more. Ask PartHub for a new one.");
  runInBackground(c, waPasswordChanged(c.env, user.id, Number(user.token_version) + 1));
  return ok(c, { email: user.email, message: "Password changed. Sign in with the new one." });
});

// ── Account deletion (utils/account-deletion.ts) ───────────────────────
const BLOCKER_TEXT: Record<string, string> = {
  admin: "Admin accounts cannot be deleted here",
  open_orders: "Finish or cancel your open orders first",
  open_claims: "Close your open claims first",
  returns_window: "Wait until the 7-day returns window of your last deliveries is over",
  money_owed: "Pay what is owed to PartHub first",
};

// GET /api/v1/auth/delete-account — can this account be deleted now?
authRoutes.get("/delete-account", authMiddleware, async (c) => {
  const blockers = await deletionBlockers(c.env.DB, Number(c.get("user_id")));
  return ok(c, { grace_days: GRACE_DAYS, can_delete: blockers.length === 0, blockers: blockers.map((b) => ({ code: b, message: BLOCKER_TEXT[b] })) });
});

// POST /api/v1/auth/delete-account { password, reason? }
authRoutes.post("/delete-account", authMiddleware, async (c) => {
  const userId = Number(c.get("user_id"));
  const body = await c.req.json<{ password?: unknown; reason?: unknown }>().catch(() => ({}) as Record<string, unknown>);
  const user = await dbFirst<{ password_hash: string }>(c.env.DB, "SELECT password_hash FROM users WHERE id = ?", [userId]);
  const key = `pwd:user:${userId}`;
  if (await blockedFor(c.env.DB, [key])) return fail(c, TOO_MANY, 429);
  if (!user || typeof body.password !== "string" || !(await verifyPassword(body.password, user.password_hash))) {
    await recordAttempt(c.env.DB, key, LIMITS.passwordUser);
    return fail(c, "The current password is wrong");
  }
  const blockers = await deletionBlockers(c.env.DB, userId);
  if (blockers.length) return fail(c, BLOCKER_TEXT[blockers[0]!] || "This account cannot be deleted now", 409);
  const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 500) || null : null;
  await requestDeletion(c.env.DB, userId, reason);
  return ok(c, {
    grace_days: GRACE_DAYS,
    message: `Your account is closed. Its personal data will be erased in ${GRACE_DAYS} days. Sign in before then to keep it.`,
  });
});

