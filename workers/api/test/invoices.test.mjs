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
// Commission invoices and payments (utils/invoices.ts, migrations/0025),
// and the buyer's "I received it".
const ago = (days) => new Date(Date.now() - days * 86400000).toISOString().slice(0, 19).replace("T", " ");
const today = new Date().toISOString().slice(0, 10);
const D = ago(60), P = D.slice(0, 7); // a month that is over, windows closed
sql.exec(`
  INSERT INTO users (id,name,email,password_hash,role) VALUES (1,'Admin','a@x','x','admin'),(2,'S1','s1@x','x','seller'),(3,'S2','s2@x','x','seller'),(4,'S3','s3@x','x','seller'),(7,'B','b@x','x','buyer'),(8,'B2','b2@x','x','buyer');
  INSERT INTO sellers (id,user_id,name,slug,status) VALUES (1,2,'Shop One','one','active'),(2,3,'Shop Two','two','active'),(3,4,'Shop Three','three','active');
  INSERT INTO categories (id,name,slug) VALUES (1,'Brakes','brakes');
  INSERT INTO parts (id,seller_id,category_id,title,slug,price,quantity,status) VALUES (1,1,1,'P','p',1000,9,'active');
  INSERT INTO orders (id,buyer_id,reference,subtotal,total,status) VALUES (1,7,'PH-A',0,0,'delivered');
  INSERT INTO order_items (id,order_id,part_id,seller_id,title,price,quantity,subtotal,status,delivered_at) VALUES
    (1,1,1,1,'A',100000,1,100000,'delivered','${D}'),
    (2,1,1,1,'B',33333,1,33333,'delivered','${D}'),
    (3,1,1,1,'Claim',20000,1,20000,'delivered','${D}'),
    (4,1,1,2,'Other seller',80000,1,80000,'delivered','${D}'),
    (5,1,1,3,'Third seller',40000,1,40000,'delivered','${D}');
  INSERT INTO order_issues (id,order_id,order_item_id,buyer_id,seller_id,reason,details,status) VALUES (9,1,3,7,1,'damaged','x','open');
  UPDATE commission_rates SET rate_bps = 500 WHERE id = 1;
`);
const admin = await tok({ user_id: 1, role: "admin" });
const s1 = await tok({ user_id: 2, role: "seller", seller_id: 1 });
const s2 = await tok({ user_id: 3, role: "seller", seller_id: 2 });
const b1 = await tok({ user_id: 7, role: "buyer" });
const b2 = await tok({ user_id: 8, role: "buyer" });
const status = (id) => sql.prepare("select status, invoice_id from commissions where order_item_id = ?").get(id);

let [st, r] = await call("GET", "/api/v1/admin/invoices", s1);
check("admin_only", st === 403, st);
[st, r] = await call("GET", `/api/v1/admin/invoices/draft?month=${P}`, admin);
const d1 = r.data.sellers.find((x) => x.seller_id === 1);
check("draft", st === 200 && d1.month_closed && d1.pending_lines === 1 && d1.lines === 2 && d1.amount === 5000 + 1667, d1);
[st, r] = await call("POST", "/api/v1/admin/invoices", admin, { seller_id: 1, month: P });
check("pending_blocks", st === 409 && /not final/.test(r.error || JSON.stringify(r)), [st, r]);
sql.exec("UPDATE order_issues SET status = 'closed', outcome = 'seller', closed_at = datetime('now') WHERE id = 9");
[st, r] = await call("POST", "/api/v1/admin/invoices", admin, { seller_id: 1, month: P, note: "first" });
const inv1 = r.data;
check("issued", st === 200 && inv1.amount === 5000 + 1667 + 1000 && /^PH-C-\d{4}-\d{2}-0001-1$/.test(inv1.number), [st, r]);
check("lines_invoiced", [1, 2, 3].every((id) => status(id).status === "invoiced" && status(id).invoice_id === inv1.id), [1, 2, 3].map(status));
[st] = await call("POST", "/api/v1/admin/invoices", admin, { seller_id: 1, month: P });
check("no_double_invoice", st === 409, st);
[st] = await call("POST", "/api/v1/admin/invoices", admin, { seller_id: 1, month: today.slice(0, 7) });
check("month_open", st === 409, st);
const c1 = sql.prepare("select id from commissions where order_item_id = 1").get().id;
[st] = await call("POST", `/api/v1/admin/commissions/${c1}/waive`, admin, { note: "late" });
check("invoiced_not_waivable", st === 409, st);

// Payments.
[st] = await call("POST", `/api/v1/admin/invoices/${inv1.id}/payments`, admin, { amount: "100", paid_on: today });
check("overpay_refused", st === 409, st);
[st] = await call("POST", `/api/v1/admin/invoices/${inv1.id}/payments`, admin, { amount: "10", paid_on: "2999-01-01" });
check("future_date_refused", st === 400, st);
[st] = await call("POST", `/api/v1/admin/invoices/${inv1.id}/payments`, admin, { amount: "10", paid_on: today, method: "crypto" });
check("bad_method", st === 400, st);
[st, r] = await call("POST", `/api/v1/admin/invoices/${inv1.id}/payments`, admin, { amount: "50", paid_on: today, reference: "VIR-1" });
check("partial_payment", st === 200 && r.data.balance === 7667 - 5000 && r.data.status === "issued", r);
[st, r] = await call("GET", "/api/v1/marketplace/me/invoices", s1);
const mine = r.data.invoices[0];
check("seller_sees_balance", st === 200 && r.data.invoices.length === 1 && mine.paid === 5000 && mine.balance === 2667 && mine.payments[0].reference === "VIR-1" && mine.note === undefined, r.data);
[st, r] = await call("GET", "/api/v1/marketplace/me/invoices", s2);
check("seller_private", r.data.invoices.length === 0, r.data);
[st, r] = await call("POST", `/api/v1/admin/invoices/${inv1.id}/payments`, admin, { amount: "26,67", paid_on: today, method: "cash" });
check("fully_paid", st === 200 && r.data.balance === 0 && r.data.status === "paid", r);
check("lines_paid", [1, 2, 3].every((id) => status(id).status === "paid"), [1, 2, 3].map(status));
[st] = await call("POST", `/api/v1/admin/invoices/${inv1.id}/payments`, admin, { amount: "1", paid_on: today });
check("paid_closed", st === 409, st);
[st] = await call("POST", `/api/v1/admin/invoices/${inv1.id}/cancel`, admin, { note: "x" });
check("paid_not_cancellable", st === 409, st);

// Cancel and reissue.
[st, r] = await call("POST", "/api/v1/admin/invoices", admin, { seller_id: 2, month: P });
const inv2 = r.data;
[st] = await call("POST", `/api/v1/admin/invoices/${inv2.id}/cancel`, admin, {});
check("cancel_needs_reason", st === 400, st);
[st] = await call("POST", `/api/v1/admin/invoices/${inv2.id}/cancel`, admin, { note: "Wrong month" });
check("cancelled", st === 200 && status(4).status === "accrued" && status(4).invoice_id === null, status(4));
[st, r] = await call("POST", "/api/v1/admin/invoices", admin, { seller_id: 2, month: P });
check("reissued", st === 200 && r.data.number.endsWith("-2") && r.data.amount === 4000, r.data);

// Concurrent issue for one seller and month: only one live invoice.
await Promise.all([1, 2, 3].map(() => call("POST", "/api/v1/admin/invoices", admin, { seller_id: 3, month: P })));
check("concurrent_one_invoice", sql.prepare("select count(*) n from commission_invoices where seller_id = 3 and status != 'cancelled'").get().n === 1);

// Reconciliation and totals.
[st, r] = await call("GET", "/api/v1/admin/invoices", admin);
check("reconciled", r.data.invoices.every((i) => i.reconciled), r.data.invoices.map((i) => [i.number, i.amount, i.lines_amount]));
check("totals", r.data.totals.invoiced === 7667 + 4000 + 2000 && r.data.totals.paid === 7667 && r.data.totals.outstanding === 6000 && r.data.totals.to_invoice === 0, r.data.totals);
const evs = sql.prepare("select action from commission_events order by id").all().map((e) => e.action);
check("audited", ["invoice_issued", "payment_recorded", "invoice_cancelled"].every((a) => evs.includes(a)), evs);

// Buyer confirms receipt of a shipped delivery.
sql.exec(`INSERT INTO orders (id,buyer_id,reference,subtotal,total,status) VALUES (2,7,'PH-B',0,0,'shipped');
  INSERT INTO order_items (id,order_id,part_id,seller_id,title,price,quantity,subtotal,status,status_updated_at) VALUES
    (20,2,1,1,'On the way',1000,1,1000,'shipped','${ago(12)}');`);
[st, r] = await call("GET", "/api/v1/admin/revenue", admin);
check("stuck_shipments", r.data.stuck_shipments.lines === 1 && r.data.stuck_shipments.value === 1000, r.data.stuck_shipments);
[st] = await call("POST", "/api/v1/commerce/orders/PH-B/received", b2, {});
check("received_own_order_only", st === 404, st);
[st, r] = await call("POST", "/api/v1/commerce/orders/PH-B/received", b1, {});
const l20 = sql.prepare("select status, delivered_at, received_by_buyer_at from order_items where id = 20").get();
check("received", st === 200 && l20.status === "delivered" && l20.delivered_at && l20.received_by_buyer_at, [st, l20]);
check("order_delivered", sql.prepare("select status from orders where id = 2").get().status === "delivered");
[st] = await call("POST", "/api/v1/commerce/orders/PH-B/received", b1, {});
check("received_once", st === 409, st);

console.log(results);
const fails = Object.values(results).filter((v) => v !== "PASS").length;
console.log(fails ? `${fails} FAIL` : "ALL PASS");
process.exitCode = fails ? 1 : 0;
