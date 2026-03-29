import { Hono } from "hono";
import type { Env, HonoVariables } from "../types";
import { authMiddleware } from "../middlewares/auth";
import { adminGuard } from "../middlewares/admin";
import { ok, fail, paginated } from "../utils/response";
import { dbAll, dbRun, dbFirst, dbCount } from "../utils/db";
import { parsePagination } from "../utils/pagination";

export const adminRoutes = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

adminRoutes.use("*", authMiddleware, adminGuard);

// GET /api/v1/admin/dashboard
adminRoutes.get("/dashboard", async (c) => {
  const [totalSellers, totalParts, totalOrders, totalRevenue, pendingSellers, pendingParts] =
    await Promise.all([
      dbFirst<{ n: number }>(c.env.DB, "SELECT COUNT(*) as n FROM sellers"),
      dbFirst<{ n: number }>(c.env.DB, "SELECT COUNT(*) as n FROM parts WHERE status = 'active'"),
      dbFirst<{ n: number }>(c.env.DB, "SELECT COUNT(*) as n FROM orders"),
      dbFirst<{ n: number }>(c.env.DB, "SELECT SUM(total) as n FROM orders WHERE payment_status = 'paid'"),
      dbFirst<{ n: number }>(c.env.DB, "SELECT COUNT(*) as n FROM sellers WHERE status = 'pending'"),
      dbFirst<{ n: number }>(c.env.DB, "SELECT COUNT(*) as n FROM parts WHERE status = 'pending'"),
    ]);

  return ok(c, {
    total_sellers: totalSellers?.n ?? 0,
    total_parts: totalParts?.n ?? 0,
    total_orders: totalOrders?.n ?? 0,
    total_revenue: totalRevenue?.n ?? 0,
    pending_sellers: pendingSellers?.n ?? 0,
    pending_parts: pendingParts?.n ?? 0,
  });
});

// GET /api/v1/admin/sellers
adminRoutes.get("/sellers", async (c) => {
  const q = c.req.query();
  const { page, limit, offset } = parsePagination(q);
  const status = q["status"];
  const where = status ? "WHERE s.status = ?" : "";
  const params = status ? [status] : [];

  const total = await dbCount(c.env.DB, `SELECT COUNT(*) as total FROM sellers s ${where}`, params);
  const sellers = await dbAll(
    c.env.DB,
    `SELECT s.*, u.email, u.phone as user_phone FROM sellers s
     JOIN users u ON u.id = s.user_id ${where}
     ORDER BY s.created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  return paginated(c, sellers, { page, limit, total });
});

// PATCH /api/v1/admin/sellers/:id/status
adminRoutes.patch("/sellers/:id/status", async (c) => {
  const id = c.req.param("id");
  const { status } = await c.req.json<{ status: string }>();
  const allowed = ["active", "suspended", "rejected"];
  if (!allowed.includes(status)) return fail(c, "Invalid status");
  await dbRun(c.env.DB, "UPDATE sellers SET status = ? WHERE id = ?", [status, id]);
  return ok(c, { message: `Seller ${status}` });
});

// GET /api/v1/admin/parts
adminRoutes.get("/parts", async (c) => {
  const q = c.req.query();
  const { page, limit, offset } = parsePagination(q);
  const status = q["status"] ?? "pending";

  const total = await dbCount(c.env.DB, "SELECT COUNT(*) as total FROM parts WHERE status = ?", [status]);
  const parts = await dbAll(
    c.env.DB,
    `SELECT p.*, s.name as seller_name FROM parts p
     JOIN sellers s ON s.id = p.seller_id
     WHERE p.status = ? ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
    [status, limit, offset]
  );
  return paginated(c, parts, { page, limit, total });
});

// PATCH /api/v1/admin/parts/:id/status
adminRoutes.patch("/parts/:id/status", async (c) => {
  const id = c.req.param("id");
  const { status } = await c.req.json<{ status: string }>();
  const allowed = ["active", "rejected", "archived"];
  if (!allowed.includes(status)) return fail(c, "Invalid status");
  await dbRun(c.env.DB, "UPDATE parts SET status = ? WHERE id = ?", [status, id]);
  return ok(c, { message: `Part ${status}` });
});

// GET /api/v1/admin/orders
adminRoutes.get("/orders", async (c) => {
  const { page, limit, offset } = parsePagination(c.req.query());
  const total = await dbCount(c.env.DB, "SELECT COUNT(*) as total FROM orders");
  const orders = await dbAll(
    c.env.DB,
    `SELECT o.*, u.name as buyer_name, u.email as buyer_email
     FROM orders o JOIN users u ON u.id = o.buyer_id
     ORDER BY o.created_at DESC LIMIT ? OFFSET ?`,
    [limit, offset]
  );
  return paginated(c, orders, { page, limit, total });
});

// PATCH /api/v1/admin/orders/:id/status
adminRoutes.patch("/orders/:id/status", async (c) => {
  const id = c.req.param("id");
  const { status } = await c.req.json<{ status: string }>();
  await dbRun(c.env.DB, "UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [status, id]);
  return ok(c, { message: "Order updated" });
});

// GET /api/v1/admin/reviews
adminRoutes.get("/reviews", async (c) => {
  const { page, limit, offset } = parsePagination(c.req.query());
  const total = await dbCount(c.env.DB, "SELECT COUNT(*) as total FROM reviews WHERE status = 'pending'");
  const reviews = await dbAll(
    c.env.DB,
    `SELECT r.*, u.name as buyer_name, p.title as part_title
     FROM reviews r
     JOIN users u ON u.id = r.buyer_id
     JOIN parts p ON p.id = r.part_id
     WHERE r.status = 'pending'
     ORDER BY r.created_at DESC LIMIT ? OFFSET ?`,
    [limit, offset]
  );
  return paginated(c, reviews, { page, limit, total });
});

// PATCH /api/v1/admin/reviews/:id/status
adminRoutes.patch("/reviews/:id/status", async (c) => {
  const id = c.req.param("id");
  const { status } = await c.req.json<{ status: string }>();
  await dbRun(c.env.DB, "UPDATE reviews SET status = ? WHERE id = ?", [status, id]);
  return ok(c, { message: "Review updated" });
});

// Categories CRUD
adminRoutes.get("/categories", async (c) => {
  const categories = await dbAll(c.env.DB, "SELECT * FROM categories ORDER BY sort_order, name");
  return ok(c, categories);
});

adminRoutes.post("/categories", async (c) => {
  const body = await c.req.json<{ name: string; slug: string; parent_id?: number; icon?: string }>();
  const result = await dbRun(
    c.env.DB,
    "INSERT INTO categories (name, slug, parent_id, icon) VALUES (?, ?, ?, ?)",
    [body.name, body.slug, body.parent_id ?? null, body.icon ?? null]
  );
  return ok(c, { id: result.lastRowId });
});
