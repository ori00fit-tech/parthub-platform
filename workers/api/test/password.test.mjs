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
// Password change (POST /api/v1/auth/password) and the password policy:
// weak / known passwords refused (including the old sample ones),
// admins need 10 characters, wrong current password rate-limited, and
// after a change every older session stops working.
const { hashPassword } = await import("./.build/auth.mjs");
sql.exec(`
  INSERT INTO users (id,name,email,password_hash,role,is_active) VALUES
    (1,'Admin','admin@parthub.local','${await hashPassword("Admin123!")}','admin',1),
    (7,'Ali','ali.buyer@example.ma','${await hashPassword("old-pass-123")}','buyer',1);
`);
const login = async (email, password) => call("POST", "/api/v1/auth/login", null, { email, password });
const change = (token, current_password, new_password) => call("POST", "/api/v1/auth/password", `Bearer ${token}`, { current_password, new_password });

let [st, r] = await login("admin@parthub.local", "Admin123!");
check("old_admin_login_works_before", st === 200 && r.data.password_weak === true, [st, r]);
const adminOld = r.data.access_token;
const deviceTwo = (await login("admin@parthub.local", "Admin123!"))[1].data.access_token; // e.g. someone else who knew it

// Policy
for (const [name, pw] of [["sample_admin", "Admin123!x"], ["common", "password123"], ["seller_sample", "Seller123!"], ["site_name", "MyParthub2026!"], ["email_name", "admin-strong-77"], ["too_short_admin", "Zq9!kL2#m"], ["too_simple", "aaaaabbbbbb"]]) {
  [st, r] = await change(adminOld, "Admin123!", pw);
  check(`refuse_${name}`, st === 400, [st, r?.error]);
}
[st] = await change(adminOld, "Admin123!", "Admin123!");
check("refuse_same", st === 400, st);
[st] = await call("POST", "/api/v1/auth/password", null, { current_password: "x", new_password: "y" });
check("needs_sign_in", st === 401, st);

// Success: new token works, every older one stops working, new password logs in, old does not.
[st, r] = await change(adminOld, "Admin123!", "Ts7#vRq2-Lm9@wPx");
const adminNew = r?.data?.access_token;
check("changed", st === 200 && adminNew && adminNew !== adminOld, [st, r]);
check("new_token_works", (await call("GET", "/api/v1/auth/me", `Bearer ${adminNew}`))[0] === 200);
check("old_token_revoked", (await call("GET", "/api/v1/auth/me", `Bearer ${adminOld}`))[0] === 401);
check("other_device_revoked", (await call("GET", "/api/v1/admin/kpis", `Bearer ${deviceTwo}`))[0] === 401);
check("old_password_refused", (await login("admin@parthub.local", "Admin123!"))[0] === 401);
const relog = await login("admin@parthub.local", "Ts7#vRq2-Lm9@wPx");
check("new_password_works_not_weak", relog[0] === 200 && relog[1].data.password_weak === false, relog);
check("stored_hash_pbkdf2", sql.prepare("select password_hash from users where id = 1").get().password_hash.startsWith("pbkdf2$"));

// Wrong current password: refused, then blocked after 5 tries.
const buyerTok = (await login("ali.buyer@example.ma", "old-pass-123"))[1].data.access_token;
const tries = [];
for (let i = 0; i < 6; i++) tries.push((await change(buyerTok, "wrong-pass-000", "Good-Pass-4821"))[0]);
check("wrong_current_then_limited", tries.slice(0, 5).every((s) => s === 400) && tries[5] === 429, tries);

// Registration refuses the same weak passwords.
[st] = await call("POST", "/api/v1/auth/register", null, { name: "New", email: "new.buyer@example.ma", password: "Buyer123!", role: "buyer", accept_terms: true });
check("register_refuses_sample", st === 400, st);
[st] = await call("POST", "/api/v1/auth/register", null, { name: "New", email: "new.buyer@example.ma", password: "Riad-Fes-2026", role: "buyer", accept_terms: true });
check("register_accepts_good", st === 200 || st === 201, st);

console.log(results);
const fails = Object.values(results).filter((v) => v !== "PASS").length;
console.log(fails ? `${fails} FAIL` : "ALL PASS");
process.exitCode = fails ? 1 : 0;
