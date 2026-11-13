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
// A seller's shipping choices (migrations/0037): their carriers (customer
// number, default) offered first when shipping; free delivery from an
// amount; delivery times shown to buyers; fees charged accordingly.
import { guardOff } from "./_guard-off.mjs";
guardOff(app, sql, env);
sql.exec(`
  INSERT INTO users (id,name,email,password_hash,role) VALUES (2,'S1','s1@x','x','seller'),(3,'S2','s2@x','x','seller'),(7,'B','b@x','x','buyer');
  INSERT INTO sellers (id,user_id,name,slug,status,location,delivery_enabled,delivery_fee_local,delivery_fee_national) VALUES
    (1,2,'Casa Freins','casa','active','Casablanca',1,2000,4000),(2,3,'Fes Auto','fes','active','Fes',1,NULL,NULL);
  INSERT INTO categories (id,name,slug) VALUES (1,'Brakes','brakes');
  INSERT INTO parts (id,seller_id,category_id,title,slug,price,quantity,status) VALUES (1,1,1,'Pads','pads',25000,50,'active'),(2,2,1,'Disc','disc',40000,10,'active');
`);
const s1 = await tok({ user_id: 2, role: "seller", seller_id: 1 });
const s2 = await tok({ user_id: 3, role: "seller", seller_id: 2 });
const buyer = await tok({ user_id: 7, role: "buyer" });

// 1. Settings: every active carrier listed, none chosen yet.
let [st, r] = await call("GET", "/api/v1/marketplace/me/shipping", s1);
check("lists_carriers", st === 200 && r.data.carriers.length >= 12 && r.data.carriers.every((c) => !c.chosen) && r.data.free_delivery_over === null, r.data?.carriers?.length);
// Save: Amana (customer number) + Sendit, Sendit by default, free from 500 MAD, 1 day here / 3 elsewhere.
[st, r] = await call("PUT", "/api/v1/marketplace/me/shipping", s1, {
  carriers: [{ code: "amana", account_ref: "AM-CLIENT-778" }, { code: "sendit" }], default_carrier: "sendit",
  free_delivery_over: "500", delivery_days_local: 1, delivery_days_national: "3",
});
const amana = r.data?.carriers.find((c) => c.code === "amana");
check("saved", st === 200 && amana.chosen && amana.account_ref === "AM-CLIENT-778" && r.data.carriers.find((c) => c.code === "sendit").is_default &&
  r.data.free_delivery_over === 50000 && r.data.delivery_days_local === 1 && r.data.delivery_days_national === 3, r.data);
// Refused: unknown carrier, default not among mine, bad amounts.
[st, r] = await call("PUT", "/api/v1/marketplace/me/shipping", s1, { carriers: [{ code: "teleport" }] });
check("unknown_carrier", st === 400, r);
[st] = await call("PUT", "/api/v1/marketplace/me/shipping", s1, { carriers: [{ code: "amana" }], default_carrier: "sendit" });
check("default_must_be_mine", st === 400);
[st] = await call("PUT", "/api/v1/marketplace/me/shipping", s1, { carriers: [], free_delivery_over: "-5" });
check("bad_amount", st === 400);
[st] = await call("PUT", "/api/v1/marketplace/me/shipping", s1, { carriers: [], delivery_days_local: 90 });
check("bad_days", st === 400);
check("refusals_changed_nothing", (await call("GET", "/api/v1/marketplace/me/shipping", s1))[1].data.carriers.filter((c) => c.chosen).length === 2);
// Another seller's settings are theirs.
check("own_settings", (await call("GET", "/api/v1/marketplace/me/shipping", s2))[1].data.carriers.every((c) => !c.chosen));

// 2. Buyer: fees, free delivery, delivery time, per city and cart.
const opt = async (parts, city) => (await call("GET", `/api/v1/commerce/fulfillment-options?parts=${parts}&city=${encodeURIComponent(city)}`))[1].data.groups;
let g = (await opt("1:1", "Casablanca"))[0];
check("local_fee_and_days", g.delivery_fee === 2000 && g.delivery_days === 1 && g.free_delivery_over === 50000, g);
g = (await opt("1:1", "Rabat"))[0];
check("national_fee_and_days", g.delivery_fee === 4000 && g.delivery_days === 3, g);
g = (await opt("1:2", "Rabat"))[0];
check("free_from_500", g.delivery_fee === 0, g);
g = (await opt("1", "Rabat"))[0];
check("old_format_still_works", g.delivery_fee === 4000);
g = (await opt("2:1", "Rabat"))[0];
check("other_seller_untouched", g.delivery_fee === 3500 && g.delivery_days === null && g.free_delivery_over === null, g);
// Part page shows the seller's free delivery and times.
const [, part] = await call("GET", "/api/v1/catalog/parts/pads");
check("part_page_fields", part.data.seller_free_delivery_over === 50000 && part.data.seller_delivery_days_local === 1 && part.data.seller_delivery_days_national === 3, part.data);

// 3. The order charges the same: 2 pads to Rabat = 500 MAD → free delivery.
const addr = { full_name: "B", phone: "0622222222", address_line1: "1 Rue", city: "Rabat", country: "MA" };
[st, r] = await call("POST", "/api/v1/commerce/orders", buyer, { items: [{ part_id: 1, quantity: 2 }], shipping_address: addr });
check("order_free_delivery", st === 201 && r.data.shipping_fee === 0 && r.data.total === 50000, r.data);
[st, r] = await call("POST", "/api/v1/commerce/orders", buyer, { items: [{ part_id: 1, quantity: 1 }], shipping_address: addr });
check("order_below_threshold_pays", r.data.shipping_fee === 4000 && r.data.total === 29000, r.data);
const oid = r.data.id;

// 4. Shipping: the seller's carriers, default first; Amana's customer number kept for them.
[st, r] = await call("GET", `/api/v1/marketplace/me/orders/${oid}`, s1);
check("ship_choices_mine", st === 200 && r.data.ship_choices.carriers.map((c) => c.code).join(",") === "sendit,amana" && r.data.ship_choices.default_carrier === "sendit", r.data?.ship_choices);
await call("PATCH", `/api/v1/marketplace/me/orders/${oid}/status`, s1, { status: "confirmed" });
[st, r] = await call("PATCH", `/api/v1/marketplace/me/orders/${oid}/status`, s1, { status: "shipped", carrier: "sendit", tracking_number: "SD-1" });
check("ships_with_mine", st === 200 && r.data.shipment.carrier === "sendit", r.data?.shipment);
// A seller with no choice sees every carrier.
const [, o2] = await call("POST", "/api/v1/commerce/orders", buyer, { items: [{ part_id: 2, quantity: 1 }], shipping_address: addr });
[st, r] = await call("GET", `/api/v1/marketplace/me/orders/${o2.data.id}`, s2);
check("no_choice_all_carriers", r.data.ship_choices.carriers.length >= 12 && r.data.ship_choices.default_carrier === null);
// Clearing the choices.
[st, r] = await call("PUT", "/api/v1/marketplace/me/shipping", s1, { carriers: [], default_carrier: null });
check("cleared", st === 200 && r.data.carriers.every((c) => !c.chosen) && r.data.free_delivery_over === null);

console.log(results);
const fails = Object.values(results).filter((v) => v !== "PASS").length;
console.log(fails ? `${fails} FAIL` : "ALL PASS");
process.exitCode = fails ? 1 : 0;
