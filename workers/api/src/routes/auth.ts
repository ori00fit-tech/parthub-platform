import { Hono } from "hono";
import type { Env, HonoVariables } from "../types";
import { authMiddleware } from "../middlewares/auth";
import { ok, fail, created } from "../utils/response";
import { hashPassword, verifyPassword, signToken } from "../utils/auth";
import { dbFirst, dbRun } from "../utils/db";

export const authRoutes = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

// POST /api/v1/auth/register
authRoutes.post("/register", async (c) => {
  const body = await c.req.json<{
    name: string;
    email: string;
    password: string;
    phone?: string;
    role?: "buyer" | "seller";
  }>();

  if (!body.name || !body.email || !body.password) {
    return fail(c, "name, email and password are required");
  }

  const existing = await dbFirst(c.env.DB, "SELECT id FROM users WHERE email = ?", [body.email]);
  if (existing) return fail(c, "Email already registered", 409);

  const hashed = await hashPassword(body.password);
  const role = body.role === "seller" ? "seller" : "buyer";

  const result = await dbRun(
    c.env.DB,
    "INSERT INTO users (name, email, password_hash, phone, role) VALUES (?, ?, ?, ?, ?)",
    [body.name, body.email, hashed, body.phone ?? null, role]
  );

  const user = await dbFirst<{ id: number; name: string; email: string; role: string }>(
    c.env.DB,
    "SELECT id, name, email, role FROM users WHERE id = ?",
    [result.lastRowId]
  );

  return created(c, { user });
});

// POST /api/v1/auth/login
authRoutes.post("/login", async (c) => {
  const body = await c.req.json<{ email: string; password: string }>();

  if (!body.email || !body.password) {
    return fail(c, "email and password are required");
  }

  const user = await dbFirst<{
    id: number;
    name: string;
    email: string;
    role: "buyer" | "seller" | "admin";
    password_hash: string;
    is_active: number;
    seller_id: number | null;
  }>(
    c.env.DB,
    `SELECT u.id, u.name, u.email, u.role, u.password_hash, u.is_active,
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

  const token = await signToken(
    { user_id: user.id, role: user.role, seller_id: user.seller_id ?? undefined },
    c.env.JWT_SECRET
  );

  return ok(c, {
    access_token: token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      seller_id: user.seller_id,
    },
  });
});

// GET /api/v1/auth/me
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

// POST /api/v1/auth/logout
authRoutes.post("/logout", authMiddleware, (c) => {
  // Stateless JWT — client drops the token
  return ok(c, { message: "Logged out" });
});
