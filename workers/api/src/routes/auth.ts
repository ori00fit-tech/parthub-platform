import { Hono } from "hono";
import type { Env, HonoVariables } from "../types";
import { authMiddleware } from "../middlewares/auth";
import { ok, fail, created } from "../utils/response";
import { hashPassword, verifyPassword, needsRehash, signToken } from "../utils/auth";
import { dbFirst, dbRun } from "../utils/db";
import { LEGAL_VERSION } from "../utils/legal";

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
  if (body.password.length < 8) {
    return fail(c, "password must be at least 8 characters");
  }

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

  const user = await dbFirst<{
    id: number;
    name: string;
    email: string;
    phone: string | null;
    role: "buyer" | "seller" | "admin";
    password_hash: string;
    is_active: number;
    seller_id: number | null;
  }>(
    c.env.DB,
    `SELECT u.id, u.name, u.email, u.phone, u.role, u.password_hash, u.is_active,
            s.id as seller_id
     FROM users u
     LEFT JOIN sellers s ON s.user_id = u.id
     WHERE u.email = ?`,
    [body.email]
  );

  if (!user) return fail(c, "Invalid credentials", 401);
  if (!user.is_active) return fail(c, "Account suspended", 403);

  const valid = await verifyPassword(body.password, user.password_hash);
  if (!valid) return fail(c, "Invalid credentials", 401);

  // Transparently upgrade legacy (unsalted SHA-256) hashes to PBKDF2.
  if (needsRehash(user.password_hash)) {
    await dbRun(c.env.DB, "UPDATE users SET password_hash = ? WHERE id = ?", [
      await hashPassword(body.password),
      user.id,
    ]);
  }

  const payload =
    user.seller_id != null
      ? { user_id: user.id, role: user.role, seller_id: user.seller_id }
      : { user_id: user.id, role: user.role };

  if (!c.env.JWT_SECRET) {
    return fail(c, "JWT_SECRET is not configured", 500);
  }

  const token = await signToken(payload, c.env.JWT_SECRET);

  return ok(c, {
    access_token: token,
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

authRoutes.post("/logout", authMiddleware, (c) => {
  return ok(c, { message: "Logged out" });
});
