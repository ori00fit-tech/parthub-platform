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
// CORS allowlist (utils/cors.ts) and admin-only analytics.
sql.exec("INSERT INTO users (id,name,email,password_hash,role) VALUES (1,'A','a@x','x','admin'),(2,'S','s@x','x','seller'),(3,'B','b@x','x','buyer')");
const prodEnv = { ...env, APP_ENV: "production" };
const origin = async (o, e = prodEnv, method = "GET") => {
  const r = await app.request("/api/v1/commerce/shipping", { method, headers: { Origin: o, ...(method === "OPTIONS" ? { "Access-Control-Request-Method": "POST" } : {}) } }, e);
  return r.headers.get("access-control-allow-origin");
};
for (const o of ["https://parthub.autos", "https://www.parthub.autos", "https://seller.parthub.autos", "https://admin.parthub.autos",
  "https://parthub-platform.pages.dev", "https://3f2a1b.parthub-platform-seller.pages.dev"]) {
  check(`cors_ok ${o}`, (await origin(o)) === o, await origin(o));
}
for (const o of ["https://evil.example", "https://parthub.autos.evil.example", "https://evilparthub.autos", "https://other.pages.dev", "http://localhost:5173"]) {
  check(`cors_refused ${o}`, (await origin(o)) === null, await origin(o));
}
check("cors_preflight", (await origin("https://admin.parthub.autos", prodEnv, "OPTIONS")) === "https://admin.parthub.autos");
check("cors_localhost_dev", (await origin("http://localhost:5173", { ...env, APP_ENV: "development" })) === "http://localhost:5173");

const get = async (p, payload) => {
  const h = payload ? { Authorization: tok ? await tok(payload) : "" } : {};
  return (await app.request(p, { headers: h }, env)).status;
};
check("analytics_no_token", (await get("/api/v1/admin/analytics/search-demand")) === 401);
check("analytics_buyer", (await get("/api/v1/admin/analytics/search-demand", { user_id: 3, role: "buyer" })) === 403);
check("analytics_seller", (await get("/api/v1/admin/analytics/search-demand", { user_id: 2, role: "seller", seller_id: 1 })) === 403);
check("analytics_admin", (await get("/api/v1/admin/analytics/search-demand", { user_id: 1, role: "admin" })) === 200);

// /health really tests the database: 200 + ok, or 503 when it fails.
let hr = await app.request("/api/v1/health", {}, env);
let hb = await hr.json();
check("health_ok", hr.status === 200 && hb.data.database.ok === true, hb);
const brokenEnv = { ...env, DB: { prepare: () => { throw new Error("D1_ERROR: database unavailable"); } } };
hr = await app.request("/api/v1/health", {}, brokenEnv);
hb = await hr.json();
check("health_db_down_503", hr.status === 503 && hb.data.database.ok === false && /unavailable/.test(hb.data.database.error), hb);
hr = await app.request("/health", {}, brokenEnv);
check("root_health_db_down_503", hr.status === 503 && (await hr.json()).database === "down");

console.log(results);
const fails = Object.values(results).filter((v) => v !== "PASS").length;
console.log(fails ? `${fails} FAIL` : "ALL PASS");
process.exitCode = fails ? 1 : 0;
