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
sql.exec(`
  INSERT INTO users (id,name,email,password_hash,role) VALUES (2,'S1','s1@x','x','seller'),(3,'S2','s2@x','x','seller'),(4,'S3','s3@x','x','seller'),(7,'Buyer','b@x','x','buyer');
  INSERT INTO sellers (id,user_id,name,slug,status,location,phone,delivery_enabled,pickup_enabled,pickup_address,pickup_hours) VALUES
    (1,2,'Casse One','one','active','Casablanca','0600000001',1,1,'12 Rue des Casses, Hay Hassani','9h-19h'),
    (2,3,'Shop Two','two','active','Rabat','0600000002',1,0,NULL,NULL),
    (3,4,'Pickup Only','three','active','Fes','0600000003',0,1,'Quartier industriel, Fes',NULL);
  INSERT INTO categories (id,name,slug) VALUES (1,'Engine','engine');
  INSERT INTO parts (id,seller_id,category_id,title,slug,price,quantity,status,delivery_available) VALUES
    (1,1,1,'Alternator','alt',50000,5,'active',1),
    (2,2,1,'Filter','flt',5000,5,'active',1),
    (3,3,1,'Gearbox','gbx',300000,2,'active',1),
    (4,1,1,'Engine K9K','eng',900000,2,'active',0);
`);
const buyer = await tok({ user_id: 7, role: "buyer" });
const s1 = await tok({ user_id: 2, role: "seller", seller_id: 1 });
const s2 = await tok({ user_id: 3, role: "seller", seller_id: 2 });
const addr = { full_name: "Ali", phone: "0611111111", address_line1: "5 Rue X", city: "Rabat", country: "MA" };
const noAddr = { full_name: "Ali", phone: "0611111111" };

let [st, r] = await call("GET", "/api/v1/commerce/fulfillment-options?parts=1,2,3,4");
const g = (id) => r.data.groups.find((x) => x.seller_id === id);
check("options s1", JSON.stringify(g(1).methods) === '["pickup","courier"]' && g(1).pickup.address.includes("Hay Hassani") && JSON.stringify(g(1).pickup_only_parts) === "[4]", g(1));
check("options s2", JSON.stringify(g(2).methods) === '["delivery"]' && g(2).pickup === null, g(2));
check("options s3", JSON.stringify(g(3).methods) === '["pickup","courier"]', g(3));
[st, r] = await call("GET", "/api/v1/commerce/fulfillment-options?parts=1");
check("options s1 deliverable", JSON.stringify(r.data.groups[0].methods) === '["delivery","pickup","courier"]' && r.data.flat_fee === 3500, r.data);

// Mixed: s1 pickup + s2 delivery
[st, r] = await call("POST", "/api/v1/commerce/orders", buyer, { items: [{ part_id: 1, quantity: 1 }, { part_id: 2, quantity: 1 }], shipping_address: addr, fulfillment: { 1: { method: "pickup" }, 2: { method: "delivery" } } });
check("mixed order", st === 201 && r.data.shipping_fee === 3500, [st, r]);
const ref1 = r.data.reference, id1 = r.data.id;
const lines = sql.prepare("select seller_id, fulfillment, pickup_code from order_items where order_id = ? order by seller_id").all(id1);
check("lines methods", lines[0].fulfillment === "pickup" && /^\d{6}$/.test(lines[0].pickup_code) && lines[1].fulfillment === "delivery" && lines[1].pickup_code === null, lines);
const code1 = lines[0].pickup_code;
[st, r] = await call("GET", `/api/v1/commerce/orders/${ref1}`, buyer);
check("buyer sees code + store", r.data.items.find((i) => i.seller_id === 1).pickup_code === code1 && r.data.pickups.length === 1 && r.data.pickups[0].pickup_address.includes("Hay Hassani") && r.data.pickups[0].pickup_hours === "9h-19h", r.data.pickups);

// Pickup only: no address, no fee
[st, r] = await call("POST", "/api/v1/commerce/orders", buyer, { items: [{ part_id: 4, quantity: 1 }], shipping_address: noAddr, fulfillment: { 1: { method: "courier", collector_name: "Driver Said", collector_phone: "0622" } } });
check("pickup-only order", st === 201 && r.data.shipping_fee === 0 && r.data.total === 900000, [st, r]);
const id2 = r.data.id;
check("collector saved", sql.prepare("select collector_name from order_items where order_id = ?").get(id2).collector_name === "Driver Said");
const addrRow = sql.prepare("select address_line1, city, country from order_addresses where order_id = ?").get(id2);
check("empty address ok", addrRow.address_line1 === "" && addrRow.country === "MA", addrRow);

// Refusals
[st, r] = await call("POST", "/api/v1/commerce/orders", buyer, { items: [{ part_id: 4, quantity: 1 }], shipping_address: addr, fulfillment: { 1: { method: "delivery" } } });
check("pickup-only part can't be delivered", st === 409, [st, r]);
[st, r] = await call("POST", "/api/v1/commerce/orders", buyer, { items: [{ part_id: 3, quantity: 1 }], shipping_address: addr });
check("default delivery refused for pickup-only store", st === 409 && /Choose how/.test(r.error || r.message || JSON.stringify(r)), [st, r]);
[st, r] = await call("POST", "/api/v1/commerce/orders", buyer, { items: [{ part_id: 2, quantity: 1 }], shipping_address: noAddr });
check("delivery needs address", st === 400, [st, r]);
[st, r] = await call("POST", "/api/v1/commerce/orders", buyer, { items: [{ part_id: 2, quantity: 1 }], shipping_address: addr, fulfillment: { 2: { method: "pickup" } } });
check("pickup not offered", st === 409, [st, r]);
check("stock untouched by refusals", sql.prepare("select quantity from parts where id = 3").get().quantity === 2);

// Seller flow (s1, order 1)
[st, r] = await call("GET", `/api/v1/marketplace/me/orders/${id1}`, s1);
check("seller view", r.data.fulfillment === "pickup" && JSON.stringify(r.data.next_statuses) === '["confirmed","cancelled"]' && !JSON.stringify(r.data).includes(code1), r.data);
[st, r] = await call("PATCH", `/api/v1/marketplace/me/orders/${id1}/status`, s1, { status: "confirmed" });
check("confirm = reserve", st === 200 && r.data.pickup_until && JSON.stringify(r.data.next_statuses) === '["delivered","cancelled"]', r.data);
const until = new Date(r.data.pickup_until.replace(" ", "T") + "Z").getTime();
check("hold 3 days", Math.abs(until - Date.now() - 3 * 86400000) < 120000, r.data.pickup_until);
[st] = await call("PATCH", `/api/v1/marketplace/me/orders/${id1}/status`, s1, { status: "shipped" });
check("no shipped for pickup", st === 409, st);
[st, r] = await call("PATCH", `/api/v1/marketplace/me/orders/${id1}/status`, s1, { status: "delivered" });
check("collected needs code", st === 400, [st, r]);
[st, r] = await call("PATCH", `/api/v1/marketplace/me/orders/${id1}/status`, s1, { status: "delivered", code: code1 });
check("collected with code", st === 200 && r.data.status === "delivered", [st, r]);
check("s2 line untouched", sql.prepare("select status from order_items where order_id = ? and seller_id = 2").get(id1).status === "pending");
check("delivered_at set (returns window)", sql.prepare("select delivered_at from order_items where order_id = ? and seller_id = 1").get(id1).delivered_at !== null);

// Lock after 5 wrong codes (order 2)
await call("PATCH", `/api/v1/marketplace/me/orders/${id2}/status`, s1, { status: "confirmed" });
const code2 = sql.prepare("select pickup_code from order_items where order_id = ?").get(id2).pickup_code;
const wrong = code2 === "000000" ? "111111" : "000000";
for (let i = 0; i < 5; i++) await call("PATCH", `/api/v1/marketplace/me/orders/${id2}/status`, s1, { status: "delivered", code: wrong });
[st, r] = await call("PATCH", `/api/v1/marketplace/me/orders/${id2}/status`, s1, { status: "delivered", code: code2 });
check("locked after 5", st === 423, [st, r]);
[st, r] = await call("PATCH", `/api/v1/marketplace/me/orders/${id2}/status`, s1, { status: "cancelled", note: "Buyer didn't come within 3 days" });
check("cancel not collected", st === 200 && sql.prepare("select quantity from parts where id = 4").get().quantity === 2, [st, r]);

// Delivery flow unchanged (s2)
[st, r] = await call("GET", `/api/v1/marketplace/me/orders/${id1}`, s2);
check("delivery next", r.data.fulfillment === "delivery" && JSON.stringify(r.data.next_statuses) === '["confirmed","cancelled"]' && r.data.pickup_until === null, r.data);

// Settings
[st, r] = await call("PUT", "/api/v1/marketplace/me/fulfillment", s2, { delivery_enabled: false, pickup_enabled: false });
check("needs one method", st === 400);
[st, r] = await call("PUT", "/api/v1/marketplace/me/fulfillment", s2, { delivery_enabled: true, pickup_enabled: true, pickup_address: "x" });
check("pickup needs address", st === 400);
[st, r] = await call("PUT", "/api/v1/marketplace/me/fulfillment", s2, { delivery_enabled: true, pickup_enabled: true, pickup_address: "Bd Mohammed V, Rabat", pickup_hours: "9h-18h" });
check("settings saved", st === 200 && r.data.pickup_enabled === 1 && r.data.pickup_address === "Bd Mohammed V, Rabat", r);
[st, r] = await call("PUT", "/api/v1/marketplace/me/parts/2/fulfillment", s2, { delivery_available: false });
check("part pickup only", st === 200 && sql.prepare("select delivery_available from parts where id = 2").get().delivery_available === 0);
[st] = await call("PUT", "/api/v1/marketplace/me/parts/1/fulfillment", s2, { delivery_available: false });
check("other seller's part", st === 404, st);
[st, r] = await call("GET", "/api/v1/catalog/parts/flt");
check("catalog flags", r.data.can_deliver === 0 && r.data.can_pickup === 1, r.data);
console.log(results);
const fails = Object.values(results).filter(v => v !== "PASS").length; console.log(fails ? `${fails} FAIL` : "ALL PASS");
