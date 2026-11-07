const ROOT = new URL("../../../", import.meta.url).pathname; // repository root
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import app from "./.build/app.mjs";
import { hashPassword, signToken } from "./.build/auth.mjs";

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
// Sign-in / sign-up attempt limits (utils/rate-limit.ts, migrations/0021).
const pw = await hashPassword("password123");
sql.prepare("INSERT INTO users (id,name,email,password_hash,role) VALUES (1,'A','a@x',?,'buyer'),(2,'B','b@x',?,'buyer')").run(pw, pw);
const req = async (path, body, ip) => {
  const r = await app.request(path, { method: "POST", headers: { "Content-Type": "application/json", "cf-connecting-ip": ip }, body: JSON.stringify(body) }, env);
  return [r.status, await r.json(), r.headers.get("Retry-After")];
};
const login = (email, password, ip = "1.1.1.1") => req("/api/v1/auth/login", { email, password }, ip);

// 10 failures on one account → blocked, even with the right password.
for (let i = 0; i < 9; i++) await login("a@x", "nope");
let [st] = await login("a@x", "password123", "9.9.9.9");
check("under_limit_ok", st === 200, st); // success clears the account's counter
for (let i = 0; i < 10; i++) await login("A@x ", "nope");
let [st2, b2, retry] = await login("a@x", "password123", "8.8.8.8");
check("account_blocked_429", st2 === 429 && Number(retry) > 0 && /Too many/.test(b2.error), [st2, b2, retry]);
[st] = await login("b@x", "password123", "7.7.7.7");
check("other_account_ok", st === 200, st);

// Unknown emails count too (per network): 30 failures from one IP → that IP is blocked.
for (let i = 0; i < 30; i++) await login(`ghost${i}@x`, "nope", "6.6.6.6");
[st] = await login("b@x", "password123", "6.6.6.6");
check("ip_blocked_429", st === 429, st);
[st] = await login("b@x", "password123", "5.5.5.5");
check("other_ip_ok", st === 200, st);

// The block ends.
sql.exec("UPDATE auth_attempts SET blocked_until = '2000-01-01 00:00:00', window_start = '2000-01-01 00:00:00'");
[st] = await login("a@x", "password123", "8.8.8.8");
check("block_expires", st === 200, st);
check("counter_cleared_on_success", sql.prepare("select count(*) n from auth_attempts where key = 'login:email:a@x'").get().n === 0);

// Sign-up: 10 per network per hour.
let last;
for (let i = 0; i < 10; i++) last = await req("/api/v1/auth/register", { name: "N", email: `n${i}@x`, password: "password123", accept_terms: true }, "4.4.4.4");
check("register_10_ok", last[0] === 201, last);
last = await req("/api/v1/auth/register", { name: "N", email: "n10@x", password: "password123", accept_terms: true }, "4.4.4.4");
check("register_11_blocked", last[0] === 429, last);
last = await req("/api/v1/auth/register", { name: "N", email: "n11@x", password: "password123", accept_terms: true }, "3.3.3.3");
check("register_other_ip_ok", last[0] === 201, last);

console.log(results);
const fails = Object.values(results).filter((v) => v !== "PASS").length;
console.log(fails ? `${fails} FAIL` : "ALL PASS");
process.exitCode = fails ? 1 : 0;
