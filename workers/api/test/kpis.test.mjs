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
// Investor KPIs (utils/kpis.ts) on a small known dataset over two months
// (P1 = last month, P0 = this month); every expected value worked out by hand.
const P0 = new Date().toISOString().slice(0, 7);
const d = new Date(); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() - 1);
const P1 = d.toISOString().slice(0, 7);
sql.exec(`
  INSERT INTO users (id,name,email,password_hash,role,created_at) VALUES
    (1,'Admin','a@x','x','admin','${P1}-01 09:00:00'),(2,'S1','s1@x','x','seller','${P1}-02 09:00:00'),(3,'S2','s2@x','x','seller','${P0}-01 00:10:00'),
    (7,'B1','b1@x','x','buyer','${P1}-05 09:00:00'),(8,'B2','b2@x','x','buyer','${P0}-01 00:20:00');
  INSERT INTO sellers (id,user_id,name,slug,status,created_at) VALUES (1,2,'One','one','active','${P1}-03 09:00:00'),(2,3,'Two','two','pending','${P0}-01 00:15:00');
  INSERT INTO categories (id,name,slug) VALUES (1,'Brakes','brakes');
  INSERT INTO parts (id,seller_id,category_id,title,slug,price,quantity,status,created_at) VALUES
    (1,1,1,'P1','p1',10000,5,'active','${P1}-04 09:00:00'),(2,1,1,'P2','p2',20000,5,'active','${P0}-01 00:30:00'),(3,2,1,'P3','p3',5000,5,'pending','${P0}-01 00:40:00');
  INSERT INTO part_images (part_id,url,alt_text,sort_order,is_featured) VALUES (1,'/a.jpg','a',1,1);
  INSERT INTO part_compatibility (part_id,make,model,year_start,year_end) VALUES (1,'Dacia','Logan',2012,2020);
  INSERT INTO orders (id,buyer_id,reference,subtotal,total,status,created_at) VALUES
    (1,7,'PH-1',0,0,'delivered','${P1}-10 08:00:00'),(2,7,'PH-2',0,0,'delivered','${P0}-01 01:00:00'),(3,8,'PH-3',0,0,'pending','${P0}-01 02:00:00');
  INSERT INTO order_items (id,order_id,part_id,seller_id,title,price,quantity,subtotal,status,delivered_at) VALUES
    (1,1,1,1,'l1',10000,1,10000,'delivered','${P1}-13 08:00:00'),
    (2,1,1,1,'l2',5000,1,5000,'cancelled',NULL),
    (3,2,2,1,'l3',20000,1,20000,'delivered','${P0}-01 03:24:00'),
    (4,2,1,1,'l4',10000,1,10000,'cancelled',NULL),
    (5,3,2,1,'l5',20000,1,20000,'pending',NULL);
  INSERT INTO order_shipments (order_id,seller_id,method,fee,shipped_at) VALUES (1,1,'delivery',0,NULL),(2,1,'delivery',0,'${P0}-01 02:00:00');
  INSERT INTO order_issues (order_id,order_item_id,buyer_id,seller_id,reason,details,status,outcome,closed_at) VALUES (2,3,7,1,'damaged','x','closed','buyer','${P0}-01 04:00:00');
  INSERT INTO part_requests (reference,buyer_id,part_name,make,model,year,phone,city,expires_at,created_at) VALUES ('REQ-1',8,'Alternateur','Dacia','Logan',2015,'0611','Rabat','2099-01-01 00:00:00','${P0}-01 05:00:00');
  INSERT INTO part_search_logs (query,results_count,created_at) VALUES ('logan',3,'${P0}-01 06:00:00'),('clio',1,'${P0}-01 06:01:00'),('zzz',0,'${P0}-01 06:02:00');
`);
const admin = await tok({ user_id: 1, role: "admin" });
const seller = await tok({ user_id: 2, role: "seller", seller_id: 1 });
let [st, r] = await call("GET", "/api/v1/admin/kpis?months=12", admin);
check("ok", st === 200 && r.data.months.length === 12 && r.data.last_period === P0, [st, r.error]);
const M = (p) => r.data.months.find((x) => x.period === p);
const a = M(P0), b = M(P1);
// Supply
check("sellers_new", a.sellers_new === 1 && b.sellers_new === 1, [a.sellers_new, b.sellers_new]);
check("parts_new", a.parts_new === 2 && b.parts_new === 1, [a.parts_new, b.parts_new]);
check("sellers_selling", a.sellers_selling === 1 && b.sellers_selling === 1);
// Demand
check("buyers_new", a.buyers_new === 1 && b.buyers_new === 1);
check("buyers_ordering_repeat", a.buyers_ordering === 2 && a.buyers_repeat === 1 && b.buyers_repeat === 0, [a.buyers_ordering, a.buyers_repeat, b.buyers_repeat]);
check("requests_searches", a.requests === 1 && a.searches === 3 && a.searches_no_result === 1, [a.requests, a.searches, a.searches_no_result]);
// Business
check("orders", a.orders === 2 && b.orders === 1);
check("gmv_placed", a.gmv_placed === 50000 && b.gmv_placed === 15000, [a.gmv_placed, b.gmv_placed]);
check("gmv_delivered", a.gmv_delivered === 20000 && b.gmv_delivered === 10000 && a.orders_delivered === 1 && a.aov_delivered === 20000, [a.gmv_delivered, b.gmv_delivered, a.aov_delivered]);
// Quality (cohort by order month)
check("cohort_this_month", a.lines_placed === 3 && a.lines_delivered === 1 && a.lines_failed_delivery === 1 && a.lines_cancelled === 0 && a.lines_open === 1 && a.delivery_success_rate === 0.5, a);
check("cohort_last_month", b.lines_placed === 2 && b.lines_delivered === 1 && b.lines_cancelled === 1 && b.lines_failed_delivery === 0 && b.delivery_success_rate === 0.5, b);
check("return_rate", a.returns_for_buyer === 1 && a.return_rate === 1 && b.return_rate === 0, [a.return_rate, b.return_rate]);
check("days_to_delivery", b.avg_days_to_delivery === 3 && a.avg_days_to_delivery === 0.1, [b.avg_days_to_delivery, a.avg_days_to_delivery]);
check("empty_months_zero", r.data.months.slice(0, 10).every((x) => x.orders === 0 && x.delivery_success_rate === null && x.aov_delivered === null));
// Today
const n = r.data.now;
check("now", n.sellers_active === 1 && n.sellers_pending === 1 && n.parts_active === 2 && n.parts_with_photo === 1 && n.parts_with_vehicles === 1 && n.buyers_total === 2 && n.buyers_ordered === 2 && n.buyers_repeat_total === 1 && n.orders_total === 3 && n.gmv_delivered_total === 30000, n);
// CSV and access
const res = await app.request("/api/v1/admin/kpis.csv?months=12", { headers: { Authorization: admin } }, env);
const csv = await res.text();
const rows = csv.trim().split("\n");
const head = rows[0].split(",");
const last = rows[rows.length - 1].split(",");
check("csv", res.status === 200 && /text\/csv/.test(res.headers.get("content-type")) && /attachment; filename="parthub-kpis-/.test(res.headers.get("content-disposition")) && rows.length === 13, [res.status, rows.length]);
check("csv_values", last[head.indexOf("month")] === P0 && last[head.indexOf("gmv_delivered_mad")] === "200.00" && last[head.indexOf("delivery_success_pct")] === "50.0" && last[head.indexOf("repeat_buyers")] === "1", last);
[st] = await call("GET", "/api/v1/admin/kpis", seller);
check("admin_only", st === 403, st);
check("admin_only_csv", (await app.request("/api/v1/admin/kpis.csv", {}, env)).status === 401);

console.log(results);
const fails = Object.values(results).filter((v) => v !== "PASS").length;
console.log(fails ? `${fails} FAIL` : "ALL PASS");
process.exitCode = fails ? 1 : 0;
