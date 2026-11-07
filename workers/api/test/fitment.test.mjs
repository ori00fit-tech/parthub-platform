const ROOT = new URL("../../../", import.meta.url).pathname; // repository root
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import app from "./.build/app.mjs";

const sql = new DatabaseSync(":memory:");
sql.exec(readFileSync(ROOT + "infra/d1/schema.sql", "utf8"));
sql.exec(readFileSync(ROOT + "infra/d1/migrations/0002_search_engine.sql", "utf8"));
const stmt = (q) => { let a = []; const s = { bind(...x) { a = x; return s; }, async first() { return sql.prepare(q).get(...a) ?? null; }, async all() { return { results: sql.prepare(q).all(...a) }; }, async run() { const r = sql.prepare(q).run(...a); return { meta: { last_row_id: Number(r.lastInsertRowid), changes: r.changes } }; } }; return s; };
const env = { DB: { prepare: stmt }, JWT_SECRET: "s" };
const results = {};
const check = (n, c, x = "") => { results[n] = c ? "PASS" : `FAIL ${JSON.stringify(x)}`; };
const get = async (qs) => { const r = await app.request(`/api/v1/search?${qs}`, {}, env); const b = await r.json(); return [r.status, b]; };
const ids = (b) => b.data.map((p) => p.slug);

sql.exec(`
  INSERT INTO users (id,name,email,password_hash,role) VALUES (1,'S','s@x','x','seller');
  INSERT INTO sellers (id,user_id,name,slug,status) VALUES (1,1,'Shop','shop','active');
  INSERT INTO categories (id,name,slug) VALUES (1,'Brakes','brakes');
  INSERT INTO parts (id,seller_id,category_id,slug,title,price,quantity,status) VALUES
    (1,1,1,'exact','Clio pads 2012-2019',38000,5,'active'),
    (2,1,1,'other-years','Clio pads 2005-2008',30000,5,'active'),
    (3,1,1,'other-model','Megane pads',41000,5,'active'),
    (4,1,1,'no-fitment','Universal pads',20000,5,'active');
  INSERT INTO part_compatibility (part_id,make,model,year_start,year_end) VALUES
    (1,'Renault','Clio',2012,2019),(2,'Renault','Clio',2005,2008),(3,'Renault','Megane',2010,2016);
`);
const V = "make=renault&model=clio&year=2015";

let [st, b] = await get(V);
if (!b.data) console.log("ERROR:", st, JSON.stringify(b));
check("default_is_only", st === 200 && JSON.stringify(ids(b)) === '["exact"]' && b.meta.pagination.total === 1 && b.meta.query.fit === "only", [st, ids(b), b.meta?.query]);

[st, b] = await get(`${V}&fit=rank`);
if (!b.data) console.log("RANK ERROR:", st, JSON.stringify(b));
const order = ids(b);
check("rank_returns_all", st === 200 && order.length === 4 && b.meta.pagination.total === 4, [st, order, b.error]);
check("rank_exact_first_then_same_model", order[0] === "exact" && order[1] === "other-years", order);
// Rows without an engine: model and year match, engine to check (not "exact").
const flags = Object.fromEntries(b.data.map((p) => [p.slug, [p.exact_vehicle_match, p.engine_check_match, p.partial_vehicle_match]]));
check("match_flags", JSON.stringify(flags.exact) === "[0,1,1]" && JSON.stringify(flags["other-years"]) === "[0,0,1]" && JSON.stringify(flags["no-fitment"]) === "[0,0,0]", flags);

[st, b] = await get(`${V}&fit=rank&q=pads&sort=price_asc`);
check("rank_with_text_and_sort", st === 200 && ids(b)[0] === "no-fitment" && b.data.length === 4, [st, ids(b), b.error]);

[st, b] = await get("make=renault&model=clio");
check("make_model_only", JSON.stringify(ids(b).sort()) === '["exact","other-years"]', ids(b));
[st, b] = await get("make=renault&model=clio&fit=rank");
check("make_model_rank", st === 200 && b.data.length === 4, [st, b.error]);
[st, b] = await get("make=renault");
check("make_only", b.data.length === 3, ids(b));
[st, b] = await get("make=renault&fit=rank");
check("make_rank", st === 200 && b.data.length === 4, [st, b.error]);
[st, b] = await get("limit=3");
check("no_vehicle_unchanged", st === 200 && b.data.length === 4, [st, b.error]);

const logs = sql.prepare("SELECT query, make, model, year FROM part_search_logs ORDER BY id").all();
console.log("log rows:", logs.length);
check("search_logged", logs.length === 8 && logs[0].make === "renault" && logs[0].model === "clio" && logs[0].year === 2015 && logs[0].query === "", logs[0]);

console.log(results);
console.log(Object.values(results).every((v) => v === "PASS") ? "ALL PASS" : "SOME FAILED");
