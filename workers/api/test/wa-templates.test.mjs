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
// WhatsApp templates in three languages (utils/wa-templates.ts,
// wa-notify.ts, wa-events.ts, wa-meta.ts): catalog rules, language choice,
// every order / shipping / claim / store / account event, Template Center
// and submission to Meta. Meta's API is a stand-in fetch.
import { createHmac } from "node:crypto";
import { readdirSync } from "node:fs";
const SECRET = "sendit-test-secret-0123456789";
Object.assign(env, {
  WHATSAPP_ACCESS_TOKEN: "test-access-token", WHATSAPP_PHONE_NUMBER_ID: "1333067669900608",
  SELLER_PORTAL_URL: "https://seller.parthub.autos", STOREFRONT_URL: "https://parthub.autos",
  CARRIER_SENDIT_WEBHOOK_SECRET: SECRET,
});
const graph = [];
let metaTemplates = []; // what the stand-in Meta account holds
globalThis.fetch = async (url, init = {}) => {
  const u = String(url);
  const body = init.body ? JSON.parse(init.body) : null;
  graph.push({ url: u, method: init.method || "GET", body });
  const json = (v, s = 200) => new Response(JSON.stringify(v), { status: s, headers: { "content-type": "application/json" } });
  if (u.includes("/message_templates")) {
    if ((init.method || "GET") === "GET") return json({ data: metaTemplates });
    if (body.name === "parthub_store_blocked" && body.language === "en") return json({ error: { code: 100, message: "Invalid parameter", error_user_msg: "Body too similar" } }, 400);
    const t = { id: `tpl_${metaTemplates.length + 1}`, name: body.name, language: body.language, status: "PENDING", category: body.category };
    metaTemplates.push(t);
    return json({ id: t.id, status: "PENDING", category: body.category });
  }
  return json({ messages: [{ id: `wamid.T${graph.length}` }] });
};
const tick = () => new Promise((r) => setTimeout(r, 40));
const sentTo = (template) => graph.filter((g) => g.body?.template?.name === template);
const last = (template) => sentTo(template).at(-1)?.body;
const bodyParams = (m) => m?.template?.components?.find((c) => c.type === "body")?.parameters.map((p) => p.text);
const buttonParam = (m) => m?.template?.components?.find((c) => c.type === "button")?.parameters[0].text;
const approve = (name, langs) => {
  for (const l of langs) sql.prepare("insert or replace into whatsapp_templates (name, language, status, source) values (?, ?, 'approved', 'manual')").run(name, l);
};
const notif = (kind) => sql.prepare("select * from whatsapp_notifications where kind = ? order by id desc").get(kind);

// Catalog: the same bundle the Worker uses.
const { WA_TEMPLATES, templateProblems, metaTemplatePayload } = await import("./.build/wa-templates.mjs");
const problems = WA_TEMPLATES.flatMap(templateProblems);
check("catalog_follows_meta_rules", problems.length === 0, problems);
check("catalog_names_unique", new Set(WA_TEMPLATES.map((t) => t.name)).size === WA_TEMPLATES.length);
// Every template is sent by some code (no template without an event).
const SRC = ROOT + "workers/api/src/";
const code = ["utils/wa-events.ts", "utils/request-notifications.ts", "utils/stock-alerts.ts"].map((f) => readFileSync(SRC + f, "utf8")).join("\n");
const unused = WA_TEMPLATES.filter((t) => !code.includes(`"${t.name}"`)).map((t) => t.name);
check("every_template_has_an_event", unused.length === 0, unused);
const payload = metaTemplatePayload(WA_TEMPLATES.find((t) => t.name === "parthub_order_shipped"), "ar", { storefront: "https://parthub.autos", seller: "https://seller.parthub.autos" });
check("meta_payload", payload.category === "UTILITY" && payload.components[0].example.body_text[0].length === 4 &&
  payload.components[2].buttons[0].url === "https://parthub.autos/{{1}}" && payload.components[1].text.includes("STOP"), payload);

sql.exec(`
  INSERT INTO users (id,name,email,password_hash,role,phone,locale) VALUES
    (1,'Admin','a@x','x','admin',NULL,NULL),(2,'Karim Seller','s1@x','x','seller','0611111111','fr'),(3,'Second Seller','s2@x','x','seller',NULL,'fr'),(7,'Ali Benali','b@x','x','buyer','0622222222','ar');
  INSERT INTO sellers (id,user_id,name,slug,status,location,delivery_enabled,whatsapp,phone,pickup_enabled,pickup_address) VALUES
    (1,2,'Casa Freins','casa','active','Casablanca',1,'06 61 23 45 67','0522000000',1,'12 Rue Ibn Batouta, Casablanca'),
    (2,3,'Second','second','pending','Fes',1,'0612121212',NULL,0,NULL);
  INSERT INTO categories (id,name,slug) VALUES (1,'Brakes','brakes');
  INSERT INTO parts (id,seller_id,category_id,title,slug,price,quantity,status) VALUES
    (1,1,1,'Plaquettes Logan','pads',25000,10,'active'),(2,1,1,'Disque Logan','disc',40000,5,'pending'),(3,1,1,'Etrier','caliper',60000,5,'pending');
  INSERT INTO part_images (part_id,url,sort_order,is_featured) VALUES (2,'https://x/2.jpg',1,1),(3,'https://x/3.jpg',1,1);
`);
const admin = await tok({ user_id: 1, role: "admin" });
const s1 = await tok({ user_id: 2, role: "seller", seller_id: 1 });
let buyer = await tok({ user_id: 7, role: "buyer" });
const addr = { full_name: "Ali", phone: "0622222222", address_line1: "1 Rue Y", city: "Rabat", country: "MA" };
const order = async (extra = {}) => {
  const [st, r] = await call("POST", "/api/v1/commerce/orders", buyer, { items: [{ part_id: 1, quantity: 1, ...extra }], shipping_address: addr });
  if (st !== 201) throw new Error(JSON.stringify(r));
  await tick();
  return r.data;
};
const step = (oid, status, more = {}) => call("PATCH", `/api/v1/marketplace/me/orders/${oid}/status`, s1, { status, ...more });

// 1. Nothing submitted yet: a catalog template is skipped (with the reason),
//    a template from before the catalog still goes out in French.
let o = await order();
check("not_submitted_skipped", sentTo("parthub_order_received").length === 0 && notif("order_received")?.status === "skipped" &&
  /not submitted/i.test(notif("order_received")?.error), notif("order_received"));
check("legacy_still_sent_fr", last("parthub_new_order")?.template.language.code === "fr", last("parthub_new_order"));

// 2. Language: the buyer uses Arabic. Only French approved → French; Arabic approved → Arabic.
approve("parthub_order_received", ["fr"]);
o = await order();
let m = last("parthub_order_received");
check("fallback_to_approved_fr", m?.template.language.code === "fr" && bodyParams(m)[0] === o.reference && bodyParams(m)[1] === "285.00 MAD" &&
  buttonParam(m) === `orders/${o.reference}/tracking` && m.to === "212622222222", m);
approve("parthub_order_received", ["ar"]);
o = await order();
m = last("parthub_order_received");
check("buyer_language_ar", m?.template.language.code === "ar", m?.template.language);
check("logged_with_language", notif("order_received").template === "parthub_order_received" && notif("order_received").language === "ar" && notif("order_received").status === "sent");
const before = sentTo("parthub_order_received").length;
// The site's language header changes the stored language (signed-in calls).
await app.request("/api/v1/auth/me", { headers: { Authorization: buyer, "X-PartHub-Lang": "en" } }, env);
check("locale_from_header", sql.prepare("select locale from users where id = 7").get().locale === "en");
approve("parthub_order_received", ["en"]);
o = await order();
check("buyer_language_en", last("parthub_order_received")?.template.language.code === "en" && sentTo("parthub_order_received").length === before + 1);
sql.exec("update users set locale = 'ar' where id = 7");

// 3. Seller steps: confirmed, shipped (carrier name + tracking), delivered.
for (const t of ["parthub_order_confirmed", "parthub_order_shipped", "parthub_order_delivered", "parthub_order_cancelled", "parthub_pickup_ready",
  "parthub_out_for_delivery", "parthub_delivery_attempt_failed", "parthub_carrier_delivered", "parthub_delivery_returned",
  "parthub_claim_opened", "parthub_claim_update", "parthub_seller_claim_update", "parthub_store_approved", "parthub_store_blocked",
  "parthub_parts_reviewed", "parthub_password_changed"]) approve(t, ["ar", "fr", "en"]);
await step(o.id, "confirmed"); await tick();
m = last("parthub_order_confirmed");
check("confirmed_to_buyer", m?.template.language.code === "ar" && bodyParams(m).join("|") === `Casa Freins|${o.reference}`, bodyParams(m));
await step(o.id, "confirmed"); await tick();
check("no_double_send", sentTo("parthub_order_confirmed").length === 1);
await step(o.id, "shipped", { carrier: "sendit", tracking_number: "SD-77" }); await tick();
m = last("parthub_order_shipped");
check("shipped_carrier_tracking", bodyParams(m)?.join("|") === `${o.reference}|Casa Freins|Sendit|SD-77`, bodyParams(m));
await step(o.id, "delivered"); await tick();
check("delivered_to_buyer", bodyParams(last("parthub_order_delivered"))?.[0] === o.reference);

// Shipped without carrier: the words are in the buyer's language.
let o2 = await order();
await step(o2.id, "confirmed"); await step(o2.id, "shipped"); await tick();
check("not_given_in_arabic", bodyParams(last("parthub_order_shipped"))?.[2] === "غير محدد", bodyParams(last("parthub_order_shipped")));

// Cancelled by the seller, with the reason.
const o3 = await order();
await step(o3.id, "cancelled", { note: "Plus en stock" }); await tick();
check("cancelled_with_reason", bodyParams(last("parthub_order_cancelled"))?.join("|") === `${o3.reference}|Casa Freins|Plus en stock`);
// Cancelled by PartHub (admin).
const o4 = await order();
await call("PATCH", `/api/v1/admin/orders/${o4.id}/status`, admin, { status: "cancelled" }); await tick();
check("admin_cancel_reason", bodyParams(last("parthub_order_cancelled"))?.[2] === "ألغتها PartHub", bodyParams(last("parthub_order_cancelled")));

// Pickup: code, date, address.
const [pst, pr] = await call("POST", "/api/v1/commerce/orders", buyer, { items: [{ part_id: 1, quantity: 1 }], fulfillment: { 1: { method: "pickup" } }, shipping_address: addr });
check("pickup_order", pst === 201 && sql.prepare("select fulfillment from order_items where order_id = ?").get(pr.data.id).fulfillment === "pickup", pr);
await step(pr.data.id, "confirmed"); await tick();
m = last("parthub_pickup_ready");
const pp = bodyParams(m) || [];
check("pickup_ready", pp[0] === pr.data.reference && pp[1] === "Casa Freins" && /^\d{6}$/.test(pp[2]) && /^\d\d\/\d\d\/\d{4}$/.test(pp[3]) && pp[4].startsWith("12 Rue"), pp);

// 4. Carrier webhook: out for delivery, failed attempt, delivered (seller hears the cash).
await call("PUT", "/api/v1/admin/carriers/sendit", admin, { webhook_enabled: true });
const o5 = await order();
await step(o5.id, "confirmed"); await step(o5.id, "shipped", { carrier: "sendit", tracking_number: "SD-500" }); await tick();
const hook = async (body) => {
  const raw = JSON.stringify(body);
  const r = await app.request(`/api/v1/carriers/sendit/webhook?token=${SECRET}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: raw }, env);
  await tick();
  return r.status;
};
const at = (h) => new Date(Date.now() + h * 3600000).toISOString().slice(0, 19).replace("T", " ");
await hook({ tracking_number: "SD-500", status: "En cours de livraison", updated_at: at(1) });
check("out_for_delivery", bodyParams(last("parthub_out_for_delivery"))?.join("|") === `${o5.reference}|285.00 MAD`, bodyParams(last("parthub_out_for_delivery")));
await hook({ tracking_number: "SD-500", status: "Client injoignable", comment: "Téléphone éteint", updated_at: at(2) });
await hook({ tracking_number: "SD-500", status: "Client injoignable", comment: "Absent", updated_at: at(3) });
check("each_failed_attempt", sentTo("parthub_delivery_attempt_failed").length === 2 && bodyParams(last("parthub_delivery_attempt_failed"))[2] === "Absent");
await hook({ tracking_number: "SD-500", status: "Livré", cod_amount: 270, updated_at: at(4) });
m = last("parthub_carrier_delivered");
check("seller_hears_cod", m?.to === "212661234567" && m.template.language.code === "fr" && bodyParams(m).join("|") === `${o5.reference}|Sendit|270.00 MAD` &&
  buttonParam(m) === `orders/${o5.id}`, m && bodyParams(m));
check("buyer_delivered_by_carrier", bodyParams(last("parthub_order_delivered"))?.[0] === o5.reference);

// 5. Claims: opened (seller), refused (buyer), escalated (seller), PartHub decides (both).
const item = sql.prepare("select id from order_items where order_id = ?").get(o5.id);
let [st, r] = await call("POST", `/api/v1/commerce/orders/${o5.reference}/issues`, buyer, { order_item_id: item.id, reason: "not_compatible", details: "Ne va pas sur ma Logan 2016" });
await tick();
const issueId = r.data?.id;
m = last("parthub_claim_opened");
check("claim_opened_seller", st === 201 && m?.template.language.code === "fr" && bodyParams(m).join("|") === `${o5.reference}|Plaquettes Logan|non compatible avec le véhicule` && buttonParam(m) === "issues", bodyParams(m));
await call("POST", `/api/v1/marketplace/me/issues/${issueId}/respond`, s1, { decision: "refuse", note: "Pièce montée" }); await tick();
check("claim_refused_buyer", bodyParams(last("parthub_claim_update"))?.[2]?.startsWith("البائع رفض"), bodyParams(last("parthub_claim_update")));
await call("POST", `/api/v1/commerce/issues/${issueId}/escalate`, buyer, {}); await tick();
check("claim_escalated_seller", bodyParams(last("parthub_seller_claim_update"))?.[2] === "PartHub examine le dossier");
await call("POST", `/api/v1/admin/issues/${issueId}/decide`, admin, { outcome: "buyer", note: "Incompatible, voir photos" }); await tick();
check("decision_both_sides", sentTo("parthub_claim_update").length === 2 && sentTo("parthub_seller_claim_update").length === 2);

// 6. Store and parts review.
await call("PATCH", "/api/v1/admin/sellers/2/status", admin, { status: "active" }); await tick();
check("store_approved", bodyParams(last("parthub_store_approved"))?.[0] === "Second" && last("parthub_store_approved").to === "212612121212");
await call("PATCH", "/api/v1/admin/sellers/2/status", admin, { status: "active" }); await tick();
check("store_same_status_silent", sentTo("parthub_store_approved").length === 1);
await call("PATCH", "/api/v1/admin/sellers/2/status", admin, { status: "suspended", reason: "Numéro à vérifier svp" }); await tick();
check("store_blocked_reason", bodyParams(last("parthub_store_blocked"))?.join("|") === "Second|Numéro à vérifier svp");
[st, r] = await call("POST", "/api/v1/admin/parts/bulk-status", admin, { ids: [1, 2, 3], status: "active" }); await tick();
check("parts_reviewed_one_message", sentTo("parthub_parts_reviewed").length === 1 && bodyParams(last("parthub_parts_reviewed")).join("|") === "2|0", bodyParams(last("parthub_parts_reviewed")));

// 7. Password changed: a warning to the account's number.
const { hashPassword } = await import("./.build/auth.mjs");
sql.prepare("update users set password_hash = ? where id = 7").run(await hashPassword("Old-Pass-2026!"));
[st, r] = await call("POST", "/api/v1/auth/password", buyer, { current_password: "Old-Pass-2026!", new_password: "Riad-Fes-2026-x" });
await tick();
m = last("parthub_password_changed");
if (r.data?.access_token) buyer = `Bearer ${r.data.access_token}`; // the old session is signed out
check("password_warning", st === 200 && bodyParams(m)?.[0] === "Ali" && /^\d\d\/\d\d\/\d{4} \d\d:\d\d$/.test(bodyParams(m)[1]) && m.template.language.code === "ar", [st, r, m && bodyParams(m)]);

// 8. STOP: nothing more, recorded as skipped.
sql.exec("insert into whatsapp_contacts (phone, opted_out_at) values ('212622222222', datetime('now'))");
const before2 = sentTo("parthub_order_received").length;
await order();
check("opted_out_skipped", sentTo("parthub_order_received").length === before2 && notif("order_received").status === "skipped" && /STOP/.test(notif("order_received").error));
sql.exec("delete from whatsapp_contacts");

// 9. Template Center: catalog + statuses + stats; manual status; submit to Meta.
[st, r] = await call("GET", "/api/v1/admin/whatsapp/templates", admin);
const rec = r.data?.templates?.find((t) => t.name === "parthub_order_received");
check("center_lists_catalog", st === 200 && r.data.templates.length === WA_TEMPLATES.length && rec.versions.ar.status === "approved" && rec.stats.sent >= 3 && r.data.can_manage === false, rec);
[st] = await call("GET", "/api/v1/admin/whatsapp/templates", s1);
check("center_admin_only", st === 403, st);
[st, r] = await call("PATCH", "/api/v1/admin/whatsapp/templates/parthub_order_received/en", admin, { status: "paused" });
check("manual_status", st === 200 && r.data.templates.find((t) => t.name === "parthub_order_received").versions.en.status === "paused");
[st, r] = await call("PATCH", "/api/v1/admin/whatsapp/templates/parthub_nope/en", admin, { status: "approved" });
check("manual_unknown_404", st === 404);
[st, r] = await call("POST", "/api/v1/admin/whatsapp/templates/submit", admin, {});
check("submit_needs_account_id", st === 502 && /WHATSAPP_BUSINESS_ACCOUNT_ID/.test(JSON.stringify(r)), r);

env.WHATSAPP_BUSINESS_ACCOUNT_ID = "1127017660127481";
metaTemplates = [{ id: "old1", name: "parthub_new_order", language: "fr", status: "APPROVED", category: "UTILITY" }, { id: "x", name: "someone_else", language: "fr", status: "APPROVED" }];
[st, r] = await call("POST", "/api/v1/admin/whatsapp/templates/sync", admin);
const no = r.data?.templates?.find((t) => t.name === "parthub_new_order");
check("sync_reads_meta", st === 200 && r.data.found === 1 && no.versions.fr.status === "approved" && no.versions.fr.source === "meta" &&
  !sql.prepare("select 1 from whatsapp_templates where name = 'someone_else'").get(), [r.data?.found, no?.versions]);
check("sync_drops_stale_meta_keeps_manual", sql.prepare("select count(*) n from whatsapp_templates where source = 'manual'").get().n > 0);
let rounds = 0, submitted = [];
do {
  [st, r] = await call("POST", "/api/v1/admin/whatsapp/templates/submit", admin, {});
  submitted.push(...(r.data?.submitted || []));
  rounds++;
} while (st === 200 && r.data.remaining > 0 && rounds < 10);
const expected = WA_TEMPLATES.length * 3 - 1; // parthub_new_order/fr was there
const creates = graph.filter((g) => g.method === "POST" && g.url.includes("/message_templates"));
check("submit_all_in_batches", submitted.length === expected && rounds === Math.ceil(expected / 20) && creates.length === expected, [submitted.length, rounds, creates.length]);
const refused = sql.prepare("select * from whatsapp_templates where name = 'parthub_store_blocked' and language = 'en'").get();
check("submit_error_recorded", refused.status === "error" && /too similar/.test(refused.reason), refused);
// Retried only on its own.
[st, r] = await call("POST", "/api/v1/admin/whatsapp/templates/submit", admin, {});
check("batch_skips_refused", st === 200 && r.data.submitted.length === 0 && r.data.remaining === 0, r.data?.submitted);
[st, r] = await call("POST", "/api/v1/admin/whatsapp/templates/submit", admin, { name: "parthub_store_blocked", language: "en" });
check("single_retry", st === 200 && r.data.submitted.length === 1 && r.data.submitted[0].status === "error", r.data?.submitted);
const created = creates.find((g) => g.body.name === "parthub_claim_opened" && g.body.language === "ar").body;
check("submit_payload", created.components[2].buttons[0].url === "https://seller.parthub.autos/{{1}}" && created.components[0].text.includes("{{3}}"), created);
check("pending_after_submit", sql.prepare("select status from whatsapp_templates where name = 'parthub_order_shipped' and language = 'ar'").get().status === "pending");
// Pending everywhere → the event is skipped with the statuses, nothing sent to Meta.
const sentBefore = sentTo("parthub_order_shipped").length;
const o6 = await order();
await step(o6.id, "confirmed"); await step(o6.id, "shipped"); await tick();
check("pending_not_sent", sentTo("parthub_order_shipped").length === sentBefore && /No approved language/.test(notif("order_shipped").error), notif("order_shipped"));

console.log(results);
const fails = Object.values(results).filter((v) => v !== "PASS").length;
console.log(fails ? `${fails} FAIL` : "ALL PASS");
process.exitCode = fails ? 1 : 0;
