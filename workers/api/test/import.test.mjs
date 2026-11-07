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
  INSERT INTO sellers (id,user_id,name,slug,status,location) VALUES (1,2,'Casse One','one','active','Casablanca'),(2,3,'Two','two','active','Rabat');
  INSERT INTO categories (id,name,slug) VALUES (1,'Filters & Fluids','filters'),(2,'Brakes & Rotors','brakes');
  INSERT INTO brands (id,name,slug) VALUES (1,'Bosch','bosch'),(2,'Valeo','valeo');
  INSERT INTO vehicle_makes (id,slug,name) VALUES (1,'dacia','Dacia'),(2,'renault','Renault'),(3,'mercedes-benz','Mercedes-Benz');
  INSERT INTO vehicle_models (id,make_id,slug,name) VALUES (1,1,'logan','Logan'),(2,2,'clio','Clio'),(3,3,'classe-c','Classe C');
  INSERT INTO vehicle_generations (id,model_id,slug,name,year_start,year_end) VALUES (10,2,'clio-iv','Clio IV',2012,2019),(11,1,'logan-ii','Logan II',2012,2020);
  INSERT INTO parts (id,seller_id,category_id,title,slug,price,quantity,status,sku) VALUES
    (50,1,1,'Old filter','old-filter',1000,0,'active','FLT-1'),
    (51,2,1,'Other seller same sku','x-filter',1000,5,'active','ABC-9');
`);
const s1 = await tok({ user_id: 2, role: "seller", seller_id: 1 });
const rows = [
  { "Titre": "Plaquettes de frein avant", "Catégorie": "Freinage", "Prix": "1 200,50", "Quantité": "3", "État": "neuf", "Marque": "Bosch",
    "Référence": "PLQ-1", "Numéros OEM": "7701 208 174; 41060-0010R", "Véhicules": "Dacia Logan 2012-2020; Renault Clio IV; Peugeot 208 2015", "Origine": "adaptable", "Photo": "https://img.example.com/a.jpg" },
  { "Titre": "Filtre à huile", "Catégorie": "filters", "Prix": "45", "Référence": "flt-1", "Quantité": "7" }, // updates part 50
  { "Titre": "Disque", "Catégorie": "Unknown cat", "Prix": "abc" },
  { "Titre": "Amortisseur", "Catégorie": "brakes", "Prix": "300", "État": "occasion", "Marque": "NoSuchBrand", "Véhicules": "Mercedes-Benz Classe C 2008-2014" },
  { "Titre": "Dup", "Catégorie": "brakes", "Prix": "10", "Référence": "PLQ-1" },
  { "Titre": "Other seller sku is mine to create", "Catégorie": "brakes", "Prix": "10", "Référence": "ABC-9", "Véhicules": "Renault Clio" },
];
let [st, r] = await call("POST", "/api/v1/marketplace/me/parts/import", s1, { rows, dry_run: true, first_row: 2 });
check("dry run 200", st === 200 && r.meta.dry_run === true, r);
const res = r.data;
check("row numbers", res[0].row === 2 && res[5].row === 7, res.map(x => x.row));
check("actions", JSON.stringify(res.map(x => x.action)) === JSON.stringify(["create", "update", "error", "create", "error", "create"]), res.map(x => [x.action, x.errors]));
check("row1 warnings", res[0].warnings.some(w => /not a make and model/.test(w.text) && w.params.value === "Peugeot 208 2015"), res[0].warnings);
check("row3 errors", res[2].errors.length === 2, res[2].errors);
check("brand warning", res[3].warnings.some(w => /Brand/.test(w.text)), res[3].warnings);
check("dup", res[4].errors[0].text.includes("twice"), res[4].errors);
// Model only: saved for every generation of it, with a warning.
check("model only warn", res[5].warnings.some(w => /no year or generation/.test(w.text) && w.params.model === "Renault Clio"), res[5].warnings);
check("dry run wrote nothing", sql.prepare("select count(*) n from parts").get().n === 2);

[st, r] = await call("POST", "/api/v1/marketplace/me/parts/import", s1, { rows, first_row: 2 });
check("import 200", st === 200 && r.meta.created === 3 && r.meta.updated === 1 && r.meta.errors === 2, r.meta);
const p1 = sql.prepare("select * from parts where id = ?").get(r.data[0].part_id);
check("created part", p1 && p1.title === "Plaquettes de frein avant" && p1.price === 120050 && p1.quantity === 3 && p1.status === "pending" && p1.brand_id === 1 && p1.category_id === 2 && p1.part_origin === "aftermarket" && p1.seller_id === 1 && p1.sku === "PLQ-1", p1);
const comp = sql.prepare("select make, model, year_start, year_end, generation_id, engine_scope from part_compatibility where part_id = ? order by make").all(p1.id);
check("fitments", comp.length === 2 && comp[0].make === "Dacia" && comp[0].year_end === 2020 && comp[1].model === "Clio" && comp[1].generation_id === 10 && comp[1].year_start === 2012 && comp[1].engine_scope === "unspecified", comp);
const nums = sql.prepare("select pn.number_norm, pln.role from part_listing_numbers pln join part_numbers pn on pn.id = pln.part_number_id where pln.part_id = ?").all(p1.id);
check("numbers", nums.length === 2 && nums.every(n => n.role === "replaces") && nums.some(n => n.number_norm === "7701208174"), nums);
check("image", sql.prepare("select url from part_images where part_id = ?").get(p1.id)?.url === "https://img.example.com/a.jpg");
const upd = sql.prepare("select price, quantity, title from parts where id = 50").get();
check("update", upd.price === 4500 && upd.quantity === 7 && upd.title === "Old filter", upd);
const used = sql.prepare("select * from parts where id = ?").get(r.data[3].part_id);
check("used part", used.condition === "used" && used.part_origin === "used" && used.brand_id === null, used);
const mb = sql.prepare("select make, model from part_compatibility where part_id = ?").all(used.id);
check("hyphen make", mb.length === 1 && mb[0].make === "Mercedes-Benz" && mb[0].model === "Classe C", mb);
check("other seller untouched", sql.prepare("select price from parts where id = 51").get().price === 1000);
check("new for ABC-9", sql.prepare("select seller_id from parts where id = ?").get(r.data[5].part_id)?.seller_id === 1);

// Existing number reused, not duplicated
[st, r] = await call("POST", "/api/v1/marketplace/me/parts/import", s1, { rows: [{ title: "Second pads", category: "brakes", price: "99", oem: "7701-208-174", origin: "oem" }] });
const n2 = sql.prepare("select count(*) n from part_numbers where number_norm = '7701208174'").get().n;
check("number shared", st === 200 && n2 === 1 && sql.prepare("select role from part_listing_numbers where part_id = ?").get(r.data[0].part_id)?.role === "own", [n2, r]);

// Limits and auth
[st] = await call("POST", "/api/v1/marketplace/me/parts/import", s1, { rows: Array.from({ length: 51 }, () => ({ title: "x" })) });
check("too many", st === 400);
[st] = await call("POST", "/api/v1/marketplace/me/parts/import", s1, { rows: [] });
check("empty", st === 400);
[st] = await call("POST", "/api/v1/marketplace/me/parts/import", await tok({ user_id: 5, role: "buyer" }), { rows: [{ title: "x" }] });
check("buyer refused", st === 403 || st === 401, st);
[st] = await call("POST", "/api/v1/marketplace/me/parts/import", null, { rows: [{ title: "x" }] });
check("anon refused", st === 401, st);
// all-or-nothing: an error rows doesn't block valid rows; nothing for errors
const before = sql.prepare("select count(*) n from parts").get().n;
[st, r] = await call("POST", "/api/v1/marketplace/me/parts/import", s1, { rows: [{ title: "ok row", category: "brakes", price: "5" }, { title: "", category: "", price: "" }] });
check("partial rows", st === 200 && sql.prepare("select count(*) n from parts").get().n === before + 1 && r.meta.errors === 1, r.meta);
console.log(results);
const fails = Object.values(results).filter(v => v !== "PASS").length; console.log(fails ? `${fails} FAIL` : "ALL PASS");
