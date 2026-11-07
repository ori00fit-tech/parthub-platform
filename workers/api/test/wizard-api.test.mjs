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
  INSERT INTO users (id,name,email,password_hash,role) VALUES (2,'S1','s1@x','x','seller'), (3,'S2','s2@x','x','seller');
  INSERT INTO sellers (id,user_id,name,slug,status) VALUES (1,2,'Casse','casse','active'), (2,3,'Other','other','active');
  INSERT INTO categories (id,name,slug) VALUES (1,'Brakes','brakes');
`);
const s1 = await tok({ user_id: 2, role: "seller", seller_id: 1 });
const s2 = await tok({ user_id: 3, role: "seller", seller_id: 2 });
const base = { title: "Pads", slug: "pads-1", category_id: 1, price: 35000, quantity: 3, condition: "used", image_url: "/api/v1/media/uploads/a.jpg" };
let [st, b] = await call("POST", "/api/v1/marketplace/me/parts", s1, { ...base, part_origin: "oem" });
const id = b.data?.id;
check("create_ok", st === 201 && id, [st, b]);
check("origin_saved", sql.prepare("select part_origin from parts where id=?").get(id).part_origin === "oem");
[st, b] = await call("POST", "/api/v1/marketplace/me/parts", s1, { ...base, slug: "pads-2", part_origin: "fake" });
check("bad_origin_defaults", sql.prepare("select part_origin from parts where id=?").get(b.data.id).part_origin === "aftermarket");
[st, b] = await call("POST", "/api/v1/marketplace/me/parts", s1, { ...base, slug: "pads-3" });
check("no_origin_defaults", sql.prepare("select part_origin from parts where id=?").get(b.data.id).part_origin === "aftermarket");
[st, b] = await call("GET", `/api/v1/marketplace/me/parts/${id}`, s1);
check("detail_has_origin", b.data.part_origin === "oem", b.data);
// update without origin keeps it; with origin changes it
const upd = { ...base, slug: "pads-1" };
[st, b] = await call("PUT", `/api/v1/marketplace/me/parts/${id}`, s1, upd);
check("update_keeps_origin", st === 200 && sql.prepare("select part_origin from parts where id=?").get(id).part_origin === "oem", [st, b]);
[st, b] = await call("PUT", `/api/v1/marketplace/me/parts/${id}`, s1, { ...upd, part_origin: "used" });
check("update_changes_origin", sql.prepare("select part_origin from parts where id=?").get(id).part_origin === "used");
// images: create's image + 1 more, list, owner only
await call("POST", `/api/v1/marketplace/parts/${id}/images`, s1, { url: "/api/v1/media/uploads/b.jpg", sort_order: 2, is_featured: false });
[st, b] = await call("GET", `/api/v1/marketplace/parts/${id}/images`, s1);
check("images_list", st === 200 && b.data.length === 2 && b.data[0].url.endsWith("a.jpg"), [st, b]);
[st, b] = await call("GET", `/api/v1/marketplace/parts/${id}/images`, s2);
check("images_other_seller_404", st === 404, st);
[st, b] = await call("GET", `/api/v1/marketplace/parts/${id}/images`, null);
check("images_auth_required", st === 401, st);
let bad = 0;
for (const [k, v] of Object.entries(results)) { console.log(v.startsWith("PASS") ? "PASS" : "FAIL", k, v.startsWith("PASS") ? "" : v); if (!v.startsWith("PASS")) bad++; }
console.log(bad ? `${bad} failed` : `all ${Object.keys(results).length} passed`);
