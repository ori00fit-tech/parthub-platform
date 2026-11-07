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
const env = { DB, JWT_SECRET: "s", WHATSAPP_ACCESS_TOKEN: "t", WHATSAPP_PHONE_NUMBER_ID: "p", STOREFRONT_URL: "https://shop.test" };
const sent = [];
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  if (String(url).includes("graph.facebook.com")) { sent.push(JSON.parse(init.body)); return new Response("{}", { status: 200 }); }
  return realFetch(url, init);
};
const flush = () => new Promise((r) => setTimeout(r, 50));
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
  INSERT INTO users (id,name,email,password_hash,role,phone) VALUES
    (1,'Buyer','b@x','x','buyer','0612345678'), (2,'S1','s1@x','x','seller',NULL), (5,'Other','o@x','x','buyer',NULL), (9,'Admin','a@x','x','admin',NULL);
  INSERT INTO sellers (id,user_id,name,slug,status,phone,location) VALUES (1,2,'Casse Casa','casse-casa','active','0611','Casablanca');
  INSERT INTO categories (id,name,slug) VALUES (1,'Engine','engine');
  INSERT INTO parts (id,seller_id,category_id,slug,title,price,quantity,status) VALUES
    (1,1,1,'p1','Clio engine',100000,0,'active'), (2,1,1,'p2','Pads',5000,5,'active'), (3,1,1,'p3','Turbo',300000,0,'active');
`);
const buyer = await tok({ user_id: 1, role: "buyer" });
const other = await tok({ user_id: 5, role: "buyer" });
const seller = await tok({ user_id: 2, role: "seller", seller_id: 1 });
const admin = await tok({ user_id: 9, role: "admin" });

let [st, b] = await call("POST", "/api/v1/stock-alerts", null, { part_id: 1 });
check("auth_required", st === 401, st);
[st, b] = await call("POST", "/api/v1/stock-alerts", buyer, { part_id: 2 });
check("in_stock_rejected", st === 409 && b.error === "This part is in stock", [st, b]);
[st, b] = await call("POST", "/api/v1/stock-alerts", buyer, { part_id: 999 });
check("missing_part_404", st === 404, st);
[st, b] = await call("POST", "/api/v1/stock-alerts", buyer, { part_id: 1 });
check("subscribe", st === 201 && b.data.status === "active", [st, b]);
[st, b] = await call("POST", "/api/v1/stock-alerts", buyer, { part_id: 1 });
check("subscribe_twice_one_row", st === 201 && sql.prepare("select count(*) n from stock_alerts where part_id=1").get().n === 1);
await call("POST", "/api/v1/stock-alerts", other, { part_id: 1 });
[st, b] = await call("GET", "/api/v1/stock-alerts/mine", buyer);
check("mine_lists", st === 200 && b.data.length === 1 && b.data[0].title === "Clio engine" && b.data[0].status === "active", b);
[st, b] = await call("GET", "/api/v1/stock-alerts/mine?part_id=3", buyer);
check("mine_filter", st === 200 && b.data.length === 0, b);

// Seller sees how many buyers are waiting (counts only).
[st, b] = await call("GET", "/api/v1/marketplace/me/parts", seller);
const p1 = (b.data || []).find((x) => x.id === 1);
check("seller_list_waiting_count", st === 200 && p1 && p1.waiting_count === 2 && (b.data.find((x) => x.id === 2) || {}).waiting_count === 0, [st, p1]);
[st, b] = await call("GET", "/api/v1/marketplace/me/parts/1", seller);
check("seller_detail_waiting_count", st === 200 && b.data.waiting_count === 2, [st, b]);
// Same buyer also waits for part 3: distinct buyers = 2, not 3.
await call("POST", "/api/v1/stock-alerts", buyer, { part_id: 3 });
[st, b] = await call("GET", "/api/v1/marketplace/dashboard", seller);
check("dashboard_waiting", st === 200 && b.data.waiting_buyers === 2 && b.data.waiting_parts.length === 2 && b.data.waiting_parts[0].id === 1 && b.data.waiting_parts[0].waiting_count === 2, b.data);
check("no_buyer_identity_leak", !JSON.stringify(b.data).match(/user_id|phone|email|Buyer/), b.data);
await call("DELETE", "/api/v1/stock-alerts/3", buyer);

// Seller edits but stays at 0: nothing happens.
const put = (q) => call("PUT", "/api/v1/marketplace/parts/1", seller, { category_id: 1, slug: "p1", title: "Clio engine", price: 100000, quantity: q, status: "active" });
[st, b] = await put(0); await flush();
check("still_out_no_notify", st === 200 && sql.prepare("select count(*) n from stock_alerts where status='notified'").get().n === 0 && sent.length === 0, [st, b, sent.length]);

// Restock: both alerts notified in-app; WhatsApp only to the buyer with a phone.
[st, b] = await put(3); await flush();
check("restock_ok", st === 200, [st, b]);
check("alerts_notified", sql.prepare("select count(*) n from stock_alerts where part_id=1 and status='notified' and notified_at is not null").get().n === 2);
check("whatsapp_sent_once", sent.length === 1 && sent[0].to === "212612345678" && sent[0].template.name === "parthub_back_in_stock"
  && JSON.stringify(sent[0].template.components[0].parameters.map((p) => p.text)) === JSON.stringify(["Clio engine", "1000.00 MAD", "https://shop.test/parts/p1"]), sent);
[st, b] = await call("GET", "/api/v1/stock-alerts/mine", buyer);
check("mine_shows_notified", b.data[0].status === "notified" && b.data[0].quantity === 3, b);

[st, b] = await call("GET", "/api/v1/marketplace/me/parts/1", seller);
check("waiting_cleared_after_restock", b.data.waiting_count === 0, b.data.waiting_count);
// Another update while in stock: no second message.
await put(4); await flush();
check("no_double_send", sent.length === 1, sent.length);

// Out again, buyer re-subscribes, restock -> a new message.
await put(0); await flush();
[st, b] = await call("POST", "/api/v1/stock-alerts", buyer, { part_id: 1 });
check("resubscribe_after_notified", st === 201 && b.data.status === "active", b);
await put(2); await flush();
check("second_cycle_sends", sent.length === 2, sent.length);

// Unsubscribe.
sql.exec("UPDATE parts SET quantity = 0 WHERE id = 3");
await call("POST", "/api/v1/stock-alerts", buyer, { part_id: 3 });
[st, b] = await call("DELETE", "/api/v1/stock-alerts/3", buyer);
check("unsubscribe", st === 200 && sql.prepare("select count(*) n from stock_alerts where part_id=3").get().n === 0, [st, b]);

// Admin approval of a pending part that is in stock notifies waiting buyers.
sql.exec("UPDATE parts SET quantity = 0, status = 'active' WHERE id = 3");
await call("POST", "/api/v1/stock-alerts", buyer, { part_id: 3 });
sql.exec("UPDATE parts SET quantity = 6, status = 'pending' WHERE id = 3");
[st, b] = await call("PATCH", "/api/v1/admin/parts/3/status", admin, { status: "active" }); await flush();
check("admin_approval_notifies", st === 200 && sql.prepare("select status from stock_alerts where part_id=3").get().status === "notified" && sent.length === 3, [st, b, sent.length]);

// Alerts on another buyer's account are not visible.
[st, b] = await call("GET", "/api/v1/stock-alerts/mine", other);
check("mine_is_private", b.data.every((a) => a.part_id === 1), b);

let bad = 0;
for (const [k, v] of Object.entries(results)) { console.log(v.startsWith("PASS") ? "PASS" : "FAIL", k, v.startsWith("PASS") ? "" : v); if (!v.startsWith("PASS")) bad++; }
console.log(bad ? `${bad} failed` : `all ${Object.keys(results).length} passed`);
