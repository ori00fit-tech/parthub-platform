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
// The API itself refuses bad prices / stock (utils/part-values.ts), on all
// four routes that write parts; and cancelling puts stock back only once,
// even when two cancellations arrive at the same time (setLineStatus).
sql.exec(`
  INSERT INTO users (id,name,email,password_hash,role) VALUES (1,'A','a@x','x','admin'),(2,'S1','s1@x','x','seller'),(7,'B','b@x','x','buyer');
  INSERT INTO sellers (id,user_id,name,slug,status,location,delivery_enabled) VALUES (1,2,'Shop','shop','active','Casablanca',1);
  INSERT INTO categories (id,name,slug) VALUES (1,'Brakes','brakes');
  INSERT INTO parts (id,seller_id,category_id,title,slug,price,quantity,status) VALUES (10,1,1,'Pads','pads-10',25000,5,'active');
`);
const admin = await tok({ user_id: 1, role: "admin" });
const s1 = await tok({ user_id: 2, role: "seller", seller_id: 1 });
const buyer = await tok({ user_id: 7, role: "buyer" });
const base = { title: "Disque", category_id: 1, price: 35000, quantity: 3, condition: "new" };
let n = 0;
const routes = [
  ["POST", () => "/api/v1/marketplace/me/parts"],
  ["POST", () => "/api/v1/marketplace/parts"],
  ["PUT", () => "/api/v1/marketplace/me/parts/10"],
  ["PUT", () => "/api/v1/marketplace/parts/10"],
];
const bad = {
  negative_price: { price: -5000 },
  zero_price: { price: 0 },
  decimal_price: { price: 120.5 },
  text_price: { price: "abc" },
  huge_price: { price: 100_000_001 },
  negative_qty: { quantity: -1 },
  decimal_qty: { quantity: 1.5 },
  text_qty: { quantity: "lots" },
  negative_compare: { compare_price: -1 },
  zero_weight: { weight_kg: 0 },
};
for (const [method, path] of routes) {
  for (const [name, patch] of Object.entries(bad)) {
    const [st] = await call(method, path(), s1, { ...base, slug: `x-${++n}`, ...patch });
    check(`${method} ${path()} ${name}`, st === 400, st);
  }
  const [st] = await call(method, path(), s1, { ...base, slug: `ok-${++n}`, compare_price: "", weight_kg: "", quantity: 0 });
  check(`${method} ${path()} valid`, st === 200 || st === 201, st);
}
check("no_bad_rows", sql.prepare("select count(*) n from parts where price <= 0 or quantity < 0 or price != cast(price as integer) or quantity != cast(quantity as integer)").get().n === 0);

// Two cancellations of the same order at the same time: stock back once.
// Reads are slowed down so that both requests read "not cancelled yet"
// before either writes: the real race, made certain. Two requests on the
// same path (same number of reads) stay in step: seller + seller, then
// admin + admin.
const slow = (q) => {
  const inner = stmt(q);
  const s = { ...inner };
  s.bind = (...a) => { inner.bind(...a); return s; };
  s.first = async () => { const v = await inner.first(); await new Promise((r) => setTimeout(r, 30)); return v; };
  s.all = async () => { const v = await inner.all(); await new Promise((r) => setTimeout(r, 30)); return v; };
  return s;
};
const raceEnv = { ...env, DB: { ...DB, prepare: slow } };
const req = (m, u, auth, body) => app.request(u, { method: m, headers: { "Content-Type": "application/json", Authorization: auth }, body: JSON.stringify(body) }, raceEnv);
const order = async () => {
  sql.exec("UPDATE parts SET quantity = 5, price = 25000, status = 'active' WHERE id = 10");
  const [st, r] = await call("POST", "/api/v1/commerce/orders", buyer, {
    items: [{ part_id: 10, quantity: 2 }],
    shipping_address: { full_name: "Ali", phone: "0611", address_line1: "1 Rue Y", city: "Casablanca", country: "MA" },
  });
  return st === 201 && sql.prepare("select quantity from parts where id = 10").get().quantity === 3 ? r.data.id : null;
};
for (const [who, path, auth, body] of [
  ["seller", (id) => `/api/v1/marketplace/me/orders/${id}/status`, s1, { status: "cancelled", note: "Plus en stock" }],
  ["admin", (id) => `/api/v1/admin/orders/${id}/status`, admin, { status: "cancelled" }],
]) {
  const oid = await order();
  check(`${who}_order_reserved`, oid !== null);
  const rr = await Promise.all([req("PATCH", path(oid), auth, body), req("PATCH", path(oid), auth, body)]);
  const q = sql.prepare("select quantity from parts where id = 10").get().quantity;
  check(`${who}_restocked_once`, q === 5, { stock: q, statuses: rr.map((x) => x.status) });
  check(`${who}_line_cancelled`, sql.prepare("select status from order_items where order_id = ?").get(oid).status === "cancelled");
}

console.log(results);
const fails = Object.values(results).filter((v) => v !== "PASS").length;
console.log(fails ? `${fails} FAIL` : "ALL PASS");
process.exitCode = fails ? 1 : 0;
