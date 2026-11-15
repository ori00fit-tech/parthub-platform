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
const call = async (m, u, auth, body, headers = {}) => {
  const r = await app.request(u, {
    method: m,
    headers: { "Content-Type": "application/json", ...headers, ...(auth ? { Authorization: auth } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  }, env);
  return [r.status, await r.json()];
};
const results = {};
const check = (name, cond, extra = "") => { results[name] = cond ? "PASS" : `FAIL ${JSON.stringify(extra)}`; };
// Sign in with a WhatsApp code (POST /auth/login-code, /auth/login-code/verify):
// the code goes to the account's own number, one use, 5 tries, never an admin,
// no account enumeration; signing in this way works like the password.
import { hashPassword } from "./.build/auth.mjs";
Object.assign(env, { WHATSAPP_ACCESS_TOKEN: "t", WHATSAPP_PHONE_NUMBER_ID: "1" });
const graph = [];
globalThis.fetch = async (url, init = {}) => {
  graph.push(JSON.parse(init.body || "null"));
  return new Response(JSON.stringify({ messages: [{ id: `wamid.${graph.length}` }] }), { status: 200, headers: { "content-type": "application/json" } });
};
const tick = () => new Promise((r) => setTimeout(r, 30));
const pw = await hashPassword("Old-Pass-2026!");
sql.prepare("INSERT INTO users (id,name,email,password_hash,role,phone,locale) VALUES (1,'Admin','admin@x.ma',?,'admin','0600000001','fr')").run(pw);
sql.prepare("INSERT INTO users (id,name,email,password_hash,role,phone,locale) VALUES (7,'Ali Buyer','ali@x.ma',?,'buyer','06 22 22 22 22','ar')").run(pw);
sql.prepare("INSERT INTO users (id,name,email,password_hash,role,phone) VALUES (2,'Seller','seller@x.ma',?,'seller',NULL)").run(pw);
sql.prepare("INSERT INTO users (id,name,email,password_hash,role,phone,is_active) VALUES (9,'Off','off@x.ma',?,'buyer','0633333333',0)").run(pw);
sql.exec("INSERT INTO sellers (id,user_id,name,slug,status,location,whatsapp) VALUES (1,2,'Casa','casa','active','Casablanca','+212 661 23 45 67')");
sql.exec("INSERT INTO whatsapp_templates (name, language, status, source) VALUES ('parthub_reset_code','ar','approved','meta'),('parthub_reset_code','fr','approved','meta')");
const codes = () => graph.filter((g) => g?.template?.name === "parthub_reset_code");
const codeTo = (to) => codes().filter((x) => x.to === to).at(-1)?.template.components[0].parameters[0].text;
const wrong = (c) => (c === "000000" ? "111111" : "000000");
const ask = (identifier, h) => call("POST", "/api/v1/auth/login-code", null, { identifier }, h);
const verify = (identifier, code, extra = {}, h) => call("POST", "/api/v1/auth/login-code/verify", null, { identifier, code, ...extra }, h);

// 1. Same answer whatever the number; the code goes to the account's own number.
let [st, r] = await ask("0622222222");
const [st2, r2] = await ask("0699999999");
const [st3, r3] = await ask("0600000001"); // the admin's number
await tick();
check("same_answer", st === 200 && st2 === 200 && st3 === 200 && r.data.message === r2.data.message && r.data.message === r3.data.message, [r, r2, r3]);
check("code_sent_to_own_number", codes().length === 1 && codes()[0].to === "212622222222", codes().map((c) => c.to));
check("no_code_for_admin", !codes().some((c) => c.to === "212600000001"));

// 2. Wrong code refused; the right one signs in, like the password.
let code = codeTo("212622222222");
[st, r] = await verify("0622222222", wrong(code));
check("wrong_code_refused", st === 401 && /wrong or has expired/.test(r.error), [st, r]);
[st, r] = await verify("+212 6 22 22 22 22", code, { device_name: "Phone" });
check("right_code_signs_in", st === 200 && r.data?.access_token && r.data.user?.id === 7 && r.data.user.role === "buyer", [st, r]);
const me = await call("GET", "/api/v1/auth/me", `Bearer ${r.data?.access_token}`);
check("token_works", me[0] === 200 && me[1].data?.email === "ali@x.ma", me);
check("session_recorded", sql.prepare("select count(*) n from sessions where user_id = 7 and device_name = 'Phone'").get().n === 1);
check("password_unchanged", (await call("POST", "/api/v1/auth/login", null, { email: "ali@x.ma", password: "Old-Pass-2026!" }))[0] === 200);

// 3. A code works once.
[st] = await verify("0622222222", code);
check("code_used_once", st === 401, st);

// 4. Five wrong codes: even the right one stops working.
await ask("0622222222");
await tick();
code = codeTo("212622222222");
for (let i = 0; i < 5; i++) await verify("0622222222", wrong(code), {}, { "CF-Connecting-IP": `10.0.0.${i}` });
[st] = await verify("0622222222", code, {}, { "CF-Connecting-IP": "10.0.1.1" });
check("five_tries_then_dead", st === 401, st);

// 5. A seller by the store's WhatsApp; an app gets a refresh token.
await ask("0661234567", { "CF-Connecting-IP": "10.0.2.1" });
await tick();
[st, r] = await verify("0661234567", codeTo("212661234567"), { client: "app", device_name: "Android" }, { "CF-Connecting-IP": "10.0.2.1" });
check("seller_signs_in", st === 200 && r.data?.user?.role === "seller" && r.data.user.seller_id === 1 && !!r.data.refresh_token, [st, r]);

// 6. Never an admin, even with a code planted in the table.
sql.exec("INSERT INTO password_resets (user_id, channel, secret_hash, expires_at) VALUES (1, 'whatsapp', 'x', datetime('now', '+10 minutes'))");
[st] = await verify("0600000001", "123456", {}, { "CF-Connecting-IP": "10.0.3.1" });
check("admin_refused", st === 401, st);

// 7. A deactivated account gets no code.
const before = codes().length;
await ask("0633333333", { "CF-Connecting-IP": "10.0.4.1" });
await tick();
check("inactive_no_code", codes().length === before);

// 8. Signing in with a code cancels a pending deletion (like the password).
sql.exec("UPDATE users SET deletion_requested_at = datetime('now') WHERE id = 7");
sql.exec("INSERT INTO account_deletions (user_id) VALUES (7)");
await ask("0622222222", { "CF-Connecting-IP": "10.0.5.1" });
await tick();
[st, r] = await verify("0622222222", codeTo("212622222222"), {}, { "CF-Connecting-IP": "10.0.5.1" });
check("deletion_cancelled", st === 200 && r.data?.deletion_cancelled === true && sql.prepare("select deletion_requested_at d from users where id = 7").get().d === null, [st, r]);

// 9. Requests per number are limited (3 codes an hour).
graph.length = 0;
for (let i = 0; i < 5; i++) await ask("0622222222", { "CF-Connecting-IP": `10.0.6.${i}` });
await tick();
check("codes_limited", codes().length <= 3, codes().length);

console.log(results);
const fails = Object.values(results).filter((v) => v !== "PASS").length;
console.log(fails ? `${fails} FAIL` : "ALL PASS");
process.exitCode = fails ? 1 : 0;
