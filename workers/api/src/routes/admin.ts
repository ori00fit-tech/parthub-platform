import { Hono } from "hono";
import type { Context } from "hono";
import type { Env, HonoVariables } from "../types";
import { authMiddleware } from "../middlewares/auth";
import { adminGuard } from "../middlewares/admin";
import { ok, fail, paginated } from "../utils/response";
import { dbAll, dbRun, dbFirst, dbCount } from "../utils/db";
import { parsePagination } from "../utils/pagination";
import { notifyBackInStock } from "../utils/stock-alerts";
import { runInBackground } from "../utils/whatsapp";
import { type LineStatus, logOrderEvent, refreshOrderStatus, setLineStatus } from "../utils/fulfillment";
import { readNumbersInput } from "../utils/part-numbers";
import { ensureBrand, ensureVehicle, engineInfo, readVehicleEntry } from "../utils/vehicle-catalog";
import { type IssueRow, cleanNote, loadIssue, nowText, publicIssue, updateIssue } from "../utils/issues";

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

// GET /api/v1/admin/pending-counts — what is waiting for moderation (sidebar badges).
adminRoutes.get("/pending-counts", async (c) => {
  const [sellers, parts, reviews, issues, catalog, numbers] = await Promise.all([
    dbFirst<{ n: number }>(c.env.DB, "SELECT COUNT(*) as n FROM sellers WHERE status = 'pending'"),
    dbFirst<{ n: number }>(c.env.DB, "SELECT COUNT(*) as n FROM parts WHERE status = 'pending'"),
    dbFirst<{ n: number }>(c.env.DB, "SELECT COUNT(*) as n FROM reviews WHERE status = 'pending'"),
    dbFirst<{ n: number }>(c.env.DB, "SELECT COUNT(*) as n FROM order_issues WHERE status = 'escalated'"),
    dbFirst<{ n: number }>(c.env.DB, "SELECT COUNT(*) as n FROM catalog_suggestions WHERE status = 'pending'"),
    dbFirst<{ n: number }>(c.env.DB, "SELECT COUNT(*) as n FROM part_number_links WHERE verification = 'unverified'"),
  ]);
  return ok(c, {
    sellers: sellers?.n ?? 0,
    parts: parts?.n ?? 0,
    reviews: reviews?.n ?? 0,
    issues: issues?.n ?? 0,
    catalog: catalog?.n ?? 0,
    numbers: numbers?.n ?? 0,
  });
});

// GET /api/v1/admin/sellers
adminRoutes.get("/sellers", async (c) => {
  const q = c.req.query();
  const { page, limit, offset } = parsePagination(q);
  const status = q["status"];
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (status) {
    conditions.push("s.status = ?");
    params.push(status);
  }
  const search = (q["q"] || "").trim().slice(0, 100);
  if (search) {
    conditions.push("(s.name LIKE ? OR s.slug LIKE ? OR s.location LIKE ? OR u.email LIKE ?)");
    const like = `%${search}%`;
    params.push(like, like, like, like);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const total = await dbCount(c.env.DB, `SELECT COUNT(*) as total FROM sellers s JOIN users u ON u.id = s.user_id ${where}`, params);
  const sellers = await dbAll(
    c.env.DB,
    `SELECT s.*, u.email, u.phone as user_phone FROM sellers s
     JOIN users u ON u.id = s.user_id ${where}
     ORDER BY s.created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  return paginated(c, sellers, { page, limit, total });
});

// GET /api/v1/admin/sellers/:id — store, owner contact and their parts.
adminRoutes.get("/sellers/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id) || id <= 0) return fail(c, "Invalid seller id");
  const seller = await dbFirst<Record<string, unknown>>(
    c.env.DB,
    `SELECT s.*, u.name AS user_name, u.email AS user_email, u.phone AS user_phone
     FROM sellers s JOIN users u ON u.id = s.user_id WHERE s.id = ?`,
    [id]
  );
  if (!seller) return fail(c, "Seller not found", 404);
  const parts = await dbAll(
    c.env.DB,
    "SELECT id, slug, title, price, status, quantity, moderation_note FROM parts WHERE seller_id = ? ORDER BY created_at DESC LIMIT 100",
    [id]
  );
  return ok(c, { ...seller, parts });
});

// GET /api/v1/admin/parts/:id — listing with seller, photos, fitment and specs.
adminRoutes.get("/parts/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id) || id <= 0) return fail(c, "Invalid part id");
  const part = await dbFirst<Record<string, unknown>>(
    c.env.DB,
    `SELECT p.*, s.name AS seller_name, s.slug AS seller_slug, s.status AS seller_status,
            b.name AS brand_name, c.name AS category_name
     FROM parts p
     JOIN sellers s ON s.id = p.seller_id
     LEFT JOIN brands b ON b.id = p.brand_id
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.id = ?`,
    [id]
  );
  if (!part) return fail(c, "Part not found", 404);
  const [images, compatibility, specs] = await Promise.all([
    dbAll(c.env.DB, "SELECT id, url, alt_text, is_featured, sort_order FROM part_images WHERE part_id = ? ORDER BY is_featured DESC, sort_order, id", [id]),
    dbAll(c.env.DB, "SELECT id, make, model, year_start, year_end, engine, trim, notes FROM part_compatibility WHERE part_id = ? ORDER BY make, model, year_start", [id]),
    dbAll(c.env.DB, "SELECT * FROM part_specs WHERE part_id = ?", [id]),
  ]);
  return ok(c, { ...part, images, compatibility, specs });
});

// Sellers see the reason, so negative decisions must explain what to fix.
const MIN_REASON = 10;
const MAX_REASON = 500;

function readReason(body: { reason?: unknown }): string {
  return typeof body.reason === "string" ? body.reason.trim().slice(0, MAX_REASON) : "";
}

type ModerationResult = { ok: true; status: string; note: string | null } | { ok: false; error: string; code: number };

const SELLER_STATUSES = ["active", "suspended", "rejected"];
function checkSellerDecision(status: string, reason: string): ModerationResult | null {
  if (!SELLER_STATUSES.includes(status)) return { ok: false, error: "Invalid status", code: 400 };
  if ((status === "rejected" || status === "suspended") && reason.length < MIN_REASON) {
    return { ok: false, error: `Explain the decision to the seller (at least ${MIN_REASON} characters)`, code: 400 };
  }
  return null;
}
async function applySellerStatus(env: Env, id: number, status: string, reason: string): Promise<boolean> {
  const seller = await dbFirst(env.DB, "SELECT id FROM sellers WHERE id = ?", [id]);
  if (!seller) return false;
  await dbRun(
    env.DB,
    "UPDATE sellers SET status = ?, moderation_note = ?, updated_at = datetime('now') WHERE id = ?",
    [status, status === "active" ? null : reason, id]
  );
  return true;
}

const PART_STATUSES = ["active", "rejected", "archived"];
function checkPartDecision(status: string, reason: string): ModerationResult | null {
  if (!PART_STATUSES.includes(status)) return { ok: false, error: "Invalid status", code: 400 };
  if (status === "rejected" && reason.length < MIN_REASON) {
    return { ok: false, error: `Explain what the seller should fix (at least ${MIN_REASON} characters)`, code: 400 };
  }
  return null;
}
// "missing": no such part. "no_photo": a part is approved only with at least
// one photo (buyers don't trust listings without one).
async function applyPartStatus(
  c: Context<{ Bindings: Env; Variables: HonoVariables }>,
  id: number,
  status: string,
  reason: string
): Promise<"ok" | "missing" | "no_photo"> {
  const part = await dbFirst<{ id: number; photos: number }>(
    c.env.DB,
    "SELECT id, (SELECT COUNT(*) FROM part_images pi WHERE pi.part_id = parts.id) as photos FROM parts WHERE id = ?",
    [id]
  );
  if (!part) return "missing";
  if (status === "active" && !Number(part.photos)) return "no_photo";
  const note = status === "active" ? null : reason || null;
  await dbRun(
    c.env.DB,
    "UPDATE parts SET status = ?, moderation_note = ?, updated_at = datetime('now') WHERE id = ?",
    [status, note, id]
  );
  if (status === "active") runInBackground(c, notifyBackInStock(c.env, id));
  return "ok";
}

const MAX_BULK = 100;
function readIds(body: { ids?: unknown }): number[] | null {
  if (!Array.isArray(body.ids)) return null;
  const ids = [...new Set(body.ids.map(Number).filter((n) => Number.isInteger(n) && n > 0))];
  return ids.length && ids.length <= MAX_BULK ? ids : null;
}

// PATCH /api/v1/admin/sellers/:id/status  { status, reason? }
// reason is required for "rejected" and "suspended"; approving clears it.
adminRoutes.patch("/sellers/:id/status", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json<{ status: string; reason?: string }>().catch(() => ({ status: "", reason: "" }));
  const status = String(body.status || "");
  const reason = readReason(body);
  const bad = checkSellerDecision(status, reason);
  if (bad && !bad.ok) return fail(c, bad.error, bad.code);
  if (!(await applySellerStatus(c.env, id, status, reason))) return fail(c, "Seller not found", 404);
  return ok(c, { message: `Seller ${status}`, status, moderation_note: status === "active" ? null : reason });
});

// POST /api/v1/admin/sellers/bulk-status  { ids: number[], status, reason? }
// Same rules as one by one; the reason (when needed) is sent to every seller.
adminRoutes.post("/sellers/bulk-status", async (c) => {
  const body = await c.req.json<{ ids?: unknown; status?: string; reason?: string }>().catch(() => ({}) as { ids?: unknown; status?: string; reason?: string });
  const ids = readIds(body);
  if (!ids) return fail(c, `Select between 1 and ${MAX_BULK} items`);
  const status = String(body.status || "");
  const reason = readReason(body);
  const bad = checkSellerDecision(status, reason);
  if (bad && !bad.ok) return fail(c, bad.error, bad.code);
  const updated: number[] = [];
  const missing: number[] = [];
  for (const id of ids) ((await applySellerStatus(c.env, id, status, reason)) ? updated : missing).push(id);
  return ok(c, { status, updated, missing });
});

// GET /api/v1/admin/parts?status=pending|active|rejected|archived|all&seller_id=&category_id=&q=
adminRoutes.get("/parts", async (c) => {
  const q = c.req.query();
  const { page, limit, offset } = parsePagination(q);
  const status = q["status"] ?? "pending";
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (status !== "all") {
    conditions.push("p.status = ?");
    params.push(status);
  }
  const sellerId = Number(q["seller_id"] || 0);
  if (sellerId > 0) {
    conditions.push("p.seller_id = ?");
    params.push(sellerId);
  }
  const categoryId = Number(q["category_id"] || 0);
  if (categoryId > 0) {
    conditions.push("p.category_id = ?");
    params.push(categoryId);
  }
  const search = (q["q"] || "").trim().slice(0, 100);
  if (search) {
    conditions.push("(p.title LIKE ? OR p.sku LIKE ? OR s.name LIKE ?)");
    const like = `%${search}%`;
    params.push(like, like, like);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const total = await dbCount(
    c.env.DB,
    `SELECT COUNT(*) as total FROM parts p JOIN sellers s ON s.id = p.seller_id ${where}`,
    params
  );
  const parts = await dbAll(
    c.env.DB,
    `SELECT p.*, s.name as seller_name, cat.name as category_name,
       (SELECT pi.url FROM part_images pi WHERE pi.part_id = p.id
         ORDER BY pi.is_featured DESC, pi.sort_order ASC, pi.id ASC LIMIT 1) as image_url
     FROM parts p
     JOIN sellers s ON s.id = p.seller_id
     LEFT JOIN categories cat ON cat.id = p.category_id
     ${where}
     ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  return paginated(c, parts, { page, limit, total });
});

// PATCH /api/v1/admin/parts/:id/status  { status, reason? }
// reason is required for "rejected", optional for "archived"; approving clears it.
adminRoutes.patch("/parts/:id/status", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json<{ status: string; reason?: string }>().catch(() => ({ status: "", reason: "" }));
  const status = String(body.status || "");
  const reason = readReason(body);
  const bad = checkPartDecision(status, reason);
  if (bad && !bad.ok) return fail(c, bad.error, bad.code);
  const done = await applyPartStatus(c, id, status, reason);
  if (done === "missing") return fail(c, "Part not found", 404);
  if (done === "no_photo") return fail(c, "Add at least one photo before approving this part", 409);
  return ok(c, { message: `Part ${status}`, status, moderation_note: status === "active" ? null : reason || null });
});

// POST /api/v1/admin/parts/bulk-status  { ids: number[], status, reason? }
adminRoutes.post("/parts/bulk-status", async (c) => {
  const body = await c.req.json<{ ids?: unknown; status?: string; reason?: string }>().catch(() => ({}) as { ids?: unknown; status?: string; reason?: string });
  const ids = readIds(body);
  if (!ids) return fail(c, `Select between 1 and ${MAX_BULK} items`);
  const status = String(body.status || "");
  const reason = readReason(body);
  const bad = checkPartDecision(status, reason);
  if (bad && !bad.ok) return fail(c, bad.error, bad.code);
  const updated: number[] = [];
  const missing: number[] = [];
  const no_photo: number[] = [];
  for (const id of ids) {
    const done = await applyPartStatus(c, id, status, reason);
    (done === "ok" ? updated : done === "missing" ? missing : no_photo).push(id);
  }
  return ok(c, { status, updated, missing, no_photo });
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
  const allowed = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];
  if (!allowed.includes(status)) return fail(c, "Invalid status");
  const orderId = Number(id);
  // Admin override: every line that is still open takes the new status.
  const lines = await dbAll<{ id: number }>(
    c.env.DB,
    "SELECT id FROM order_items WHERE order_id = ? AND status != 'cancelled'",
    [orderId]
  );
  if (!lines.length) return fail(c, "Order not found", 404);
  const restocked = await setLineStatus(c.env.DB, lines.map((l) => l.id), status as LineStatus);
  await logOrderEvent(c.env.DB, orderId, status, "admin");
  await refreshOrderStatus(c.env.DB, orderId);
  for (const partId of restocked) runInBackground(c, notifyBackInStock(c.env, partId));
  return ok(c, { message: "Order updated" });
});

// GET /api/v1/admin/issues?status=escalated|active|all — returns and complaints.
adminRoutes.get("/issues", async (c) => {
  const q = c.req.query();
  const { page, limit, offset } = parsePagination(q);
  const status = q["status"] || "escalated";
  const where =
    status === "all" ? "" : status === "active" ? "WHERE i.status != 'closed'" : "WHERE i.status = 'escalated'";
  const total = await dbCount(c.env.DB, `SELECT COUNT(*) as total FROM order_issues i ${where}`);
  const rows = await dbAll<IssueRow>(
    c.env.DB,
    `SELECT i.*, o.reference, oi.title AS part_title, oi.subtotal, oi.delivered_at,
            u.name AS buyer_name, u.email AS buyer_email, a.phone AS buyer_phone,
            s.name AS seller_name, s.phone AS seller_phone, s.whatsapp AS seller_whatsapp
     FROM order_issues i
     JOIN orders o ON o.id = i.order_id
     JOIN order_items oi ON oi.id = i.order_item_id
     JOIN users u ON u.id = i.buyer_id
     JOIN sellers s ON s.id = i.seller_id
     LEFT JOIN order_addresses a ON a.order_id = i.order_id
     ${where}
     ORDER BY CASE i.status WHEN 'escalated' THEN 0 ELSE 1 END, i.escalated_at ASC, i.created_at DESC
     LIMIT ? OFFSET ?`,
    [limit, offset]
  );
  return paginated(c, rows.map(publicIssue), { page, limit, total });
});

// POST /api/v1/admin/issues/:id/decide { outcome: buyer|seller, note }
// PartHub's decision, recorded on the order. For the buyer: the seller must
// take the part back and refund (claim stays "accepted" until refunded).
// For the seller: the claim is closed.
adminRoutes.post("/issues/:id/decide", async (c) => {
  const issue = await loadIssue(c.env.DB, Number(c.req.param("id")));
  if (!issue) return fail(c, "Claim not found", 404);
  if (issue.status === "closed") return fail(c, "This claim is already closed", 409);
  const body = await c.req.json<{ outcome?: unknown; note?: unknown; return_paid_by?: unknown }>().catch(() => ({} as Record<string, unknown>));
  const outcome = String(body.outcome || "");
  const note = cleanNote(body.note);
  if (outcome !== "buyer" && outcome !== "seller") return fail(c, "Choose who the decision favours");
  if (!note) return fail(c, "Write the reason for the decision");
  const paidBy = body.return_paid_by === "buyer" || body.return_paid_by === "seller" ? body.return_paid_by : issue.return_paid_by;
  const fields =
    outcome === "buyer"
      ? { status: "accepted" as const, admin_note: note, return_paid_by: paidBy, seller_replied_at: nowText() }
      : { status: "closed" as const, outcome: "seller" as const, admin_note: note, closed_at: nowText() };
  const updated = await updateIssue(
    c.env.DB, issue, fields, outcome === "buyer" ? "issue_decided_buyer" : "issue_decided_seller", "admin", note
  );
  return ok(c, publicIssue(updated));
});

// ── Vehicle catalog ───────────────────────────────────────────

const VERIFICATION = ["unverified", "admin_approved", "verified"];
// undefined → leave as is; "invalid" → refuse.
function readVerification(value: unknown): string | null | "invalid" {
  if (value === undefined || value === null || value === "") return null;
  return VERIFICATION.includes(String(value)) ? String(value) : "invalid";
}

// GET /api/v1/admin/catalog-suggestions?status=pending|all
adminRoutes.get("/catalog-suggestions", async (c) => {
  const all = c.req.query("status") === "all";
  const rows = await dbAll(
    c.env.DB,
    `SELECT cs.*, u.name AS user_name, u.email AS user_email, s.name AS seller_name
     FROM catalog_suggestions cs
     JOIN users u ON u.id = cs.user_id
     LEFT JOIN sellers s ON s.id = cs.seller_id
     ${all ? "" : "WHERE cs.status = 'pending'"}
     ORDER BY CASE cs.status WHEN 'pending' THEN 0 ELSE 1 END, cs.created_at DESC
     LIMIT 200`
  );
  return ok(c, rows);
});

// POST /api/v1/admin/catalog-suggestions/:id/approve { make, model, generation, year_start, year_end, engine | brand }
// The admin may correct the fields first; what is missing is added to the catalog.
adminRoutes.post("/catalog-suggestions/:id/approve", async (c) => {
  const id = Number(c.req.param("id"));
  const sug = await dbFirst<Record<string, unknown>>(c.env.DB, "SELECT * FROM catalog_suggestions WHERE id = ?", [id]);
  if (!sug) return fail(c, "Suggestion not found", 404);
  if (sug.status !== "pending") return fail(c, "This suggestion was already reviewed", 409);
  const body = await c.req.json<Record<string, unknown>>().catch(() => ({} as Record<string, unknown>));
  const fields = { ...sug, ...Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined)) };

  // Check the fields before claiming the suggestion.
  const brandName = sug.kind === "brand" && typeof fields.brand === "string" ? fields.brand.trim().slice(0, 80) : "";
  const entry = sug.kind === "brand" ? null : readVehicleEntry(fields);
  if (sug.kind === "brand" && !brandName) return fail(c, "Give the brand name");
  if (typeof entry === "string") return fail(c, entry);

  // Claim it atomically: of two admins approving at once, only one goes on.
  const claim = await dbRun(
    c.env.DB,
    "UPDATE catalog_suggestions SET status = 'approved', admin_note = ?, decided_at = datetime('now') WHERE id = ? AND status = 'pending'",
    [cleanNote(body.admin_note, 500), id]
  );
  if (!claim.changes) return fail(c, "This suggestion was already reviewed", 409);

  const prov = { source: "seller_suggestion", verification: "admin_approved" } as const;
  try {
    const created = entry ? await ensureVehicle(c.env.DB, entry, prov) : await ensureBrand(c.env.DB, brandName, prov);
    return ok(c, { id, status: "approved", created });
  } catch (err) {
    // Give it back to the queue if the catalog could not be updated.
    await dbRun(c.env.DB, "UPDATE catalog_suggestions SET status = 'pending', decided_at = NULL WHERE id = ?", [id]);
    throw err;
  }
});

// POST /api/v1/admin/catalog-suggestions/:id/reject { admin_note }
adminRoutes.post("/catalog-suggestions/:id/reject", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json<{ admin_note?: unknown }>().catch(() => ({} as { admin_note?: unknown }));
  const res = await dbRun(
    c.env.DB,
    "UPDATE catalog_suggestions SET status = 'rejected', admin_note = ?, decided_at = datetime('now') WHERE id = ? AND status = 'pending'",
    [cleanNote(body.admin_note, 500), id]
  );
  if (!res.changes) return fail(c, "Suggestion not found", 404);
  return ok(c, { id, status: "rejected" });
});

// POST /api/v1/admin/vehicles/catalog { make, model, generation?, year_start?, year_end?, engine? }
adminRoutes.post("/vehicles/catalog", async (c) => {
  const body = await c.req.json<Record<string, unknown>>().catch(() => ({} as Record<string, unknown>));
  const entry = readVehicleEntry(body);
  if (typeof entry === "string") return fail(c, entry);
  return ok(c, await ensureVehicle(c.env.DB, entry, { source: "admin", verification: "admin_approved" }));
});

// GET /api/v1/admin/vehicles/generations?model_id= — generations with their engines.
adminRoutes.get("/vehicles/generations", async (c) => {
  const modelId = Number(c.req.query("model_id"));
  const gens = await dbAll<{ id: number }>(
    c.env.DB,
    `SELECT g.*, (SELECT COUNT(*) FROM part_compatibility pc WHERE pc.generation_id = g.id) AS fitment_count
     FROM vehicle_generations g WHERE g.model_id = ? ORDER BY g.year_start, g.sort_order`,
    [modelId]
  );
  const engines = gens.length
    ? await dbAll<{ generation_id: number }>(
        c.env.DB,
        `SELECT e.*, (SELECT COUNT(*) FROM part_compatibility pc WHERE pc.engine_id = e.id) AS fitment_count
         FROM vehicle_engines e WHERE e.generation_id IN (${gens.map(() => "?").join(",")}) ORDER BY e.fuel, e.displacement_cc, e.power_hp`,
        gens.map((g) => g.id)
      )
    : [];
  return ok(c, gens.map((g) => ({ ...g, engines: engines.filter((e) => e.generation_id === g.id) })));
});

// PATCH /api/v1/admin/vehicles/generations/:id { name?, year_start?, year_end? }
adminRoutes.patch("/vehicles/generations/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const gen = await dbFirst<{ id: number; name: string; year_start: number; year_end: number | null }>(c.env.DB, "SELECT * FROM vehicle_generations WHERE id = ?", [id]);
  if (!gen) return fail(c, "Generation not found", 404);
  const body = await c.req.json<Record<string, unknown>>().catch(() => ({} as Record<string, unknown>));
  const name = typeof body.name === "string" && body.name.trim() ? body.name.trim().slice(0, 80) : gen.name;
  const ys = body.year_start !== undefined ? Number(body.year_start) : gen.year_start;
  const ye = body.year_end === null || body.year_end === "" ? null : body.year_end !== undefined ? Number(body.year_end) : gen.year_end;
  if (!Number.isInteger(ys) || ys < 1950 || (ye != null && (!Number.isInteger(ye) || ye < ys))) return fail(c, "Check the years");
  const verification = readVerification(body.verification);
  if (verification === "invalid") return fail(c, "Unknown verification status");
  await dbRun(
    c.env.DB,
    "UPDATE vehicle_generations SET name = ?, year_start = ?, year_end = ?, verification = coalesce(?, verification) WHERE id = ?",
    [name, ys, ye, verification, id]
  );
  return ok(c, await dbFirst(c.env.DB, "SELECT * FROM vehicle_generations WHERE id = ?", [id]));
});

// DELETE /api/v1/admin/vehicles/generations/:id — fitment rows keep their text.
adminRoutes.delete("/vehicles/generations/:id", async (c) => {
  const id = Number(c.req.param("id"));
  await dbRun(c.env.DB, "UPDATE part_compatibility SET engine_id = NULL WHERE engine_id IN (SELECT id FROM vehicle_engines WHERE generation_id = ?)", [id]);
  await dbRun(c.env.DB, "UPDATE part_compatibility SET generation_id = NULL WHERE generation_id = ?", [id]);
  await dbRun(c.env.DB, "DELETE FROM vehicle_engines WHERE generation_id = ?", [id]);
  const res = await dbRun(c.env.DB, "DELETE FROM vehicle_generations WHERE id = ?", [id]);
  if (!res.changes) return fail(c, "Generation not found", 404);
  return ok(c, { id, deleted: true });
});

// PATCH /api/v1/admin/vehicles/engines/:id { name?, verification? }
// Marking an engine "verified" also marks its fuel / cc / hp as checked.
adminRoutes.patch("/vehicles/engines/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json<{ name?: unknown; verification?: unknown }>().catch(() => ({} as { name?: unknown; verification?: unknown }));
  const verification = readVerification(body.verification);
  if (verification === "invalid") return fail(c, "Unknown verification status");
  const engine = await dbFirst<{ id: number; name: string }>(c.env.DB, "SELECT id, name FROM vehicle_engines WHERE id = ?", [id]);
  if (!engine) return fail(c, "Engine not found", 404);
  const name = typeof body.name === "string" && body.name.trim() ? body.name.trim().slice(0, 80) : engine.name;
  if (body.name !== undefined && !name) return fail(c, "Give the engine name");
  if (verification && body.name === undefined) {
    await dbRun(
      c.env.DB,
      "UPDATE vehicle_engines SET verification = ?, specs_inferred = CASE WHEN ? = 'verified' THEN 0 ELSE specs_inferred END WHERE id = ?",
      [verification, verification, id]
    );
    return ok(c, await dbFirst(c.env.DB, "SELECT * FROM vehicle_engines WHERE id = ?", [id]));
  }
  const info = engineInfo(name);
  await dbRun(
    c.env.DB,
    "UPDATE vehicle_engines SET name = ?, fuel = ?, displacement_cc = ?, power_hp = ?, specs_inferred = 1, verification = coalesce(?, verification) WHERE id = ?",
    [name, info.fuel, info.cc, info.hp, verification, id]
  );
  // Fitment rows linked to this engine show the corrected name.
  await dbRun(c.env.DB, "UPDATE part_compatibility SET engine = ? WHERE engine_id = ?", [name, id]);
  return ok(c, await dbFirst(c.env.DB, "SELECT * FROM vehicle_engines WHERE id = ?", [id]));
});

// DELETE /api/v1/admin/vehicles/engines/:id
adminRoutes.delete("/vehicles/engines/:id", async (c) => {
  const id = Number(c.req.param("id"));
  await dbRun(c.env.DB, "UPDATE part_compatibility SET engine_id = NULL WHERE engine_id = ?", [id]);
  const res = await dbRun(c.env.DB, "DELETE FROM vehicle_engines WHERE id = ?", [id]);
  if (!res.changes) return fail(c, "Engine not found", 404);
  return ok(c, { id, deleted: true });
});

// ── Part numbers (OEM / aftermarket) ──────────────────────────

// GET /api/v1/admin/part-numbers/links?status=unverified|all
// Seller claims ("this part replaces that number") wait here; once verified
// they link every listing carrying either number.
adminRoutes.get("/part-numbers/links", async (c) => {
  const all = c.req.query("status") === "all";
  const rows = await dbAll(
    c.env.DB,
    `SELECT l.id, l.relation, l.source, l.verification, l.created_at, l.decided_at,
            a.number AS from_number, a.kind AS from_kind, ba.name AS from_brand,
            b.number AS to_number, b.kind AS to_kind, bb.name AS to_brand,
            u.name AS claimed_by,
            (SELECT COUNT(*) FROM part_listing_numbers x WHERE x.part_number_id = l.from_id) AS from_listings,
            (SELECT COUNT(*) FROM part_listing_numbers x WHERE x.part_number_id = l.to_id) AS to_listings,
            (SELECT group_concat(p.title, ' | ') FROM part_listing_numbers x JOIN part_listing_numbers y ON y.part_id = x.part_id
               JOIN parts p ON p.id = x.part_id
             WHERE x.part_number_id = l.from_id AND y.part_number_id = l.to_id) AS claimed_on
     FROM part_number_links l
     JOIN part_numbers a ON a.id = l.from_id
     JOIN part_numbers b ON b.id = l.to_id
     LEFT JOIN brands ba ON ba.id = a.brand_id
     LEFT JOIN brands bb ON bb.id = b.brand_id
     LEFT JOIN users u ON u.id = l.created_by
     ${all ? "" : "WHERE l.verification = 'unverified'"}
     ORDER BY CASE l.verification WHEN 'unverified' THEN 0 ELSE 1 END, l.created_at DESC
     LIMIT 200`
  );
  return ok(c, rows);
});

// POST /api/v1/admin/part-numbers/links/:id/decide { decision: verify|reject, relation? }
adminRoutes.post("/part-numbers/links/:id/decide", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json<{ decision?: unknown; relation?: unknown }>().catch(() => ({} as { decision?: unknown; relation?: unknown }));
  const decision = String(body.decision || "");
  if (decision !== "verify" && decision !== "reject") return fail(c, "Choose to verify or reject");
  const relation = body.relation === "supersedes" ? "supersedes" : body.relation === "equivalent" ? "equivalent" : null;
  const res = await dbRun(
    c.env.DB,
    `UPDATE part_number_links
     SET verification = ?, relation = coalesce(?, relation), decided_at = datetime('now')
     WHERE id = ?`,
    [decision === "verify" ? "verified" : "rejected", relation, id]
  );
  if (!res.changes) return fail(c, "Link not found", 404);
  return ok(c, await dbFirst(c.env.DB, "SELECT * FROM part_number_links WHERE id = ?", [id]));
});

// POST /api/v1/admin/part-numbers/links { from: {number, kind, brand_id?}, to: {...}, relation }
// An admin records a link directly (verified).
adminRoutes.post("/part-numbers/links", async (c) => {
  const body = await c.req.json<Record<string, unknown>>().catch(() => ({} as Record<string, unknown>));
  const parsed = readNumbersInput([body.from, body.to]);
  if (typeof parsed === "string") return fail(c, parsed);
  if (parsed.length !== 2) return fail(c, "Give two different part numbers");
  const relation = body.relation === "supersedes" ? "supersedes" : "equivalent";
  const ids: number[] = [];
  for (const n of parsed) {
    await dbRun(
      c.env.DB,
      "INSERT OR IGNORE INTO part_numbers (number, number_norm, kind, brand_id, source, verification) VALUES (?, ?, ?, ?, 'admin', 'admin_approved')",
      [n.number, n.norm, n.kind, n.brand_id]
    );
    const row = await dbFirst<{ id: number }>(c.env.DB, "SELECT id FROM part_numbers WHERE number_norm = ? AND coalesce(brand_id, 0) = ?", [n.norm, n.brand_id ?? 0]);
    if (!row) return fail(c, "Part number not saved", 500);
    ids.push(row.id);
  }
  await dbRun(
    c.env.DB,
    `INSERT INTO part_number_links (from_id, to_id, relation, source, verification, created_by, decided_at)
     VALUES (?, ?, ?, 'admin', 'verified', ?, datetime('now'))
     ON CONFLICT (from_id, to_id, relation) DO UPDATE SET verification = 'verified', decided_at = datetime('now')`,
    [ids[0], ids[1], relation, Number(c.get("user_id")) || null]
  );
  return ok(c, await dbFirst(c.env.DB, "SELECT * FROM part_number_links WHERE from_id = ? AND to_id = ? AND relation = ?", [ids[0], ids[1], relation]));
});

// PATCH /api/v1/admin/part-numbers/:id { verification }
adminRoutes.patch("/part-numbers/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json<{ verification?: unknown }>().catch(() => ({} as { verification?: unknown }));
  const verification = readVerification(body.verification);
  if (!verification || verification === "invalid") return fail(c, "Unknown verification status");
  const res = await dbRun(c.env.DB, "UPDATE part_numbers SET verification = ? WHERE id = ?", [verification, id]);
  if (!res.changes) return fail(c, "Part number not found", 404);
  return ok(c, await dbFirst(c.env.DB, "SELECT * FROM part_numbers WHERE id = ?", [id]));
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
  const allowed = ["approved", "rejected"];
  if (!allowed.includes(status)) return fail(c, "Invalid status");
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
