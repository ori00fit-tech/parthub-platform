const ROOT = new URL("../../../", import.meta.url).pathname; // repository root
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import app from "./.build/app.mjs";
import { hashPassword, signToken, verifyToken } from "./.build/auth.mjs";

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
// Session security (middlewares/auth.ts, migrations/0021).
const pw = await hashPassword("password123");
sql.prepare("INSERT INTO users (id,name,email,password_hash,role) VALUES (1,'Buyer','b@x',?,'buyer'),(2,'Admin','a@x',?,'admin'),(3,'Seller','s@x',?,'seller')").run(pw, pw, pw);
sql.exec("INSERT INTO sellers (id,user_id,name,slug,status) VALUES (5,3,'Shop','shop','active')");
const login = async (email, password = "password123") => call("POST", "/api/v1/auth/login", null, { email, password });

let [st, b] = await login("b@x");
const t1 = "Bearer " + b.data.access_token;
check("login_ok", st === 200 && (await verifyToken(b.data.access_token, "s")).tv === 0, [st, b]);
[st] = await call("GET", "/api/v1/auth/me", t1);
check("token_works", st === 200, st);

// Sign out (this device): this token stops working, another device keeps going.
const other = "Bearer " + (await login("b@x"))[1].data.access_token;
[st] = await call("POST", "/api/v1/auth/logout", t1);
check("logout_ok", st === 200, st);
[st, b] = await call("GET", "/api/v1/auth/me", t1);
check("token_revoked", st === 401, [st, b]);
check("other_device_still_in", (await call("GET", "/api/v1/auth/me", other))[0] === 200);
// Sign out everywhere: every token stops (token_version + 1).
[st] = await call("POST", "/api/v1/auth/logout", other, { everywhere: true });
check("logout_everywhere", st === 200 && (await call("GET", "/api/v1/auth/me", other))[0] === 401);
[st, b] = await login("b@x");
const t2 = "Bearer " + b.data.access_token;
check("new_login_tv1", (await verifyToken(b.data.access_token, "s")).tv === 1 && (await call("GET", "/api/v1/auth/me", t2))[0] === 200);

// Tokens issued before migration 0021 (no tv) still work while token_version is 0.
const legacy = await tok({ user_id: 2, role: "admin" });
[st] = await call("GET", "/api/v1/admin/pending-counts", legacy);
check("legacy_token_ok", st === 200, st);

// Role taken from the database: an admin demoted to buyer loses admin access at once.
sql.exec("UPDATE users SET role = 'buyer' WHERE id = 2");
[st] = await call("GET", "/api/v1/admin/pending-counts", legacy);
check("demoted_admin_403", st === 403, st);

// Deactivated account: refused at once, and at sign-in only after the right password.
sql.exec("UPDATE users SET is_active = 0 WHERE id = 1");
[st] = await call("GET", "/api/v1/auth/me", t2);
check("deactivated_401", st === 401, st);
[st] = await login("b@x", "wrong-password");
check("deactivated_wrong_pw_401", st === 401, st);
[st] = await login("b@x");
check("deactivated_right_pw_403", st === 403, st);

// Unknown user in a validly signed token.
[st] = await call("GET", "/api/v1/auth/me", await tok({ user_id: 999, role: "admin" }));
check("unknown_user_401", st === 401, st);

// Store from the database: a claim for another store is ignored.
[st, b] = await call("GET", "/api/v1/marketplace/me/readiness", await tok({ user_id: 3, role: "seller", seller_id: 42 }));
check("store_from_db", st === 200 && b.data.seller.id === 5, [st, b.data?.seller]);
// A buyer token claiming seller rights gets none.
[st] = await call("GET", "/api/v1/marketplace/me/orders", await tok({ user_id: 2, role: "seller", seller_id: 5 }));
check("claimed_role_ignored", st === 403, st);

console.log(results);
const fails = Object.values(results).filter((v) => v !== "PASS").length;
console.log(fails ? `${fails} FAIL` : "ALL PASS");
process.exitCode = fails ? 1 : 0;
