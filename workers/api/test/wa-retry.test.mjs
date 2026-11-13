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
// WhatsApp retries (utils/wa-notify.ts retryWhatsApp, cron */15): a message
// skipped before its template was approved goes out once it is; refused by
// Meta → tried again, at most 3 times; too old for its kind → never; STOP
// → never.
import worker from "./.build/index.mjs";
Object.assign(env, { WHATSAPP_ACCESS_TOKEN: "t", WHATSAPP_PHONE_NUMBER_ID: "1", STOREFRONT_URL: "https://parthub.autos", SELLER_PORTAL_URL: "https://seller.parthub.autos" });
const graph = [];
let refuse = false;
globalThis.fetch = async (url, init = {}) => {
  graph.push(JSON.parse(init.body || "null"));
  if (refuse) return new Response(JSON.stringify({ error: { code: 131000, message: "Something went wrong" } }), { status: 500, headers: { "content-type": "application/json" } });
  return new Response(JSON.stringify({ messages: [{ id: `wamid.${graph.length}` }] }), { status: 200, headers: { "content-type": "application/json" } });
};
const tick = () => new Promise((r) => setTimeout(r, 40));
const cron = async (expr) => { const jobs = []; await worker.scheduled({ cron: expr }, env, { waitUntil: (p) => jobs.push(p) }); await Promise.all(jobs); };
const sent = (name) => graph.filter((g) => g?.template?.name === name);
const row = (kind) => sql.prepare("select * from whatsapp_notifications where kind = ? order by id desc").get(kind);
sql.exec(`
  INSERT INTO users (id,name,email,password_hash,role,phone,locale) VALUES (2,'S1','s1@x','x','seller','0611111111','fr'),(7,'Ali','b@x','x','buyer','0622222222','ar');
  INSERT INTO sellers (id,user_id,name,slug,status,location,delivery_enabled,whatsapp) VALUES (1,2,'Casa Freins','casa','active','Casablanca',1,'0661234567');
  INSERT INTO categories (id,name,slug) VALUES (1,'Brakes','brakes');
  INSERT INTO parts (id,seller_id,category_id,title,slug,price,quantity,status) VALUES (1,1,1,'Plaquettes','pads',25000,10,'active'),(2,1,1,'Disque','disc',40000,10,'active');
  INSERT INTO whatsapp_templates (name, language, status, source) VALUES ('parthub_order_received','ar','pending','meta');
`);
const buyer = await tok({ user_id: 7, role: "buyer" });
const order = async (part) => {
  const [st, r] = await call("POST", "/api/v1/commerce/orders", buyer, { items: [{ part_id: part, quantity: 1 }], shipping_address: { full_name: "Ali", phone: "0622222222", address_line1: "1 Rue", city: "Rabat", country: "MA" } });
  await tick();
  return r.data;
};

// 1. Template pending → skipped, the content kept.
const o = await order(1);
let n = row("order_received");
check("skipped_with_payload", n.status === "skipped" && n.attempts === 0 && JSON.parse(n.payload).params.ar[0] === o.reference && JSON.parse(n.payload).button.includes(o.reference), n);
await cron("*/15 * * * *");
check("still_waiting", sent("parthub_order_received").length === 0 && row("order_received").status === "skipped" && row("order_received").attempts === 0);
// 2. Approved → the next run sends it, in the buyer's language, once.
sql.exec("update whatsapp_templates set status = 'approved' where name = 'parthub_order_received'");
await cron("*/15 * * * *");
let m = sent("parthub_order_received").at(-1);
check("sent_after_approval", sent("parthub_order_received").length === 1 && m.template.language.code === "ar" && m.template.components[0].parameters[0].text === o.reference &&
  m.template.components[1].parameters[0].text === `orders/${o.reference}/tracking` && row("order_received").status === "sent" && row("order_received").attempts === 1, row("order_received"));
await cron("*/15 * * * *");
check("not_twice", sent("parthub_order_received").length === 1);
// The daily cron is not the retry cron.
await cron("17 3 * * *");
check("daily_cron_separate", sent("parthub_order_received").length === 1);

// 3. Refused by Meta → retried, at most 3 tries in all.
refuse = true;
const o2 = await order(2);
check("first_try_failed", row("order_received").status === "failed" && row("order_received").attempts === 1, row("order_received"));
await cron("*/15 * * * *"); await cron("*/15 * * * *"); await cron("*/15 * * * *"); await cron("*/15 * * * *");
check("three_tries_max", row("order_received").attempts === 3 && sent("parthub_order_received").filter((x) => x.template.components[0].parameters[0].text === o2.reference).length === 3, row("order_received"));
refuse = false;

// 4. Too old for its kind → never sent ("order received" lives 24 h).
sql.exec("update whatsapp_notifications set status = 'skipped', attempts = 0, created_at = datetime('now', '-30 hours') where kind = 'order_received' and ref_id = " + o2.id);
await cron("*/15 * * * *");
check("stale_not_sent", row("order_received").status === "skipped" && row("order_received").attempts === 0);

// 5. STOP → never retried.
sql.exec("update whatsapp_notifications set created_at = datetime('now'), status = 'failed', attempts = 1 where kind = 'order_received' and ref_id = " + o2.id);
sql.exec("insert into whatsapp_contacts (phone, opted_out_at) values ('212622222222', datetime('now'))");
const before = graph.length;
await cron("*/15 * * * *");
check("stop_respected", graph.length === before && row("order_received").error === "Opted out (STOP)", row("order_received"));
await cron("*/15 * * * *");
check("stop_final", graph.length === before);

console.log(results);
const fails = Object.values(results).filter((v) => v !== "PASS").length;
console.log(fails ? `${fails} FAIL` : "ALL PASS");
process.exitCode = fails ? 1 : 0;
