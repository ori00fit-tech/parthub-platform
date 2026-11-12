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
// Shipping operations (utils/carriers.ts recordManualEvent,
// utils/shipping-delays.ts): carrier updates recorded by the seller or
// PartHub for carriers without a webhook, their effects (returned parcel →
// stock back), WhatsApp messages, and the daily late-shipment check.
import worker from "./.build/index.mjs";
Object.assign(env, {
  WHATSAPP_ACCESS_TOKEN: "t", WHATSAPP_PHONE_NUMBER_ID: "1",
  SELLER_PORTAL_URL: "https://seller.parthub.autos", STOREFRONT_URL: "https://parthub.autos",
});
const graph = [];
globalThis.fetch = async (url, init = {}) => {
  graph.push(JSON.parse(init.body || "null"));
  return new Response(JSON.stringify({ messages: [{ id: `wamid.${graph.length}` }] }), { status: 200, headers: { "content-type": "application/json" } });
};
const tick = () => new Promise((r) => setTimeout(r, 40));
const sent = (name) => graph.filter((g) => g?.template?.name === name);
const params = (m) => m?.template?.components?.find((c) => c.type === "body")?.parameters.map((p) => p.text);

sql.exec(`
  INSERT INTO users (id,name,email,password_hash,role,phone,locale) VALUES
    (1,'Admin','a@x','x','admin',NULL,NULL),(2,'S1','s1@x','x','seller','0611111111','fr'),(3,'S2','s2@x','x','seller','0633333333','fr'),(7,'Ali','b@x','x','buyer','0622222222','fr');
  INSERT INTO sellers (id,user_id,name,slug,status,location,delivery_enabled,whatsapp) VALUES
    (1,2,'Casa Freins','casa','active','Casablanca',1,'0661234567'),(2,3,'Other','other','active','Fes',1,'0633333333');
  INSERT INTO categories (id,name,slug) VALUES (1,'Brakes','brakes');
  INSERT INTO parts (id,seller_id,category_id,title,slug,price,quantity,status) VALUES (1,1,1,'Plaquettes Logan','pads',25000,10,'active');
`);
const templates = ["parthub_out_for_delivery", "parthub_delivery_attempt_failed", "parthub_delivery_returning", "parthub_delivery_returned",
  "parthub_order_delivered", "parthub_carrier_delivered", "parthub_shipping_delayed", "parthub_seller_shipping_delayed", "parthub_order_shipped", "parthub_order_confirmed"];
for (const t of templates) sql.prepare("insert into whatsapp_templates (name, language, status, source) values (?, 'fr', 'approved', 'manual')").run(t);
const admin = await tok({ user_id: 1, role: "admin" });
const s1 = await tok({ user_id: 2, role: "seller", seller_id: 1 });
const s2 = await tok({ user_id: 3, role: "seller", seller_id: 2 });
const buyer = await tok({ user_id: 7, role: "buyer" });
const addr = { full_name: "Ali", phone: "0622222222", address_line1: "1 Rue Y", city: "Rabat", country: "MA" };
const order = async (qty = 1) => {
  const [st, r] = await call("POST", "/api/v1/commerce/orders", buyer, { items: [{ part_id: 1, quantity: qty }], shipping_address: addr });
  if (st !== 201) throw new Error(JSON.stringify(r));
  return r.data;
};
const step = (oid, status, more = {}) => call("PATCH", `/api/v1/marketplace/me/orders/${oid}/status`, s1, { status, ...more });
const upd = (oid, status, note, who = s1) => call("POST", `/api/v1/marketplace/me/orders/${oid}/shipment`, who, { status, note });
const stock = () => sql.prepare("select quantity from parts where id = 1").get().quantity;
const ship = (oid) => sql.prepare("select * from order_shipments where order_id = ?").get(oid);

// 1. Only a shipped delivery can get an update; only its own seller.
const o1 = await order(2);
let [st, r] = await upd(o1.id, "out_for_delivery");
check("not_shipped_409", st === 409, [st, r]);
await step(o1.id, "confirmed"); await step(o1.id, "shipped", { carrier: "amana", tracking_number: "AM1" }); await tick();
[st] = await upd(o1.id, "out_for_delivery", null, s2);
check("other_seller_404", st === 404, st);
[st, r] = await upd(o1.id, "delivered");
check("seller_cannot_post_delivered_here", st === 400, st);

// 2. Steps: picked up (timeline only), out for delivery (buyer), failed attempt (reason required).
[st, r] = await upd(o1.id, "picked_up");
await tick();
check("picked_up", st === 200 && r.data.shipment.shipment_status === "picked_up" && r.data.shipment_events.some((e) => e.status === "picked_up" && e.source === "seller"), r.data?.shipment);
[st] = await upd(o1.id, "out_for_delivery"); await tick();
check("out_for_delivery_msg", st === 200 && params(sent("parthub_out_for_delivery").at(-1))?.[0] === o1.reference);
[st, r] = await upd(o1.id, "failed_attempt");
check("failed_needs_reason", st === 400 && /why/i.test(JSON.stringify(r)), r);
[st, r] = await upd(o1.id, "failed_attempt", "Client injoignable"); await tick();
check("failed_attempt", st === 200 && ship(o1.id).attempts === 1 && params(sent("parthub_delivery_attempt_failed").at(-1))?.[2] === "Client injoignable", ship(o1.id));
check("failed_event_logged", sql.prepare("select 1 from order_events where order_id = ? and event = 'delivery_attempt_failed'").get(o1.id) != null);

// 3. Returning (buyer can still say they want it), then returned: lines cancelled, stock back, seller told.
[st] = await upd(o1.id, "returning", "Refusé par le client"); await tick();
check("returning_buyer_msg", params(sent("parthub_delivery_returning").at(-1))?.join("|") === `${o1.reference}|Refusé par le client`);
const before = stock();
[st, r] = await upd(o1.id, "returned"); await tick();
const lines = sql.prepare("select status from order_items where order_id = ?").all(o1.id).map((l) => l.status);
check("returned_cancels_and_restocks", st === 200 && lines.every((s) => s === "cancelled") && stock() === before + 2 && ship(o1.id).status === "returned", [lines, stock(), before]);
check("returned_seller_msg", sent("parthub_delivery_returned").length === 1 && sent("parthub_delivery_returned")[0].to === "212661234567");
[st] = await upd(o1.id, "out_for_delivery");
check("after_final_409", st === 409, st);
[st, r] = await call("GET", `/api/v1/commerce/orders/${o1.reference}`, buyer);
check("buyer_sees_timeline", st === 200 && JSON.stringify(r.data).includes("returned"), st);

// 4. PartHub records a delivery with the cash collected.
const o2 = await order();
await step(o2.id, "confirmed"); await step(o2.id, "shipped"); await tick();
[st, r] = await call("POST", `/api/v1/admin/orders/${o2.id}/shipment`, admin, { seller_id: 1, status: "delivered", cod: "285" }); await tick();
check("admin_delivered_cod", st === 200 && ship(o2.id).cod_collected === 28500 && sql.prepare("select status from order_items where order_id = ?").get(o2.id).status === "delivered", [st, r, ship(o2.id)]);
check("admin_delivered_msgs", params(sent("parthub_carrier_delivered").at(-1))?.[2] === "285.00 MAD" && params(sent("parthub_order_delivered").at(-1))?.[0] === o2.reference);
[st] = await call("POST", `/api/v1/admin/orders/${o2.id}/shipment`, s1, { seller_id: 1, status: "delivered" });
check("admin_endpoint_admin_only", st === 403, st);
[st, r] = await call("POST", `/api/v1/admin/orders/${o2.id}/shipment`, admin, { seller_id: 1, status: "teleported" });
check("admin_invalid_status", st === 400, st);

// 5. Late shipments: no update for 4+ days → listed, buyer and seller told once, cleared by the next update.
const o3 = await order();
await step(o3.id, "confirmed"); await step(o3.id, "shipped", { carrier: "amana", tracking_number: "AM3" }); await tick();
const o4 = await order();
await step(o4.id, "confirmed"); await step(o4.id, "shipped"); await tick();
sql.prepare("update order_shipments set status_at = datetime('now', '-5 days'), shipped_at = datetime('now', '-5 days') where order_id = ?").run(o3.id);
sql.prepare("update order_shipments set status_at = datetime('now', '-2 days'), shipped_at = datetime('now', '-2 days') where order_id = ?").run(o4.id);
[st, r] = await call("GET", "/api/v1/admin/shipments/late", admin);
check("late_listed", st === 200 && r.data.shipments.length === 1 && r.data.shipments[0].reference === o3.reference && r.data.shipments[0].days === 5 &&
  r.data.shipments[0].carrier_name.startsWith("Amana") && !("buyer_locale" in r.data.shipments[0]), r.data);
const cron = async () => {
  const jobs = [];
  await worker.scheduled({}, env, { waitUntil: (p) => jobs.push(p) });
  await Promise.all(jobs);
};
await cron();
check("late_buyer_msg", params(sent("parthub_shipping_delayed").at(-1))?.join("|") === `${o3.reference}|5`, params(sent("parthub_shipping_delayed").at(-1)));
check("late_seller_msg", params(sent("parthub_seller_shipping_delayed").at(-1))?.join("|") ?.startsWith(`${o3.reference}|5|Amana`), params(sent("parthub_seller_shipping_delayed").at(-1)));
check("late_logged", sql.prepare("select 1 from order_events where order_id = ? and event = 'shipping_delayed'").get(o3.id) != null && ship(o3.id).delay_notified_at != null);
await cron();
check("late_told_once", sent("parthub_shipping_delayed").length === 1 && sent("parthub_seller_shipping_delayed").length === 1);
[st] = await upd(o3.id, "in_transit", "Au centre de tri");
check("update_clears_delay", st === 200 && ship(o3.id).delay_notified_at === null);
[st, r] = await call("GET", "/api/v1/admin/shipments/late", admin);
check("late_gone_after_update", r.data.shipments.length === 0, r.data.shipments);

console.log(results);
const fails = Object.values(results).filter((v) => v !== "PASS").length;
console.log(fails ? `${fails} FAIL` : "ALL PASS");
process.exitCode = fails ? 1 : 0;
