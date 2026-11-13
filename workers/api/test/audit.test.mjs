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
// Admin audit log (utils/audit.ts, migrations/0031).
sql.exec(`
  INSERT INTO users (id,name,email,password_hash,role) VALUES (1,'Admin One','a1@x','x','admin'),(5,'Admin Two','a2@x','x','admin'),(2,'S1','s1@x','x','seller');
  INSERT INTO sellers (id,user_id,name,slug,status,location) VALUES (1,2,'Casa','casa','pending','Casablanca');
`);
const a1 = await tok({ user_id: 1, role: "admin" });
const a2 = await tok({ user_id: 5, role: "admin" });
const s1 = await tok({ user_id: 2, role: "seller", seller_id: 1 });
const log = () => sql.prepare("select * from admin_audit_log order by id").all();

let [st] = await call("PATCH", "/api/v1/admin/sellers/1/status", a1, { status: "active" });
let rows = log();
check("change_logged", st === 200 && rows.length === 1 && rows[0].admin_id === 1 && rows[0].method === "PATCH" &&
  rows[0].route === "/api/v1/admin/sellers/:id/status" && rows[0].target_type === "sellers" && rows[0].target_id === "1" &&
  JSON.parse(rows[0].body).status === "active" && rows[0].status === 200, rows);
// A refused change is logged too, with its status.
[st] = await call("PATCH", "/api/v1/admin/sellers/1/status", a2, { status: "suspended", reason: "x" });
rows = log();
check("refused_logged", st === 400 && rows.length === 2 && rows[1].admin_id === 5 && rows[1].status === 400, rows[1]);
// Reading is not logged.
await call("GET", "/api/v1/admin/sellers", a1);
check("reads_not_logged", log().length === 2);
// Secrets never stored, at any depth.
await call("POST", "/api/v1/admin/carriers", a1, { code: "testco", name: "Test Co", webhook: { secret: "s3cr3t-value", token: "tok-123" }, password: "p@ss" });
const body = log().at(-1).body;
check("secrets_removed", !body.includes("s3cr3t-value") && !body.includes("tok-123") && !body.includes("p@ss") && body.includes("[removed]") && body.includes("Test Co"), body);
// A non-admin is refused before anything: nothing logged.
const before = log().length;
[st] = await call("PATCH", "/api/v1/admin/sellers/1/status", s1, { status: "active" });
check("non_admin_not_logged", st === 403 && log().length === before, st);
// Reading the log: newest first, filters, admin name.
let r;
[st, r] = await call("GET", "/api/v1/admin/audit-log?target_type=sellers&target_id=1", a1);
check("read_log", st === 200 && r.data.length === 2 && r.data[0].admin_name === "Admin Two" && r.data[1].admin_name === "Admin One" && r.pagination?.total === 2, r);
[st, r] = await call("GET", "/api/v1/admin/audit-log?admin_id=1", a1);
check("filter_admin", r.data.every((x) => x.admin_id === 1) && r.data.length === 2, r.data.map((x) => x.admin_id));
[st] = await call("GET", "/api/v1/admin/audit-log", s1);
check("log_admin_only", st === 403, st);

console.log(results);
const fails = Object.values(results).filter((v) => v !== "PASS").length;
console.log(fails ? `${fails} FAIL` : "ALL PASS");
process.exitCode = fails ? 1 : 0;
