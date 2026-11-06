// PartHub's vehicle catalog: makes → models → generations → engines
// (infra/d1/migrations/0016_vehicle_catalog.sql). Used when an admin adds an
// entry or approves a seller's suggestion.

export function catalogSlug(value: string): string {
  return String(value)
    .replace(/\+/g, " plus ")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// "1.5 dCi 90" → diesel, 1500 cc, 90 hp (same rules as infra/d1/catalog/build-seed.mjs).
export function engineInfo(name: string): { fuel: string; cc: number | null; hp: number | null } {
  const n = name.toLowerCase();
  let fuel = "petrol";
  if (/hybrid|e-tech|e-power/.test(n)) fuel = "hybrid";
  else if (/electric|ë-|^e-\d/.test(n)) fuel = "electric";
  else if (/dci|hdi|tdi|sdi|cdi|crdi|d-4d|multijet|jtd|tdci|ecoblue|cdti|\bdti\b|\bdi\b|ddis|di-d|ddi|\btd\b|\bd\b|\d+d\b|dti/.test(n)) fuel = "diesel";
  const disp = name.match(/^(\d\.\d{1,2})\b/) || name.match(/\b(\d\.\d)\b/);
  const cc = disp ? Math.round((Number(disp[1]) * 1000) / 10) * 10 : null;
  const hp = name.match(/(\d{2,3})\s*$/);
  return { fuel, cc, hp: hp ? Number(hp[1]) : null };
}

const clean = (v: unknown, max = 80) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "");
const year = (v: unknown) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1950 && n <= new Date().getUTCFullYear() + 1 ? n : null;
};

export type VehicleEntry = {
  make: string;
  model: string;
  generation?: string;
  year_start?: number | null;
  year_end?: number | null;
  engine?: string;
};

export function readVehicleEntry(body: Record<string, unknown>): VehicleEntry | string {
  const entry: VehicleEntry = {
    make: clean(body.make),
    model: clean(body.model),
    generation: clean(body.generation),
    year_start: year(body.year_start),
    year_end: body.year_end == null || body.year_end === "" ? null : year(body.year_end),
    engine: clean(body.engine),
  };
  if (!entry.make || !entry.model) return "Make and model are required";
  if (entry.generation && !entry.year_start) return "Give the first year of this generation";
  if (entry.engine && !entry.generation) return "Give the generation of this engine";
  if (entry.year_start && entry.year_end && entry.year_end < entry.year_start) {
    return "The end year must be the same as or after the start year";
  }
  return entry;
}

// Where a new catalog row comes from (infra/d1/migrations/0018_catalog_quality.sql).
export type Provenance = { source: "admin" | "seller_suggestion" | "imported"; verification: "unverified" | "admin_approved" | "verified" };

// Add whatever is missing (make, model, generation, engine); existing rows
// with the same slug are reused (and keep their own provenance), so nothing
// is duplicated.
export async function ensureVehicle(DB: D1Database, entry: VehicleEntry, prov: Provenance = { source: "admin", verification: "admin_approved" }) {
  const makeSlug = catalogSlug(entry.make);
  await DB.prepare("insert or ignore into vehicle_makes (slug, name, source, verification) values (?1, ?2, ?3, ?4)")
    .bind(makeSlug, entry.make, prov.source, prov.verification)
    .run();
  const make = await DB.prepare("select id, name from vehicle_makes where slug = ?1").bind(makeSlug).first<{ id: number; name: string }>();
  if (!make) throw new Error("make not saved");

  // A model is found by slug or by name ("Mégane" / "megane").
  const modelSlug = catalogSlug(entry.model);
  let model = await DB.prepare(
    "select id, name from vehicle_models where make_id = ?1 and (slug = ?2 or lower(name) = lower(?3))"
  ).bind(make.id, modelSlug, entry.model).first<{ id: number; name: string }>();
  if (!model) {
    await DB.prepare("insert or ignore into vehicle_models (make_id, slug, name, source, verification) values (?1, ?2, ?3, ?4, ?5)")
      .bind(make.id, modelSlug, entry.model, prov.source, prov.verification)
      .run();
    model = await DB.prepare("select id, name from vehicle_models where make_id = ?1 and slug = ?2").bind(make.id, modelSlug).first();
  }
  if (!model) throw new Error("model not saved");

  let generation: { id: number; name: string; year_start: number; year_end: number | null } | null = null;
  if (entry.generation && entry.year_start) {
    const genSlug = catalogSlug(entry.generation);
    await DB.prepare(
      `insert or ignore into vehicle_generations (model_id, slug, name, year_start, year_end, sort_order, source, verification)
       values (?1, ?2, ?3, ?4, ?5, (select coalesce(max(sort_order), -1) + 1 from vehicle_generations where model_id = ?1), ?6, ?7)`
    ).bind(model.id, genSlug, entry.generation, entry.year_start, entry.year_end ?? null, prov.source, prov.verification).run();
    generation = await DB.prepare("select id, name, year_start, year_end from vehicle_generations where model_id = ?1 and slug = ?2")
      .bind(model.id, genSlug)
      .first();
    if (generation) {
      // Years for the buyer's vehicle picker.
      await DB.prepare(
        `insert or ignore into vehicle_years (model_id, year)
         with recursive y(n) as (select ?2 union all select n + 1 from y where n < ?3)
         select ?1, n from y`
      ).bind(model.id, generation.year_start, generation.year_end ?? new Date().getUTCFullYear()).run();
    }
  }

  let engine: { id: number; name: string } | null = null;
  if (generation && entry.engine) {
    const info = engineInfo(entry.engine);
    await DB.prepare(
      `insert or ignore into vehicle_engines (generation_id, slug, name, fuel, displacement_cc, power_hp, source, verification, specs_inferred)
       values (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 1)`
    ).bind(generation.id, catalogSlug(entry.engine), entry.engine, info.fuel, info.cc, info.hp, prov.source, prov.verification).run();
    engine = await DB.prepare("select id, name from vehicle_engines where generation_id = ?1 and slug = ?2")
      .bind(generation.id, catalogSlug(entry.engine))
      .first();
  }

  return { make, model, generation, engine };
}

export async function ensureBrand(DB: D1Database, name: string, prov: Provenance = { source: "admin", verification: "admin_approved" }) {
  const slug = catalogSlug(name);
  await DB.prepare("insert or ignore into brands (slug, name, source, verification) values (?1, ?2, ?3, ?4)")
    .bind(slug, name, prov.source, prov.verification)
    .run();
  return DB.prepare("select id, slug, name from brands where slug = ?1").bind(slug).first<{ id: number; slug: string; name: string }>();
}
