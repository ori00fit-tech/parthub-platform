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
// Webhooks that fail half-way (utils/carriers.ts recordEvent,
// utils/whatsapp.ts handleWhatsAppWebhook): the carrier's retry applies an
// event recorded but not applied; a WhatsApp message and its STOP are
// stored together; an old STOP sent again after START changes nothing.
import { createHmac } from "node:crypto";
import { guardOff } from "./_guard-off.mjs";
guardOff(app, sql, env);
const SECRET = "sendit-test-secret-0123456789";
const APP_SECRET = "meta-app-secret-for-tests";
Object.assign(env, { CARRIER_SENDIT_WEBHOOK_SECRET: SECRET, WHATSAPP_APP_SECRET: APP_SECRET, WHATSAPP_VERIFY_TOKEN: "verify-token-0123456789abcdef" });
sql.exec(`
  INSERT INTO users (id,name,email,password_hash,role) VALUES (1,'A','a@x','x','admin'),(2,'S1','s1@x','x','seller'),(7,'B','b@x','x','buyer');
  INSERT INTO sellers (id,user_id,name,slug,status,location,delivery_enabled) VALUES (1,2,'Shop','shop','active','Casablanca',1);
  INSERT INTO categories (id,name,slug) VALUES (1,'Brakes','brakes');
  INSERT INTO parts (id,seller_id,category_id,title,slug,price,quantity,status) VALUES (1,1,1,'Pads','pads',30000,10,'active');
  UPDATE carriers SET webhook_enabled = 1 WHERE code = 'sendit';
`);
const s1 = await tok({ user_id: 2, role: "seller", seller_id: 1 });
const buyer = await tok({ user_id: 7, role: "buyer" });
const [, ord] = await call("POST", "/api/v1/commerce/orders", buyer, { items: [{ part_id: 1, quantity: 1 }], shipping_address: { full_name: "Ali", phone: "0611", address_line1: "1 Rue Y", city: "Casablanca", country: "MA" } });
await call("PATCH", `/api/v1/marketplace/me/orders/${ord.data.id}/status`, s1, { status: "confirmed" });
await call("PATCH", `/api/v1/marketplace/me/orders/${ord.data.id}/status`, s1, { status: "shipped", carrier: "sendit", tracking_number: "SD-9" });
const hook = async (body) => {
  const r = await app.request(`/api/v1/carriers/sendit/webhook?token=${SECRET}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }, env);
  return [r.status, await r.json().catch(() => null)];
};
const at = new Date(Date.now() + 3600000).toISOString().slice(0, 19).replace("T", " ");
const delivered = { tracking_number: "SD-9", status: "Livré", cod_amount: 335, updated_at: at };

// 1. The database fails while applying the event (after it was recorded).
const realPrepare = DB.prepare;
let failOnce = true;
DB.prepare = (q) => {
  if (failOnce && /^\s*update order_shipments set\s+status = case/i.test(q)) {
    failOnce = false;
    throw new Error("D1_ERROR: network blip");
  }
  return realPrepare(q);
};
let [st] = await hook(delivered);
DB.prepare = realPrepare;
const ev = () => sql.prepare("select applied_at from shipment_events where tracking_number = 'SD-9' and source = 'carrier'").get();
const line = () => sql.prepare("select status from order_items where order_id = ?").get(ord.data.id).status;
check("half_way_failure", st === 500 && ev() && ev().applied_at === null && line() === "shipped", [st, ev(), line()]);
// 2. The carrier sends it again (they retry on errors): applied now, once.
let r;
[st, r] = await hook(delivered);
check("retry_applies", st === 200 && r.data.applied === 1 && ev().applied_at !== null && line() === "delivered" &&
  sql.prepare("select cod_collected from order_shipments where order_id = ?").get(ord.data.id).cod_collected === 33500, [st, r, ev(), line()]);
[st, r] = await hook(delivered);
check("third_time_duplicate", r.data.duplicate === 1 && r.data.applied === 0, r.data);
// Events written by the seller are applied with their action.
check("seller_events_applied", sql.prepare("select count(*) n from shipment_events where source = 'seller' and applied_at is null").get().n === 0);

// 3. WhatsApp: STOP then START; Meta re-sends the old STOP → still subscribed.
const wa = (id, text, ts) => ({ object: "whatsapp_business_account", entry: [{ id: "1", changes: [{ field: "messages", value: { messaging_product: "whatsapp",
  contacts: [{ wa_id: "212600000001", profile: { name: "Ali" } }], messages: [{ id, from: "212600000001", timestamp: String(ts), type: "text", text: { body: text } }] } }] }] });
const post = async (body) => {
  const raw = JSON.stringify(body);
  const sig = `sha256=${createHmac("sha256", APP_SECRET).update(raw).digest("hex")}`;
  const res = await app.request("/api/v1/whatsapp/webhook", { method: "POST", headers: { "Content-Type": "application/json", "X-Hub-Signature-256": sig }, body: raw }, env);
  return res.status;
};
const now = Math.floor(Date.now() / 1000);
const contact = () => sql.prepare("select * from whatsapp_contacts where phone = '212600000001'").get();
await post(wa("wamid.STOP1", "STOP", now - 60));
check("stop_applied", contact().opted_out_at !== null);
await post(wa("wamid.START1", "START", now));
check("start_applied", contact().opted_out_at === null);
// Meta's retry of the old STOP (as if it had failed after storing): the message
// row is gone (rolled back) so it is handled again — and must not opt out.
sql.exec("delete from whatsapp_messages where wa_message_id = 'wamid.STOP1'");
await post(wa("wamid.STOP1", "STOP", now - 60));
check("old_stop_ignored", contact().opted_out_at === null && contact().last_inbound_at !== null, contact());
// 4. Message and contact together: a failure on the contact leaves no message, so Meta's retry is handled.
failOnce = true;
DB.batch = ((realBatch) => async (list) => { if (failOnce) { failOnce = false; throw new Error("D1_ERROR: blip"); } return realBatch(list); })(DB.batch);
const s500 = await post(wa("wamid.STOP2", "STOP", now + 10));
const stored = sql.prepare("select count(*) n from whatsapp_messages where wa_message_id = 'wamid.STOP2'").get().n;
await post(wa("wamid.STOP2", "STOP", now + 10));
check("atomic_message_and_stop", s500 === 500 && stored === 0 && contact().opted_out_at !== null &&
  sql.prepare("select count(*) n from whatsapp_messages where wa_message_id = 'wamid.STOP2'").get().n === 1, [s500, stored, contact()]);

console.log(results);
const fails = Object.values(results).filter((v) => v !== "PASS").length;
console.log(fails ? `${fails} FAIL` : "ALL PASS");
process.exitCode = fails ? 1 : 0;
