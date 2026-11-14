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
// Isolation (IDOR): seller B tries every seller route on seller A's records,
// buyer B on buyer A's. Every attempt must be refused (403/404) and change
// nothing; A still works on their own.
import { guardOff } from "./_guard-off.mjs";
guardOff(app, sql, env);
sql.exec(`
  INSERT INTO users (id,name,email,password_hash,role) VALUES (2,'Seller A','a@x','x','seller'),(3,'Seller B','b@x','x','seller'),(7,'Buyer A','ba@x','x','buyer'),(8,'Buyer B','bb@x','x','buyer');
  INSERT INTO sellers (id,user_id,name,slug,status,location,delivery_enabled) VALUES (1,2,'Shop A','shop-a','active','Casablanca',1),(2,3,'Shop B','shop-b','active','Fes',1);
  INSERT INTO categories (id,name,slug) VALUES (1,'Brakes','brakes');
  INSERT INTO parts (id,seller_id,category_id,title,slug,price,quantity,status) VALUES (1,1,1,'A pads','a-pads',30000,10,'active'),(2,2,1,'B disc','b-disc',40000,10,'active');
  INSERT INTO part_images (id,part_id,url,is_featured) VALUES (11,1,'/api/v1/media/uploads/a.jpg',1);
  INSERT INTO part_compatibility (id,part_id,make,model,year_start,year_end) VALUES (21,1,'Dacia','Logan',2012,2020);
`);
const A = await tok({ user_id: 2, role: "seller", seller_id: 1 });
const B = await tok({ user_id: 3, role: "seller", seller_id: 2 });
const buyerA = await tok({ user_id: 7, role: "buyer" });
const buyerB = await tok({ user_id: 8, role: "buyer" });
const addr = { full_name: "Buyer A", phone: "0622222222", address_line1: "5 Rue Privée", city: "Rabat", country: "MA" };
const [, ord] = await call("POST", "/api/v1/commerce/orders", buyerA, { items: [{ part_id: 1, quantity: 1 }], shipping_address: addr });
const oid = ord.data.id, ref = ord.data.reference;
const item = sql.prepare("select id from order_items where order_id = ?").get(oid).id;
// A delivered line with a claim, for the claim routes.
sql.prepare("update order_items set status = 'delivered', delivered_at = datetime('now') where id = ?").run(item);
const [, iss] = await call("POST", `/api/v1/commerce/orders/${ref}/issues`, buyerA, { order_item_id: item, reason: "damaged", details: "Arrivée cassée en deux" });
const issueId = iss.data.id;
// A part request by buyer A, with an offer from seller A.
const [, req] = await call("POST", "/api/v1/requests", buyerA, { make: "Dacia", model: "Logan", year: 2016, part_name: "Alternateur", city: "Rabat", phone: "0622222222", category_id: 1 });
const reqId = req.data?.id;
await call("PUT", `/api/v1/requests/inbox/${reqId}/offer`, A, { price: 1200, condition: "used", note: "Bon état" });

const snapshot = () => JSON.stringify({
  part: sql.prepare("select title, price, quantity, status from parts where id = 1").get(),
  images: sql.prepare("select id, is_featured from part_images where part_id = 1").all(),
  compat: sql.prepare("select id from part_compatibility where part_id = 1").all(),
  numbers: sql.prepare("select count(*) n from part_listing_numbers where part_id = 1").get(),
  item: sql.prepare("select status from order_items where id = ?").get(item),
  shipment: sql.prepare("select carrier, tracking_number, status from order_shipments where order_id = ?").get(oid),
  issue: sql.prepare("select status, seller_note from order_issues where id = ?").get(issueId),
  offers: sql.prepare("select seller_id, price, status from request_offers where request_id = ?").all(reqId),
  request: sql.prepare("select status from part_requests where id = ?").get(reqId),
});
const before = snapshot();
const leaks = [];
const attempt = async (who, label, m, url, body) => {
  const [st, j] = await call(m, url, who, body);
  const text = JSON.stringify(j || {});
  if (st < 400 || /Rue Privée|0622222222|Buyer A|a-pads|A pads/.test(text) && st < 400) leaks.push(`${label}: ${m} ${url} → ${st}`);
};
// Seller B on seller A's order, parts, photos, compatibility, numbers, claims.
await attempt(B, "order", "GET", `/api/v1/marketplace/me/orders/${oid}`);
await attempt(B, "order status", "PATCH", `/api/v1/marketplace/me/orders/${oid}/status`, { status: "cancelled", note: "x" });
await attempt(B, "shipment", "POST", `/api/v1/marketplace/me/orders/${oid}/shipment`, { status: "returned" });
await attempt(B, "part", "GET", "/api/v1/marketplace/me/parts/1");
await attempt(B, "part edit", "PUT", "/api/v1/marketplace/me/parts/1", { title: "Hacked", price: 1, quantity: 0 });
await attempt(B, "part legacy", "GET", "/api/v1/marketplace/parts/1");
await attempt(B, "part legacy edit", "PUT", "/api/v1/marketplace/parts/1", { title: "Hacked", price: 1 });
await attempt(B, "part fulfilment", "PUT", "/api/v1/marketplace/me/parts/1/fulfillment", { delivery_available: false });
await attempt(B, "compat list", "GET", "/api/v1/marketplace/me/parts/1/compatibility");
await attempt(B, "compat add", "POST", "/api/v1/marketplace/me/parts/1/compatibility", { make: "Renault", model: "Clio" });
await attempt(B, "compat delete", "DELETE", "/api/v1/marketplace/me/parts/1/compatibility/21");
await attempt(B, "numbers", "GET", "/api/v1/marketplace/me/parts/1/numbers");
await attempt(B, "numbers set", "PUT", "/api/v1/marketplace/me/parts/1/numbers", { numbers: [{ number: "7701208265", type: "oem" }] });
await attempt(B, "images list", "GET", "/api/v1/marketplace/parts/1/images");
await attempt(B, "image add", "POST", "/api/v1/marketplace/parts/1/images", { url: "/api/v1/media/uploads/evil.jpg" });
await attempt(B, "image delete", "DELETE", "/api/v1/marketplace/parts/1/images/11");
await attempt(B, "image feature", "PUT", "/api/v1/marketplace/parts/1/images/11/feature");
await attempt(B, "claim respond", "POST", `/api/v1/marketplace/me/issues/${issueId}/respond`, { decision: "refuse", note: "non" });
await attempt(B, "claim resolve", "POST", `/api/v1/marketplace/me/issues/${issueId}/resolve`, {});
// Buyer B on buyer A's order, claim and request.
await attempt(buyerB, "buyer order", "GET", `/api/v1/commerce/orders/${ref}`);
await attempt(buyerB, "buyer received", "POST", `/api/v1/commerce/orders/${ref}/received`);
await attempt(buyerB, "buyer claim", "POST", `/api/v1/commerce/orders/${ref}/issues`, { order_item_id: item, reason: "damaged", details: "Fausse réclamation ici" });
await attempt(buyerB, "buyer escalate", "POST", `/api/v1/commerce/issues/${issueId}/escalate`, {});
await attempt(buyerB, "buyer withdraw", "POST", `/api/v1/commerce/issues/${issueId}/withdraw`, {});
await attempt(buyerB, "buyer request", "GET", `/api/v1/requests/mine/${reqId}`);
await attempt(buyerB, "buyer request close", "POST", `/api/v1/requests/mine/${reqId}/close`, {});
const offerId = sql.prepare("select id from request_offers where request_id = ?").get(reqId)?.id;
await attempt(buyerB, "buyer accept offer", "POST", `/api/v1/requests/mine/${reqId}/accept/${offerId}`, {});
// Not signed in at all (the legacy part route had no check).
await attempt(null, "anonymous part", "GET", "/api/v1/marketplace/parts/1");
// A buyer is not a seller.
await attempt(buyerA, "buyer as seller", "GET", `/api/v1/marketplace/me/orders/${oid}`);
await attempt(buyerA, "buyer edits part", "PUT", "/api/v1/marketplace/me/parts/1", { price: 1 });

check("no_cross_access", leaks.length === 0, leaks);
check("nothing_changed", snapshot() === before, [JSON.parse(before), JSON.parse(snapshot())]);
// B's list never shows A's records.
const [, bOrders] = await call("GET", "/api/v1/marketplace/me/orders", B);
const [, bParts] = await call("GET", "/api/v1/marketplace/me/parts", B);
const [, bIssues] = await call("GET", "/api/v1/marketplace/me/issues", B);
check("lists_are_own", !(bOrders.data || []).some((o) => o.id === oid) && (bParts.data || []).every((p) => p.id !== 1) && !(bIssues.data?.items || []).some((i) => i.id === issueId));
// …while A works on their own (the routes above are not simply broken).
check("owner_can_read_order", (await call("GET", `/api/v1/marketplace/me/orders/${oid}`, A))[0] === 200);
check("owner_can_read_part", (await call("GET", "/api/v1/marketplace/me/parts/1", A))[0] === 200 && (await call("GET", "/api/v1/marketplace/parts/1", A))[0] === 200);
check("owner_can_list_images", (await call("GET", "/api/v1/marketplace/parts/1/images", A))[0] === 200);
check("buyer_can_read_own", (await call("GET", `/api/v1/commerce/orders/${ref}`, buyerA))[0] === 200);
check("checked_enough", reqId && offerId && issueId, [reqId, offerId, issueId]);

// Suspended, unfinished and deactivated accounts lose the seller part route.
sql.exec(`
  INSERT INTO users (id,name,email,password_hash,role,is_active) VALUES (4,'Seller C','c@x','x','seller',1),(5,'Seller D','d@x','x','seller',1),(6,'Seller E','e@x','x','seller',0);
  INSERT INTO sellers (id,user_id,name,slug,status) VALUES (3,4,'Shop C','shop-c','suspended'),(4,5,'Shop D','shop-d','pending'),(5,6,'Shop E','shop-e','active');
  INSERT INTO parts (id,seller_id,category_id,title,slug,price,quantity,status) VALUES (3,3,1,'C part','c-part',1000,1,'active'),(4,4,1,'D part','d-part',1000,1,'draft'),(5,5,1,'E part','e-part',1000,1,'active');
  UPDATE parts SET status = 'pending' WHERE id = 2;
`);
const C = await tok({ user_id: 4, role: "seller", seller_id: 3 });
const D = await tok({ user_id: 5, role: "seller", seller_id: 4 });
const E = await tok({ user_id: 6, role: "seller", seller_id: 5 });
check("suspended_seller_refused", (await call("GET", "/api/v1/marketplace/parts/3", C))[0] === 403);
check("pending_seller_refused", (await call("GET", "/api/v1/marketplace/parts/4", D))[0] === 403);
check("deactivated_user_refused", (await call("GET", "/api/v1/marketplace/parts/5", E))[0] === 401);
// The public part page is a different route: published parts of active stores only.
check("public_page_shows_published", (await call("GET", "/api/v1/catalog/parts/a-pads", null))[0] === 200);
check("public_page_hides_pending", (await call("GET", "/api/v1/catalog/parts/b-disc", null))[0] === 404);
check("public_page_hides_draft", (await call("GET", "/api/v1/catalog/parts/d-part", null))[0] === 404);
check("public_page_hides_suspended_store", (await call("GET", "/api/v1/catalog/parts/c-part", null))[0] === 404);

console.log(results);
const fails = Object.values(results).filter((v) => v !== "PASS").length;
console.log(fails ? `${fails} FAIL` : "ALL PASS");
process.exitCode = fails ? 1 : 0;
