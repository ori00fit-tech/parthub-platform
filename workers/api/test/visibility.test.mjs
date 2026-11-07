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
  INSERT INTO users (id,name,email,password_hash,role) VALUES (1,'B','b@x','x','buyer'),(2,'S1','s1@x','x','seller'),(3,'S2','s2@x','x','seller'),(4,'S3','s3@x','x','seller');
  INSERT INTO sellers (id,user_id,name,slug,status) VALUES (1,2,'Live','live','active'),(2,3,'Waiting','waiting','pending'),(3,4,'Stopped','stopped','suspended');
  INSERT INTO categories (id,name,slug) VALUES (1,'Brakes','brakes'),(2,'Filters','filters');
  INSERT INTO parts (id,seller_id,category_id,slug,title,price,quantity,status) VALUES
    (1,1,1,'live-pads','Brake pads live',5000,5,'active'),
    (2,2,1,'waiting-pads','Brake pads waiting store',4000,5,'active'),
    (3,3,1,'stopped-pads','Brake pads suspended store',3000,5,'active'),
    (4,1,2,'live-filter','Oil filter live',1000,5,'active'),
    (5,1,1,'live-discs','Brake discs live',9000,5,'active');
`);
const buyer = await tok({ user_id: 1, role: "buyer" });
let [st, b] = await call("GET", "/api/v1/catalog/parts", null);
let slugs = b.data.map((p) => p.slug);
check("catalog_list_active_stores_only", slugs.includes("live-pads") && !slugs.includes("waiting-pads") && !slugs.includes("stopped-pads"), slugs);
[st] = await call("GET", "/api/v1/catalog/parts/waiting-pads", null);
check("pending_store_part_404", st === 404, st);
[st] = await call("GET", "/api/v1/catalog/parts/stopped-pads", null);
check("suspended_store_part_404", st === 404, st);
[st, b] = await call("GET", "/api/v1/catalog/parts/live-pads", null);
const related = b.data.related_parts.map((p) => p.slug);
check("related_active_stores_same_category_first", st === 200 && !related.includes("waiting-pads") && !related.includes("stopped-pads") && related[0] === "live-discs", related);
[st, b] = await call("GET", "/api/v1/search?q=pads", null);
slugs = b.data.map((p) => p.slug);
check("search_active_stores_only", slugs.join() === "live-pads" && b.meta.pagination.total === 1, [slugs, b.meta]);
[st, b] = await call("GET", "/api/v1/search/suggestions?q=Brake", null);
const sug = JSON.stringify(b.data || b);
check("suggestions_active_stores_only", !sug.includes("waiting store") && !sug.includes("suspended store"), sug);
const addr = { full_name: "B", phone: "0611", address_line1: "x", city: "Casa", country: "MA" };
[st, b] = await call("POST", "/api/v1/commerce/orders", buyer, { items: [{ part_id: 2, quantity: 1 }], shipping_address: addr });
check("checkout_refuses_pending_store", st === 400 || st === 409 || st === 404, [st, b]);
[st, b] = await call("POST", "/api/v1/commerce/orders", buyer, { items: [{ part_id: 1, quantity: 1 }], shipping_address: addr });
check("checkout_active_store_ok", st === 201, [st, b]);

let bad = 0;
for (const [k, v] of Object.entries(results)) { console.log(v.startsWith("PASS") ? "PASS" : "FAIL", k, v.startsWith("PASS") ? "" : v); if (!v.startsWith("PASS")) bad++; }
console.log(bad ? `${bad} failed` : `all ${Object.keys(results).length} passed`);
