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
sql.exec(`
  INSERT INTO users (id,name,email,password_hash,role) VALUES (1,'Buyer','b@x','x','buyer'),(2,'S1','s1@x','x','seller'),(3,'S2','s2@x','x','seller'),(9,'Admin','a@x','x','admin');
  INSERT INTO sellers (id,user_id,name,slug,status) VALUES (1,2,'One','one','active'),(2,3,'Two','two','active');
  INSERT INTO categories (id,name,slug) VALUES (1,'Brakes','brakes');
  INSERT INTO parts (id,seller_id,category_id,slug,title,price,quantity,status) VALUES (1,1,1,'p1','Pads',5000,0,'active'),(2,2,1,'p2','Discs',9000,3,'active'),(3,1,1,'p3','Oil',1000,5,'active');
  INSERT INTO orders (id,reference,buyer_id,status,total) VALUES (1,'R-1',1,'pending',15000),(2,'R-2',1,'pending',1000);
  INSERT INTO order_addresses (order_id,full_name,phone,address_line1,city,country) VALUES (1,'Buyer B','0611','1 rue','Casablanca','MA');
  INSERT INTO order_items (id,order_id,part_id,seller_id,title,price,quantity,subtotal) VALUES (1,1,1,1,'Pads',5000,1,5000),(2,1,2,2,'Discs',9000,1,9000),(3,2,3,1,'Oil',1000,2,2000);
`);
const s1 = await tok({ user_id: 2, role: "seller", seller_id: 1 });
const s2 = await tok({ user_id: 3, role: "seller", seller_id: 2 });
const forged = await tok({ user_id: 3, role: "seller", seller_id: 1 });
const buyer = await tok({ user_id: 1, role: "buyer" });
const admin = await tok({ user_id: 9, role: "admin" });
const orderStatus = (id) => sql.prepare("select status, shipping_status, delivered_at from orders where id = ?").get(id);

let [st, b] = await call("GET", "/api/v1/marketplace/me/orders", s1);
check("list_own_subtotal", st === 200 && b.data.length === 2 && b.data.find((o) => o.id === 1).total === 5000 && b.data.find((o) => o.id === 1).status === "pending", b.data);
[st, b] = await call("GET", "/api/v1/marketplace/me/orders/1", s1);
check("detail_own_lines_only", st === 200 && b.data.items.length === 1 && b.data.items[0].title === "Pads" && b.data.has_other_sellers === true && b.data.buyer_phone === "0611", b.data);
check("detail_next", JSON.stringify(b.data.next_statuses) === '["confirmed","cancelled"]', b.data.next_statuses);
[st] = await call("GET", "/api/v1/marketplace/me/orders/2", s2);
check("other_seller_404", st === 404, st);
// A token claiming another store: the claim is ignored, the store comes
// from the account (user 3 = store 2), so only store 2's lines are shown.
[st, b] = await call("GET", "/api/v1/marketplace/me/orders/1", forged);
check("forged_claim_ignored", st === 200 && b.data.items.length === 1 && b.data.items[0].title === "Discs", [st, b.data?.items]);

[st, b] = await call("PATCH", "/api/v1/marketplace/me/orders/1/status", s1, { status: "shipped" });
check("skip_step_refused", st === 409, [st, b]);
[st, b] = await call("PATCH", "/api/v1/marketplace/me/orders/1/status", s1, { status: "confirmed" });
check("confirm_ok", st === 200 && b.data.status === "confirmed", [st, b]);
check("order_still_pending_other_seller", orderStatus(1).status === "pending", orderStatus(1));
[st] = await call("PATCH", "/api/v1/marketplace/me/orders/1/status", s2, { status: "confirmed" });
check("rollup_confirmed", orderStatus(1).status === "confirmed", orderStatus(1));
await call("PATCH", "/api/v1/marketplace/me/orders/1/status", s1, { status: "shipped" });
await call("PATCH", "/api/v1/marketplace/me/orders/1/status", s1, { status: "delivered" });
const line1 = sql.prepare("select status, delivered_at from order_items where id = 1").get();
check("line_delivered_at", line1.status === "delivered" && line1.delivered_at, line1);
check("order_waits_slowest", orderStatus(1).status === "confirmed" && !orderStatus(1).delivered_at, orderStatus(1));
// Buyer can rate the delivered line even though the order is not fully delivered.
[st, b] = await call("POST", "/api/v1/commerce/reviews", buyer, { part_id: 1, rating: 5 });
check("review_after_line_delivered", st === 201, [st, b]);
[st, b] = await call("POST", "/api/v1/commerce/reviews", buyer, { part_id: 2, rating: 5 });
check("review_blocked_line_not_delivered", st === 403, st);
// Seller 2 cancels: note required, stock restored, order delivered (only line 1 left).
[st, b] = await call("PATCH", "/api/v1/marketplace/me/orders/1/status", s2, { status: "cancelled" });
check("cancel_needs_note", st === 400, st);
[st, b] = await call("PATCH", "/api/v1/marketplace/me/orders/1/status", s2, { status: "cancelled", note: "Out of stock" });
check("cancel_ok", st === 200 && b.data.status === "cancelled", [st, b]);
check("stock_restored", sql.prepare("select quantity from parts where id = 2").get().quantity === 4);
check("order_delivered_after_cancel", orderStatus(1).status === "delivered" && orderStatus(1).delivered_at && orderStatus(1).shipping_status === "delivered", orderStatus(1));
[st] = await call("PATCH", "/api/v1/marketplace/me/orders/1/status", s1, { status: "cancelled", note: "x" });
check("no_cancel_after_delivery", st === 409, st);
const ev = sql.prepare("select event, created_by, note from order_events where order_id = 1 order by id").all();
check("events_logged", ev.length === 5 && ev[4].event === "cancelled" && ev[4].created_by === "seller:2" && ev[4].note === "Out of stock", ev);
[st, b] = await call("GET", "/api/v1/marketplace/me/orders/1", s1);
check("detail_events", b.data.events.length === 5, b.data.events);
// Admin override cancels order 2 and restocks.
[st] = await call("PATCH", "/api/v1/admin/orders/2/status", admin, { status: "cancelled" });
check("admin_cancel", st === 200 && orderStatus(2).status === "cancelled" && sql.prepare("select quantity from parts where id = 3").get().quantity === 7, [st, orderStatus(2)]);
// Buyer order page shows line status.
[st, b] = await call("GET", "/api/v1/commerce/orders/R-1", buyer);
check("buyer_sees_line_status", b.data.items.map((i) => i.status).join() === "delivered,cancelled", b.data.items);

let bad = 0;
for (const [k, v] of Object.entries(results)) { console.log(v.startsWith("PASS") ? "PASS" : "FAIL", k, v.startsWith("PASS") ? "" : v); if (!v.startsWith("PASS")) bad++; }
console.log(bad ? `${bad} failed` : `all ${Object.keys(results).length} passed`);
const o1 = sql.prepare("select subtotal, total from orders where id = 1").get();
const o2 = sql.prepare("select subtotal, total from orders where id = 2").get();
console.log(o1.subtotal === 5000 && o1.total === 5000 + Number(sql.prepare("select shipping_fee f from orders where id=1").get().f) ? "PASS totals_exclude_cancelled" : "FAIL totals_exclude_cancelled " + JSON.stringify(o1));
console.log(o2.subtotal === 0 && o2.total === 0 ? "PASS cancelled_order_zero" : "FAIL cancelled_order_zero " + JSON.stringify(o2));
