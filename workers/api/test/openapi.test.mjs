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
// The apps' contract (src/openapi.ts, GET /api/v1/openapi.json):
// 1. every route the apps can use is documented, and every documented route exists;
// 2. real answers (success and failure) match the documented schemas.
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const Ajv2020 = require("ajv/dist/2020").default;
import { hashPassword } from "./.build/auth.mjs";

let [st, spec] = await call("GET", "/api/v1/openapi.json");
check("served", st === 200 && spec.openapi === "3.1.0" && spec.paths["/api/v1/commerce/orders"], st);
const version = JSON.parse(readFileSync(ROOT + "workers/api/package.json", "utf8")).version;
check("version", spec.info.version === version, spec.info.version);

// 1. Coverage, both ways. Not in the contract on purpose: the admin (web
// only) and the webhooks (Meta, carriers), and the old /health alias.
const NOT_FOR_APPS = [/^\/api\/v1\/admin(\/|$)/, /^\/api\/v1\/whatsapp\//, /^\/api\/v1\/carriers\/:code\/webhook$/, /^\/health$/];
const inApi = new Set(app.routes.filter((r) => r.method !== "ALL" && !NOT_FOR_APPS.some((re) => re.test(r.path))).map((r) => `${r.method} ${r.path}`));
const inSpec = new Set(Object.entries(spec.paths).flatMap(([p, ops]) => Object.keys(ops).map((m) => `${m.toUpperCase()} ${p.replace(/\{path\}$/, "*").replace(/\{([A-Za-z]+)\}/g, ":$1")}`)));
const undocumented = [...inApi].filter((r) => !inSpec.has(r));
const missing = [...inSpec].filter((r) => !inApi.has(r));
check("every_app_route_documented", undocumented.length === 0, undocumented);
check("every_documented_route_exists", missing.length === 0, missing);
const ids = Object.values(spec.paths).flatMap((ops) => Object.values(ops).map((o) => o.operationId));
check("operation_ids_unique", new Set(ids).size === ids.length);
check("every_operation_described", Object.values(spec.paths).every((ops) => Object.values(ops).every((o) => o.summary && o.tags?.length && o.responses?.default)));

// 2. Real answers against the schemas.
const deref = (s, seen = 0) => {
  if (Array.isArray(s)) return s.map((x) => deref(x, seen));
  if (!s || typeof s !== "object") return s;
  if (s.$ref) return deref(spec.components.schemas[s.$ref.split("/").pop()], seen + 1);
  return Object.fromEntries(Object.entries(s).map(([k, v]) => [k, deref(v, seen)]));
};
const ajv = new Ajv2020({ strict: false, allErrors: true });
const toKey = (path) => path.replace(/:([A-Za-z]+)/g, "{$1}");
const problems = [];
const checked = new Set();
async function contract(method, url, specPath, auth, body) {
  const [status, json] = await call(method, url, auth, body);
  const op = spec.paths[toKey(specPath)]?.[method.toLowerCase()];
  if (!op) return problems.push(`${method} ${specPath}: not in the contract`), [status, json];
  const res = op.responses[String(status)] || (status >= 400 ? op.responses.default : null);
  if (!res) return problems.push(`${method} ${specPath}: status ${status} not documented`), [status, json];
  const validate = ajv.compile(deref(res.content["application/json"].schema));
  if (!validate(json)) problems.push(`${method} ${specPath} (${status}): ${ajv.errorsText(validate.errors).slice(0, 400)}`);
  checked.add(`${method} ${specPath} ${status}`);
  return [status, json];
}

const pw = await hashPassword("Riad-Fes-2026-x");
sql.prepare("INSERT INTO users (id,name,email,password_hash,role,phone) VALUES (2,'Seller','s@x.ma',?,'seller','0611111111'),(7,'Buyer','b@x.ma',?,'buyer','0622222222')").run(pw, pw);
sql.exec(`
  INSERT INTO sellers (id,user_id,name,slug,status,location,delivery_enabled) VALUES (1,2,'Shop','shop','active','Casablanca',1);
  INSERT INTO categories (id,name,slug) VALUES (1,'Brakes','brakes');
  INSERT INTO vehicle_makes (id, name, slug) VALUES (1, 'Dacia', 'dacia');
  INSERT INTO parts (id,seller_id,category_id,title,slug,price,quantity,status) VALUES (1,1,1,'Pads','pads',30000,10,'active'),(2,1,1,'Disc','disc',40000,3,'pending');
  INSERT INTO part_images (part_id,url,is_featured) VALUES (1,'/api/v1/media/uploads/a.jpg',1);
  INSERT INTO part_compatibility (part_id,make,model,year_start,year_end) VALUES (1,'Dacia','Logan',2012,2020);
`);
const [, login] = await contract("POST", "/api/v1/auth/login", "/api/v1/auth/login", null, { email: "b@x.ma", password: "Riad-Fes-2026-x" });
const buyer = `Bearer ${login.data.access_token}`;
const seller = `Bearer ${(await call("POST", "/api/v1/auth/login", null, { email: "s@x.ma", password: "Riad-Fes-2026-x" }))[1].data.access_token}`;
await contract("POST", "/api/v1/auth/login", "/api/v1/auth/login", null, { email: "b@x.ma", password: "wrong" });
await contract("GET", "/api/v1/auth/me", "/api/v1/auth/me", buyer);
await contract("GET", "/api/v1/auth/me", "/api/v1/auth/me", null);
await contract("GET", "/api/v1/health", "/api/v1/health");
await contract("GET", "/api/v1/catalog/categories", "/api/v1/catalog/categories");
await contract("GET", "/api/v1/catalog/parts?limit=5", "/api/v1/catalog/parts");
await contract("GET", "/api/v1/catalog/parts/pads", "/api/v1/catalog/parts/:slug");
await contract("GET", "/api/v1/catalog/parts/nope", "/api/v1/catalog/parts/:slug");
await contract("GET", "/api/v1/search?q=pads", "/api/v1/search");
await contract("GET", "/api/v1/vehicles/makes", "/api/v1/vehicles/makes");
await contract("GET", "/api/v1/vehicles/models", "/api/v1/vehicles/models");
await contract("GET", "/api/v1/carriers", "/api/v1/carriers");
await contract("GET", "/api/v1/commerce/fulfillment-options?parts=1", "/api/v1/commerce/fulfillment-options");
const order = { items: [{ part_id: 1, quantity: 1 }], shipping_address: { full_name: "B", phone: "0622222222", address_line1: "1 Rue", city: "Rabat", country: "MA" } };
const [, created] = await contract("POST", "/api/v1/commerce/orders", "/api/v1/commerce/orders", buyer, order);
await contract("POST", "/api/v1/commerce/orders", "/api/v1/commerce/orders", buyer, { items: [] });
check("no_internal_order_fields", !("cart_hash" in created.data) && !("idempotency_key" in created.data), Object.keys(created.data));
await contract("GET", "/api/v1/commerce/orders", "/api/v1/commerce/orders", buyer);
const [, detail] = await contract("GET", `/api/v1/commerce/orders/${created.data.reference}`, "/api/v1/commerce/orders/:reference", buyer);
check("no_internal_fields_in_detail", !("cart_hash" in detail.data));
await contract("GET", "/api/v1/marketplace/me/orders", "/api/v1/marketplace/me/orders", seller);
await contract("GET", `/api/v1/marketplace/me/orders/${created.data.id}`, "/api/v1/marketplace/me/orders/:id", seller);
await contract("PATCH", `/api/v1/marketplace/me/orders/${created.data.id}/status`, "/api/v1/marketplace/me/orders/:id/status", seller, { status: "confirmed" });
await contract("PATCH", `/api/v1/marketplace/me/orders/${created.data.id}/status`, "/api/v1/marketplace/me/orders/:id/status", seller, { status: "shipped" });
await contract("POST", `/api/v1/marketplace/me/orders/${created.data.id}/shipment`, "/api/v1/marketplace/me/orders/:id/shipment", seller, { status: "out_for_delivery" });
await contract("POST", `/api/v1/marketplace/me/orders/${created.data.id}/shipment`, "/api/v1/marketplace/me/orders/:id/shipment", seller, { status: "teleported" });
await contract("GET", "/api/v1/marketplace/me/parts", "/api/v1/marketplace/me/parts", seller);
await contract("GET", "/api/v1/marketplace/parts/1/images", "/api/v1/marketplace/parts/:id/images", seller);
await contract("POST", "/api/v1/auth/forgot", "/api/v1/auth/forgot", null, { identifier: "nobody@x.ma" });
await contract("GET", "/api/v1/auth/delete-account", "/api/v1/auth/delete-account", buyer);
check("answers_match_contract", problems.length === 0, problems);
check("enough_checked", checked.size >= 25, checked.size);

// The envelope: both flags on old-style and new-style routes.
const [, a] = await call("GET", "/api/v1/vehicles/makes");
const [, b] = await call("GET", "/api/v1/auth/me", buyer);
check("envelope_both_flags", a.success === true && a.ok === true && b.success === true && b.ok === true);

console.log(results);
const fails = Object.values(results).filter((v) => v !== "PASS").length;
console.log(fails ? `${fails} FAIL` : "ALL PASS");
process.exitCode = fails ? 1 : 0;
