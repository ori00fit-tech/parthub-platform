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
  INSERT INTO users (id,name,email,password_hash,role) VALUES (1,'Buyer','b@x','x','buyer'),(4,'Other','o@x','x','buyer'),(2,'S1','s1@x','x','seller'),(3,'S2','s2@x','x','seller'),(9,'Admin','a@x','x','admin');
  INSERT INTO sellers (id,user_id,name,slug,status) VALUES (1,2,'One','one','active'),(2,3,'Two','two','active');
  INSERT INTO categories (id,name,slug) VALUES (1,'Brakes','brakes');
  INSERT INTO parts (id,seller_id,category_id,slug,title,price,quantity,status) VALUES (1,1,1,'p1','Pads',5000,1,'active'),(2,2,1,'p2','Discs',9000,3,'active'),(3,1,1,'p3','Oil',1000,5,'active');
  INSERT INTO orders (id,reference,buyer_id,status,total) VALUES (1,'R-1',1,'delivered',15000);
  INSERT INTO order_items (id,order_id,part_id,seller_id,title,price,quantity,subtotal,status,delivered_at) VALUES
    (1,1,1,1,'Pads',5000,1,5000,'delivered',datetime('now','-2 days')),
    (2,1,2,2,'Discs',9000,1,9000,'delivered',datetime('now','-9 days')),
    (3,1,3,1,'Oil',1000,1,1000,'shipped',NULL);
`);
const buyer = await tok({ user_id: 1, role: "buyer" });
const other = await tok({ user_id: 4, role: "buyer" });
const s1 = await tok({ user_id: 2, role: "seller", seller_id: 1 });
const s2 = await tok({ user_id: 3, role: "seller", seller_id: 2 });
const admin = await tok({ user_id: 9, role: "admin" });
const issueRow = (id) => sql.prepare("select * from order_issues where id = ?").get(id);

let [st, b] = await call("GET", "/api/v1/commerce/orders/R-1", buyer);
const byId = Object.fromEntries(b.data.items.map((i) => [i.id, i]));
check("can_report_recent", byId[1].can_report === true && byId[1].report_until, byId[1]);
check("window_closed", byId[2].can_report === false, byId[2]);
check("not_delivered", byId[3].can_report === false, byId[3]);

const claim = { order_item_id: 1, reason: "not_compatible", details: "Does not fit my Clio 4 1.5 dCi" };
[st, b] = await call("POST", "/api/v1/commerce/orders/R-1/issues", buyer, { ...claim, reason: "nope" });
check("bad_reason", st === 400, st);
[st, b] = await call("POST", "/api/v1/commerce/orders/R-1/issues", buyer, { ...claim, details: "short" });
check("details_too_short", st === 400, st);
[st, b] = await call("POST", "/api/v1/commerce/orders/R-1/issues", other, claim);
check("other_buyer_404", st === 404, st);
[st, b] = await call("POST", "/api/v1/commerce/orders/R-1/issues", buyer, { ...claim, order_item_id: 2 });
check("expired_window_409", st === 409, [st, b]);
[st, b] = await call("POST", "/api/v1/commerce/orders/R-1/issues", buyer, { ...claim, order_item_id: 3 });
check("undelivered_409", st === 409, st);
[st, b] = await call("POST", "/api/v1/commerce/orders/R-1/issues", buyer, claim);
const id = b.data?.id;
check("created_open_seller_pays", st === 201 && b.data.status === "open" && b.data.return_paid_by === "seller" && b.data.can_escalate === false, [st, b]);
[st, b] = await call("POST", "/api/v1/commerce/orders/R-1/issues", buyer, claim);
check("duplicate_409", st === 409, st);
[st, b] = await call("POST", `/api/v1/commerce/issues/${id}/escalate`, buyer, {});
check("escalate_too_early", st === 409, st);

// Seller side
[st, b] = await call("GET", "/api/v1/marketplace/me/issues", s1);
check("seller_list", st === 200 && b.data.items.length === 1 && b.data.waiting === 1 && b.data.items[0].reference === "R-1" && b.data.items[0].part_title === "Pads", b.data);
[st, b] = await call("GET", "/api/v1/marketplace/me/issues", s2);
check("other_seller_empty", b.data.items.length === 0, b.data);
[st] = await call("POST", `/api/v1/marketplace/me/issues/${id}/respond`, s2, { decision: "accept" });
check("other_seller_cannot_answer", st === 404, st);
[st, b] = await call("GET", "/api/v1/marketplace/me/orders/1", s1);
check("issue_in_seller_order", b.data.issues.length === 1, b.data.issues);
[st] = await call("POST", `/api/v1/marketplace/me/issues/${id}/respond`, s1, { decision: "refuse" });
check("refuse_needs_note", st === 400, st);
[st, b] = await call("POST", `/api/v1/marketplace/me/issues/${id}/respond`, s1, { decision: "refuse", note: "The listing says Clio 3 only" });
check("refused", st === 200 && b.data.status === "refused" && b.data.can_escalate === true, [st, b]);
[st] = await call("POST", `/api/v1/marketplace/me/issues/${id}/respond`, s1, { decision: "accept" });
check("answer_once", st === 409, st);

// Buyer escalates, admin decides for the buyer, seller refunds
[st, b] = await call("POST", `/api/v1/commerce/issues/${id}/escalate`, buyer, { note: "The listing said Clio 4" });
check("escalated", st === 200 && b.data.status === "escalated" && issueRow(id).escalated_at, [st, b]);
[st, b] = await call("GET", "/api/v1/admin/pending-counts", admin);
check("admin_count", b.data.issues === 1, b.data);
[st, b] = await call("GET", "/api/v1/admin/issues", admin);
check("admin_list", b.data.length === 1 && b.data[0].seller_name === "One" && b.pagination.total === 1, b);
[st] = await call("POST", `/api/v1/admin/issues/${id}/decide`, admin, { outcome: "buyer" });
check("decide_needs_note", st === 400, st);
[st] = await call("POST", `/api/v1/admin/issues/${id}/decide`, buyer, { outcome: "buyer", note: "x" });
check("decide_admin_only", st === 403 || st === 401, st);
[st, b] = await call("POST", `/api/v1/admin/issues/${id}/decide`, admin, { outcome: "buyer", note: "Listing showed Clio 4 (photo kept)" });
check("decided_buyer_accepted", st === 200 && b.data.status === "accepted" && b.data.admin_note.startsWith("Listing"), [st, b]);
[st, b] = await call("POST", `/api/v1/marketplace/me/issues/${id}/resolve`, s1, { note: "Refunded 50 MAD in cash" });
check("seller_refunded_closed", st === 200 && b.data.status === "closed" && b.data.outcome === "buyer", [st, b]);
[st] = await call("POST", `/api/v1/commerce/issues/${id}/withdraw`, buyer, {});
check("closed_cannot_withdraw", st === 409, st);
const ev = sql.prepare("select event, created_by from order_events where order_id = 1 order by id").all().map((e) => e.event + "/" + e.created_by.split(":")[0]).join(",");
check("history", ev === "issue_opened/buyer,issue_refused/seller,issue_escalated/buyer,issue_decided_buyer/admin,issue_refunded/seller", ev);
[st, b] = await call("GET", "/api/v1/commerce/orders/R-1", buyer);
const it1 = b.data.items.find((i) => i.id === 1);
check("buyer_sees_closed_issue", it1.issue.outcome === "buyer" && it1.can_report === false, it1);

// Withdraw then report again; seller can't resolve before accepting; admin rules for seller
sql.exec("UPDATE order_items SET delivered_at = datetime('now','-1 day') WHERE id = 3; UPDATE order_items SET status='delivered' WHERE id = 3;");
[st, b] = await call("POST", "/api/v1/commerce/orders/R-1/issues", buyer, { order_item_id: 3, reason: "changed_mind", details: "I found it cheaper elsewhere" });
const id2 = b.data.id;
check("buyer_pays_changed_mind", b.data.return_paid_by === "buyer", b.data);
[st] = await call("POST", `/api/v1/marketplace/me/issues/${id2}/resolve`, s1, {});
check("resolve_needs_accept", st === 409, st);
[st, b] = await call("POST", `/api/v1/commerce/issues/${id2}/withdraw`, buyer, {});
check("withdrawn", b.data.status === "closed" && b.data.outcome === "withdrawn", b.data);
[st, b] = await call("POST", "/api/v1/commerce/orders/R-1/issues", buyer, { order_item_id: 3, reason: "damaged", details: "The bottle leaked when opened" });
const id3 = b.data?.id;
check("report_again_after_withdraw", st === 201, [st, b]);
// Seller does not reply for 4 days → buyer can escalate
sql.exec(`UPDATE order_issues SET created_at = datetime('now','-4 days') WHERE id = ${id3}`);
[st, b] = await call("POST", `/api/v1/commerce/issues/${id3}/escalate`, buyer, {});
check("escalate_after_no_reply", st === 200 && b.data.status === "escalated", [st, b]);
[st, b] = await call("POST", `/api/v1/admin/issues/${id3}/decide`, admin, { outcome: "seller", note: "Photos show the seal intact" });
check("decided_seller_closed", b.data.status === "closed" && b.data.outcome === "seller", b.data);

let bad = 0;
for (const [k, v] of Object.entries(results)) { console.log(v.startsWith("PASS") ? "PASS" : "FAIL", k, v.startsWith("PASS") ? "" : v); if (!v.startsWith("PASS")) bad++; }
console.log(bad ? `${bad} failed` : `all ${Object.keys(results).length} passed`);
