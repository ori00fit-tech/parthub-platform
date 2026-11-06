import { Hono } from "hono";
import type { Env, HonoVariables } from "../types";
import { authMiddleware } from "../middlewares/auth";
import { ok, created, fail, notFound } from "../utils/response";
import { dbFirst, dbAll, dbRun } from "../utils/db";
import { logOrderEvent } from "../utils/fulfillment";
import { ISSUE_REASONS, type IssueRow, canEscalate, cleanNote, issuesForOrder, loadIssue, nowText, publicIssue, reportWindow, updateIssue } from "../utils/issues";

const MAX_REVIEW_LENGTH = 1000;

export const commerceRoutes = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

const MAX_ORDER_LINES = 50;
const DEFAULT_SHIPPING_FEE_CENTIMES = 3500; // 35 MAD

// Flat delivery fee in centimes (MAD). Set SHIPPING_FEE_CENTIMES in wrangler.toml.
function shippingFee(env: Env): number {
  const configured = Number(env.SHIPPING_FEE_CENTIMES);
  return Number.isInteger(configured) && configured >= 0 ? configured : DEFAULT_SHIPPING_FEE_CENTIMES;
}

function optionalText(value: unknown, max = 200): string | null {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}
const MAX_QTY_PER_LINE = 100;

// Unguessable reference, e.g. PH-2026-7K3QX9MD (no 0/O/1/I to avoid confusion).
function generateOrderReference(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const code = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
  return `PH-${new Date().getFullYear()}-${code}`;
}

// GET /api/v1/commerce/shipping — what checkout should show before ordering
commerceRoutes.get("/shipping", (c) =>
  ok(c, { flat_fee: shippingFee(c.env), currency: "MAD" })
);

// POST /api/v1/commerce/orders
commerceRoutes.post("/orders", authMiddleware, async (c) => {
  const buyerId = c.get("user_id");
  const body = await c.req.json<{
    items: Array<{ part_id: number; quantity: number }>;
    shipping_address: {
      full_name: string; phone: string; address_line1: string;
      city: string; country: string;
      address_line2?: string | null; state?: string | null; postal_code?: string | null;
    };
    notes?: string;
  }>();

  if (!Array.isArray(body.items) || !body.items.length) return fail(c, "items are required");
  if (body.items.length > MAX_ORDER_LINES) return fail(c, `At most ${MAX_ORDER_LINES} items per order`);

  const addr = body.shipping_address;
  if (!addr) return fail(c, "shipping_address is required");
  for (const field of ["full_name", "phone", "address_line1", "city", "country"] as const) {
    if (typeof addr[field] !== "string" || !addr[field].trim()) {
      return fail(c, `shipping_address.${field} is required`);
    }
  }

  // Validate quantities and merge duplicate lines for the same part.
  const requested = new Map<number, number>();
  for (const item of body.items) {
    const partId = Number(item?.part_id);
    const qty = Number(item?.quantity);
    if (!Number.isInteger(partId) || partId <= 0) return fail(c, "Invalid part_id");
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY_PER_LINE) {
      return fail(c, `quantity must be a whole number between 1 and ${MAX_QTY_PER_LINE}`);
    }
    requested.set(partId, (requested.get(partId) ?? 0) + qty);
  }

  let subtotal = 0;
  const resolvedItems: Array<{
    part_id: number; seller_id: number; title: string;
    price: number; quantity: number; subtotal: number;
  }> = [];

  for (const [partId, quantity] of requested) {
    const part = await dbFirst<{
      id: number; seller_id: number; title: string; price: number; quantity: number; status: string;
    }>(c.env.DB, "SELECT id, seller_id, title, price, quantity, status FROM parts WHERE id = ?", [partId]);

    if (!part || part.status !== "active") return fail(c, `Part ${partId} not available`);
    if (part.quantity < quantity) return fail(c, `Insufficient stock for: ${part.title}`);

    const lineTotal = part.price * quantity;
    subtotal += lineTotal;
    resolvedItems.push({
      part_id: part.id, seller_id: part.seller_id,
      title: part.title, price: part.price,
      quantity, subtotal: lineTotal,
    });
  }

  const shipping_fee = shippingFee(c.env);
  const total = subtotal + shipping_fee;
  const ref = generateOrderReference();
  const orderIdSql = "(SELECT id FROM orders WHERE reference = ?)";

  // Everything runs in one D1 batch (a single transaction). The stock update sets
  // quantity to NULL when stock ran out since the check above; the NOT NULL
  // constraint then aborts the batch, so no partial order or oversell is written.
  const db = c.env.DB;
  const statements = [
    ...resolvedItems.map((item) =>
      db.prepare(
        `UPDATE parts
         SET quantity = CASE WHEN quantity >= ?1 AND status = 'active' THEN quantity - ?1 ELSE NULL END
         WHERE id = ?2`
      ).bind(item.quantity, item.part_id)
    ),
    db.prepare(
      `INSERT INTO orders (buyer_id, reference, subtotal, shipping_fee, total, status, payment_status, shipping_status, notes)
       VALUES (?, ?, ?, ?, ?, 'pending', 'unpaid', 'pending', ?)`
    ).bind(buyerId, ref, subtotal, shipping_fee, total, body.notes ?? null),
    db.prepare(
      `INSERT INTO order_addresses (order_id, full_name, phone, address_line1, address_line2, city, state, postal_code, country)
       VALUES (${orderIdSql}, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      ref,
      addr.full_name.trim(),
      addr.phone.trim(),
      addr.address_line1.trim(),
      optionalText(addr.address_line2),
      addr.city.trim(),
      optionalText(addr.state),
      optionalText(addr.postal_code),
      addr.country.trim()
    ),
    ...resolvedItems.map((item) =>
      db.prepare(
        `INSERT INTO order_items (order_id, part_id, seller_id, title, price, quantity, subtotal)
         VALUES (${orderIdSql}, ?, ?, ?, ?, ?, ?)`
      ).bind(ref, item.part_id, item.seller_id, item.title, item.price, item.quantity, item.subtotal)
    ),
  ];

  try {
    await db.batch(statements);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/NOT NULL constraint failed: parts\.quantity/i.test(message)) {
      return fail(c, "Some items are no longer in stock, please review your cart", 409);
    }
    throw err;
  }

  const order = await dbFirst(c.env.DB, "SELECT * FROM orders WHERE reference = ?", [ref]);
  return created(c, order);
});

// GET /api/v1/commerce/orders
commerceRoutes.get("/orders", authMiddleware, async (c) => {
  const buyerId = c.get("user_id");
  const orders = await dbAll(
    c.env.DB,
    "SELECT * FROM orders WHERE buyer_id = ? ORDER BY created_at DESC",
    [buyerId]
  );
  return ok(c, orders);
});

// GET /api/v1/commerce/orders/:reference
commerceRoutes.get("/orders/:reference", authMiddleware, async (c) => {
  const buyerId = c.get("user_id");
  const ref = c.req.param("reference");

  const order = await dbFirst(
    c.env.DB,
    "SELECT * FROM orders WHERE reference = ? AND buyer_id = ?",
    [ref, buyerId]
  );
  if (!order) return notFound(c, "Order");

  // my_review: the buyer's review of that part, if any (to show "Rate" or the status).
  const items = await dbAll(
    c.env.DB,
    `SELECT oi.*, r.rating as my_rating, r.status as my_review_status
     FROM order_items oi
     LEFT JOIN reviews r ON r.part_id = oi.part_id AND r.buyer_id = ?
     WHERE oi.order_id = ?`,
    [buyerId, (order as any).id]
  );
  const address = await dbFirst(c.env.DB, "SELECT * FROM order_addresses WHERE order_id = ?", [(order as any).id]);
  // History shown to the buyer: what changed, by whom (seller / PartHub) and why.
  const events = await dbAll(
    c.env.DB,
    `SELECT event, note, created_at,
            CASE WHEN created_by LIKE 'seller%' THEN 'seller' WHEN created_by = 'buyer' THEN 'buyer' ELSE 'parthub' END AS actor
     FROM order_events WHERE order_id = ? ORDER BY created_at ASC, id ASC`,
    [(order as any).id]
  );

  // Returns: the latest claim on each line, and whether a new one can be opened.
  const issues = await issuesForOrder(c.env.DB, (order as any).id);
  const withIssues = (items as Array<Record<string, any>>).map((item) => {
    const issue = issues.filter((i) => i.order_item_id === item.id).pop() || null;
    const window = reportWindow(item);
    const reopenable = !issue || (issue.status === "closed" && issue.outcome === "withdrawn");
    return { ...item, issue, report_until: window.until, can_report: window.open && reopenable };
  });

  return ok(c, { ...order, items: withIssues, shipping_address: address, events });
});

// POST /api/v1/commerce/orders/:reference/issues { order_item_id, reason, details }
// Report a problem with a delivered part, within 7 days of delivery.
commerceRoutes.post("/orders/:reference/issues", authMiddleware, async (c) => {
  const buyerId = Number(c.get("user_id"));
  const body = await c.req
    .json<{ order_item_id?: unknown; reason?: unknown; details?: unknown }>()
    .catch(() => ({}) as { order_item_id?: unknown; reason?: unknown; details?: unknown });
  const itemId = Number(body.order_item_id);
  const reason = String(body.reason || "");
  const details = cleanNote(body.details);
  if (!(reason in ISSUE_REASONS)) return fail(c, "Choose what the problem is");
  if (!details || details.length < 10) return fail(c, "Describe the problem in a few words (at least 10 characters)");

  const item = await dbFirst<{ id: number; order_id: number; seller_id: number; status: string; delivered_at: string | null }>(
    c.env.DB,
    `SELECT oi.id, oi.order_id, oi.seller_id, oi.status, oi.delivered_at
     FROM order_items oi JOIN orders o ON o.id = oi.order_id
     WHERE oi.id = ? AND o.reference = ? AND o.buyer_id = ?`,
    [itemId, c.req.param("reference"), buyerId]
  );
  if (!item) return notFound(c, "Order item");
  if (item.status !== "delivered") return fail(c, "You can report a problem once the part is delivered", 409);
  if (!reportWindow(item).open) return fail(c, "The 7-day returns window for this part has closed", 409);
  const existing = await dbFirst<{ id: number }>(
    c.env.DB,
    "SELECT id FROM order_issues WHERE order_item_id = ? AND NOT (status = 'closed' AND outcome = 'withdrawn')",
    [item.id]
  );
  if (existing) return fail(c, "A problem is already reported for this part", 409);

  const res = await dbRun(
    c.env.DB,
    `INSERT INTO order_issues (order_id, order_item_id, buyer_id, seller_id, reason, details, return_paid_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [item.order_id, item.id, buyerId, item.seller_id, reason, details, ISSUE_REASONS[reason]]
  );
  await logOrderEvent(c.env.DB, item.order_id, "issue_opened", "buyer", details);
  const issue = await loadIssue(c.env.DB, Number(res.lastRowId));
  return created(c, publicIssue(issue as IssueRow));
});

async function buyerIssue(c: { env: Env; req: { param: (k: string) => string }; get: (k: "user_id") => unknown }) {
  const issue = await loadIssue(c.env.DB, Number(c.req.param("id")));
  return issue && issue.buyer_id === Number(c.get("user_id")) ? issue : null;
}

// POST /api/v1/commerce/issues/:id/escalate { note? } — ask PartHub to decide.
commerceRoutes.post("/issues/:id/escalate", authMiddleware, async (c) => {
  const issue = await buyerIssue(c);
  if (!issue) return notFound(c, "Claim");
  if (!canEscalate(issue)) return fail(c, "You can ask PartHub once the seller refuses or does not reply in time", 409);
  const body = await c.req.json<{ note?: unknown }>().catch(() => ({}) as { note?: unknown });
  const updated = await updateIssue(
    c.env.DB, issue, { status: "escalated", escalated_at: nowText() }, "issue_escalated", "buyer", cleanNote(body.note)
  );
  return ok(c, publicIssue(updated));
});

// POST /api/v1/commerce/issues/:id/withdraw — the buyer closes the claim.
commerceRoutes.post("/issues/:id/withdraw", authMiddleware, async (c) => {
  const issue = await buyerIssue(c);
  if (!issue) return notFound(c, "Claim");
  if (issue.status === "closed") return fail(c, "This claim is already closed", 409);
  const updated = await updateIssue(
    c.env.DB, issue, { status: "closed", outcome: "withdrawn", closed_at: nowText() }, "issue_withdrawn", "buyer", null
  );
  return ok(c, publicIssue(updated));
});

// POST /api/v1/commerce/reviews
commerceRoutes.post("/reviews", authMiddleware, async (c) => {
  const buyerId = c.get("user_id");
  const body = await c.req
    .json<{ part_id?: unknown; rating?: unknown; body?: unknown }>()
    .catch(() => ({}) as { part_id?: unknown; rating?: unknown; body?: unknown });
  const partId = Number(body.part_id);
  const rating = Number(body.rating);
  if (!Number.isInteger(partId) || partId <= 0 || !body.rating) return fail(c, "part_id and rating are required");
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return fail(c, "rating must be 1–5");
  const text = typeof body.body === "string" ? body.body.trim().slice(0, MAX_REVIEW_LENGTH) : "";

  const existing = await dbFirst(c.env.DB, "SELECT id FROM reviews WHERE part_id = ? AND buyer_id = ?", [partId, buyerId]);
  if (existing) return fail(c, "You already reviewed this part", 409);

  // Only buyers who received the part can rate it.
  const orderItem = await dbFirst<{ id: number }>(
    c.env.DB,
    `SELECT oi.id FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     WHERE oi.part_id = ? AND o.buyer_id = ? AND oi.status = 'delivered'
     ORDER BY o.created_at DESC LIMIT 1`,
    [partId, buyerId]
  );
  if (!orderItem) return fail(c, "You can rate a part once your order is delivered", 403);

  const result = await dbRun(
    c.env.DB,
    `INSERT INTO reviews (part_id, buyer_id, order_item_id, rating, body, is_verified_purchase, status)
     VALUES (?, ?, ?, ?, ?, 1, 'pending')`,
    [partId, buyerId, orderItem.id, rating, text || null]
  );

  const review = await dbFirst(c.env.DB, "SELECT id, part_id, rating, body, status, created_at FROM reviews WHERE id = ?", [result.lastRowId]);
  return created(c, review);
});
