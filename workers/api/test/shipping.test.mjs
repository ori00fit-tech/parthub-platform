const ROOT = new URL("../../../", import.meta.url).pathname; // repository root
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import app from "./.build/app.mjs";
import { signToken } from "./.build/auth.mjs";

const sql = new DatabaseSync(":memory:");
sql.exec(readFileSync(ROOT + "infra/d1/schema.sql", "utf8"));
// The Morocco layer migration adds seller_type, used by the buyer offer view.

function stmt(q) {
  let args = [];
  const s = {
    bind(...a) { args = a; return s; },
    async first() { return sql.prepare(q).get(...args) ?? null; },
    async all() { return { results: sql.prepare(q).all(...args) }; },
    async run() { const r = sql.prepare(q).run(...args); return { meta: { last_row_id: Number(r.lastInsertRowid), changes: r.changes } }; },
    _exec() { const r = sql.prepare(q).run(...args); return { meta: { changes: r.changes } }; },
  };
  return s;
}
const DB = {
  prepare: stmt,
  async batch(list) {
    sql.exec("BEGIN");
    try { const out = list.map((s) => s._exec()); sql.exec("COMMIT"); return out; }
    catch (e) { sql.exec("ROLLBACK"); throw e; }
  },
};
const env = { DB, JWT_SECRET: "s" };
import { guardOff } from "./_guard-off.mjs";
guardOff(app, sql, env);
const tok = async (p) => "Bearer " + (await signToken(p, "s"));
const call = async (m, u, auth, body) => {
  const r = await app.request(u, {
    method: m,
    headers: { "Content-Type": "application/json", ...(auth ? { Authorization: auth } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  }, env);
  return [r.status, await r.json()];
};
const results = {};
const check = (name, cond, extra = "") => { results[name] = cond ? "PASS" : `FAIL ${JSON.stringify(extra)}`; };
// Delivery fees per seller and shipments (utils/shipping.ts, migrations/0022).
sql.exec(`
  INSERT INTO users (id,name,email,password_hash,role) VALUES (2,'S1','s1@x','x','seller'),(3,'S2','s2@x','x','seller'),(7,'Buyer','b@x','x','buyer');
  INSERT INTO sellers (id,user_id,name,slug,status,location,delivery_enabled,pickup_enabled,pickup_address,delivery_fee_local,delivery_fee_national) VALUES
    (1,2,'Casa Shop','casa','active','Casablanca, Hay Hassani',1,1,'12 Rue X, Hay Hassani',2000,4500),
    (2,3,'Rabat Shop','rabat','active','Rabat',1,0,NULL,NULL,NULL);
  INSERT INTO categories (id,name,slug) VALUES (1,'Brakes','brakes');
  INSERT INTO parts (id,seller_id,category_id,title,slug,price,quantity,status) VALUES (1,1,1,'Pads','pads',30000,9,'active'),(2,2,1,'Discs','discs',50000,9,'active');
`);
const buyer = await tok({ user_id: 7, role: "buyer" });
const s1 = await tok({ user_id: 2, role: "seller", seller_id: 1 });
const s2 = await tok({ user_id: 3, role: "seller", seller_id: 2 });
const g = (r, id) => r.data.groups.find((x) => x.seller_id === id);

// Fees per city (aliases: "casa", Arabic name).
for (const [city, f1, f2] of [["Casa", 2000, 3500], ["الدار البيضاء", 2000, 3500], ["casablanca", 2000, 3500], ["Rabat", 4500, 3500], ["", 4500, 3500]]) {
  const [, r] = await call("GET", `/api/v1/commerce/fulfillment-options?parts=1,2&city=${encodeURIComponent(city)}`);
  check(`fee_${city || "none"}`, g(r, 1).delivery_fee === f1 && g(r, 2).delivery_fee === f2, [g(r, 1).delivery_fee, g(r, 2).delivery_fee]);
}

// Both delivered to Casablanca: each seller's own fee.
const addr = { full_name: "Ali", phone: "0611", address_line1: "1 Rue Y", city: "الدار البيضاء", country: "MA" };
let [st, r] = await call("POST", "/api/v1/commerce/orders", buyer, { items: [{ part_id: 1, quantity: 1 }, { part_id: 2, quantity: 1 }], shipping_address: addr });
check("order_fees", st === 201 && r.data.shipping_fee === 5500 && r.data.total === 85500, [st, r.data]);
const ref = r.data.reference, oid = r.data.id;
[st, r] = await call("GET", `/api/v1/commerce/orders/${ref}`, buyer);
const sh = (id) => r.data.shipments.find((x) => x.seller_id === id);
check("buyer_shipments", sh(1).fee === 2000 && sh(1).amount_due === 32000 && sh(2).fee === 3500 && sh(2).amount_due === 53500, r.data.shipments);
[st, r] = await call("GET", `/api/v1/marketplace/me/orders/${oid}`, s1);
check("seller_collects_own", r.data.amount_to_collect === 32000 && r.data.shipment.fee === 2000, [r.data.amount_to_collect, r.data.shipment]);

// Ship with carrier + tracking.
[st, r] = await call("PATCH", `/api/v1/marketplace/me/orders/${oid}/status`, s1, { status: "confirmed" });
[st, r] = await call("PATCH", `/api/v1/marketplace/me/orders/${oid}/status`, s1, { status: "shipped", carrier: "amana", tracking_number: " RR 123 456 MA " });
check("shipped_tracking", st === 200 && r.data.shipment.carrier === "amana" && r.data.shipment.tracking_number === "RR 123 456 MA" && r.data.shipment.shipped_at && r.data.shipment.fee === 2000, r.data.shipment);
[st, r] = await call("GET", `/api/v1/commerce/orders/${ref}`, buyer);
check("buyer_sees_tracking", sh(1).carrier === "amana" && sh(1).tracking_number === "RR 123 456 MA", r.data.shipments);

// Seller 2 cancels: their fee leaves the total.
[st] = await call("PATCH", `/api/v1/marketplace/me/orders/${oid}/status`, s2, { status: "cancelled", note: "Out of stock in store" });
const o = sql.prepare("select shipping_fee, total from orders where id = ?").get(oid);
check("cancel_drops_fee", st === 200 && o.shipping_fee === 2000 && o.total === 32000, o);

// Pickup for seller 1 + delivery for seller 2: only seller 2's fee.
[st, r] = await call("POST", "/api/v1/commerce/orders", buyer, { items: [{ part_id: 1, quantity: 1 }, { part_id: 2, quantity: 1 }], shipping_address: { ...addr, city: "Rabat" }, fulfillment: { 1: { method: "pickup" } } });
check("mixed_fee", st === 201 && r.data.shipping_fee === 3500, r.data);
const mixed = sql.prepare("select seller_id, method, fee from order_shipments where order_id = ? order by seller_id").all(r.data.id);
check("mixed_rows", mixed[0].method === "pickup" && mixed[0].fee === 0 && mixed[1].fee === 3500, mixed);

// Unknown carrier → stored as none, tracking kept.
const [, r3] = await call("POST", "/api/v1/commerce/orders", buyer, { items: [{ part_id: 1, quantity: 1 }], shipping_address: addr });
await call("PATCH", `/api/v1/marketplace/me/orders/${r3.data.id}/status`, s1, { status: "confirmed" });
[st, r] = await call("PATCH", `/api/v1/marketplace/me/orders/${r3.data.id}/status`, s1, { status: "shipped", carrier: "dhl<script>", tracking_number: "" });
check("bad_carrier", r.data.shipment.carrier === null && r.data.shipment.tracking_number === null, r.data.shipment);

// Re-sent "shipped" without carrier keeps the tracking number already saved
// (ON CONFLICT path: a fresh shipment row exists from checkout).
sql.exec(`UPDATE order_items SET status = 'confirmed' WHERE order_id = ${r3.data.id}`);
[st, r] = await call("PATCH", `/api/v1/marketplace/me/orders/${r3.data.id}/status`, s1, { status: "shipped", carrier: "sendit", tracking_number: "SD-9" });
sql.exec(`UPDATE order_items SET status = 'confirmed' WHERE order_id = ${r3.data.id}`);
[st, r] = await call("PATCH", `/api/v1/marketplace/me/orders/${r3.data.id}/status`, s1, { status: "shipped" });
check("tracking_kept", r.data.shipment.carrier === "sendit" && r.data.shipment.tracking_number === "SD-9", r.data.shipment);

// Delivery failed: a shipped order can be closed (reason required); stock
// comes back, the fee leaves the total, the event says why.
check("shipped_can_fail", r.data.next_statuses.includes("cancelled"), r.data.next_statuses);
const stockBefore = sql.prepare("select quantity from parts where id = 1").get().quantity;
[st] = await call("PATCH", `/api/v1/marketplace/me/orders/${r3.data.id}/status`, s1, { status: "cancelled" });
check("failed_needs_reason", st === 400, st);
[st, r] = await call("PATCH", `/api/v1/marketplace/me/orders/${r3.data.id}/status`, s1, { status: "cancelled", note: "Buyer refused the parcel" });
const fo = sql.prepare("select status, shipping_fee, total from orders where id = ?").get(r3.data.id);
const fev = sql.prepare("select event, note from order_events where order_id = ? order by id desc limit 1").get(r3.data.id);
check("delivery_failed", st === 200 && fo.status === "cancelled" && fo.total === 0 && fev.event === "delivery_failed" && fev.note === "Buyer refused the parcel", [st, fo, fev]);
check("failed_restocked", sql.prepare("select quantity from parts where id = 1").get().quantity === stockBefore + 1);
[st] = await call("PATCH", `/api/v1/marketplace/me/orders/${r3.data.id}/status`, s1, { status: "delivered" });
check("failed_is_final", st === 409, st);

// Order from before 0022 (no shipments, flat fee): shipping keeps its fee.
sql.exec(`INSERT INTO orders (id,buyer_id,reference,subtotal,shipping_fee,total,status) VALUES (90,7,'PH-OLD',30000,3500,33500,'confirmed');
  INSERT INTO order_items (order_id,part_id,seller_id,title,price,quantity,subtotal,status) VALUES (90,1,1,'Pads',30000,1,30000,'confirmed');`);
[st, r] = await call("PATCH", "/api/v1/marketplace/me/orders/90/status", s1, { status: "shipped", carrier: "ctm", tracking_number: "CTM1" });
const old = sql.prepare("select shipping_fee, total from orders where id = 90").get();
check("legacy_fee_kept", st === 200 && old.shipping_fee === 3500 && old.total === 33500 && r.data.shipment.fee === 3500, [old, r.data.shipment]);

// Settings.
[st, r] = await call("PUT", "/api/v1/marketplace/me/fulfillment", s2, { delivery_enabled: true, delivery_fee_local: "15", delivery_fee_national: "39,50" });
check("fees_saved", st === 200 && r.data.delivery_fee_local === 1500 && r.data.delivery_fee_national === 3950, r.data);
[st] = await call("PUT", "/api/v1/marketplace/me/fulfillment", s2, { delivery_enabled: true, delivery_fee_local: "-5" });
check("fee_invalid", st === 400, st);
[st, r] = await call("PUT", "/api/v1/marketplace/me/fulfillment", s2, { delivery_enabled: true, delivery_fee_local: "", delivery_fee_national: null });
check("fee_cleared", st === 200 && r.data.delivery_fee_local === null && r.data.delivery_fee_national === null, r.data);

console.log(results);
const fails = Object.values(results).filter((v) => v !== "PASS").length;
console.log(fails ? `${fails} FAIL` : "ALL PASS");
process.exitCode = fails ? 1 : 0;
