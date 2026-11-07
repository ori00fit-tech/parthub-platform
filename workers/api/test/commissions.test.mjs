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

// Rates are scheduled (dated), never edited. API rules first.
const inDays = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
[st] = await call("POST", "/api/v1/admin/commission-rates", admin, { rate_percent: "25", effective_from: inDays(40) });
check("rate_max", st === 400, st);
[st] = await call("POST", "/api/v1/admin/commission-rates", s1, { rate_percent: "5", effective_from: inDays(40) });
check("rate_admin_only", st === 403, st);
[st, r] = await call("POST", "/api/v1/admin/commission-rates", admin, { rate_percent: "5", effective_from: inDays(1) });
check("notice_required", st === 422 && /30 days/.test(r.error || r.message || JSON.stringify(r)), [st, r]);
[st] = await call("POST", "/api/v1/admin/commission-rates", admin, { rate_percent: "0", effective_from: "2020-01-01" });
check("no_past_rate", st === 400, st);
[st, r] = await call("POST", "/api/v1/admin/commission-rates", admin, { rate_percent: "5", effective_from: inDays(31), note: "Launch" });
const scheduledId = r.data?.id;
check("rate_scheduled", st === 200 && r.data.rate_bps === 500 && r.data.effective_from === `${inDays(31)} 00:00:00`, [st, r]);
[st, r] = await call("GET", "/api/v1/admin/revenue", admin);
check("still_free_now", r.data.rate_bps === 0 && r.data.upcoming.length === 1 && r.data.upcoming[0].rate_bps === 500, r.data.upcoming);
[st, r] = await call("GET", "/api/v1/marketplace/me/statement", s1);
check("sellers_see_notice", r.data.upcoming.length === 1 && r.data.upcoming[0].rate_bps === 500 && r.data.notice_days === 30, r.data.upcoming);
[st] = await call("DELETE", "/api/v1/admin/commission-rates/1", admin);
check("in_force_not_cancellable", st === 409, st);
[st, r] = await call("DELETE", `/api/v1/admin/commission-rates/${scheduledId}`, admin);
check("future_cancelled", st === 200 && r.data.history.find((x) => x.id === scheduledId)?.cancelled_at, r.data);
const events = sql.prepare("select action from commission_events order by id").all().map((e) => e.action);
check("audit_trail", events.join(",") === "rate_scheduled,rate_cancelled", events);

// The rate of a sale = the one in force when its returns window ended,
// whenever the ledger is computed. Simulate a 5% rate that started
// yesterday (announced long ago).
const D7h = new Date(Date.now() - 7.5 * 86400000).toISOString().slice(0, 19).replace("T", " "); // window ended 12h ago
sql.exec(`INSERT INTO commission_rates (rate_bps, effective_from, note, created_at) VALUES (500, '${ago(1)}', 'test', '${ago(40)}')`);
sql.exec(`INSERT INTO order_items (id,order_id,part_id,seller_id,title,price,quantity,subtotal,status,delivered_at) VALUES
  (7,2,1,1,'Window ended before the rate',60000,1,60000,'delivered','${D9}'),
  (8,2,1,1,'Window ended after the rate',60000,1,60000,'delivered','${D7h}'),
  (9,2,1,1,'3 parts, 1 returned',30000,3,90000,'delivered','${D7h}')`);
sql.exec(`INSERT INTO order_issues (order_id,order_item_id,buyer_id,seller_id,reason,details,status,outcome,closed_at,refund_amount) VALUES
  (2,9,7,1,'damaged','one of three','closed','buyer','${ago(1)}',30000)`);
// the open claim (window ended 3 days ago, at 0%) is closed for the seller now
sql.exec("UPDATE order_issues SET status = 'closed', outcome = 'seller', closed_at = datetime('now') WHERE order_item_id = 4");
[st, r] = await call("GET", "/api/v1/admin/revenue", admin);
check("rate_now_5", r.data.rate_bps === 500, r.data.rate_bps);
check("no_retroactive_rate", row(7)?.status === "accrued" && row(7).rate_bps === 0 && row(7).amount === 0, row(7));
check("rate_on_window_end", row(8)?.rate_bps === 500 && row(8).amount === 3000, row(8));
check("claim_late_uses_window_rate", row(4)?.status === "accrued" && row(4).rate_bps === 0 && row(4).amount === 0, row(4));
check("partial_refund_base", row(9)?.status === "accrued" && row(9).base === 60000 && row(9).amount === 3000, row(9));
check("old_stays_0", row(1).amount === 0 && row(1).rate_bps === 0, row(1));
check("other_seller_0", row(6)?.amount === 0, row(6));
const P7 = D7h.slice(0, 7);
[st, r] = await call("GET", `/api/v1/admin/revenue?month=${P7}`, admin);
const sellerRow = r.data.sellers.find((x) => x.seller_id === 1);
check("per_seller", sellerRow && sellerRow.commission === 6000, r.data.sellers);

// Waive (admin only, audited, not twice).
const c8 = row(8).id;
[st] = await call("POST", `/api/v1/admin/commissions/${c8}/waive`, s1, { note: "x" });
check("waive_admin_only", st === 403, st);
[st] = await call("POST", `/api/v1/admin/commissions/${c8}/waive`, admin, {});
check("waive_needs_reason", st === 400, st);
[st] = await call("POST", `/api/v1/admin/commissions/${c8}/waive`, admin, { note: "Goodwill" });
const ev = sql.prepare("select * from commission_events where action = 'waived'").get();
check("waived", st === 200 && row(8).status === "waived" && row(8).amount === 0 && ev?.old_amount === 3000 && ev.actor === "admin:1", [st, row(8), ev]);
[st] = await call("POST", `/api/v1/admin/commissions/${c8}/waive`, admin, { note: "again" });
check("waive_once", st === 409, st);

// Partial refund through the seller's "Refund done" (in MAD).
sql.exec(`INSERT INTO order_items (id,order_id,part_id,seller_id,title,price,quantity,subtotal,status,delivered_at) VALUES (10,2,1,1,'Refund via API',25000,2,50000,'delivered','${D2}');
  INSERT INTO order_issues (id,order_id,order_item_id,buyer_id,seller_id,reason,details,status) VALUES (50,2,10,7,1,'damaged','one of two','accepted')`);
[st] = await call("POST", "/api/v1/marketplace/me/issues/50/resolve", s1, { refund_amount: "700" });
check("refund_max_line", st === 400, st);
[st, r] = await call("POST", "/api/v1/marketplace/me/issues/50/resolve", s1, { refund_amount: "250,00" });
const is50 = sql.prepare("select status, outcome, refund_amount from order_issues where id = 50").get();
check("refund_partial_saved", st === 200 && is50.status === "closed" && is50.outcome === "buyer" && is50.refund_amount === 25000, [st, is50]);

// Seller statement.
[st, r] = await call("GET", `/api/v1/marketplace/me/statement?month=${P10}`, s1);
const L = (title) => r.data.lines.find((l) => l.title === title);
check("statement_ok", st === 200 && r.data.rate_bps === 500 && r.data.months.includes(P10), [st, r.data?.rate_bps, r.data?.months]);
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
