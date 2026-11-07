const ROOT = new URL("../../../", import.meta.url).pathname; // repository root
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import app from "./.build/app.mjs";
import { signToken } from "./.build/auth.mjs";

const sql = new DatabaseSync(":memory:");
sql.exec(readFileSync(ROOT + "infra/d1/schema.sql", "utf8"));
sql.exec(readFileSync(ROOT + "infra/d1/seed-vehicles-uk.sql", "utf8"));
sql.exec(readFileSync(ROOT + "infra/d1/migrations/0017_seed_vehicle_catalog.sql", "utf8"));
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
  INSERT INTO users (id,name,email,password_hash,role) VALUES (2,'S1','s1@x','x','seller'),(3,'S2','s2@x','x','seller'),(9,'Admin','a@x','x','admin'),(1,'B','b@x','x','buyer');
  INSERT INTO sellers (id,user_id,name,slug,status) VALUES (1,2,'One','one','active');
  INSERT INTO categories (id,name,slug) VALUES (1,'Electrical','electrical');
  INSERT INTO parts (id,seller_id,category_id,slug,title,price,quantity,status) VALUES (1,1,1,'alt','Alternator',100000,1,'active');
`);
const s1 = await tok({ user_id: 2, role: "seller", seller_id: 1 });
const s2 = await tok({ user_id: 3, role: "seller" });
const admin = await tok({ user_id: 9, role: "admin" });
const buyer = await tok({ user_id: 1, role: "buyer" });

let [st, b] = await call("GET", "/api/v1/vehicles/generations?make=renault&model=clio", null);
check("generations", st === 200 && b.data.map((g) => g.name).join() === "Clio II,Clio III,Clio IV,Clio V", b.data);
const clio4 = b.data.find((g) => g.name === "Clio IV");
[st, b] = await call("GET", "/api/v1/vehicles/generations?make=renault&model=Mégane", null);
check("generations_by_model_name", b.data.length === 3, b.data);
[st, b] = await call("GET", `/api/v1/vehicles/engines?generation_id=${clio4.id}`, null);
check("engines_sorted", b.data.map((e) => e.name).join() === "0.9 TCe 90,1.2 16V 75,1.5 dCi 75,1.5 dCi 90" && b.data[2].fuel === "diesel", b.data.map((e) => e.name));
const dci90 = b.data.find((e) => e.name === "1.5 dCi 90");
[st] = await call("GET", "/api/v1/vehicles/engines", null);
check("engines_needs_generation", st === 400, st);

// Fitment from the catalog: names and years filled in.
[st, b] = await call("POST", "/api/v1/marketplace/me/parts/1/compatibility", s1, { generation_id: clio4.id, engine_id: dci90.id, make: "whatever", model: "x" });
const row = sql.prepare("select * from part_compatibility where part_id = 1").get();
check("fitment_from_catalog", st === 201 && row.make === "Renault" && row.model === "Clio" && row.year_start === 2012 && row.year_end === 2019 && row.engine === "1.5 dCi 90" && row.generation_id === clio4.id && row.engine_id === dci90.id, [st, b, row]);
[st, b] = await call("POST", "/api/v1/marketplace/me/parts/1/compatibility", s1, { generation_id: clio4.id, engine_id: dci90.id });
check("fitment_duplicate", st === 409, st);
[st, b] = await call("POST", "/api/v1/marketplace/me/parts/1/compatibility", s1, { generation_id: clio4.id, year_start: 2016, year_end: 2019 });
check("fitment_narrowed_years_all_engines", st === 201, [st, b]);
const otherGen = sql.prepare("select g.id from vehicle_generations g where g.slug = 'logan-ii'").get().id;
[st] = await call("POST", "/api/v1/marketplace/me/parts/1/compatibility", s1, { generation_id: otherGen, engine_id: dci90.id });
check("engine_must_match_generation", st === 400, st);
[st] = await call("POST", "/api/v1/marketplace/me/parts/1/compatibility", s1, { make: "Renault", model: "Clio", year_start: 2010, year_end: 2011 });
check("free_text_still_works", st === 201, st);
[st, b] = await call("GET", "/api/v1/marketplace/me/parts/1/compatibility", s1);
check("seller_list_has_generation", b.data.some((r) => r.generation === "Clio IV"), b.data);
[st, b] = await call("GET", "/api/v1/catalog/parts/alt", null);
check("public_part_has_generation", b.data.compatibility.some((r) => r.generation === "Clio IV" && r.engine === "1.5 dCi 90"), b.data.compatibility);
[st, b] = await call("GET", "/api/v1/catalog/parts?make=Renault&model=Clio&year=2015", null);
check("search_by_vehicle_finds_it", (b.data.items || b.data).some((p) => p.slug === "alt"), b.data);

// Suggestions
[st, b] = await call("POST", "/api/v1/marketplace/me/catalog-suggestions", buyer, { make: "Lada", model: "Niva" });
check("buyer_cannot_suggest", st === 403, st);
[st, b] = await call("POST", "/api/v1/marketplace/me/catalog-suggestions", s2, { make: "Lada", model: "Niva", generation: "Niva 4x4", year_start: 1977, engine: "1.7 83" });
const sugId = b.data?.id;
check("suggest_vehicle", st === 201, [st, b]);
[st] = await call("POST", "/api/v1/marketplace/me/catalog-suggestions", s2, { make: "Lada" });
check("suggest_needs_model", st === 400, st);
[st] = await call("POST", "/api/v1/marketplace/me/catalog-suggestions", s2, { kind: "brand", brand: "valeo" });
check("brand_exists_409", st === 409, st);
[st, b] = await call("POST", "/api/v1/marketplace/me/catalog-suggestions", s2, { kind: "brand", brand: "Kale Oto Radyatör" });
const brandSug = b.data?.id;
check("suggest_brand", st === 201, st);
[st, b] = await call("GET", "/api/v1/admin/pending-counts", admin);
check("admin_count_catalog", b.data.catalog === 2, b.data);
[st, b] = await call("GET", "/api/v1/admin/catalog-suggestions", admin);
check("admin_list", b.data.length === 2 && b.data[0].user_email, b.data);
[st, b] = await call("POST", `/api/v1/admin/catalog-suggestions/${sugId}/approve`, admin, { generation: "Niva (2121)" });
check("approve_vehicle", st === 200 && b.data.created.generation.name === "Niva (2121)" && b.data.created.engine.name === "1.7 83", [st, b]);
[st, b] = await call("GET", "/api/v1/vehicles/generations?make=lada&model=niva", null);
check("approved_selectable", b.data.length === 1 && b.data[0].year_start === 1977, b.data);
[st] = await call("POST", `/api/v1/admin/catalog-suggestions/${sugId}/approve`, admin, {});
check("approve_once", st === 409, st);
[st, b] = await call("POST", `/api/v1/admin/catalog-suggestions/${brandSug}/reject`, admin, { admin_note: "Not sold in Morocco" });
check("reject_brand", st === 200, st);
[st, b] = await call("GET", "/api/v1/marketplace/me/catalog-suggestions", s2);
check("seller_sees_status", b.data.map((x) => x.status).sort().join() === "approved,rejected", b.data);
[st] = await call("GET", "/api/v1/admin/catalog-suggestions", s2);
check("admin_only", st === 401 || st === 403, st);

// Admin corrections
[st, b] = await call("POST", "/api/v1/admin/vehicles/catalog", admin, { make: "Renault", model: "Clio", generation: "Clio IV", year_start: 2012, engine: "1.5 dCi 110" });
check("admin_adds_engine_no_dup", st === 200 && b.data.generation.id === clio4.id && sql.prepare("select count(*) n from vehicle_generations where model_id = (select model_id from vehicle_generations where id = ?)").get(clio4.id).n === 4, [st, b.data]);
const clioModel = sql.prepare("select model_id from vehicle_generations where id = ?").get(clio4.id).model_id;
[st, b] = await call("GET", `/api/v1/admin/vehicles/generations?model_id=${clioModel}`, admin);
const g4 = b.data.find((g) => g.id === clio4.id);
check("admin_generations_with_engines", g4.engines.length === 5 && g4.fitment_count === 2, g4);
[st, b] = await call("PATCH", `/api/v1/admin/vehicles/engines/${dci90.id}`, admin, { name: "1.5 dCi 90 (K9K)" });
check("rename_engine_updates_fitment", sql.prepare("select engine from part_compatibility where engine_id = ?").get(dci90.id).engine === "1.5 dCi 90 (K9K)", sql.prepare("select engine from part_compatibility where engine_id = ?").get(dci90.id));
[st] = await call("PATCH", `/api/v1/admin/vehicles/generations/${clio4.id}`, admin, { year_end: 2011 });
check("bad_years_refused", st === 400, st);
[st] = await call("DELETE", `/api/v1/admin/vehicles/generations/${clio4.id}`, admin);
const kept = sql.prepare("select count(*) n, sum(generation_id is null) unlinked from part_compatibility where part_id = 1").get();
check("delete_generation_keeps_fitment_text", st === 200 && kept.n === 3 && kept.unlinked === 3, kept);

let bad = 0;
for (const [k, v] of Object.entries(results)) { console.log(v.startsWith("PASS") ? "PASS" : "FAIL", k, v.startsWith("PASS") ? "" : v); if (!v.startsWith("PASS")) bad++; }
console.log(bad ? `${bad} failed` : `all ${Object.keys(results).length} passed`);
