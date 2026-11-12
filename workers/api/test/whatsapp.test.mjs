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
// WhatsApp: webhook verification and signature, delivery statuses,
// incoming messages and STOP, new-order notification to sellers, admin
// inbox with the 24-hour rule. Meta's API is a stand-in fetch.
import { createHmac } from "node:crypto";
const APP_SECRET = "meta-app-secret-for-tests";
const VERIFY = "verify-token-0123456789abcdef";
Object.assign(env, {
  WHATSAPP_ACCESS_TOKEN: "test-access-token", WHATSAPP_PHONE_NUMBER_ID: "1333067669900608",
  WHATSAPP_VERIFY_TOKEN: VERIFY, WHATSAPP_APP_SECRET: APP_SECRET, SELLER_PORTAL_URL: "https://seller.parthub.autos",
});
const graph = [];
let nextGraph = null; // force one answer
globalThis.fetch = async (url, init) => {
  graph.push({ url: String(url), body: JSON.parse(init.body), auth: init.headers.Authorization });
  if (nextGraph) { const r = nextGraph; nextGraph = null; return r; }
  return new Response(JSON.stringify({ messages: [{ id: `wamid.T${graph.length}` }] }), { status: 200, headers: { "content-type": "application/json" } });
};
const tick = () => new Promise((r) => setTimeout(r, 30));
sql.exec(`
  INSERT INTO users (id,name,email,password_hash,role,phone) VALUES (1,'A','a@x','x','admin',NULL),(2,'S1','s1@x','x','seller','0611111111'),(7,'Ali','b@x','x','buyer','0622222222');
  INSERT INTO sellers (id,user_id,name,slug,status,location,delivery_enabled,whatsapp,phone,delivery_fee_local) VALUES (1,2,'Casa Freins','casa','active','Casablanca',1,'06 61 23 45 67','0522000000',2000);
  INSERT INTO categories (id,name,slug) VALUES (1,'Brakes','brakes');
  INSERT INTO parts (id,seller_id,category_id,title,slug,price,quantity,status) VALUES (1,1,1,'Plaquettes Logan','pads',25000,10,'active');
`);
const admin = await tok({ user_id: 1, role: "admin" });
const s1 = await tok({ user_id: 2, role: "seller", seller_id: 1 });
const buyer = await tok({ user_id: 7, role: "buyer" });
const verify = (q) => app.request(`/api/v1/whatsapp/webhook?${new URLSearchParams(q)}`, {}, env);
const post = async (body, { secret = APP_SECRET, sig } = {}) => {
  const raw = JSON.stringify(body);
  const headers = { "Content-Type": "application/json" };
  if (sig !== null) headers["X-Hub-Signature-256"] = sig ?? `sha256=${createHmac("sha256", secret).update(raw).digest("hex")}`;
  const r = await app.request("/api/v1/whatsapp/webhook", { method: "POST", headers, body: raw }, env);
  return [r.status, await r.json().catch(() => null)];
};
const wa = (value) => ({ object: "whatsapp_business_account", entry: [{ id: "1127017660127481", changes: [{ field: "messages", value: { messaging_product: "whatsapp", ...value } }] }] });
const status = (id, s, ts, errors) => wa({ statuses: [{ id, status: s, timestamp: String(ts), recipient_id: "212661234567", ...(errors ? { errors } : {}) }] });
const inbound = (id, from, text, ts = Math.floor(Date.now() / 1000), name = "Ali") =>
  wa({ contacts: [{ wa_id: from, profile: { name } }], messages: [{ id, from, timestamp: String(ts), type: "text", text: { body: text } }] });

// 1. Meta's verification (Callback URL + Verify token).
let r = await verify({ "hub.mode": "subscribe", "hub.verify_token": VERIFY, "hub.challenge": "1158201444" });
check("verify_ok", r.status === 200 && (await r.text()) === "1158201444", r.status);
r = await verify({ "hub.mode": "subscribe", "hub.verify_token": "wrong-token-0123456789abc", "hub.challenge": "1" });
check("verify_wrong_token", r.status === 403, r.status);
r = await verify({ "hub.mode": "unsubscribe", "hub.verify_token": VERIFY, "hub.challenge": "1" });
check("verify_wrong_mode", r.status === 403);
const saved = env.WHATSAPP_VERIFY_TOKEN; env.WHATSAPP_VERIFY_TOKEN = "";
r = await verify({ "hub.mode": "subscribe", "hub.verify_token": "", "hub.challenge": "1" });
check("verify_no_secret", r.status === 403); env.WHATSAPP_VERIFY_TOKEN = saved;
r = await verify({ "hub.mode": "subscribe", "hub.verify_token": VERIFY, "hub.challenge": "<script>" });
check("verify_challenge_sanitized", r.status === 403);

// 2. Signature.
let [st] = await post(inbound("wamid.IN1", "212661234567", "Bonjour"), { sig: null });
check("no_signature_401", st === 401, st);
[st] = await post(inbound("wamid.IN1", "212661234567", "Bonjour"), { secret: "not-the-app-secret" });
check("bad_signature_401", st === 401, st);

// 3. New order -> the seller gets parthub_new_order on their WhatsApp number.
let res;
[st, res] = await call("POST", "/api/v1/commerce/orders", buyer, {
  items: [{ part_id: 1, quantity: 2 }], shipping_address: { full_name: "Ali", phone: "0622222222", address_line1: "1 Rue Y", city: "Casablanca", country: "MA" },
});
await tick();
const order = res.data;
const sent = graph.find((g) => g.body.template?.name === "parthub_new_order");
check("new_order_sent", st === 201 && sent && sent.body.to === "212661234567" && sent.auth === "Bearer test-access-token" && sent.url.includes("/1333067669900608/messages"), [st, graph]);
check("new_order_params", JSON.stringify(sent?.body.template.components[0].parameters.map((p) => p.text)) === JSON.stringify([order.reference, "2 × Plaquettes Logan", "520.00 MAD", "Casablanca", `https://seller.parthub.autos/orders/${order.id}`]), sent?.body.template.components);
const note = () => sql.prepare("select * from whatsapp_notifications where kind = 'new_order' and ref_id = ?").get(order.id);
check("new_order_logged", note()?.sent === 1 && note().wa_message_id?.startsWith("wamid.T") && note().status === "sent", note());

// 4. Delivery statuses (out of order, never backwards), failure reason.
const wid = note().wa_message_id;
[st] = await post(status(wid, "read", 1763000300));
check("status_read", st === 200 && note().status === "read", note());
await post(status(wid, "delivered", 1763000200));
check("status_no_downgrade", note().status === "read", note().status);
sql.exec("INSERT INTO whatsapp_notifications (kind, ref_id, recipient, sent, wa_message_id, status) VALUES ('new_offer', 99, 'buyer:7', 1, 'wamid.F1', 'sent')");
await post(status("wamid.F1", "failed", 1763000400, [{ code: 131026, title: "Message undeliverable", error_data: { details: "Not a WhatsApp user" } }]));
const failed = sql.prepare("select status, error from whatsapp_notifications where wa_message_id = 'wamid.F1'").get();
check("status_failed_reason", failed.status === "failed" && /131026/.test(failed.error) && /Not a WhatsApp user/.test(failed.error), failed);

// 5. Incoming messages: stored once, contact and 24-hour window, STOP / START.
[st, res] = await post(inbound("wamid.IN1", "212622222222", "Bonjour, ma commande arrive quand ?"));
check("inbound_stored", st === 200 && res.data.messages === 1 && sql.prepare("select count(*) n from whatsapp_messages where direction = 'in'").get().n === 1, res);
[st, res] = await post(inbound("wamid.IN1", "212622222222", "Bonjour, ma commande arrive quand ?"));
check("inbound_retry_once", res.data.messages === 0 && sql.prepare("select count(*) n from whatsapp_messages").get().n === 1, res.data);
check("contact", sql.prepare("select name, last_inbound_at, opted_out_at from whatsapp_contacts where phone = '212622222222'").get()?.name === "Ali");
await post(inbound("wamid.STOP", "212661234567", "STOP", undefined, "Casa Freins"));
check("stop_opt_out", sql.prepare("select opted_out_at from whatsapp_contacts where phone = '212661234567'").get()?.opted_out_at);
const before = graph.length;
await call("POST", "/api/v1/commerce/orders", buyer, { items: [{ part_id: 1, quantity: 1 }], shipping_address: { full_name: "Ali", phone: "0622222222", address_line1: "1 Rue Y", city: "Rabat", country: "MA" } });
await tick();
check("opted_out_not_sent", graph.length === before, graph.slice(before));
await post(inbound("wamid.START", "212661234567", "Start", undefined, "Casa Freins"));
check("start_opt_in", sql.prepare("select opted_out_at from whatsapp_contacts where phone = '212661234567'").get()?.opted_out_at === null);
await post(wa({ messages: [{ id: "wamid.IMG", from: "212622222222", timestamp: String(Math.floor(Date.now() / 1000)), type: "image", image: { caption: "La pièce reçue" } }] }));
check("inbound_image", sql.prepare("select body from whatsapp_messages where wa_message_id = 'wamid.IMG'").get()?.body === "[image] La pièce reçue");

// 6. Admin: status (no secrets), inbox, reply within 24 hours, not after.
[st, res] = await call("GET", "/api/v1/admin/whatsapp/status", admin);
check("admin_status", st === 200 && res.data.configured.sending && res.data.configured.app_secret && res.data.configured.verify_token && res.data.webhook_url.endsWith("/api/v1/whatsapp/webhook") && !JSON.stringify(res.data).includes(APP_SECRET) && !JSON.stringify(res.data).includes(VERIFY), res.data);
check("admin_failures", res.data.failures.some((f) => /131026/.test(f.error)), res.data.failures);
[st, res] = await call("GET", "/api/v1/admin/whatsapp/conversations", admin);
const ali = res.data.find((x) => x.phone === "212622222222");
const shop = res.data.find((x) => x.phone === "212661234567");
check("admin_inbox", st === 200 && ali.unread === 2 && ali.window_open && ali.who?.kind === "buyer" && shop.who?.kind === "seller" && shop.who.name === "Casa Freins", res.data);
[st, res] = await call("POST", "/api/v1/admin/whatsapp/conversations/212622222222/reply", admin, { text: "Bonjour Ali, elle part demain." });
const reply = graph[graph.length - 1];
check("reply_sent", st === 200 && reply.body.type === "text" && reply.body.to === "212622222222" && reply.body.text.body === "Bonjour Ali, elle part demain.", [st, res, reply?.body]);
check("reply_stored_and_handled", sql.prepare("select count(*) n from whatsapp_messages where direction = 'out' and sent_by = 1").get().n === 1 && sql.prepare("select count(*) n from whatsapp_messages where phone = '212622222222' and direction = 'in' and handled_at is null").get().n === 0);
await post(status(res.data.id, "delivered", Math.floor(Date.now() / 1000)));
check("reply_status", sql.prepare("select status from whatsapp_messages where wa_message_id = ?").get(res.data.id)?.status === "delivered");
sql.exec("UPDATE whatsapp_contacts SET last_inbound_at = datetime('now', '-25 hours') WHERE phone = '212622222222'");
[st, res] = await call("POST", "/api/v1/admin/whatsapp/conversations/212622222222/reply", admin, { text: "Encore ?" });
check("reply_window_closed_409", st === 409, [st, res]);
nextGraph = new Response(JSON.stringify({ error: { code: 131047, message: "Re-engagement message" } }), { status: 400 });
sql.exec("UPDATE whatsapp_contacts SET last_inbound_at = datetime('now') WHERE phone = '212622222222'");
[st, res] = await call("POST", "/api/v1/admin/whatsapp/conversations/212622222222/reply", admin, { text: "Test" });
check("reply_meta_error_502", st === 502 && /131047/.test(res.error || JSON.stringify(res)), [st, res]);
[st] = await call("POST", "/api/v1/admin/whatsapp/conversations/212661234567/handled", admin, {});
check("handled", st === 200 && sql.prepare("select count(*) n from whatsapp_messages where phone = '212661234567' and handled_at is null").get().n === 0);
for (const [who, t] of [["seller", s1], ["buyer", buyer]]) {
  [st] = await call("GET", "/api/v1/admin/whatsapp/conversations", t);
  check(`admin_only_${who}`, st === 403, st);
}

console.log(results);
const fails = Object.values(results).filter((v) => v !== "PASS").length;
console.log(fails ? `${fails} FAIL` : "ALL PASS");
process.exitCode = fails ? 1 : 0;
