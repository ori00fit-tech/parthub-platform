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
  INSERT INTO users (id,name,email,password_hash,role) VALUES (2,'S1','s1@x','x','seller'),(3,'S2','s2@x','x','seller');
  INSERT INTO sellers (id,user_id,name,slug,status,location) VALUES (1,2,'Casse One','one','active','Casablanca'),(2,3,'Pending','two','pending','Fes');
  INSERT INTO categories (id,name,slug) VALUES (1,'Filters & Fluids','filters'),(2,'Brakes & Rotors','brakes'),(3,'Cooling','cooling');
  INSERT INTO vehicle_makes (id,slug,name) VALUES (1,'dacia','Dacia'),(2,'renault','Renault');
  INSERT INTO vehicle_models (id,make_id,slug,name) VALUES (1,1,'logan','Logan'),(2,1,'sandero','Sandero'),(3,2,'clio','Clio');
  INSERT INTO vehicle_generations (model_id,slug,name,year_start,year_end) VALUES (1,'logan-2','Logan II',2012,2020);
  INSERT INTO parts (id,seller_id,category_id,title,slug,price,condition,quantity,status) VALUES
    (1,1,1,'Oil filter Logan','f1',5000,'new',3,'active'),
    (2,1,2,'Brake pads Logan','b1',20000,'new',0,'active'),
    (3,1,1,'Air filter Sandero','f2',7000,'new',2,'active'),
    (4,2,1,'Hidden pending store','h1',100,'new',2,'active'),
    (5,1,1,'Draft part','d1',100,'new',2,'draft'),
    (6,1,2,'Brake Clio','c1',100,'new',2,'active');
  INSERT INTO part_compatibility (part_id,make,model,year_start) VALUES (1,'dacia','LOGAN',2014),(2,'Dacia','Logan',2014),(3,'Dacia','Sandero',2015),(4,'Dacia','Logan',2014),(5,'Dacia','Logan',2014),(6,'Renault','Clio',2015);
`);
let [st, r] = await call("GET", "/api/v1/catalog/landing?make=dacia");
check("make 200", st === 200 && r.data.total === 3, r);
check("make models", JSON.stringify(r.data.models.map(m => [m.slug, m.count])) === JSON.stringify([["logan", 2], ["sandero", 1]]), r.data.models);
check("make categories", r.data.categories.find(c => c.slug === "filters")?.count === 2, r.data.categories);
check("in stock first", r.data.parts[r.data.parts.length - 1].slug === "b1", r.data.parts.map(p => p.slug));
[st, r] = await call("GET", "/api/v1/catalog/landing?make=dacia&model=logan");
check("model", r.data.total === 2 && r.data.generations[0].name === "Logan II" && r.data.models.length === 0, r.data);
[st, r] = await call("GET", "/api/v1/catalog/landing?make=dacia&model=logan&category=filters");
check("combo", r.data.total === 1 && r.data.parts[0].slug === "f1" && r.data.categories.length === 0, r.data);
[st, r] = await call("GET", "/api/v1/catalog/landing?category=filters");
check("category", r.data.total === 2 && JSON.stringify(r.data.makes.map(m => [m.slug, m.count])) === '[["dacia",2]]', r.data);
[st, r] = await call("GET", "/api/v1/catalog/landing?category=cooling");
check("empty category", st === 200 && r.data.total === 0 && r.data.parts.length === 0, r.data);
for (const q of ["make=bmw", "category=nope", "model=logan", "make=renault&model=logan", ""]) {
  [st] = await call("GET", "/api/v1/catalog/landing?" + q);
  check("404 " + q, st === 404, st);
}
[st, r] = await call("GET", "/api/v1/catalog/sitemap");
const L = r.data.landings.sort();
check("sitemap landings", JSON.stringify(L) === JSON.stringify(["/pieces/brakes","/pieces/filters","/voiture/dacia","/voiture/dacia/logan","/voiture/dacia/logan/brakes","/voiture/dacia/logan/filters","/voiture/dacia/sandero","/voiture/dacia/sandero/filters","/voiture/renault","/voiture/renault/clio","/voiture/renault/clio/brakes"]), L);
console.log(results);
const fails = Object.values(results).filter(v => v !== "PASS").length; console.log(fails ? `${fails} FAIL` : "ALL PASS");
