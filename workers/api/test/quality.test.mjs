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
  INSERT INTO users (id,name,email,password_hash,role) VALUES (2,'S1','s1@x','x','seller'),(3,'S2','s2@x','x','seller'),(9,'Admin','a@x','x','admin');
  INSERT INTO sellers (id,user_id,name,slug,status) VALUES (1,2,'One','one','active');
  INSERT INTO categories (id,name,slug) VALUES (1,'Filters','filters');
  INSERT INTO parts (id,seller_id,category_id,slug,title,price,quantity,status) VALUES
    (1,1,1,'diesel-filter','Diesel filter 1.5 dCi',10000,5,'active'),
    (2,1,1,'wiper','Wiper blades',5000,5,'active'),
    (3,1,1,'legacy','Legacy part',5000,5,'active'),
    (4,1,1,'petrol-plug','Spark plug 1.2',3000,5,'active');
`);
const s1 = await tok({ user_id: 2, role: "seller", seller_id: 1 });
const s2 = await tok({ user_id: 3, role: "seller" });
const admin = await tok({ user_id: 9, role: "admin" });
const gen = sql.prepare("select id from vehicle_generations where slug='clio-iv'").get().id;
const eng = (name) => sql.prepare("select id from vehicle_engines where generation_id=? and name=?").get(gen, name).id;
const dci90 = eng("1.5 dCi 90"), tce90 = eng("0.9 TCe 90");

// Engine scope stored on fitment rows
let [st, b] = await call("POST", "/api/v1/marketplace/me/parts/1/compatibility", s1, { generation_id: gen, engine_id: dci90 });
[st, b] = await call("POST", "/api/v1/marketplace/me/parts/2/compatibility", s1, { generation_id: gen, engine_scope: "all" });
[st, b] = await call("POST", "/api/v1/marketplace/me/parts/4/compatibility", s1, { generation_id: gen, engine_id: tce90 });
sql.exec("INSERT INTO part_compatibility (part_id, make, model, year_start, year_end) VALUES (3, 'Renault', 'Clio', 2012, 2019)");
const scopes = Object.fromEntries(sql.prepare("select part_id, engine_scope from part_compatibility").all().map((r) => [r.part_id, r.engine_scope]));
check("scopes_stored", scopes[1] === "specific" && scopes[2] === "all" && scopes[3] === "unspecified" && scopes[4] === "specific", scopes);
[st, b] = await call("POST", "/api/v1/marketplace/me/parts/3/compatibility", s1, { generation_id: gen, year_start: 2016 });
check("no_engine_defaults_unspecified", sql.prepare("select engine_scope from part_compatibility where part_id=3 and generation_id is not null").get().engine_scope === "unspecified");
[st, b] = await call("GET", "/api/v1/marketplace/me/parts/2/compatibility", s1);
check("scope_in_seller_list", b.data[0].engine_scope === "all", b.data[0]);
[st, b] = await call("GET", "/api/v1/catalog/parts/wiper", null);
check("scope_in_public_part", b.data.compatibility[0].engine_scope === "all", b.data.compatibility[0]);

// Search: engine-aware matching (Clio 2015)
const flags = (data) => Object.fromEntries(data.map((p) => [p.slug, `${p.exact_vehicle_match}${p.engine_check_match}`]));
const search = async (extra) => (await call("GET", `/api/v1/search?make=renault&model=clio&year=2015&fit=rank${extra}`, null))[1].data;
let f = flags(await search(""));
check("no_engine_known", f["diesel-filter"] === "01" && f.wiper === "10" && f.legacy === "01" && f["petrol-plug"] === "01", f);
f = flags(await search(`&engine_id=${dci90}`));
check("diesel_buyer", f["diesel-filter"] === "10" && f.wiper === "10" && f.legacy === "01" && f["petrol-plug"] === "00", f);
f = flags(await search(`&engine=${encodeURIComponent("1.5 dCi 90")}`));
check("engine_by_name", f["diesel-filter"] === "10", f);
let only = (await call("GET", `/api/v1/search?make=renault&model=clio&year=2015&engine_id=${dci90}`, null))[1];
check("fit_only_excludes_other_engine", !only.data.some((p) => p.slug === "petrol-plug") && only.data.length === 3 && only.meta.pagination.total === 3, [only.data.map((p) => p.slug), only.meta]);
const ranked = (await search(`&engine_id=${dci90}`)).map((p) => p.slug);
check("rank_exact_before_check", ranked.indexOf("diesel-filter") < ranked.indexOf("legacy") && ranked.indexOf("wiper") < ranked.indexOf("legacy"), ranked);

// Years per make, engines for a year
const leonYears = (mk) => sql.exec(`INSERT OR IGNORE INTO vehicle_years (model_id, year) SELECT vm.id, ${mk === 'cupra' ? 2021 : 2006} FROM vehicle_models vm JOIN vehicle_makes m ON m.id = vm.make_id WHERE m.slug='${mk}' AND vm.slug='leon'`);
leonYears("cupra"); leonYears("seat");
[st, b] = await call("GET", "/api/v1/vehicles/years?model=leon&make=cupra", null);
const cupraYears = b.data.map((y) => y.year);
check("years_by_make", cupraYears.includes(2021) && !cupraYears.includes(2006), cupraYears.slice(0, 10));
[st, b] = await call("GET", "/api/v1/vehicles/engines-for?make=renault&model=clio&year=2013", null);
const gens = [...new Set(b.data.map((e) => e.generation))];
check("engines_for_year_overlap", st === 200 && gens.includes("Clio III") && gens.includes("Clio IV") && !gens.includes("Clio V"), gens);

// Provenance and verification
[st, b] = await call("POST", "/api/v1/admin/vehicles/catalog", admin, { make: "Renault", model: "Clio", generation: "Clio IV", year_start: 2012, engine: "1.5 dCi 110" });
let row = sql.prepare("select source, verification, specs_inferred from vehicle_engines where name='1.5 dCi 110' and generation_id=?").get(gen);
check("admin_add_provenance", row.source === "admin" && row.verification === "admin_approved" && row.specs_inferred === 1, row);
check("existing_row_keeps_provenance", sql.prepare("select source from vehicle_generations where id=?").get(gen).source === null);
[st, b] = await call("PATCH", `/api/v1/admin/vehicles/engines/${dci90}`, admin, { verification: "verified" });
row = sql.prepare("select name, verification, specs_inferred from vehicle_engines where id=?").get(dci90);
check("verify_engine", st === 200 && row.verification === "verified" && row.specs_inferred === 0 && row.name === "1.5 dCi 90", [st, row]);
[st] = await call("PATCH", `/api/v1/admin/vehicles/engines/${dci90}`, admin, { verification: "sure" });
check("bad_verification", st === 400, st);
[st] = await call("PATCH", `/api/v1/admin/vehicles/generations/${gen}`, admin, { verification: "verified" });
check("verify_generation", st === 200 && sql.prepare("select verification from vehicle_generations where id=?").get(gen).verification === "verified");
[st] = await call("PATCH", `/api/v1/admin/vehicles/engines/${dci90}`, s1, { verification: "verified" });
check("seller_cannot_verify", st === 401 || st === 403, st);

// Suggestions: duplicates refused, approval claimed once
[st, b] = await call("POST", "/api/v1/marketplace/me/catalog-suggestions", s1, { make: "Lada", model: "Niva" });
const sugId = b.data.id;
[st, b] = await call("POST", "/api/v1/marketplace/me/catalog-suggestions", s2, { make: "lada", model: "NIVA" });
check("duplicate_vehicle_suggestion", st === 409, [st, b]);
[st] = await call("POST", "/api/v1/marketplace/me/catalog-suggestions", s1, { kind: "brand", brand: "Kale" });
[st, b] = await call("POST", "/api/v1/marketplace/me/catalog-suggestions", s2, { kind: "brand", brand: "kale" });
check("duplicate_brand_suggestion", st === 409, st);
const both = await Promise.all([
  call("POST", `/api/v1/admin/catalog-suggestions/${sugId}/approve`, admin, {}),
  call("POST", `/api/v1/admin/catalog-suggestions/${sugId}/approve`, admin, {}),
]);
check("concurrent_approve_once", both.map((r) => r[0]).sort().join() === "200,409", both.map((r) => r[0]));
row = sql.prepare("select source, verification from vehicle_models where slug='niva'").get();
check("suggestion_provenance", row.source === "seller_suggestion" && row.verification === "admin_approved", row);
[st, b] = await call("POST", "/api/v1/marketplace/me/catalog-suggestions", s2, { make: "Lada", model: "Niva" });
check("suggest_again_after_review", st === 201, st);

let bad = 0;
for (const [k, v] of Object.entries(results)) { console.log(v.startsWith("PASS") ? "PASS" : "FAIL", k, v.startsWith("PASS") ? "" : v); if (!v.startsWith("PASS")) bad++; }
console.log(bad ? `${bad} failed` : `all ${Object.keys(results).length} passed`);
