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
// Favorites (routes/favorites.ts, migrations/0041).
sql.exec(`
  INSERT INTO users (id,name,email,password_hash,role) VALUES (2,'S','s@x','x','seller'),(7,'B','b@x','x','buyer'),(8,'B2','b2@x','x','buyer');
  INSERT INTO sellers (id,user_id,name,slug,status,location) VALUES (1,2,'Shop','shop','active','Casablanca');
  INSERT INTO categories (id,name,slug) VALUES (1,'Brakes','brakes');
  INSERT INTO parts (id,seller_id,category_id,title,slug,price,pro_price,quantity,status) VALUES (1,1,1,'Pads','pads',10000,8000,5,'active'),(2,1,1,'Disc','disc',40000,NULL,5,'active'),(3,1,1,'Draft','draft',1000,NULL,5,'draft');
`);
const b = await tok({ user_id: 7, role: "buyer" });
const b2 = await tok({ user_id: 8, role: "buyer" });

check("needs_sign_in", (await call("PUT", "/api/v1/favorites/1", null))[0] === 401);
check("save", (await call("PUT", "/api/v1/favorites/1", b))[0] === 200 && (await call("PUT", "/api/v1/favorites/2", b))[0] === 200);
check("save_twice_ok", (await call("PUT", "/api/v1/favorites/1", b))[0] === 200 && sql.prepare("select count(*) n from favorites where user_id = 7").get().n === 2);
check("not_a_draft", (await call("PUT", "/api/v1/favorites/3", b))[0] === 404);
check("not_missing", (await call("PUT", "/api/v1/favorites/99", b))[0] === 404);
let [, ids] = await call("GET", "/api/v1/favorites/ids", b);
check("ids", JSON.stringify([...ids.data].sort()) === "[1,2]", ids);
let [, list] = await call("GET", "/api/v1/favorites", b);
check("list", list.data.length === 2 && list.data.every((p) => p.available === 1 && p.seller_name === "Shop"), list.data);
check("pro_amount_hidden", list.data.find((p) => p.id === 1).has_pro_price === 1 && !("pro_price" in list.data.find((p) => p.id === 1)));
check("own_only", (await call("GET", "/api/v1/favorites/ids", b2))[1].data.length === 0);
// A part taken off sale stays, marked unavailable.
sql.exec("update parts set status = 'archived' where id = 2");
[, list] = await call("GET", "/api/v1/favorites", b);
check("unavailable_marked", list.data.find((p) => p.id === 2)?.available === 0, list.data);
// Remove.
await call("DELETE", "/api/v1/favorites/1", b);
[, ids] = await call("GET", "/api/v1/favorites/ids", b);
check("removed", JSON.stringify(ids.data) === "[2]", ids);
// Limit.
sql.exec("delete from favorites");
sql.exec("update parts set status = 'active' where id = 2");
const ins = sql.prepare("insert into parts (id,seller_id,category_id,title,slug,price,quantity,status) values (?,1,1,?,?,100,1,'active')");
const fav = sql.prepare("insert into favorites (user_id, part_id) values (7, ?)");
for (let i = 100; i < 300; i++) { ins.run(i, `P${i}`, `p-${i}`); fav.run(i); }
check("limit_200", (await call("PUT", "/api/v1/favorites/2", b))[0] === 409);

console.log(results);
const fails = Object.values(results).filter((x) => x !== "PASS").length;
console.log(fails ? `${fails} FAIL` : "ALL PASS");
if (fails) process.exit(1);
