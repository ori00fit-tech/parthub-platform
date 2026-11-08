const ROOT = new URL("../../../", import.meta.url).pathname; // repository root
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import app from "./.build/app.mjs";
import worker from "./.build/index.mjs";
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
// End to end, through the API only (plus the daily cron), the money cycle
// of one marketplace order: two sellers, delivery, buyer confirmation, a
// partial refund, the returns window, the commission at the rate in force
// when the window closed, the monthly invoice, payments, the statement.
// Time passing is simulated by moving timestamps back.
sql.exec(`
  INSERT INTO users (id,name,email,password_hash,role) VALUES (1,'Admin','a@x','x','admin'),(2,'S1','s1@x','x','seller'),(3,'S2','s2@x','x','seller'),(7,'Buyer','b@x','x','buyer');
  INSERT INTO sellers (id,user_id,name,slug,status,location,delivery_enabled,delivery_fee_local,delivery_fee_national) VALUES
    (1,2,'Casa Freins','casa','active','Casablanca',1,2000,4000),(2,3,'Rabat Filtres','rabat','active','Rabat',1,NULL,NULL);
  INSERT INTO categories (id,name,slug) VALUES (1,'Brakes','brakes');
  INSERT INTO parts (id,seller_id,category_id,title,slug,price,quantity,status) VALUES
    (1,1,1,'Plaquettes','plaquettes',25000,10,'active'),(2,2,1,'Filtre','filtre',4500,10,'active');
`);
const admin = await tok({ user_id: 1, role: "admin" });
const s1 = await tok({ user_id: 2, role: "seller", seller_id: 1 });
const s2 = await tok({ user_id: 3, role: "seller", seller_id: 2 });
const buyer = await tok({ user_id: 7, role: "buyer" });
const daysAgo = (d) => new Date(Date.now() - d * 86400000).toISOString().slice(0, 19).replace("T", " ");

// 1. Order: 3 brake pads from seller 1 (Casablanca, local fee), 2 filters from seller 2 (flat fee).
let [st, r] = await call("POST", "/api/v1/commerce/orders", buyer, {
  items: [{ part_id: 1, quantity: 3 }, { part_id: 2, quantity: 2 }],
  shipping_address: { full_name: "Ali", phone: "0611", address_line1: "1 Rue Y", city: "Casablanca", country: "MA" },
});
check("1_order", st === 201 && r.data.subtotal === 75000 + 9000 && r.data.shipping_fee === 2000 + 3500, [st, r.data]);
const ref = r.data.reference, oid = r.data.id;
check("1_stock_reserved", sql.prepare("select quantity from parts where id = 1").get().quantity === 7);

// 2. Seller 1 ships with tracking and marks delivered; seller 2 ships, the buyer confirms receipt.
for (const s of ["confirmed", "shipped", "delivered"]) {
  [st] = await call("PATCH", `/api/v1/marketplace/me/orders/${oid}/status`, s1, { status: s, ...(s === "shipped" ? { carrier: "amana", tracking_number: "RR1" } : {}) });
}
check("2_seller1_delivered", st === 200, st);
await call("PATCH", `/api/v1/marketplace/me/orders/${oid}/status`, s2, { status: "confirmed" });
await call("PATCH", `/api/v1/marketplace/me/orders/${oid}/status`, s2, { status: "shipped", carrier: "ctm" });
[st] = await call("POST", `/api/v1/commerce/orders/${ref}/received`, buyer, { seller_id: 2 });
const lines = sql.prepare("select id, seller_id, status, delivered_at, received_by_buyer_at from order_items where order_id = ? order by seller_id").all(oid);
check("2_all_delivered", st === 200 && lines.every((l) => l.status === "delivered" && l.delivered_at) && lines[1].received_by_buyer_at, lines);
check("2_order_delivered", sql.prepare("select status from orders where id = ?").get(oid).status === "delivered");

// 3. Within 7 days: 1 of the 3 pads is damaged; seller accepts and refunds 250 MAD.
[st, r] = await call("POST", `/api/v1/commerce/orders/${ref}/issues`, buyer, { order_item_id: lines[0].id, reason: "damaged", details: "Une plaquette sur trois est fissurée" });
const issueId = r.data?.id;
check("3_claim_opened", st === 201 || st === 200, [st, r]);
// While the claim is open, the line cannot be recorded even after the window.
[st] = await call("POST", `/api/v1/marketplace/me/issues/${issueId}/respond`, s1, { decision: "accept", note: "Renvoyez la plaquette" });
check("3_accepted", st === 200, st);
[st] = await call("POST", `/api/v1/marketplace/me/issues/${issueId}/resolve`, s1, { refund_amount: "250" });
check("3_partial_refund", st === 200 && sql.prepare("select refund_amount, outcome from order_issues where id = ?").get(issueId).refund_amount === 25000, st);

// 4. Before the window closes: nothing recorded, the statement says "pending".
await worker.scheduled({}, env, { waitUntil: (p) => p });
check("4_nothing_before_window", sql.prepare("select count(*) n from commissions").get().n === 0);

// 5. Time passes: delivered 40 days ago (last month, window long closed).
//    A 5% rate started 35 days ago (announced 70 days ago), i.e. before the
//    windows closed (33 days ago): it applies. An older 0% covers before.
const D = daysAgo(40), P = D.slice(0, 7);
sql.exec(`UPDATE order_items SET delivered_at = '${D}' WHERE order_id = ${oid}`);
sql.exec(`INSERT INTO commission_rates (rate_bps, effective_from, note, created_by, created_at) VALUES (500, '${daysAgo(35)}', 'launch', 1, '${daysAgo(70)}')`);
// The daily cron records the ledger (nobody opens a page).
let pending = [];
await worker.scheduled({}, env, { waitUntil: (p) => pending.push(p) });
await Promise.all(pending);
const cm = sql.prepare("select order_item_id, seller_id, base, rate_bps, amount, status, period from commissions order by seller_id").all();
check("5_cron_recorded", cm.length === 2, cm);
// Seller 1: 750 MAD of pads - 250 refunded = 500 kept → 5% = 25 MAD. Delivery fee excluded.
check("5_partial_base", cm[0]?.base === 50000 && cm[0].amount === 2500 && cm[0].rate_bps === 500 && cm[0].period === P, cm[0]);
check("5_seller2", cm[1]?.base === 9000 && cm[1].amount === 450, cm[1]);
// Opening the dashboard later, or changing the rate, changes nothing.
await call("GET", "/api/v1/admin/revenue", admin);
sql.exec(`INSERT INTO commission_rates (rate_bps, effective_from, created_by) VALUES (1000, '${daysAgo(1)}', 1)`);
await call("GET", `/api/v1/marketplace/me/statement?month=${P}`, s1);
check("5_stable", JSON.stringify(sql.prepare("select order_item_id, seller_id, base, rate_bps, amount, status, period from commissions order by seller_id").all()) === JSON.stringify(cm));

// 6. Seller statement for that month.
[st, r] = await call("GET", `/api/v1/marketplace/me/statement?month=${P}`, s1);
check("6_statement", st === 200 && r.data.totals.commission === 2500 && r.data.lines[0].base === 50000 && r.data.lines[0].status === "accrued", r.data);

// 7. Monthly invoice per seller, then payments.
[st, r] = await call("GET", `/api/v1/admin/invoices/draft?month=${P}`, admin);
check("7_draft", st === 200 && r.data.sellers.length === 2 && r.data.sellers.every((s) => s.month_closed && !s.pending_lines), r.data.sellers);
[st, r] = await call("POST", "/api/v1/admin/invoices", admin, { seller_id: 1, month: P });
const inv1 = r.data;
check("7_invoice_s1", st === 200 && inv1.amount === 2500, [st, r]);
[st, r] = await call("POST", "/api/v1/admin/invoices", admin, { seller_id: 2, month: P });
const inv2 = r.data;
const today = new Date().toISOString().slice(0, 10);
[st, r] = await call("POST", `/api/v1/admin/invoices/${inv1.id}/payments`, admin, { amount: "10", paid_on: today, reference: "VIR-001" });
check("7_partial_payment", st === 200 && r.data.balance === 1500 && r.data.status === "issued", r);
[st, r] = await call("POST", `/api/v1/admin/invoices/${inv1.id}/payments`, admin, { amount: "15", paid_on: today, reference: "VIR-002" });
check("7_paid", st === 200 && r.data.status === "paid" && r.data.balance === 0, r);

// 8. Reconciliation: ledger, invoices and payments agree.
[st, r] = await call("GET", "/api/v1/admin/invoices", admin);
const t = r.data.totals;
check("8_totals", t.invoiced === 2950 && t.paid === 2500 && t.outstanding === 450 && t.to_invoice === 0, t);
check("8_reconciled", r.data.invoices.every((i) => i.reconciled) && r.data.invoices.find((i) => i.id === inv2.id).balance === 450, r.data.invoices);
check("8_lines_paid", sql.prepare("select status from commissions where seller_id = 1").get().status === "paid" && sql.prepare("select status from commissions where seller_id = 2").get().status === "invoiced");
[st, r] = await call("GET", "/api/v1/marketplace/me/invoices", s2);
check("8_seller_sees_due", st === 200 && r.data.invoices.length === 1 && r.data.invoices[0].balance === 450 && r.data.totals.outstanding === 450, r.data);
const audit = sql.prepare("select action from commission_events order by id").all().map((e) => e.action);
const count = (a) => audit.filter((x) => x === a).length;
check("8_audit", count("invoice_issued") === 2 && count("payment_recorded") === 2, audit);

console.log(results);
const fails = Object.values(results).filter((v) => v !== "PASS").length;
console.log(fails ? `${fails} FAIL` : "ALL PASS");
process.exitCode = fails ? 1 : 0;
