const ROOT = new URL("../../../", import.meta.url).pathname; // repository root
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import app from "./.build/app.mjs";
import { signToken } from "./.build/auth.mjs";

const sql = new DatabaseSync(":memory:");
sql.exec(readFileSync(ROOT + "infra/d1/schema.sql", "utf8"));
// Approval needs a photo: these suites are about other rules, so every part gets one.
sql.exec("CREATE TRIGGER test_photo AFTER INSERT ON parts BEGIN INSERT INTO part_images (part_id, url, sort_order, is_featured) VALUES (NEW.id, 'https://img.test/p.jpg', 1, 1); END;");
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
  INSERT INTO users (id,name,email,password_hash,role,phone) VALUES (1,'Buyer','b@x','x','buyer','0612345678'), (2,'S1','s1@x','x','seller',NULL), (3,'S2','s2@x','x','seller',NULL), (4,'S3','s3@x','x','seller',NULL), (9,'Admin','a@x','x','admin',NULL);
  INSERT INTO sellers (id,user_id,name,slug,status,location) VALUES (1,2,'Casse Casa','casse-casa','active','Casablanca'), (2,3,'Auto Rabat','auto-rabat','pending','Rabat'), (3,4,'Fes Pieces','fes-pieces','pending','Fes');
  INSERT INTO categories (id,name,slug) VALUES (1,'Brakes','brakes'), (2,'Engine','engine');
  INSERT INTO parts (id,seller_id,category_id,slug,title,sku,price,quantity,status) VALUES
    (1,1,1,'p1','Brake pads Clio','BP-1',5000,3,'pending'), (2,1,2,'p2','Turbo K9K','TB-9',300000,1,'pending'),
    (3,2,1,'p3','Brake discs','BD-3',90000,0,'pending'), (4,1,1,'p4','Old pads','OP-4',2000,1,'active');
  INSERT INTO reviews (part_id,buyer_id,rating,body,status) VALUES (4,1,5,'ok','pending');
  INSERT INTO stock_alerts (part_id,user_id) VALUES (1,1);
`);
const admin = await tok({ user_id: 9, role: "admin" });
const seller = await tok({ user_id: 2, role: "seller", seller_id: 1 });

let [st, b] = await call("GET", "/api/v1/admin/pending-counts", admin);
check("pending_counts", st === 200 && b.data.sellers === 2 && b.data.parts === 3 && b.data.reviews === 1, b);
[st] = await call("GET", "/api/v1/admin/pending-counts", seller);
check("pending_counts_admin_only", st === 403, st);

[st, b] = await call("GET", "/api/v1/admin/parts", admin);
check("parts_default_pending", b.data.length === 3, b.data.length);
[st, b] = await call("GET", "/api/v1/admin/parts?status=all", admin);
check("parts_all", b.data.length === 4 && b.pagination.total === 4, b.pagination);
[st, b] = await call("GET", "/api/v1/admin/parts?status=all&seller_id=1&category_id=1", admin);
check("parts_seller_category", b.data.map((p) => p.id).sort().join() === "1,4" && b.data[0].category_name === "Brakes", b.data.map((p) => p.id));
[st, b] = await call("GET", "/api/v1/admin/parts?status=all&q=tb-9", admin);
check("parts_search_sku", b.data.length === 1 && b.data[0].id === 2, b.data);
[st, b] = await call("GET", "/api/v1/admin/parts?status=all&q=Rabat", admin);
check("parts_search_seller_name", b.data.length === 1 && b.data[0].id === 3, b.data);
[st, b] = await call("GET", "/api/v1/admin/sellers?q=fes", admin);
check("sellers_search", st === 200 && b.data.length === 1 && b.data[0].id === 3 && b.pagination.total === 1, b);

[st, b] = await call("POST", "/api/v1/admin/parts/bulk-status", admin, { ids: [1, 2], status: "rejected", reason: "short" });
check("bulk_reject_needs_reason", st === 400, [st, b]);
[st, b] = await call("POST", "/api/v1/admin/parts/bulk-status", admin, { ids: [], status: "active" });
check("bulk_needs_ids", st === 400, [st, b]);
[st, b] = await call("POST", "/api/v1/admin/parts/bulk-status", admin, { ids: Array.from({ length: 101 }, (_, i) => i + 1), status: "active" });
check("bulk_max_100", st === 400, st);
[st, b] = await call("POST", "/api/v1/admin/parts/bulk-status", admin, { ids: [1, 2, 999, 2], status: "active" });
await new Promise((r) => setTimeout(r, 30));
check("bulk_approve", st === 200 && b.data.updated.join() === "1,2" && b.data.missing.join() === "999" && sql.prepare("select count(*) n from parts where id in (1,2) and status='active'").get().n === 2, b);
check("bulk_approve_triggers_alerts", sql.prepare("select status from stock_alerts where part_id=1").get().status === "notified");
[st, b] = await call("POST", "/api/v1/admin/parts/bulk-status", admin, { ids: [3], status: "rejected", reason: "Photos don't show the actual part." });
check("bulk_reject_note", st === 200 && sql.prepare("select status, moderation_note from parts where id=3").get().moderation_note === "Photos don't show the actual part.", b);
[st, b] = await call("POST", "/api/v1/admin/parts/bulk-status", seller, { ids: [3], status: "active" });
check("bulk_admin_only", st === 403, st);

[st, b] = await call("POST", "/api/v1/admin/sellers/bulk-status", admin, { ids: [2, 3], status: "suspended", reason: "x" });
check("bulk_seller_needs_reason", st === 400, st);
[st, b] = await call("POST", "/api/v1/admin/sellers/bulk-status", admin, { ids: [2, 3], status: "active" });
check("bulk_seller_approve", st === 200 && sql.prepare("select count(*) n from sellers where status='active'").get().n === 3 && sql.prepare("select count(*) n from sellers where moderation_note is not null").get().n === 0, b);
[st, b] = await call("GET", "/api/v1/admin/pending-counts", admin);
check("counts_after", b.data.sellers === 0 && b.data.parts === 0, b.data);
// single-item routes still behave the same
[st, b] = await call("PATCH", "/api/v1/admin/parts/4/status", admin, { status: "rejected", reason: "no" });
check("single_reject_still_needs_reason", st === 400, st);
[st, b] = await call("PATCH", "/api/v1/admin/sellers/1/status", admin, { status: "suspended", reason: "Repeated buyer complaints about delivered parts." });
check("single_suspend_ok", st === 200 && sql.prepare("select status from sellers where id=1").get().status === "suspended", b);
let bad = 0;
for (const [k, v] of Object.entries(results)) { console.log(v.startsWith("PASS") ? "PASS" : "FAIL", k, v.startsWith("PASS") ? "" : v); if (!v.startsWith("PASS")) bad++; }
console.log(bad ? `${bad} failed` : `all ${Object.keys(results).length} passed`);
