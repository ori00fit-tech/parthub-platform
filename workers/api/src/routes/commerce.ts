import { Hono } from "hono";
import type { Env, HonoVariables } from "../types";
import { authMiddleware } from "../middlewares/auth";
import { ok, created, fail, notFound } from "../utils/response";
import { dbFirst, dbAll, dbRun } from "../utils/db";

export const commerceRoutes = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

const MAX_ORDER_LINES = 50;
const MAX_QTY_PER_LINE = 100;

// Unguessable reference, e.g. PH-2026-7K3QX9MD (no 0/O/1/I to avoid confusion).
function generateOrderReference(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const code = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
  return `PH-${new Date().getFullYear()}-${code}`;
}

// POST /api/v1/commerce/orders
commerceRoutes.post("/orders", authMiddleware, async (c) => {
  const buyerId = c.get("user_id");
  const body = await c.req.json<{
    items: Array<{ part_id: number; quantity: number }>;
    shipping_address: {
      full_name: string; phone: string; address_line1: string;
      city: string; country: string;
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

  const shipping_fee = 500; // cents — flat rate
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
      `INSERT INTO order_addresses (order_id, full_name, phone, address_line1, city, country)
       VALUES (${orderIdSql}, ?, ?, ?, ?, ?)`
    ).bind(ref, addr.full_name.trim(), addr.phone.trim(), addr.address_line1.trim(), addr.city.trim(), addr.country.trim()),
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

  const items = await dbAll(c.env.DB, "SELECT * FROM order_items WHERE order_id = ?", [(order as any).id]);
  const address = await dbFirst(c.env.DB, "SELECT * FROM order_addresses WHERE order_id = ?", [(order as any).id]);

  return ok(c, { ...order, items, shipping_address: address });
});

// POST /api/v1/commerce/reviews
commerceRoutes.post("/reviews", authMiddleware, async (c) => {
  const buyerId = c.get("user_id");
  const body = await c.req.json<{
    part_id: number; rating: number; body?: string; order_item_id?: number;
  }>();

  if (!body.part_id || !body.rating) return fail(c, "part_id and rating are required");
  if (body.rating < 1 || body.rating > 5) return fail(c, "rating must be 1–5");

  const existing = await dbFirst(
    c.env.DB,
    "SELECT id FROM reviews WHERE part_id = ? AND buyer_id = ?",
    [body.part_id, buyerId]
  );
  if (existing) return fail(c, "You already reviewed this part", 409);

  // Verify purchase
  let is_verified = false;
  if (body.order_item_id) {
    const orderItem = await dbFirst(
      c.env.DB,
      `SELECT oi.id FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE oi.id = ? AND o.buyer_id = ? AND o.status = 'delivered'`,
      [body.order_item_id, buyerId]
    );
    is_verified = !!orderItem;
  }

  const result = await dbRun(
    c.env.DB,
    `INSERT INTO reviews (part_id, buyer_id, order_item_id, rating, body, is_verified_purchase, status)
     VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
    [body.part_id, buyerId, body.order_item_id ?? null, body.rating, body.body ?? null, is_verified ? 1 : 0]
  );

  const review = await dbFirst(c.env.DB, "SELECT * FROM reviews WHERE id = ?", [result.lastRowId]);
  return created(c, review);
});
