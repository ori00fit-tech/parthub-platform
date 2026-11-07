const ROOT = new URL("../../../", import.meta.url).pathname; // repository root
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import app from "./.build/app.mjs";
import { signToken } from "./.build/auth.mjs";

const sql = new DatabaseSync(":memory:");
sql.exec(readFileSync(ROOT + "infra/d1/schema.sql", "utf8"));

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

// Mock the WhatsApp Cloud API.
const sent = [];
let metaStatus = 200;
globalThis.fetch = async (url, init) => {
  sent.push({ url: String(url), body: JSON.parse(init.body) });
  return new Response(JSON.stringify({ messages: [{ id: "x" }] }), { status: metaStatus });
};

const configured = {
  DB, JWT_SECRET: "s",
  WHATSAPP_ACCESS_TOKEN: "tok", WHATSAPP_PHONE_NUMBER_ID: "123",
  SELLER_PORTAL_URL: "https://seller.parthub.site", STOREFRONT_URL: "https://parthub.site",
};
const unconfigured = { DB, JWT_SECRET: "s" };
let env = unconfigured;

const tok = async (p) => "Bearer " + (await signToken(p, "s"));
const call = async (m, u, auth, body) => {
  const r = await app.request(u, {
    method: m,
    headers: { "Content-Type": "application/json", ...(auth ? { Authorization: auth } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  }, env);
  return [r.status, await r.json()];
};
const settle = () => new Promise((r) => setTimeout(r, 50)); // background tasks
const results = {};
const check = (name, cond, extra = "") => { results[name] = cond ? "PASS" : `FAIL ${JSON.stringify(extra)}`; };
const to = () => sent.map((m) => m.body.to).sort();
const logRows = () => sql.prepare("SELECT kind, recipient, sent FROM whatsapp_notifications ORDER BY id").all();

sql.exec(`
  INSERT INTO users (id,name,email,password_hash,role) VALUES
    (1,'Youssef','b@x','x','buyer'), (2,'S1','s1@x','x','seller'), (3,'S2','s2@x','x','seller'),
    (4,'S3','s3@x','x','seller'), (5,'S4','s4@x','x','seller'), (6,'S5','s5@x','x','seller');
  INSERT INTO sellers (id,user_id,name,slug,status,phone,whatsapp,location) VALUES
    (1,2,'Casse Casa','casse','active','0611111111','212611111111','Casablanca'),
    (2,3,'Auto Rabat','rabat','active','06 22 22 22 22','','Rabat'),
    (3,4,'Pending','pending','pending','0633333333',NULL,'Fes'),
    (4,5,'No match','nomatch','active','0644444444',NULL,'Tanger'),
    (5,6,'No phone','nophone','active',NULL,NULL,'Agadir');
  INSERT INTO categories (id,name,slug) VALUES (1,'Engine','engine'), (2,'Electrical','electrical');
  INSERT INTO parts (id,seller_id,category_id,slug,title,price,quantity,status) VALUES
    (1,1,1,'p1','Clio engine',100000,1,'active'),
    (2,2,2,'p2','Battery',5000,5,'active'),
    (3,3,1,'p3','x',1,1,'active'),
    (4,4,1,'p4','Peugeot thing',1,1,'active'),
    (5,5,2,'p5','y',1,1,'active');
  INSERT INTO part_compatibility (part_id,make,model,year_start) VALUES
    (1,'Renault','Clio',2010), (3,'Renault','Clio',2010), (4,'Peugeot','208',2015);
`);

const buyer = await tok({ user_id: 1, role: "buyer" });
const s1 = await tok({ user_id: 2, role: "seller", seller_id: 1 });
const s2 = await tok({ user_id: 3, role: "seller", seller_id: 2 });
sql.exec("INSERT INTO users (id,name,email,password_hash,role) VALUES (99,'Admin','admin99@x','x','admin')");
const admin = await tok({ user_id: 99, role: "admin" });
const base = { make: "Renault", model: "Clio", year: 2015, part_name: "Alternator", category_id: 2, city: "Casablanca", phone: "06 12 34 56 78" };

// 1. Not configured → nothing sent, nothing logged.
let [st, b] = await call("POST", "/api/v1/requests", buyer, base);
await settle();
check("unconfigured_no_messages", st === 201 && sent.length === 0 && logRows().length === 0, [st, sent.length, logRows()]);

// 2. Configured → matching active sellers with a number get the new-request alert.
env = configured;
[st, b] = await call("POST", "/api/v1/requests", buyer, base);
const reqId = b.data.id;
await settle();
check("new_request_recipients", JSON.stringify(to()) === JSON.stringify(["212611111111", "212622222222"]), to());
const m0 = sent.find((m) => m.body.to === "212611111111")?.body;
check("new_request_template", m0?.template?.name === "parthub_new_request" && m0.template.language.code === "fr", m0?.template);
const p0 = m0?.template?.components?.[0]?.parameters?.map((p) => p.text);
check("new_request_params", JSON.stringify(p0) === JSON.stringify(["Alternator", "Renault Clio 2015", "Casablanca", `https://seller.parthub.site/requests/${reqId}`]), p0);
check("graph_api_url", sent[0].url === "https://graph.facebook.com/v20.0/123/messages", sent[0].url);
check("logged_as_sent", logRows().every((r) => r.sent === 1) && logRows().length === 2, logRows());

// 3. Offer → buyer notified once (not on update, not on re-offer after withdraw).
sent.length = 0;
[st, b] = await call("PUT", `/api/v1/requests/inbox/${reqId}/offer`, s1, { price: 65000, condition: "used" });
await settle();
const offer1 = b.data.id;
const bo = sent[0]?.body;
check("buyer_new_offer", sent.length === 1 && bo.to === "212612345678" && bo.template.name === "parthub_new_offer", sent.map((m) => m.body));
const bp = bo?.template?.components?.[0]?.parameters?.map((p) => p.text);
check("buyer_new_offer_params", JSON.stringify(bp) === JSON.stringify(["Alternator", "Casse Casa", "650.00 MAD", `https://parthub.site/requests/${reqId}`]), bp);
sent.length = 0;
await call("PUT", `/api/v1/requests/inbox/${reqId}/offer`, s1, { price: 60000, condition: "used" });
await call("DELETE", `/api/v1/requests/inbox/${reqId}/offer`, s1);
await call("PUT", `/api/v1/requests/inbox/${reqId}/offer`, s1, { price: 61000, condition: "used" });
await settle();
check("no_duplicate_offer_alerts", sent.length === 0, sent.length);

// 4. Accept → winning seller notified.
sent.length = 0;
[st] = await call("POST", `/api/v1/requests/mine/${reqId}/accept/${offer1}`, buyer);
await settle();
const ap = sent[0]?.body?.template?.components?.[0]?.parameters?.map((p) => p.text);
check("seller_accepted_alert", st === 200 && sent.length === 1 && sent[0].body.to === "212611111111" && sent[0].body.template.name === "parthub_offer_accepted", sent.map((m) => m.body));
check("seller_accepted_params", JSON.stringify(ap) === JSON.stringify(["Alternator", "Youssef", `https://seller.parthub.site/requests/${reqId}`]), ap);

// 5. Meta rejects → request still succeeds; log keeps sent = 0.
sent.length = 0;
metaStatus = 500;
[st, b] = await call("POST", "/api/v1/requests", buyer, { ...base, part_name: "Starter" });
await settle();
const failedRows = sql.prepare("SELECT sent FROM whatsapp_notifications WHERE ref_id = ? AND kind='new_request'").all(b.data.id);
check("meta_failure_does_not_break_request", st === 201 && sent.length === 2 && failedRows.every((r) => r.sent === 0), [st, sent.length, failedRows]);
metaStatus = 200;

// 6. Daily cap: seller 1 already has 10 alerts today → skipped; seller 2 still gets one.
sql.exec("DELETE FROM whatsapp_notifications WHERE recipient = 'seller:1'");
for (let i = 0; i < 10; i++) {
  sql.prepare("INSERT INTO whatsapp_notifications (kind, ref_id, recipient, sent) VALUES ('new_request', ?, 'seller:1', 1)").run(1000 + i);
}
sent.length = 0;
await call("POST", "/api/v1/requests", buyer, { ...base, part_name: "Radiator" });
await settle();
check("daily_cap_per_seller", JSON.stringify(to()) === JSON.stringify(["212622222222"]), to());

// 7. Existing admin order notification keeps its English template.
sent.length = 0;
[st] = await call("POST", "/api/v1/whatsapp/notify/order", admin, { phone: "0612345678", order_ref: "PH-1", status: "shipped" });
check("order_template_stays_en", st === 200 && sent[0]?.body.template.language.code === "en" && sent[0].body.template.name === "order_status_update", sent[0]?.body);

console.log(results);
console.log(Object.values(results).every((v) => v === "PASS") ? "ALL PASS" : "SOME FAILED");
