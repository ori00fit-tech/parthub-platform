const ROOT = new URL("../../../", import.meta.url).pathname; // repository root
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import app from "./.build/app.mjs";
import { signToken } from "./.build/auth.mjs";

const sql = new DatabaseSync(":memory:");
sql.exec(readFileSync(ROOT + "infra/d1/schema.sql", "utf8"));
sql.exec(readFileSync(ROOT + "infra/d1/migrations/0017_seed_vehicle_catalog.sql", "utf8")); // full Morocco catalog
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
// The "Véhicules" / "Marque" / "Catégorie" cells as sellers really write
// them (first real import, 67 parts), against the full vehicle catalog.
sql.exec(`
  INSERT INTO users (id,name,email,password_hash,role) VALUES (2,'S1','s1@x','x','seller');
  INSERT INTO sellers (id,user_id,name,slug,status) VALUES (1,2,'Shop','shop','active');
  INSERT INTO categories (id,name,slug) VALUES (1,'Brakes & Rotors','brakes'),(2,'Filters & Fluids','filters'),(3,'Interior & Accessories','interior'),(4,'Electrical & Lighting','electrical');
`);
const s1 = await tok({ user_id: 2, role: "seller", seller_id: 1 });
const cells = {
  inherit: "Dacia Logan 2004-2012; Sandero 2008-2012; Renault Clio III 2005-2012",
  gens: "Renault Clio III/IV 1.5 dCi",
  engine: "Dacia Logan 1.5 dCi",
  vw: "VW Golf V 2003-2008; VW Jetta 2005-2010",
  slash: "Citroën C3 / C4",
  engineSlash: "Peugeot 206 1.4 / 1.6; 206+",
  universal: "Universel 12V",
  modelOnly: "Peugeot 208",
  noModel: "Renault; Dacia",
  notVehicle: "Sièges avant standards",
};
const rows = Object.entries(cells).map(([k, v], i) => ({ "Titre": `Part ${k}`, "Catégorie": "Freinage", "Prix": "100", "Référence": `R-${i}`, "Véhicules": v }));
rows.push({ "Titre": "Huile moteur 5W40", "Catégorie": "Lubrifiants", "Prix": "280", "Marque": "Total", "Véhicules": "Universel" });
rows.push({ "Titre": "Filtre Mann", "Catégorie": "Filtres", "Prix": "45", "Marque": "Mann", "Véhicules": "Universel" });
rows.push({ "Titre": "Support", "Catégorie": "Accessoires", "Prix": "45", "Marque": "Generic", "Véhicules": "Universel" });
rows.push({ "Titre": "Ampoule", "Catégorie": "Électricité", "Prix": "30", "Marque": "OSRAM" });
const [st, r] = await call("POST", "/api/v1/marketplace/me/parts/import", s1, { rows, dry_run: false, first_row: 2 });
check("import_ok", st === 200, [st, r]);
const by = Object.fromEntries(r.data.map((x) => [x.title, x]));
const fit = (k) => sql.prepare(`select pc.make, pc.model, pc.year_start, pc.year_end, g.name as gen from part_compatibility pc
  left join vehicle_generations g on g.id = pc.generation_id where pc.part_id = ? order by pc.make, pc.model, pc.year_start`).all(by[`Part ${k}`].part_id);
const names = (k) => fit(k).map((f) => f.gen || `${f.model} ${f.year_start}-${f.year_end}`);
const warn = (t) => (by[t]?.warnings || []).map((w) => w.text).join(" | ");

check("make_inherited", JSON.stringify(fit("inherit").map((f) => f.make + " " + f.model)) === JSON.stringify(["Dacia Logan", "Dacia Sandero", "Renault Clio"]), fit("inherit"));
check("two_generations", JSON.stringify(names("gens")) === JSON.stringify(["Clio III", "Clio IV"]), names("gens"));
check("engine_narrows", JSON.stringify(names("engine")) === JSON.stringify(["Logan I", "Logan II"]) && !warn("Part engine"), [names("engine"), warn("Part engine")]);
check("vw_alias", fit("vw").every((f) => f.make === "Volkswagen") && fit("vw").length === 2, fit("vw"));
check("slash_models", fit("slash").some((f) => f.model === "C3") && fit("slash").some((f) => f.model === "C4"), fit("slash"));
check("engine_not_vehicle", !/1\.6/.test(warn("Part engineSlash")) && names("engineSlash").includes("206+") && names("engineSlash").includes("206"), [names("engineSlash"), warn("Part engineSlash")]);
check("universal_no_warning", fit("universal").length === 0 && !warn("Part universal"), warn("Part universal"));
check("model_only_all_gens", names("modelOnly").join(",") === "208 I,208 II" && /no year or generation/.test(warn("Part modelOnly")), [names("modelOnly"), warn("Part modelOnly")]);
check("make_only_msg", /give the model after the make/.test(warn("Part noModel")), warn("Part noModel"));
check("not_vehicle_msg", /not a make and model/.test(warn("Part notVehicle")), warn("Part notVehicle"));
check("lubrifiants_category", by["Huile moteur 5W40"].action === "create", by["Huile moteur 5W40"]);
const part = (t) => sql.prepare("select p.*, b.name as brand from parts p left join brands b on b.id = p.brand_id where p.id = ?").get(by[t].part_id);
check("lubrifiants_in_filters", part("Huile moteur 5W40").category_id === 2 && part("Huile moteur 5W40").brand === "Total", part("Huile moteur 5W40"));
check("brand_prefix", part("Filtre Mann").brand === "Mann-Filter" && !warn("Filtre Mann"), [part("Filtre Mann").brand, warn("Filtre Mann")]);
check("generic_no_brand_no_warning", part("Support").brand_id === null && !/Brand/.test(warn("Support")), warn("Support"));
check("new_brand_osram", part("Ampoule").brand === "Osram", part("Ampoule").brand);

console.log(results);
const fails = Object.values(results).filter((v) => v !== "PASS").length;
console.log(fails ? `${fails} FAIL` : "ALL PASS");
process.exitCode = fails ? 1 : 0;
