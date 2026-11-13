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
import { guardOff } from "./_guard-off.mjs";
guardOff(app, sql, env);
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
// Carrier integration layer (utils/carriers.ts, routes/carriers.ts,
// migrations/0026): carriers table, generic webhook (token / HMAC),
// status mapping, effects on the order, dedupe, custom formats, admin.
const SECRET = "sendit-test-secret-0123456789";
const OZ_SECRET = "ozon-test-secret-0123456789ab";
env.CARRIER_SENDIT_WEBHOOK_SECRET = SECRET;
env.CARRIER_OZONEXPRESS_WEBHOOK_SECRET = OZ_SECRET;
sql.exec(`
  INSERT INTO users (id,name,email,password_hash,role) VALUES (1,'A','a@x','x','admin'),(2,'S1','s1@x','x','seller'),(7,'B','b@x','x','buyer');
  INSERT INTO sellers (id,user_id,name,slug,status,location,delivery_enabled) VALUES (1,2,'Shop','shop','active','Casablanca',1);
  INSERT INTO categories (id,name,slug) VALUES (1,'Brakes','brakes');
  INSERT INTO parts (id,seller_id,category_id,title,slug,price,quantity,status) VALUES (1,1,1,'Pads','pads',30000,10,'active');
`);
const admin = await tok({ user_id: 1, role: "admin" });
const s1 = await tok({ user_id: 2, role: "seller", seller_id: 1 });
const buyer = await tok({ user_id: 7, role: "buyer" });
const addr = { full_name: "Ali", phone: "0611", address_line1: "1 Rue Y", city: "Casablanca", country: "MA" };
const newOrder = async (qty = 1) => {
  const [st, r] = await call("POST", "/api/v1/commerce/orders", buyer, { items: [{ part_id: 1, quantity: qty }], shipping_address: addr });
  if (st !== 201) throw new Error(JSON.stringify(r));
  return r.data;
};
const ship = async (oid, carrier, tracking) => {
  await call("PATCH", `/api/v1/marketplace/me/orders/${oid}/status`, s1, { status: "confirmed" });
  return call("PATCH", `/api/v1/marketplace/me/orders/${oid}/status`, s1, { status: "shipped", carrier, tracking_number: tracking });
};
const hook = async (code, body, { token, sig, form } = {}) => {
  const raw = form ? new URLSearchParams(body).toString() : JSON.stringify(body);
  const headers = { "Content-Type": form ? "application/x-www-form-urlencoded" : "application/json" };
  if (sig) headers["X-PartHub-Signature"] = sig;
  const r = await app.request(`/api/v1/carriers/${code}/webhook${token ? `?token=${encodeURIComponent(token)}` : ""}`, { method: "POST", headers, body: raw }, env);
  return [r.status, await r.json()];
};
const hmac = async (secret, raw) => {
  const { createHmac } = await import("node:crypto");
  return createHmac("sha256", secret).update(raw).digest("hex");
};
const shipment = (oid) => sql.prepare("select * from order_shipments where order_id = ?").get(oid);
const lines = (oid) => sql.prepare("select status from order_items where order_id = ?").all(oid).map((l) => l.status);

// 1. Carriers list and seller choice.
let [st, r] = await call("GET", "/api/v1/carriers", null);
check("list_carriers", st === 200 && r.data.length === 12 && r.data.some((c) => c.code === "ozonexpress"), r.data?.length);
const o1 = await newOrder(2);
[st, r] = await ship(o1.id, "sendit", "SD-1001");
check("ship_with_carrier", st === 200 && r.data.shipment.carrier === "sendit" && r.data.shipment.tracking_number === "SD-1001" && r.data.shipment.shipment_status === "in_transit", r.data?.shipment);
const o9 = await newOrder();
[st, r] = await ship(o9.id, "speedaf", "SP-1");
check("unknown_carrier_dropped", r.data.shipment.carrier === null, r.data.shipment);
[st] = await call("POST", "/api/v1/admin/carriers", admin, { code: "speedaf", name: "Speedaf" });
check("admin_adds_carrier", st === 200, st);
sql.exec(`UPDATE order_items SET status = 'confirmed' WHERE order_id = ${o9.id}`);
[st, r] = await call("PATCH", `/api/v1/marketplace/me/orders/${o9.id}/status`, s1, { status: "shipped", carrier: "speedaf", tracking_number: "SP-1" });
check("new_carrier_usable", r.data.shipment.carrier === "speedaf", r.data.shipment);

// 2. Webhook security.
// Carrier times: after the seller marked it shipped (now), an hour apart.
const at = (h) => new Date(Date.now() + h * 3600000).toISOString().slice(0, 19).replace("T", " ");
const ev = (status, extra = {}) => ({ tracking_number: "SD-1001", status, updated_at: at(1), ...extra });
[st] = await hook("sendit", ev("Ramassé"), { token: SECRET });
check("webhook_disabled_404", st === 404, st);
await call("PUT", "/api/v1/admin/carriers/sendit", admin, { webhook_enabled: true });
await call("PUT", "/api/v1/admin/carriers/cathedis", admin, { webhook_enabled: true });
[st] = await hook("cathedis", ev("Ramassé"), { token: "whatever-whatever-1234" });
check("webhook_no_secret_404", st === 404, st);
[st] = await hook("sendit", ev("Ramassé"), { token: "wrong-token-wrong-token" });
check("webhook_bad_token_401", st === 401, st);
[st] = await hook("sendit", ev("Ramassé"));
check("webhook_no_auth_401", st === 401, st);

// 3. Status flow: picked up -> failed attempt -> delivered (with COD).
[st, r] = await hook("sendit", ev("Ramassé"), { token: SECRET });
check("picked_up", st === 200 && r.data.applied === 1 && shipment(o1.id).status === "picked_up", [r, shipment(o1.id)]);
[st, r] = await hook("sendit", ev("Non livré - client injoignable", { updated_at: at(5) }), { token: SECRET });
check("failed_attempt", shipment(o1.id).status === "failed_attempt" && shipment(o1.id).attempts === 1 && lines(o1.id).every((s) => s === "shipped"), shipment(o1.id));
const deliveredAt = at(26);
const delivered = ev("Livré", { updated_at: deliveredAt, cod_amount: "620,00" });
const raw = JSON.stringify(delivered);
[st, r] = await (async () => {
  const res = await app.request("/api/v1/carriers/sendit/webhook", { method: "POST", headers: { "Content-Type": "application/json", "X-PartHub-Signature": `sha256=${await hmac(SECRET, raw)}` }, body: raw }, env);
  return [res.status, await res.json()];
})();
const sh1 = shipment(o1.id);
check("delivered_hmac", st === 200 && r.data.applied === 1, [st, r]);
check("delivered_effects", sh1.status === "delivered" && sh1.carrier_delivered_at === deliveredAt && sh1.cod_collected === 62000 && lines(o1.id).every((s) => s === "delivered"), sh1);
check("order_delivered", sql.prepare("select status from orders where id = ?").get(o1.id).status === "delivered");
check("order_event_carrier", sql.prepare("select count(*) n from order_events where order_id = ? and event = 'delivered_by_carrier' and created_by = 'carrier:sendit'").get(o1.id).n === 1);
[st] = await hook("sendit", delivered, { sig: "deadbeef" });
check("bad_hmac_401", st === 401, st);

// 4. Duplicate and out-of-order events change nothing.
[st, r] = await hook("sendit", delivered, { token: SECRET });
check("duplicate", st === 200 && r.data.duplicate === 1 && r.data.applied === 0, r.data);
[st, r] = await hook("sendit", ev("En transit", { updated_at: at(30) }), { token: SECRET });
// (a later in-progress event after delivery: timeline only, still delivered)
check("older_event_kept_in_timeline_only", shipment(o1.id).status === "delivered" && r.data.applied === 1, shipment(o1.id).status);

// 5. A carrier with its own format: events list, custom fields, its own codes.
const o2 = await newOrder(3);
await ship(o2.id, "ozonexpress", "OZ 77 88");
const stockBefore = sql.prepare("select quantity from parts where id = 1").get().quantity;
[st] = await call("PUT", "/api/v1/admin/carriers/ozonexpress", admin, {
  webhook_enabled: true,
  field_map: { events: "data.parcels", tracking: "code", status: "state", cod: "amount", cod_unit: "centimes", time: "at", note: "why" },
  status_map: { "9": "returned", "4": "out_for_delivery" },
  tracking_url_template: "https://track.example.ma/colis/{tracking}",
});
check("custom_maps_saved", st === 200, st);
const ozBody = { data: { parcels: [{ code: "OZ7788", state: "4", at: Math.floor(Date.now() / 1000) + 3600 }, { code: "OZ7788", state: "9", at: Math.floor(Date.now() / 1000) + 90000, why: "Refusé par le client" }] } };
[st, r] = await hook("ozonexpress", ozBody, { token: OZ_SECRET });
check("custom_format", st === 200 && r.data.received === 2 && r.data.applied === 2, r.data);
check("returned_effects", shipment(o2.id).status === "returned" && lines(o2.id).every((s) => s === "cancelled"), [shipment(o2.id), lines(o2.id)]);
check("returned_restocked_once", sql.prepare("select quantity from parts where id = 1").get().quantity === stockBefore + 3);
[st, r] = await hook("ozonexpress", ozBody, { token: OZ_SECRET });
check("returned_replay_no_double_restock", r.data.duplicate === 2 && sql.prepare("select quantity from parts where id = 1").get().quantity === stockBefore + 3, r.data);
check("delivery_failed_event", sql.prepare("select note from order_events where order_id = ? and event = 'delivery_failed'").get(o2.id)?.note === "Returned by the carrier: Refusé par le client");

// 5b. A carrier clock behind ours: "delivered" dated before the seller's
//     "shipped" still delivers (a final status beats an in-progress one).
const o3 = await newOrder();
await ship(o3.id, "sendit", "SD-3003");
[st, r] = await hook("sendit", { tracking_number: "SD 3003", status: "Livré", updated_at: at(-3) }, { token: SECRET });
check("final_beats_clock_skew", shipment(o3.id).status === "delivered" && lines(o3.id).every((x) => x === "delivered"), [r.data, shipment(o3.id)]);

// 6. Form body, unknown tracking, unknown words.
[st, r] = await hook("sendit", { tracking_number: "SD-NOPE", status: "Livré" }, { token: SECRET, form: true });
check("form_body_unknown_shipment", st === 200 && r.data.unknown_shipment === 1, r.data);
[st, r] = await hook("sendit", { tracking_number: "SD-1001", status: "Statut bizarre 42" }, { token: SECRET });
check("unknown_status_recorded", r.data.unknown_status === 1, r.data);
[st] = await hook("sendit", "not json", { token: SECRET });
check("junk_body", st === 200 || st === 400, st);

// 7. Admin screens and rules.
[st, r] = await call("GET", "/api/v1/admin/carriers", admin);
const sd = r.data.find((c) => c.code === "sendit"), cat = r.data.find((c) => c.code === "cathedis");
check("admin_list", st === 200 && sd.secret_configured === true && cat.secret_configured === false && sd.webhook_url.endsWith("/api/v1/carriers/sendit/webhook") && sd.unmatched_7d === 1 && !JSON.stringify(r.data).includes(SECRET), sd);
[st] = await call("PUT", "/api/v1/admin/carriers/sendit", admin, { tracking_url_template: "http://bad/{tracking}" });
check("bad_tracking_link", st === 400, st);
[st] = await call("PUT", "/api/v1/admin/carriers/sendit", admin, { status_map: { "X": "teleported" } });
check("bad_status_map", st === 400, st);
[st] = await call("PUT", "/api/v1/admin/carriers/sendit", admin, { field_map: { tracking: "a", colour: "b" } });
check("bad_field_map", st === 400, st);
const evCount = sql.prepare("select count(*) n from shipment_events").get().n;
[st, r] = await call("POST", "/api/v1/admin/carriers/ozonexpress/test", admin, { payload: JSON.stringify(ozBody) });
check("dry_run", st === 200 && r.data.read === 2 && r.data.events[1].status === "returned" && r.data.events[1].order_id === o2.id && sql.prepare("select count(*) n from shipment_events").get().n === evCount, r.data);
for (const [who, t] of [["seller", s1], ["buyer", buyer]]) {
  [st] = await call("GET", "/api/v1/admin/carriers", t);
  check(`admin_only_${who}`, st === 403, st);
}

// 8. Buyer and seller see the status, the timeline and the tracking link.
[st, r] = await call("GET", `/api/v1/commerce/orders/${o2.reference}`, buyer);
const bs = r.data.shipments[0];
check("buyer_view", st === 200 && bs.shipment_status === "returned" && bs.tracking_url === "https://track.example.ma/colis/OZ%2077%2088" && bs.events.length >= 3 && !("tracking_url_template" in bs), bs);
[st, r] = await call("GET", `/api/v1/marketplace/me/orders/${o1.id}`, s1);
check("seller_view", st === 200 && r.data.shipment.shipment_status === "delivered" && r.data.shipment.cod_collected === 62000 && r.data.shipment_events.some((e) => e.source === "carrier"), r.data.shipment);

console.log(results);
const fails = Object.values(results).filter((v) => v !== "PASS").length;
console.log(fails ? `${fails} FAIL` : "ALL PASS");
process.exitCode = fails ? 1 : 0;
