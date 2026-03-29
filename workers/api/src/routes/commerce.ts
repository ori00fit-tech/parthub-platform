import { Hono } from "hono";
import type { Env, HonoVariables } from "../types";
import { authMiddleware } from "../middlewares/auth";
import { ok, created, fail, notFound } from "../utils/response";
import { dbFirst, dbAll, dbRun } from "../utils/db";

export const commerceRoutes = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

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

  if (!body.items?.length) return fail(c, "items are required");
  if (!body.shipping_address) return fail(c, "shipping_address is required");

  // Validate parts exist and are active
  let subtotal = 0;
  const resolvedItems: Array<{
    part_id: number; seller_id: number; title: string;
    price: number; quantity: number; subtotal: number;
  }> = [];

  for (const item of body.items) {
    const part = await dbFirst<{
      id: number; seller_id: number; title: string; price: number; quantity: number; status: string;
    }>(c.env.DB, "SELECT id, seller_id, title, price, quantity, status FROM parts WHERE id = ?", [item.part_id]);

    if (!part || part.status !== "active") return fail(c, `Part ${item.part_id} not available`);
    if (part.quantity < item.quantity) return fail(c, `Insufficient stock for: ${part.title}`);

    const lineTotal = part.price * item.quantity;
    subtotal += lineTotal;
    resolvedItems.push({
      part_id: part.id, seller_id: part.seller_id,
      title: part.title, price: part.price,
      quantity: item.quantity, subtotal: lineTotal,
    });
  }

  const shipping_fee = 500; // cents — $5.00 flat rate
  const total = subtotal + shipping_fee;

  // Create order
  const orderResult = await dbRun(
    c.env.DB,
    `INSERT INTO orders (buyer_id, subtotal, shipping_fee, total, status, payment_status, shipping_status, notes)
     VALUES (?, ?, ?, ?, 'pending', 'unpaid', 'pending', ?)`,
    [buyerId, subtotal, shipping_fee, total, body.notes ?? null]
  );
  const orderId = orderResult.lastRowId!;

  // Generate reference
  const ref = `PH-${new Date().getFullYear()}-${String(orderId).padStart(5, "0")}`;
  await dbRun(c.env.DB, "UPDATE orders SET reference = ? WHERE id = ?", [ref, orderId]);

  // Insert shipping address
  const addr = body.shipping_address;
  await dbRun(
    c.env.DB,
    `INSERT INTO order_addresses (order_id, full_name, phone, address_line1, city, country)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [orderId, addr.full_name, addr.phone, addr.address_line1, addr.city, addr.country]
  );

  // Insert items & deduct stock
  for (const item of resolvedItems) {
    await dbRun(
      c.env.DB,
      `INSERT INTO order_items (order_id, part_id, seller_id, title, price, quantity, subtotal)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [orderId, item.part_id, item.seller_id, item.title, item.price, item.quantity, item.subtotal]
    );
    await dbRun(
      c.env.DB,
      "UPDATE parts SET quantity = quantity - ? WHERE id = ?",
      [item.quantity, item.part_id]
    );
  }

  const order = await dbFirst(c.env.DB, "SELECT * FROM orders WHERE id = ?", [orderId]);
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
     VALUES (?, ?, ?, ?, ?, ?, 'approved')`,
    [body.part_id, buyerId, body.order_item_id ?? null, body.rating, body.body ?? null, is_verified ? 1 : 0]
  );

  const review = await dbFirst(c.env.DB, "SELECT * FROM reviews WHERE id = ?", [result.lastRowId]);
  return created(c, review);
});
