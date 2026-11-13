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
// Devices (utils/sessions.ts, migrations/0035): every sign-in is a session;
// apps get short tokens + rotating refresh tokens; reuse of an old refresh
// token ends the session; one device can be signed out; a password change
// keeps this device and ends the others.
import { hashPassword, verifyToken } from "./.build/auth.mjs";
const pw = await hashPassword("Riad-Fes-2026-x");
sql.prepare("INSERT INTO users (id,name,email,password_hash,role) VALUES (7,'Ali','ali@x.ma',?,'buyer'),(8,'Sara','sara@x.ma',?,'buyer')").run(pw, pw);
const login = async (body, ua) => {
  const r = await app.request("/api/v1/auth/login", { method: "POST", headers: { "Content-Type": "application/json", ...(ua ? { "User-Agent": ua } : {}) }, body: JSON.stringify({ email: "ali@x.ma", password: "Riad-Fes-2026-x", ...body }) }, env);
  return [r.status, await r.json()];
};
const me = async (token) => (await call("GET", "/api/v1/auth/me", `Bearer ${token}`))[0];
const row = (sid) => sql.prepare("select * from sessions where id = ?").get(sid);

// 1. Site sign-in: 7-day token with its session, device named from the browser.
let [st, r] = await login({}, "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36");
const web = r.data;
const wp = await verifyToken(web.access_token, "s");
check("web_session", st === 200 && web.session_id && !web.refresh_token && web.expires_in === 604800 && wp.sid === web.session_id && wp.exp - wp.iat === 604800, web);
check("device_named", row(web.session_id).device_name === "Chrome on Android" && row(web.session_id).platform === "android" && row(web.session_id).client === "web", row(web.session_id));
check("web_token_works", (await me(web.access_token)) === 200);

// 2. App sign-in: 15-minute token + refresh token.
[st, r] = await login({ client: "app", device_name: "Pixel 8 de Ali", platform: "android" });
const app1 = r.data;
const ap = await verifyToken(app1.access_token, "s");
check("app_session", st === 200 && app1.refresh_token?.startsWith(`${app1.session_id}.`) && app1.expires_in === 900 && ap.exp - ap.iat === 900, app1);
check("refresh_hash_only", row(app1.session_id).refresh_hash && row(app1.session_id).refresh_hash !== app1.refresh_token && !JSON.stringify(row(app1.session_id)).includes(app1.refresh_token.split(".")[1]));

// 3. Refresh: new pair; the old refresh token no longer works, and reusing it ends the session.
[st, r] = await call("POST", "/api/v1/auth/refresh", null, { refresh_token: app1.refresh_token });
const app2 = r.data;
check("refresh_rotates", st === 200 && app2.refresh_token !== app1.refresh_token && app2.session_id === app1.session_id && (await me(app2.access_token)) === 200, r);
[st, r] = await call("POST", "/api/v1/auth/refresh", null, { refresh_token: app2.refresh_token });
const app3 = r.data;
check("refresh_again", st === 200);
[st] = await call("POST", "/api/v1/auth/refresh", null, { refresh_token: app2.refresh_token });
check("old_refresh_refused", st === 401);
check("reuse_ends_session", row(app1.session_id).revoked_at !== null && row(app1.session_id).revoked_reason === "refresh token reused" && (await me(app3.access_token)) === 401);
[st] = await call("POST", "/api/v1/auth/refresh", null, { refresh_token: app3.refresh_token });
check("whole_session_dead", st === 401);
[st] = await call("POST", "/api/v1/auth/refresh", null, { refresh_token: "garbage" });
check("garbage_refused", st === 401);

// 4. My devices; sign one out (at once), not another person's.
[st, r] = await login({ client: "app", device_name: "iPhone", platform: "ios" });
const phone = r.data;
[st, r] = await call("GET", "/api/v1/auth/sessions", `Bearer ${web.access_token}`);
check("list_devices", st === 200 && r.data.length === 2 && r.data.find((d) => d.id === web.session_id).current === true && r.data.find((d) => d.id === phone.session_id).device_name === "iPhone", r.data);
const sara = (await call("POST", "/api/v1/auth/login", null, { email: "sara@x.ma", password: "Riad-Fes-2026-x" }))[1].data;
[st] = await call("DELETE", `/api/v1/auth/sessions/${phone.session_id}`, `Bearer ${sara.access_token}`);
check("not_someone_elses", st === 404 && (await me(phone.access_token)) === 200);
[st] = await call("DELETE", `/api/v1/auth/sessions/${phone.session_id}`, `Bearer ${web.access_token}`);
check("sign_one_out", st === 200 && (await me(phone.access_token)) === 401 && (await me(web.access_token)) === 200);
[st] = await call("POST", "/api/v1/auth/refresh", null, { refresh_token: phone.refresh_token });
check("signed_out_cannot_refresh", st === 401);

// 5. Password change: this device stays (same session), the others end.
const other = (await login({ client: "app", device_name: "Tablet" }))[1].data;
[st, r] = await call("POST", "/api/v1/auth/password", `Bearer ${web.access_token}`, { current_password: "Riad-Fes-2026-x", new_password: "Nouveau-Mot-2026-y" });
const after = r.data.access_token;
check("password_keeps_this_device", st === 200 && (await verifyToken(after, "s")).sid === web.session_id && (await me(after)) === 200, r);
check("password_ends_others", (await me(other.access_token)) === 401 && (await call("POST", "/api/v1/auth/refresh", null, { refresh_token: other.refresh_token }))[0] === 401);
[st, r] = await call("GET", "/api/v1/auth/sessions", `Bearer ${after}`);
check("list_after_password", r.data.length === 1 && r.data[0].current === true, r.data);

// 6. Expired session → refused; tokens from before devices (no sid) still work.
sql.prepare("update sessions set expires_at = datetime('now', '-1 minute') where id = ?").run(web.session_id);
check("expired_session_refused", (await me(after)) === 401);
const legacy = await tok({ user_id: 8, role: "buyer" });
check("legacy_token_ok", (await call("GET", "/api/v1/auth/me", legacy))[0] === 200);

console.log(results);
const fails = Object.values(results).filter((v) => v !== "PASS").length;
console.log(fails ? `${fails} FAIL` : "ALL PASS");
process.exitCode = fails ? 1 : 0;
