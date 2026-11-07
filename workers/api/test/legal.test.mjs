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
sql.exec(`
  INSERT INTO users (id,name,email,password_hash,role) VALUES (2,'Old seller','old@x','x','seller'), (3,'New seller','new@x','x','seller');
  INSERT INTO sellers (id,user_id,name,slug,status,location) VALUES (1,2,'Old Casse','old-casse','active','Fes');
`);
const oldSeller = await tok({ user_id: 2, role: "seller", seller_id: 1 });
const newSeller = await tok({ user_id: 3, role: "seller" });

// Register: acceptance recorded only when sent.
let [st, b] = await call("POST", "/api/v1/auth/register", null, { name: "A", email: "a1@x", password: "password123", accept_terms: true });
let row = sql.prepare("select terms_accepted_at, terms_version from users where email = 'a1@x'").get();
check("register_records_terms", st === 201 && row.terms_accepted_at && row.terms_version === "2026-11-06", [st, row]);
[st, b] = await call("POST", "/api/v1/auth/register", null, { name: "B", email: "b1@x", password: "password123" });
row = sql.prepare("select terms_accepted_at, terms_version from users where email = 'b1@x'").get();
check("register_without_terms_null", st === 201 && row.terms_accepted_at === null && row.terms_version === null, row);
[st, b] = await call("POST", "/api/v1/auth/register", null, { name: "C", email: "c1@x", password: "password123", accept_terms: "yes" });
row = sql.prepare("select terms_accepted_at from users where email = 'c1@x'").get();
check("register_only_true_counts", row.terms_accepted_at === null, row);

// Store creation requires the agreement.
const store = { display_name: "New Casse", slug: "new-casse", city: "Casablanca" };
[st, b] = await call("POST", "/api/v1/marketplace/onboarding", newSeller, store);
check("onboarding_requires_agreement", st === 400 && b.error?.code === "AGREEMENT_REQUIRED", [st, b]);
check("no_store_created", !sql.prepare("select id from sellers where user_id = 3").get());
[st, b] = await call("POST", "/api/v1/marketplace/onboarding", newSeller, { ...store, accept_agreement: "true" });
check("onboarding_string_not_enough", st === 400, st);
[st, b] = await call("POST", "/api/v1/marketplace/onboarding", newSeller, { ...store, accept_agreement: true });
row = sql.prepare("select agreement_accepted_at, agreement_version from sellers where user_id = 3").get();
check("onboarding_records_agreement", st === 201 && row.agreement_accepted_at && row.agreement_version === "2026-11-06", [st, row]);
[st, b] = await call("GET", "/api/v1/marketplace/me/readiness", newSeller);
check("new_store_item_done", b.data.items.find((i) => i.id === "agreement").done === true, b.data.items);

// Existing store: item not done until accepted.
[st, b] = await call("GET", "/api/v1/marketplace/me/readiness", oldSeller);
const item = b.data.items.find((i) => i.id === "agreement");
check("old_store_item_pending", item && item.done === false && item.required && item.action.to === "/agreement", item);
check("active_store_stays_active", b.data.status === "active", b.data.status);
[st, b] = await call("POST", "/api/v1/marketplace/me/agreement", oldSeller, {});
row = sql.prepare("select agreement_accepted_at, agreement_version from sellers where id = 1").get();
check("accept_endpoint", st === 200 && b.data.agreement_version === "2026-11-06" && row.agreement_accepted_at, [st, b, row]);
[st, b] = await call("GET", "/api/v1/marketplace/me/readiness", oldSeller);
check("old_store_item_done", b.data.items.find((i) => i.id === "agreement").done === true);

// No store / not signed in.
sql.exec("INSERT INTO users (id,name,email,password_hash,role) VALUES (77,'Loner','loner@x','x','seller')");
const loner = await tok({ user_id: 77, role: "seller" });
[st, b] = await call("POST", "/api/v1/marketplace/me/agreement", loner, {});
check("accept_without_store_404", st === 404, [st, b]);
[st] = await call("POST", "/api/v1/marketplace/me/agreement", null, {});
check("accept_requires_auth", st === 401, st);

let bad = 0;
for (const [k, v] of Object.entries(results)) { console.log(v.startsWith("PASS") ? "PASS" : "FAIL", k, v.startsWith("PASS") ? "" : v); if (!v.startsWith("PASS")) bad++; }
console.log(bad ? `${bad} failed` : `all ${Object.keys(results).length} passed`);
