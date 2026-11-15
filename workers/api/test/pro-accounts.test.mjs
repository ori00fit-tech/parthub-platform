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
// Professional accounts and pro prices (utils/pro.ts, migrations/0040).
import { guardOff } from "./_guard-off.mjs";
guardOff(app, sql, env);
sql.exec(`
  INSERT INTO users (id,name,email,password_hash,role) VALUES (1,'A','a@x','x','admin'),(2,'S1','s1@x','x','seller'),(3,'S2','s2@x','x','seller'),(7,'Garage','g@x','x','buyer'),(8,'Plain','p@x','x','buyer');
  INSERT INTO sellers (id,user_id,name,slug,status,location,delivery_enabled) VALUES (1,2,'One','one','active','Casablanca',1),(2,3,'Two','two','active','Fes',1);
  INSERT INTO categories (id,name,slug) VALUES (1,'Brakes','brakes');
  INSERT INTO parts (id,seller_id,category_id,title,slug,price,quantity,status) VALUES (1,1,1,'Pads','pads',10000,50,'active'),(2,1,1,'Disc','disc',40000,50,'active'),(3,2,1,'Other','other',20000,50,'active');
`);
const admin = await tok({ user_id: 1, role: "admin" });
const s1 = await tok({ user_id: 2, role: "seller", seller_id: 1 });
const s2 = await tok({ user_id: 3, role: "seller", seller_id: 2 });
const garage = await tok({ user_id: 7, role: "buyer" });
const plain = await tok({ user_id: 8, role: "buyer" });

// 1. Asking: buyers only, checked fields, one request at a time.
check("seller_cannot_ask", (await call("POST", "/api/v1/pro/request", s1, { business_name: "X", city: "Fes" }))[0] === 403);
check("name_required", (await call("POST", "/api/v1/pro/request", garage, { city: "Rabat" }))[0] === 400);
check("ice_15_digits", (await call("POST", "/api/v1/pro/request", garage, { business_name: "Garage Atlas", city: "Rabat", ice: "123" }))[0] === 400);
let [st, b] = await call("POST", "/api/v1/pro/request", garage, { business_name: "Garage Atlas", city: "Rabat", ice: "001234567000089" });
check("request_sent", st === 200 && b.data?.status === "pending", [st, b]);
check("one_pending_at_a_time", (await call("POST", "/api/v1/pro/request", garage, { business_name: "Garage Atlas", city: "Rabat" }))[0] === 409);
[, b] = await call("GET", "/api/v1/pro/me", plain);
check("none_for_others", b.data?.status === null, b);

// 2. Review: admin only; a refusal needs a reason, the buyer sees it and can ask again.
check("buyer_cannot_review", (await call("PUT", "/api/v1/admin/pro-accounts/7", garage, { approve: true }))[0] === 403);
[, b] = await call("GET", "/api/v1/admin/pro-accounts", admin);
check("admin_lists_pending", b.data?.length === 1 && b.data[0].business_name === "Garage Atlas" && b.data[0].email === "g@x", b);
check("refusal_needs_reason", (await call("PUT", "/api/v1/admin/pro-accounts/7", admin, { approve: false }))[0] === 400);
await call("PUT", "/api/v1/admin/pro-accounts/7", admin, { approve: false, note: "ICE introuvable" });
[, b] = await call("GET", "/api/v1/pro/me", garage);
check("buyer_sees_reason", b.data?.status === "rejected" && b.data.note === "ICE introuvable", b);
[st] = await call("POST", "/api/v1/pro/request", garage, { business_name: "Garage Atlas SARL", city: "Rabat", ice: "001234567000089" });
check("ask_again_after_refusal", st === 200);
[st] = await call("PUT", "/api/v1/admin/pro-accounts/7", admin, { approve: true });
[, b] = await call("GET", "/api/v1/pro/me", garage);
check("approved", st === 200 && b.data?.status === "approved" && b.data.note === null, b);

// 3. The seller's pro price: below the price, own parts only, null removes it.
check("pro_price_below_price", (await call("PUT", "/api/v1/marketplace/me/parts/1/pro-price", s1, { pro_price: 10000 }))[0] === 400);
check("pro_price_positive", (await call("PUT", "/api/v1/marketplace/me/parts/1/pro-price", s1, { pro_price: -5 }))[0] === 400);
check("not_others_part", (await call("PUT", "/api/v1/marketplace/me/parts/1/pro-price", s2, { pro_price: 8000 }))[0] === 404);
[st] = await call("PUT", "/api/v1/marketplace/me/parts/1/pro-price", s1, { pro_price: 8500 });
await call("PUT", "/api/v1/marketplace/me/parts/2/pro-price", s1, { pro_price: 35000 });
check("pro_price_set", st === 200 && sql.prepare("select pro_price from parts where id = 1").get().pro_price === 8500);
[, b] = await call("GET", "/api/v1/marketplace/me/parts/1", s1);
check("seller_sees_own_pro_price", b.data?.pro_price === 8500, b.data);

// 4. Who sees what: the amount only for the approved pro.
const view = async (auth) => {
  const [, list] = await call("GET", "/api/v1/catalog/parts", auth);
  const [, one] = await call("GET", "/api/v1/catalog/parts/pads", auth);
  const [, found] = await call("GET", "/api/v1/search?q=pads", auth);
  const pads = list.data.find((p) => p.id === 1);
  const hit = (found.data || []).find((p) => p.id === 1);
  return { pads, one: one.data, hit };
};
let v = await view(null);
check("anonymous_flag_only", v.pads.has_pro_price === 1 && !("pro_price" in v.pads) && v.one.has_pro_price === 1 && !("pro_price" in v.one) && !("pro_price" in v.hit), v.pads);
check("related_parts_no_leak", !JSON.stringify(v.one.related_parts).includes("35000") && v.one.related_parts.every((p) => !("pro_price" in p)), v.one.related_parts);
v = await view(plain);
check("plain_buyer_flag_only", !("pro_price" in v.pads) && !("pro_price" in v.one), v.pads);
v = await view(s1);
check("seller_public_view_no_amount", !("pro_price" in v.pads), v.pads);
v = await view(garage);
check("pro_sees_amount", v.pads.pro_price === 8500 && v.one.pro_price === 8500 && v.hit?.pro_price === 8500, [v.pads, v.hit]);
const other = (await call("GET", "/api/v1/catalog/parts", garage))[1].data.find((p) => p.id === 3);
check("no_pro_price_no_field", other.has_pro_price === 0 && !("pro_price" in other), other);

// 5. Checkout: the pro pays the pro price, the server decides (not the client).
const addr = { full_name: "G", phone: "0622222222", address_line1: "1 Rue", city: "Rabat", country: "MA" };
const order = async (auth, items) => (await call("POST", "/api/v1/commerce/orders", auth, { items, shipping_address: addr }))[1].data;
let o = await order(garage, [{ part_id: 1, quantity: 2, price: 1 }, { part_id: 3, quantity: 1 }]);
let lines = sql.prepare("select part_id, price, subtotal from order_items where order_id = (select id from orders where reference = ?) order by part_id").all(o.reference);
check("pro_pays_pro_price", lines[0].price === 8500 && lines[0].subtotal === 17000 && lines[1].price === 20000, lines);
check("order_subtotal_pro", sql.prepare("select subtotal from orders where reference = ?").get(o.reference).subtotal === 37000);
o = await order(plain, [{ part_id: 1, quantity: 2 }]);
lines = sql.prepare("select price from order_items where order_id = (select id from orders where reference = ?)").all(o.reference);
check("plain_pays_price", lines[0].price === 10000, lines);

// 6. A pro price above a later, lower price never applies.
sql.exec("update parts set price = 8000 where id = 1");
v = await view(garage);
check("stale_pro_price_hidden", v.pads.has_pro_price === 0 && !("pro_price" in v.pads), v.pads);
o = await order(garage, [{ part_id: 1, quantity: 1 }]);
check("stale_pro_price_not_charged", sql.prepare("select price from order_items where order_id = (select id from orders where reference = ?)").get(o.reference).price === 8000);
sql.exec("update parts set price = 10000 where id = 1");

// 7. Removing pro status (refused later) stops the pro price at once.
await call("PUT", "/api/v1/admin/pro-accounts/7", admin, { approve: false, note: "Plus en activité" });
v = await view(garage);
check("revoked_no_amount", !("pro_price" in v.pads), v.pads);
o = await order(garage, [{ part_id: 1, quantity: 1 }]);
check("revoked_pays_price", sql.prepare("select price from order_items where order_id = (select id from orders where reference = ?)").get(o.reference).price === 10000);

// 8. The seller removes the pro price.
await call("PUT", "/api/v1/marketplace/me/parts/1/pro-price", s1, { pro_price: null });
check("pro_price_removed", sql.prepare("select pro_price from parts where id = 1").get().pro_price === null);

console.log(results);
const fails = Object.values(results).filter((x) => x !== "PASS").length;
console.log(fails ? `${fails} FAIL` : "ALL PASS");
if (fails) process.exit(1);
