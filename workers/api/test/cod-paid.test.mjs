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
// Cash on delivery: a delivered order is paid; the admin's revenue is what
// was delivered (pilot of 13 Nov 2026: delivered order still "unpaid",
// dashboard revenue stuck at 0).
import { guardOff } from "./_guard-off.mjs";
guardOff(app, sql, env);
sql.exec(`
  INSERT INTO users (id,name,email,password_hash,role) VALUES (1,'A','a@x','x','admin'),(2,'S1','s1@x','x','seller'),(3,'S2','s2@x','x','seller'),(7,'B','b@x','x','buyer');
  INSERT INTO sellers (id,user_id,name,slug,status,location,delivery_enabled) VALUES (1,2,'One','one','active','Casablanca',1),(2,3,'Two','two','active','Fes',1);
  INSERT INTO categories (id,name,slug) VALUES (1,'Brakes','brakes');
  INSERT INTO parts (id,seller_id,category_id,title,slug,price,quantity,status) VALUES (1,1,1,'Pads','pads',9500,10,'active'),(2,2,1,'Disc','disc',40000,10,'active');
`);
const admin = await tok({ user_id: 1, role: "admin" });
const s1 = await tok({ user_id: 2, role: "seller", seller_id: 1 });
const s2 = await tok({ user_id: 3, role: "seller", seller_id: 2 });
const buyer = await tok({ user_id: 7, role: "buyer" });
const addr = { full_name: "B", phone: "0622222222", address_line1: "1 Rue", city: "Rabat", country: "MA" };
const order = async (items) => (await call("POST", "/api/v1/commerce/orders", buyer, { items, shipping_address: addr }))[1].data;
const step = (who, id, status, more = {}) => call("PATCH", `/api/v1/marketplace/me/orders/${id}/status`, who, { status, ...more });
const pay = (id) => sql.prepare("select payment_status, status from orders where id = ?").get(id);
const revenue = async () => (await call("GET", "/api/v1/admin/dashboard", admin))[1].data.total_revenue;

check("start_zero", (await revenue()) === 0);
// One seller, delivered: paid; revenue = line + that seller's fee.
const o1 = await order([{ part_id: 1, quantity: 1 }]);
check("new_unpaid", pay(o1.id).payment_status === "unpaid");
await step(s1, o1.id, "confirmed"); await step(s1, o1.id, "shipped"); await step(s1, o1.id, "delivered");
check("delivered_paid", pay(o1.id).payment_status === "paid" && pay(o1.id).status === "delivered", pay(o1.id));
check("revenue_counts_it", (await revenue()) === 9500 + 3500, await revenue());
// Two sellers, one delivered: not fully paid yet, but the delivered part counts.
const o2 = await order([{ part_id: 1, quantity: 1 }, { part_id: 2, quantity: 1 }]);
await step(s1, o2.id, "confirmed"); await step(s1, o2.id, "shipped"); await step(s1, o2.id, "delivered");
check("partial_still_unpaid", pay(o2.id).payment_status === "unpaid");
check("partial_revenue", (await revenue()) === 2 * (9500 + 3500), await revenue());
await step(s2, o2.id, "confirmed"); await step(s2, o2.id, "shipped"); await step(s2, o2.id, "delivered");
check("all_delivered_paid", pay(o2.id).payment_status === "paid");
// Cancelled: never paid, not in revenue.
const before = await revenue();
const o3 = await order([{ part_id: 2, quantity: 1 }]);
await step(s2, o3.id, "cancelled", { note: "Plus en stock" });
check("cancelled_unpaid", pay(o3.id).payment_status === "unpaid" && (await revenue()) === before);
// Refunded stays refunded.
sql.prepare("update orders set payment_status = 'refunded' where id = ?").run(o1.id);
await call("PATCH", `/api/v1/admin/orders/${o1.id}/status`, admin, { status: "delivered" });
check("refunded_kept", pay(o1.id).payment_status === "refunded");
// The migration marks old delivered orders.
sql.exec("update orders set payment_status = 'unpaid' where id = " + o2.id);
sql.exec(readFileSync(ROOT + "infra/d1/migrations/0036_cod_paid.sql", "utf8"));
check("migration_backfills", pay(o2.id).payment_status === "paid" && pay(o3.id).payment_status === "unpaid");

console.log(results);
const fails = Object.values(results).filter((v) => v !== "PASS").length;
console.log(fails ? `${fails} FAIL` : "ALL PASS");
process.exitCode = fails ? 1 : 0;
