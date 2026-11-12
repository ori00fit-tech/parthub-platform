import { Hono } from "hono";
import type { Env, HonoVariables } from "../types";
import { authMiddleware } from "../middlewares/auth";
import { ok, fail, created } from "../utils/response";
import { hashPassword, verifyPassword, needsRehash, signToken } from "../utils/auth";
import { dbFirst, dbRun } from "../utils/db";
import { LEGAL_VERSION } from "../utils/legal";
import { passwordProblem } from "../utils/password-policy";
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
    seller_id: number | null;
  }>(
    c.env.DB,
    `SELECT u.id, u.name, u.email, u.phone, u.role, u.password_hash, u.is_active, u.token_version,
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
  const payload = user.seller_id != null ? { user_id: user.id, role: user.role, seller_id: user.seller_id, tv } : { user_id: user.id, role: user.role, tv };
  return ok(c, { access_token: await signToken(payload, c.env.JWT_SECRET), message: "Password changed. Other devices are signed out." });
});

