import { Hono } from "hono";
import type { Env, HonoVariables } from "../types";
import { authMiddleware } from "../middlewares/auth";
import { sellerGuard } from "../middlewares/seller";
import { ok, created, fail, notFound, paginated } from "../utils/response";
import { dbFirst, dbAll, dbRun, dbCount } from "../utils/db";
import { parsePagination } from "../utils/pagination";
import { slugify } from "../utils/slug";

export const marketplaceRoutes = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

// ── Seller Profile (public) ──────────────────────────────

// GET /api/v1/marketplace/sellers/:slug
marketplaceRoutes.get("/sellers/:slug", async (c) => {
  const slug = c.req.param("slug");
  const seller = await dbFirst(
    c.env.DB,
    `SELECT s.*, ROUND(AVG(r.rating),1) as rating_avg, COUNT(DISTINCT r.id) as rating_count,
            COUNT(DISTINCT p.id) as parts_count
     FROM sellers s
     LEFT JOIN parts p ON p.seller_id = s.id AND p.status = 'active'
     LEFT JOIN reviews r ON r.part_id = p.id AND r.status = 'approved'
     WHERE s.slug = ? AND s.status = 'active'
     GROUP BY s.id`,
    [slug]
  );
  if (!seller) return notFound(c, "Seller");
  return ok(c, seller);
});

// ── Seller Onboarding ────────────────────────────────────

// POST /api/v1/marketplace/sellers/onboard
marketplaceRoutes.post("/sellers/onboard", authMiddleware, async (c) => {
  const userId = c.get("user_id");
  const role = c.get("user_role");

  if (role !== "seller") return fail(c, "Only seller accounts can onboard");

  const existing = await dbFirst(c.env.DB, "SELECT id FROM sellers WHERE user_id = ?", [userId]);
  if (existing) return fail(c, "Seller profile already exists", 409);

  const body = await c.req.json<{ name: string; description?: string; phone?: string; location?: string }>();
  if (!body.name) return fail(c, "Store name is required");

  const slug = slugify(body.name);
  const result = await dbRun(
    c.env.DB,
    "INSERT INTO sellers (user_id, name, slug, description, phone, location) VALUES (?, ?, ?, ?, ?, ?)",
    [userId, body.name, slug, body.description ?? null, body.phone ?? null, body.location ?? null]
  );

  const seller = await dbFirst(c.env.DB, "SELECT * FROM sellers WHERE id = ?", [result.lastRowId]);
  return created(c, seller);
});

// ── Seller Parts CRUD ────────────────────────────────────

// GET /api/v1/marketplace/parts
marketplaceRoutes.get("/parts", authMiddleware, sellerGuard, async (c) => {
  const sellerId = c.get("seller_id");
  const { page, limit, offset } = parsePagination(c.req.query());

  const total = await dbCount(c.env.DB, "SELECT COUNT(*) as total FROM parts WHERE seller_id = ?", [sellerId]);
  const parts = await dbAll(
    c.env.DB,
    `SELECT p.*, (SELECT url FROM part_images WHERE part_id = p.id AND is_featured = 1 LIMIT 1) as thumbnail
     FROM parts p WHERE p.seller_id = ? ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
    [sellerId, limit, offset]
  );

  return paginated(c, parts, { page, limit, total });
});

// POST /api/v1/marketplace/parts
marketplaceRoutes.post("/parts", authMiddleware, sellerGuard, async (c) => {
  const sellerId = c.get("seller_id");
  const body = await c.req.json<{
    title: string; description?: string; category_id: number;
    price: number; condition: string; quantity: number; sku?: string;
  }>();

  if (!body.title || !body.category_id || !body.price) {
    return fail(c, "title, category_id, and price are required");
  }

  const result = await dbRun(
    c.env.DB,
    `INSERT INTO parts (seller_id, title, slug, description, category_id, price, condition, quantity, sku, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [sellerId, body.title, slugify(body.title), body.description ?? null,
     body.category_id, body.price, body.condition ?? "new", body.quantity ?? 1, body.sku ?? null]
  );

  const part = await dbFirst(c.env.DB, "SELECT * FROM parts WHERE id = ?", [result.lastRowId]);
  return created(c, part);
});

// PUT /api/v1/marketplace/parts/:id
marketplaceRoutes.put("/parts/:id", authMiddleware, sellerGuard, async (c) => {
  const sellerId = c.get("seller_id");
  const partId = c.req.param("id");

  const part = await dbFirst<{ id: number; seller_id: number }>(
    c.env.DB, "SELECT id, seller_id FROM parts WHERE id = ?", [partId]
  );
  if (!part) return notFound(c, "Part");
  if (part.seller_id !== sellerId) return fail(c, "Forbidden", 403);

  const body = await c.req.json<Record<string, unknown>>();
  const allowed = ["title", "description", "price", "compare_price", "condition", "quantity", "sku", "status"];
  const updates = Object.entries(body)
    .filter(([k]) => allowed.includes(k))
    .map(([k, v]) => ({ k, v }));

  if (!updates.length) return fail(c, "No valid fields to update");

  const set = updates.map(({ k }) => `${k} = ?`).join(", ");
  const vals = updates.map(({ v }) => v);

  await dbRun(c.env.DB, `UPDATE parts SET ${set}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [...vals, partId]);
  const updated = await dbFirst(c.env.DB, "SELECT * FROM parts WHERE id = ?", [partId]);
  return ok(c, updated);
});

// DELETE /api/v1/marketplace/parts/:id
marketplaceRoutes.delete("/parts/:id", authMiddleware, sellerGuard, async (c) => {
  const sellerId = c.get("seller_id");
  const partId = c.req.param("id");

  const part = await dbFirst<{ seller_id: number }>(c.env.DB, "SELECT seller_id FROM parts WHERE id = ?", [partId]);
  if (!part) return notFound(c, "Part");
  if (part.seller_id !== sellerId) return fail(c, "Forbidden", 403);

  await dbRun(c.env.DB, "UPDATE parts SET status = 'archived' WHERE id = ?", [partId]);
  return ok(c, { message: "Part archived" });
});

// GET /api/v1/marketplace/orders
marketplaceRoutes.get("/orders", authMiddleware, sellerGuard, async (c) => {
  const sellerId = c.get("seller_id");
  const { page, limit, offset } = parsePagination(c.req.query());

  const total = await dbCount(
    c.env.DB,
    "SELECT COUNT(DISTINCT o.id) as total FROM orders o JOIN order_items oi ON oi.order_id = o.id WHERE oi.seller_id = ?",
    [sellerId]
  );
  const orders = await dbAll(
    c.env.DB,
    `SELECT DISTINCT o.id, o.reference, o.status, o.total, o.created_at,
            u.name as buyer_name
     FROM orders o
     JOIN order_items oi ON oi.order_id = o.id
     JOIN users u ON u.id = o.buyer_id
     WHERE oi.seller_id = ?
     ORDER BY o.created_at DESC LIMIT ? OFFSET ?`,
    [sellerId, limit, offset]
  );

  return paginated(c, orders, { page, limit, total });
});
