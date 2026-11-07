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
  INSERT INTO users (id,name,email,password_hash,role) VALUES (1,'Youssef Benali','b@x','x','buyer'), (5,'Salma','s@x','x','buyer'), (2,'S1','s1@x','x','seller'), (9,'Admin','a@x','x','admin');
  INSERT INTO sellers (id,user_id,name,slug,status) VALUES (1,2,'Casse','casse','active');
  INSERT INTO categories (id,name,slug) VALUES (1,'Brakes','brakes');
  INSERT INTO parts (id,seller_id,category_id,slug,title,price,quantity,status) VALUES (1,1,1,'p1','Pads',5000,5,'active'), (2,1,1,'p2','Discs',9000,5,'active');
  INSERT INTO orders (id,reference,buyer_id,status,total) VALUES (1,'R-1',1,'delivered',5000), (2,'R-2',5,'shipped',5000), (3,'R-3',1,'delivered',9000);
  INSERT INTO order_items (id,order_id,part_id,seller_id,title,price,quantity,subtotal) VALUES (1,1,1,1,'Pads',5000,1,5000), (2,2,1,1,'Pads',5000,1,5000), (3,3,2,1,'Discs',9000,1,9000);
  UPDATE order_items SET status = (SELECT status FROM orders WHERE orders.id = order_items.order_id);
`);
const buyer = await tok({ user_id: 1, role: "buyer" });
const salma = await tok({ user_id: 5, role: "buyer" });
const admin = await tok({ user_id: 9, role: "admin" });

let [st, b] = await call("POST", "/api/v1/commerce/reviews", salma, { part_id: 1, rating: 5, body: "Top" });
check("not_delivered_refused", st === 403, [st, b]);
[st, b] = await call("POST", "/api/v1/commerce/reviews", buyer, { part_id: 1, rating: 7 });
check("bad_rating", st === 400, st);
[st, b] = await call("POST", "/api/v1/commerce/reviews", buyer, { part_id: 1, rating: 4.5 });
check("non_integer_rating", st === 400, st);
[st, b] = await call("POST", "/api/v1/commerce/reviews", buyer, { part_id: 1, rating: 4, body: "x".repeat(1500) });
check("review_created_pending", st === 201 && b.data.status === "pending" && b.data.body.length === 1000, [st, b.data?.status, b.data?.body?.length]);
check("verified_and_linked", sql.prepare("select is_verified_purchase v, order_item_id o from reviews where id=?").get(b.data.id).v === 1 && sql.prepare("select order_item_id o from reviews where id=?").get(b.data.id).o === 1);
const firstId = b.data.id;
[st, b] = await call("POST", "/api/v1/commerce/reviews", buyer, { part_id: 1, rating: 5 });
check("one_review_per_part", st === 409, st);
[st, b] = await call("GET", "/api/v1/catalog/parts/p1", null);
check("pending_not_shown", b.data.rating.count === 0 && b.data.reviews.length === 0 && b.data.rating.average === null, b.data.rating);
await call("PATCH", `/api/v1/admin/reviews/${firstId}/status`, admin, { status: "approved" });
[st, b] = await call("POST", "/api/v1/commerce/reviews", buyer, { part_id: 2, rating: 5, body: "Parfait" });
await call("PATCH", `/api/v1/admin/reviews/${b.data.id}/status`, admin, { status: "approved" });
[st, b] = await call("GET", "/api/v1/catalog/parts/p1", null);
check("part_rating", b.data.rating.count === 1 && b.data.rating.average === 4, b.data.rating);
check("seller_rating_on_part_page", b.data.seller_rating.count === 2 && b.data.seller_rating.average === 4.5, b.data.seller_rating);
check("review_author_short", b.data.reviews[0].author === "Youssef B." && b.data.reviews[0].verified === true, b.data.reviews[0]);
check("no_private_fields", !JSON.stringify(b.data.reviews).match(/buyer_id|email|order_item/), b.data.reviews);
[st, b] = await call("GET", "/api/v1/storefront/sellers/casse", null);
check("seller_profile_rating", st === 200 && b.data.rating.count === 2 && b.data.rating.average === 4.5 && b.data.reviews.length === 2 && b.data.reviews[0].part_title, b.data.rating);
[st, b] = await call("GET", "/api/v1/commerce/orders/R-1", buyer);
check("order_item_my_review", b.data.items[0].my_rating === 4 && b.data.items[0].my_review_status === "approved", b.data.items[0]);
[st, b] = await call("GET", "/api/v1/commerce/orders/R-2", salma);
check("order_item_no_review", b.data.items[0].my_rating === null, b.data.items[0]);
let bad = 0;
for (const [k, v] of Object.entries(results)) { console.log(v.startsWith("PASS") ? "PASS" : "FAIL", k, v.startsWith("PASS") ? "" : v); if (!v.startsWith("PASS")) bad++; }
console.log(bad ? `${bad} failed` : `all ${Object.keys(results).length} passed`);
