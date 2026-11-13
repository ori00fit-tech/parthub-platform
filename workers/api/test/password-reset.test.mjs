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
// Forgot password (utils/password-reset.ts, migrations/0033): code on
// WhatsApp to the account's own number, one-time link made by an admin,
// no account enumeration, limits, sessions revoked.
import { hashPassword } from "./.build/auth.mjs";
Object.assign(env, { WHATSAPP_ACCESS_TOKEN: "t", WHATSAPP_PHONE_NUMBER_ID: "1", STOREFRONT_URL: "https://parthub.autos", SELLER_PORTAL_URL: "https://seller.parthub.autos" });
const graph = [];
globalThis.fetch = async (url, init = {}) => {
  graph.push(JSON.parse(init.body || "null"));
  return new Response(JSON.stringify({ messages: [{ id: `wamid.${graph.length}` }] }), { status: 200, headers: { "content-type": "application/json" } });
};
const tick = () => new Promise((r) => setTimeout(r, 30));
const pw = await hashPassword("Old-Pass-2026!");
sql.prepare("INSERT INTO users (id,name,email,password_hash,role,phone,locale) VALUES (1,'Admin','admin@x.ma',?,'admin','0600000001','fr')").run(pw);
sql.prepare("INSERT INTO users (id,name,email,password_hash,role,phone,locale) VALUES (7,'Ali Buyer','ali@x.ma',?,'buyer','06 22 22 22 22','ar')").run(pw);
sql.prepare("INSERT INTO users (id,name,email,password_hash,role,phone) VALUES (8,'No Phone','nophone@x.ma',?,'buyer',NULL)").run(pw);
sql.prepare("INSERT INTO users (id,name,email,password_hash,role,phone) VALUES (2,'Seller','seller@x.ma',?,'seller',NULL)").run(pw);
sql.exec("INSERT INTO sellers (id,user_id,name,slug,status,location,whatsapp) VALUES (1,2,'Casa','casa','active','Casablanca','+212 661 23 45 67')");
sql.exec("INSERT INTO whatsapp_templates (name, language, status, source) VALUES ('parthub_reset_code','ar','approved','meta'),('parthub_reset_code','fr','approved','meta'),('parthub_password_changed','ar','approved','meta')");
const admin = await tok({ user_id: 1, role: "admin" });
const codes = () => graph.filter((g) => g?.template?.name === "parthub_reset_code");
const lastCode = () => codes().at(-1)?.template.components[0].parameters[0].text;
const login = (email, password) => call("POST", "/api/v1/auth/login", null, { email, password });

// 1. Same answer with or without an account (no enumeration).
let [st, r] = await call("POST", "/api/v1/auth/forgot", null, { identifier: "ali@x.ma" });
const [st2, r2] = await call("POST", "/api/v1/auth/forgot", null, { identifier: "nobody@x.ma" });
check("same_answer", st === 200 && st2 === 200 && r.data.message === r2.data.message, [r, r2]);
await tick();
let m = codes().at(-1);
check("code_on_whatsapp", codes().length === 1 && m.to === "212622222222" && m.template.language.code === "ar" && /^\d{6}$/.test(lastCode()) &&
  m.template.components[1].sub_type === "url" && m.template.components[1].parameters[0].text === lastCode(), m);
check("only_hash_stored", !JSON.stringify(sql.prepare("select * from password_resets").all()).includes(lastCode()));

// 2. By phone, any format; a seller by the store's WhatsApp.
[st] = await call("POST", "/api/v1/auth/forgot", null, { identifier: "+212622222222" });
await tick();
check("by_phone", codes().length === 2 && codes()[1].to === "212622222222");
[st] = await call("POST", "/api/v1/auth/forgot", null, { identifier: "0661234567" });
await tick();
check("seller_by_store_number", codes().length === 3 && codes()[2].to === "212661234567" && codes()[2].template.language.code === "fr");

// 3. Wrong code → refused; the right one → new password, every device signed out.
const oldToken = (await login("ali@x.ma", "Old-Pass-2026!"))[1].data.access_token;
[st] = await call("POST", "/api/v1/auth/forgot", null, { identifier: "ali@x.ma" });
await tick();
const code = codes().filter((x) => x.to === "212622222222").at(-1).template.components[0].parameters[0].text;
[st, r] = await call("POST", "/api/v1/auth/reset", null, { identifier: "ali@x.ma", code: code === "000000" ? "111111" : "000000", new_password: "Riad-Fes-2026-x" });
check("wrong_code", st === 400 && /wrong or has expired/.test(r.error), r);
[st, r] = await call("POST", "/api/v1/auth/reset", null, { identifier: "ali@x.ma", code, new_password: "Admin123!" });
check("policy_applies", st === 400 && /common/i.test(r.error), r);
[st, r] = await call("POST", "/api/v1/auth/reset", null, { identifier: "ali@x.ma", code, new_password: "Riad-Fes-2026-x" });
check("reset_ok", st === 200 && r.data.email === "ali@x.ma", r);
check("new_password_works", (await login("ali@x.ma", "Riad-Fes-2026-x"))[0] === 200 && (await login("ali@x.ma", "Old-Pass-2026!"))[0] === 401);
check("sessions_revoked", (await call("GET", "/api/v1/auth/me", `Bearer ${oldToken}`))[0] === 401);
[st] = await call("POST", "/api/v1/auth/reset", null, { identifier: "ali@x.ma", code, new_password: "Another-Pass-2026" });
check("code_used_once", st === 400);
await tick();
check("password_changed_message", graph.some((g) => g?.template?.name === "parthub_password_changed"));

// 4. Five wrong codes → that code is dead even if right afterwards.
[st] = await call("POST", "/api/v1/auth/forgot", null, { identifier: "0661234567" });
await tick();
const sc = lastCode();
for (let i = 0; i < 5; i++) await call("POST", "/api/v1/auth/reset", null, { identifier: "seller@x.ma", code: sc === "999999" ? "111111" : "999999", new_password: "Riad-Fes-2026-y" });
[st] = await call("POST", "/api/v1/auth/reset", null, { identifier: "seller@x.ma", code: sc, new_password: "Riad-Fes-2026-y" });
check("five_tries_max", st === 400);
// Expired codes don't work.
[st] = await call("POST", "/api/v1/auth/forgot", null, { identifier: "seller@x.ma" });
await tick();
const ec = lastCode();
sql.exec("update password_resets set expires_at = datetime('now', '-1 minute') where used_at is null");
[st] = await call("POST", "/api/v1/auth/reset", null, { identifier: "seller@x.ma", code: ec, new_password: "Riad-Fes-2026-y" });
check("expired", st === 400);

// 5. Limits: 3 codes an hour per account, 10 requests per network.
sql.exec("delete from auth_attempts");
const before = codes().length;
for (let i = 0; i < 5; i++) await call("POST", "/api/v1/auth/forgot", null, { identifier: "seller@x.ma" });
await tick();
check("account_limit", codes().length - before === 3, codes().length - before);
for (let i = 0; i < 10; i++) [st] = await call("POST", "/api/v1/auth/forgot", null, { identifier: `x${i}@x.ma` });
check("ip_limit", st === 429, st);
sql.exec("delete from auth_attempts");

// 6. No number on the account → nothing sent (same answer); the admin link.
const n0 = codes().length;
[st, r] = await call("POST", "/api/v1/auth/forgot", null, { identifier: "nophone@x.ma" });
check("no_number_same_answer", st === 200 && codes().length === n0);
[st, r] = await call("POST", "/api/v1/admin/password-reset-link", admin, { identifier: "nophone@x.ma" });
const url = r.data?.url || "";
check("admin_link", st === 200 && url.startsWith("https://parthub.autos/reset-password?token=") && r.data.name === "No Phone", r);
const token = new URL(url).searchParams.get("token");
check("link_hash_only", !JSON.stringify(sql.prepare("select * from password_resets").all()).includes(token));
const audit = sql.prepare("select * from admin_audit_log where route like '%password-reset-link'").get();
check("link_audited", audit && audit.admin_id === 1 && !String(audit.body).includes(token), audit);
[st, r] = await call("POST", "/api/v1/auth/reset-link", null, { token, new_password: "Riad-Fes-2026-z" });
check("link_reset", st === 200 && (await login("nophone@x.ma", "Riad-Fes-2026-z"))[0] === 200, r);
[st] = await call("POST", "/api/v1/auth/reset-link", null, { token, new_password: "Riad-Fes-2026-w" });
check("link_once", st === 400);
// Seller → link to the seller portal; never for an admin; non-admins can't make links.
[st, r] = await call("POST", "/api/v1/admin/password-reset-link", admin, { identifier: "seller@x.ma" });
check("seller_link_portal", r.data?.url.startsWith("https://seller.parthub.autos/reset-password?token="), r);
[st] = await call("POST", "/api/v1/admin/password-reset-link", admin, { identifier: "admin@x.ma" });
check("never_admin", st === 403, st);
const buyerTok = (await login("ali@x.ma", "Riad-Fes-2026-x"))[1].data.access_token;
[st] = await call("POST", "/api/v1/admin/password-reset-link", `Bearer ${buyerTok}`, { identifier: "seller@x.ma" });
check("admins_only", st === 403, st);
// A new link kills the previous one.
const first = new URL((await call("POST", "/api/v1/admin/password-reset-link", admin, { identifier: "ali@x.ma" }))[1].data.url).searchParams.get("token");
await call("POST", "/api/v1/admin/password-reset-link", admin, { identifier: "ali@x.ma" });
[st] = await call("POST", "/api/v1/auth/reset-link", null, { token: first, new_password: "Riad-Fes-2026-v" });
check("older_link_dead", st === 400);

console.log(results);
const fails = Object.values(results).filter((v) => v !== "PASS").length;
console.log(fails ? `${fails} FAIL` : "ALL PASS");
process.exitCode = fails ? 1 : 0;
