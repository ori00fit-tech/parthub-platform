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
// Commission ledger (utils/commissions.ts, migrations/0023).
const ago = (days) => new Date(Date.now() - days * 86400000).toISOString().slice(0, 19).replace("T", " ");
const D10 = ago(10), D2 = ago(2), D9 = ago(9);
sql.exec(`
  INSERT INTO users (id,name,email,password_hash,role) VALUES (1,'Admin','a@x','x','admin'),(2,'S1','s1@x','x','seller'),(3,'S2','s2@x','x','seller'),(7,'B','b@x','x','buyer');
  INSERT INTO sellers (id,user_id,name,slug,status) VALUES (1,2,'Shop One','one','active'),(2,3,'Shop Two','two','active');
  INSERT INTO categories (id,name,slug) VALUES (1,'Brakes','brakes');
  INSERT INTO parts (id,seller_id,category_id,title,slug,price,quantity,status) VALUES (1,1,1,'P','p',1000,9,'active');
  INSERT INTO orders (id,buyer_id,reference,subtotal,total,status) VALUES (1,7,'PH-A',0,0,'delivered'),(2,7,'PH-B',0,0,'delivered');
  INSERT INTO order_items (id,order_id,part_id,seller_id,title,price,quantity,subtotal,status,delivered_at) VALUES
    (1,1,1,1,'Eligible',100000,1,100000,'delivered','${D10}'),
    (2,1,1,1,'Recent',50000,1,50000,'delivered','${D2}'),
    (3,1,1,1,'Returned',40000,1,40000,'delivered','${D10}'),
    (4,1,1,1,'Open claim',30000,1,30000,'delivered','${D10}'),
    (5,1,1,1,'Cancelled',20000,1,20000,'cancelled',NULL),
    (6,2,1,2,'Other seller',80000,1,80000,'delivered','${D10}');
  INSERT INTO order_issues (order_id,order_item_id,buyer_id,seller_id,reason,details,status,outcome,closed_at) VALUES
    (1,3,7,1,'damaged','x','closed','buyer','${D2}'),
    (1,4,7,1,'damaged','x','open',NULL,NULL);
`);
sql.exec("INSERT OR IGNORE INTO platform_settings (key, value) VALUES ('commission_rate_bps', '0')");
const admin = await tok({ user_id: 1, role: "admin" });
const s1 = await tok({ user_id: 2, role: "seller", seller_id: 1 });
const s2 = await tok({ user_id: 3, role: "seller", seller_id: 2 });
const row = (id) => sql.prepare("select * from commissions where order_item_id = ?").get(id);

// Free (0%): eligible lines are recorded at 0, the claim won by the buyer is waived.
let [st, r] = await call("GET", "/api/v1/admin/revenue", admin);
check("revenue_ok", st === 200 && r.data.rate_bps === 0 && r.data.months.length === 6, [st, r]);
check("eligible_recorded_0", row(1)?.status === "accrued" && row(1).amount === 0 && row(1).rate_bps === 0, row(1));
check("recent_not_yet", row(2) === undefined);
check("returned_waived", row(3)?.status === "waived" && row(3).amount === 0, row(3));
check("open_claim_waits", row(4) === undefined);
check("cancelled_never", row(5) === undefined);
const P10 = D10.slice(0, 7), P2 = D2.slice(0, 7);
const m = (p) => r.data.months.find((x) => x.period === p);
const gmvP10 = [1, 3, 4, 6].reduce((a, id) => a + [0, 100000, 0, 40000, 30000, 0, 80000][id], 0) + (P2 === P10 ? 50000 : 0);
check("gmv", m(P10).gmv === gmvP10, [m(P10), gmvP10]);

// 5%: applies to lines recorded from now on only.
[st] = await call("PUT", "/api/v1/admin/settings/commission", admin, { rate_percent: "25" });
check("rate_max", st === 400, st);
[st] = await call("PUT", "/api/v1/admin/settings/commission", s1, { rate_percent: "5" });
check("rate_admin_only", st === 403, st);
[st, r] = await call("PUT", "/api/v1/admin/settings/commission", admin, { rate_percent: "5" });
check("rate_set", st === 200 && r.data.rate_bps === 500, r);
sql.exec(`INSERT INTO order_items (id,order_id,part_id,seller_id,title,price,quantity,subtotal,status,delivered_at) VALUES (7,2,1,1,'Later',60000,1,60000,'delivered','${D9}')`);
// the open claim is closed for the seller: now eligible too
sql.exec("UPDATE order_issues SET status = 'closed', outcome = 'seller', closed_at = datetime('now') WHERE order_item_id = 4");
[st, r] = await call("GET", "/api/v1/admin/revenue", admin);
check("new_at_5pct", row(7)?.amount === 3000 && row(7).rate_bps === 500, row(7));
check("claim_for_seller_accrues", row(4)?.status === "accrued" && row(4).amount === 1500, row(4));
check("old_stays_0", row(1).amount === 0 && row(1).rate_bps === 0, row(1));
check("other_seller_0", row(6)?.amount === 0, row(6)); // recorded at 0% on the first pass
[st, r] = await call("GET", `/api/v1/admin/revenue?month=${P10}`, admin);
const sellerRow = r.data.sellers.find((x) => x.seller_id === 1);
check("per_seller", sellerRow && sellerRow.commission === (P10 === D9.slice(0, 7) ? 4500 : 1500), r.data.sellers);

// Seller statement.
[st, r] = await call("GET", `/api/v1/marketplace/me/statement?month=${P10}`, s1);
const L = (title) => r.data.lines.find((l) => l.title === title);
check("statement_ok", st === 200 && r.data.rate_bps === 500 && r.data.months.includes(P10), [st, r.data?.months]);
check("statement_statuses", L("Eligible").status === "accrued" && L("Returned").status === "waived" && (P2 !== P10 || L("Recent").status === "pending"), r.data.lines);
check("statement_private", !r.data.lines.some((l) => l.title === "Other seller") && !r.data.lines.some((l) => l.title === "Cancelled"));
[st, r] = await call("GET", "/api/v1/marketplace/me/statement?month=2020-01", s2);
check("empty_month", st === 200 && r.data.lines.length === 0 && r.data.totals.sales === 0, r.data);
[st] = await call("GET", "/api/v1/admin/revenue", s1);
check("revenue_admin_only", st === 403, st);
// Idempotent: a second pass records nothing new.
const before = sql.prepare("select count(*) n from commissions").get().n;
await call("GET", "/api/v1/admin/revenue", admin);
check("idempotent", sql.prepare("select count(*) n from commissions").get().n === before);

console.log(results);
const fails = Object.values(results).filter((v) => v !== "PASS").length;
console.log(fails ? `${fails} FAIL` : "ALL PASS");
process.exitCode = fails ? 1 : 0;
