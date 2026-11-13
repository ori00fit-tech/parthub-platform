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
// Unexpected errors come back as JSON with a request id (app.onError).
sql.exec("INSERT INTO users (id,name,email,password_hash,role) VALUES (7,'B','b@x','x','buyer')");
const buyer = await tok({ user_id: 7, role: "buyer" });
// A body that is not JSON → 400 JSON.
let r = await app.request("/api/v1/commerce/orders", { method: "POST", headers: { "Content-Type": "application/json", Authorization: buyer }, body: "{not json" }, env);
let j = await r.json().catch(() => null);
check("bad_json_400", r.status === 400 && j?.success === false && /valid JSON/.test(j.error) && j.request_id, [r.status, j]);
// The database failing → 500 JSON, no internals, a request id (also in the header).
const broken = { ...env, DB: { prepare() { throw new Error("D1_ERROR: secret internal detail"); }, batch() { throw new Error("x"); } } };
const logs = [];
const orig = console.error;
console.error = (m) => logs.push(String(m));
r = await app.request("/api/v1/commerce/orders", { headers: { Authorization: buyer, "cf-ray": "8f1a2b3c4d5e6f70-CMN" } }, broken);
console.error = orig;
j = await r.json().catch(() => null);
check("crash_500_json", r.status === 500 && j?.success === false && j.error === "Something went wrong. Please try again." && j.request_id === "8f1a2b3c4d5e6f70" && r.headers.get("x-request-id") === "8f1a2b3c4d5e6f70", [r.status, j]);
check("no_internals", !JSON.stringify(j).includes("secret internal"), j);
check("logged_with_id", logs.some((l) => l.includes("8f1a2b3c4d5e6f70") && l.includes("secret internal detail")), logs);
// Unknown route stays a JSON 404.
r = await app.request("/api/v1/nope", {}, env);
check("not_found_json", r.status === 404 && (await r.json()).error === "Route not found");

// The version shown by /health is the packages' version.
const pkgs = ["package.json", "workers/api/package.json", "apps/storefront/package.json", "apps/seller-portal/package.json", "apps/admin/package.json", "packages/shared/package.json"]
  .map((f) => JSON.parse(readFileSync(ROOT + f, "utf8")).version);
r = await app.request("/api/v1/health", {}, env);
j = await r.json();
check("version_everywhere", new Set(pkgs).size === 1 && j.data.version === pkgs[0], [pkgs, j.data?.version]);

console.log(results);
const fails = Object.values(results).filter((v) => v !== "PASS").length;
console.log(fails ? `${fails} FAIL` : "ALL PASS");
process.exitCode = fails ? 1 : 0;
