// Bulk import of a seller's parts from a spreadsheet (CSV) — see
// infra/docs/part-import.md. The seller portal parses the file and sends
// the rows (objects keyed by the file's column names) in chunks.
//
// A row whose reference (SKU) matches one of the seller's parts updates
// its price and stock; any other row creates a part, sent to moderation
// like a part made with the form. Each chunk is checked first, then written
// in one D1 batch: all of its rows or none. A batch counts as one query
// against the Workers query limit, so a chunk costs a handful of queries.

import { normalizeNumber } from "./part-numbers";

export const MAX_IMPORT_ROWS = 50;
const MAX_OEM = 6;
const MAX_VEHICLES = 10; // vehicles written in the cell
const MAX_FITMENTS = 20; // rows saved ("Clio III/IV" = 2)

type Raw = Record<string, unknown>;

// Column names a seller may use (French, English, Arabic), after
// normalizeKey(). The first is the canonical name.
const COLUMNS: Record<string, string[]> = {
  title: ["title", "titre", "name", "nom", "designation", "libelle", "العنوان", "الاسم", "اسم_القطعة"],
  category: ["category", "categorie", "famille", "الفئة", "الصنف"],
  price: ["price", "prix", "prix_mad", "price_mad", "السعر"],
  quantity: ["quantity", "quantite", "qty", "qte", "stock", "الكمية"],
  condition: ["condition", "etat", "الحالة"],
  origin: ["origin", "origine", "type", "المصدر", "النوع"],
  brand: ["brand", "marque", "fabricant", "الماركة", "العلامة"],
  sku: ["sku", "reference", "ref", "code", "المرجع"],
  oem: ["oem", "oem_numbers", "numeros_oem", "numero_oem", "reference_oem", "ref_oem", "رقم_oem", "الرقم_الأصلي"],
  vehicles: ["vehicles", "vehicules", "compatibilite", "compatible", "fits", "voitures", "السيارات", "التوافق"],
  description: ["description", "details", "الوصف"],
  image_url: ["image_url", "image", "photo", "photo_url", "صورة", "الصورة"],
};

export function normalizeKey(key: string): string {
  return String(key || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s\-./()]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

const ALIAS = new Map<string, string>();
for (const [canon, names] of Object.entries(COLUMNS)) for (const n of names) ALIAS.set(normalizeKey(n), canon);

export function canonicalRow(raw: Raw): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw || {})) {
    const canon = ALIAS.get(normalizeKey(k));
    if (canon && out[canon] == null) out[canon] = String(v ?? "").trim();
  }
  return out;
}

const fold = (s: string) =>
  String(s || "").replace(/\+/g, " plus ").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9؀-ۿ]+/g, " ").trim();

// Category names a seller may write, besides the slug and English name.
const CATEGORY_ALIASES: Record<string, string[]> = {
  "body-exterior": ["carrosserie", "carrosserie et exterieur", "الهيكل والخارج", "الهيكل"],
  brakes: ["freinage", "freins", "frein", "الفرامل والأقراص", "الفرامل", "فرامل"],
  cooling: ["refroidissement", "radiateur", "نظام التبريد", "التبريد"],
  electrical: ["electricite", "electricite et eclairage", "eclairage", "الكهرباء والإنارة", "الكهرباء"],
  "engine-parts": ["moteur", "pieces moteur", "قطع المحرك", "المحرك"],
  exhaust: ["echappement", "العادم والانبعاثات", "العادم"],
  filters: [
    "filtres", "filtre", "filtres et fluides", "huiles", "huile", "huile moteur", "lubrifiants", "lubrifiant", "fluides", "liquides",
    "lubricants", "oils", "fluids", "الفلاتر والسوائل", "الفلاتر", "الزيوت", "زيوت", "الزيوت والسوائل",
  ],
  interior: ["interieur", "accessoires", "interieur et accessoires", "الداخلية والإكسسوارات", "الداخلية"],
  suspension: ["suspension et direction", "direction", "amortisseurs", "التعليق والمقود", "التعليق"],
  "tires-wheels": ["pneus", "jantes", "pneus et jantes", "الإطارات والعجلات", "الإطارات"],
  tools: ["outillage", "outils", "الأدوات والمعدات", "الأدوات"],
  transmission: ["boite de vitesses", "embrayage", "ناقل الحركة"],
};

const CONDITIONS: Record<string, string> = {
  new: "new", neuf: "new", neuve: "new", nouveau: "new", "جديد": "new", "جديدة": "new",
  used: "used", occasion: "used", "d occasion": "used", utilise: "used", "مستعمل": "used", "مستعملة": "used",
  refurbished: "refurbished", reconditionne: "refurbished", reconditionnee: "refurbished", "مجدد": "refurbished", "مجددة": "refurbished",
};
const ORIGINS: Record<string, string> = {
  oem: "oem", origine: "oem", original: "oem", origin: "oem", "d origine": "oem", "أصلي": "oem", "اصلي": "oem",
  aftermarket: "aftermarket", adaptable: "aftermarket", equivalent: "aftermarket", "بديل": "aftermarket", "تجاري": "aftermarket",
  used: "used", occasion: "used", casse: "used", "مستعمل": "used",
};

// "1 200,50" / "1.200,50" / "1200.5" / "1 200 DH" → 120050 (centimes)
export function parsePrice(value: string): number | null {
  let s = String(value || "").replace(/(mad|dhs?|dirhams?|درهم)/gi, "").replace(/[\s  ]/g, "");
  if (!s) return null;
  if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, "").replace(",", ".");
  else s = s.replace(/,/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  return Math.round(Number(s) * 100);
}

export function slugify(value: string): string {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

type Catalog = {
  categories: Array<{ id: number; slug: string; name: string }>;
  brands: Array<{ id: number; slug: string; name: string }>;
  makes: Array<{ id: number; slug: string; name: string }>;
  models: Array<{ id: number; make_id: number; slug: string; name: string }>;
  generations: Array<{ id: number; model_id: number; name: string; year_start: number; year_end: number | null }>;
  engines: Array<{ generation_id: number; name: string; fuel: string | null }>;
};

export async function loadCatalog(DB: D1Database): Promise<Catalog> {
  const [categories, brands, makes, models, generations, engines] = await Promise.all([
    DB.prepare("select id, slug, name from categories").all<Catalog["categories"][number]>(),
    DB.prepare("select id, slug, name from brands").all<Catalog["brands"][number]>(),
    DB.prepare("select id, slug, name from vehicle_makes").all<Catalog["makes"][number]>(),
    DB.prepare("select id, make_id, slug, name from vehicle_models").all<Catalog["models"][number]>(),
    DB.prepare("select id, model_id, name, year_start, year_end from vehicle_generations").all<Catalog["generations"][number]>(),
    DB.prepare("select generation_id, name, fuel from vehicle_engines").all<Catalog["engines"][number]>(),
  ]);
  return {
    categories: categories.results || [],
    brands: brands.results || [],
    makes: makes.results || [],
    models: models.results || [],
    generations: generations.results || [],
    engines: engines.results || [],
  };
}

function findCategory(cat: Catalog, value: string) {
  const v = fold(value);
  if (!v) return null;
  return (
    cat.categories.find((c) => fold(c.slug) === v || fold(c.name) === v) ||
    cat.categories.find((c) => (CATEGORY_ALIASES[c.slug] || []).some((a) => fold(a) === v)) ||
    // "Brakes" for "Brakes & Rotors", "Filters" for "Filters & Fluids"
    cat.categories.find((c) => fold(c.name).split(" ")[0] === v) ||
    null
  );
}

export type Fitment = { make: string; model: string; year_start: number; year_end: number; generation_id: number | null };

type Make = Catalog["makes"][number];
type Model = Catalog["models"][number];
type Gen = Catalog["generations"][number];

// Short names sellers use for a make.
const MAKE_ALIASES: Record<string, string> = { vw: "volkswagen", merco: "mercedes benz", mercedes: "mercedes benz", chevy: "chevrolet" };
// "Universel", "Tous véhicules…": a part with no vehicle list.
const UNIVERSAL = /^(universel|universelle|universal|tous|toutes|tout|all|la plupart|most|obligatoire|عام|جميع|كل)\b/;
const startsWith = (s: string, prefix: string) => Boolean(prefix) && (s === prefix || s.startsWith(`${prefix} `));
const longestFirst = <T,>(list: T[], name: (x: T) => string) => [...list].sort((a, b) => fold(name(b)).length - fold(name(a)).length);

export type VehicleParse = { fitments: Fitment[]; messages: Message[]; universal: boolean };

// The "Véhicules" cell: "Dacia Logan 2004-2012; Sandero 2008-2012; Renault
// Clio III/IV 1.5 dCi; Citroën C3 / C4; Universel". A vehicle without its
// make takes the make of the one before it (or the only make that has that
// model); "Clio III/IV" gives both generations; a model with no year nor
// generation covers all its generations (with a warning).
export function parseVehicles(cat: Catalog, cell: string): VehicleParse {
  const out: VehicleParse = { fitments: [], messages: [], universal: false };
  let lastMake: Make | null = null;
  for (const raw of splitList(cell).slice(0, MAX_VEHICLES)) {
    const text = raw.replace(/\([^)]*\)/g, " ").split(/\s+[-–]\s+/)[0]!.trim();
    if (UNIVERSAL.test(fold(text))) {
      out.universal = true;
      continue;
    }
    // "Citroën C3 / C4" = two vehicles of one make (but "Symbol / Thalia" is one model).
    const whole = parseOne(cat, text, lastMake);
    const parts = "fitments" in whole && whole.model.name.includes("/")
      ? [text]
      : text.split(/\s+\/\s+/).reduce<string[]>((acc, x) => {
          // "206 1.4 / 1.6": the second one is an engine, not a vehicle.
          if (acc.length && /^\d[.,]\d/.test(x)) acc[acc.length - 1] += ` ${x}`;
          else acc.push(x);
          return acc;
        }, []);
    for (const part of parts) {
      const r: One = parts.length === 1 ? whole : parseOne(cat, part, lastMake);
      if (!("fitments" in r)) {
        out.messages.push(r);
        continue;
      }
      lastMake = r.make;
      if (r.note) out.messages.push(r.note);
      for (const f of r.fitments) {
        if (out.fitments.length >= MAX_FITMENTS) break;
        if (!out.fitments.some((x) => x.model === f.model && x.make === f.make && x.year_start === f.year_start && x.year_end === f.year_end)) {
          out.fitments.push(f);
        }
      }
    }
  }
  return out;
}

type One = { make: Make; model: Model; fitments: Fitment[]; note?: Message } | Message;

function parseOne(cat: Catalog, text: string, lastMake: Make | null): One {
  let v = fold(text);
  if (!v) return msg("Vehicle skipped: empty");
  const findMake = (t: string) => longestFirst(cat.makes, (m) => m.name).find((m) => startsWith(t, fold(m.name)) || startsWith(t, fold(m.slug))) || null;
  let make = findMake(v);
  const first = v.split(" ")[0]!;
  // "VW Golf" → "volkswagen golf" (only when the text does not start with a real make).
  if (!make && MAKE_ALIASES[first]) {
    v = `${MAKE_ALIASES[first]}${v.slice(first.length)}`;
    make = findMake(v);
  }
  let rest = v;
  if (make) rest = v.slice((startsWith(v, fold(make.name)) ? fold(make.name) : fold(make.slug)).length).trim();

  const modelOf = (mk: Make, s: string) => {
    const models = cat.models.filter((m) => m.make_id === mk.id);
    const gens = cat.generations.filter((g) => models.some((m) => m.id === g.model_id));
    const gen = longestFirst(gens, (g) => g.name).find((g) => startsWith(s, fold(g.name)));
    const model = gen
      ? models.find((m) => m.id === gen.model_id)
      : longestFirst(models, (m) => m.name).find((m) => startsWith(s, fold(m.name)) || startsWith(s, fold(m.slug)));
    return model ? { model, gen: gen ?? null } : null;
  };

  let found = make ? modelOf(make, rest) : null;
  if (!make) {
    // No make written: the previous vehicle's make, else the only make with that model.
    if (lastMake) found = modelOf(lastMake, v);
    if (found) make = lastMake;
    else {
      const hits = cat.makes.flatMap((mk) => {
        const f = modelOf(mk, v);
        return f ? [{ mk, f }] : [];
      });
      if (hits.length === 1) {
        make = hits[0]!.mk;
        found = hits[0]!.f;
      }
    }
    rest = v;
    if (!make) return msg("Vehicle skipped: \"{value}\" is not a make and model (e.g. Dacia Logan 2012-2020, or Universel)", { value: text });
  }
  if (!found) {
    return rest
      ? msg("Vehicle skipped: unknown model in \"{value}\"", { value: text })
      : msg("Vehicle skipped: give the model after the make in \"{value}\"", { value: text });
  }
  const { model } = found;
  const allGens = cat.generations.filter((g) => g.model_id === model.id).sort((a, b) => a.year_start - b.year_start);
  const name = found.gen ? fold(found.gen.name) : startsWith(rest, fold(model.name)) ? fold(model.name) : fold(model.slug);
  rest = rest.slice(name.length).trim();

  // Several generations: "Clio III/IV", "Clio II / III" (fold turns the
  // separator into a space): the tokens after the first one.
  const gens: Gen[] = found.gen ? [found.gen] : [];
  const toks = rest ? rest.split(" ") : [];
  while (toks.length && /^([ivx]+|\d)$/.test(toks[0]!)) {
    const g = allGens.find((x) => fold(x.name) === `${fold(model.name)} ${toks[0]}`);
    if (!g) break;
    if (!gens.includes(g)) gens.push(g);
    toks.shift();
  }
  rest = toks.join(" ");

  const maxYear = new Date().getUTCFullYear() + 1;
  const years = rest.match(/(19[5-9]\d|20\d\d)(?:\D+(19[5-9]\d|20\d\d))?/);
  const mk = make!;
  if (years) {
    let ys = Number(years[1]);
    let ye = Number(years[2] || years[1]);
    if (ye < ys) [ys, ye] = [ye, ys];
    if (ys < 1950 || ye > maxYear) return msg("Vehicle skipped: years out of range in \"{value}\"", { value: text });
    // Years written: one row; linked to the generation when only one matches.
    const within = (gens.length ? gens : allGens).filter((g) => g.year_start <= ye && (g.year_end ?? maxYear) >= ys);
    return { make: mk, model, fitments: [{ make: mk.name, model: model.name, year_start: ys, year_end: ye, generation_id: within.length === 1 ? within[0]!.id : null }] };
  }
  if (gens.length) {
    return {
      make: mk,
      model,
      fitments: gens.map((g) => ({ make: mk.name, model: model.name, year_start: g.year_start, year_end: g.year_end ?? maxYear, generation_id: g.id })),
    };
  }
  if (!allGens.length) {
    return msg("Vehicle skipped: year missing in \"{value}\" (e.g. {example})", { value: text, example: `${mk.name} ${model.name} 2012-2020` });
  }
  // Model + engine ("Logan 1.5 dCi", "Captur TCe", "Logan essence"): the
  // generations that have such an engine in the catalog.
  const fuelWord: Record<string, string> = { essence: "petrol", petrol: "petrol", benzine: "petrol", diesel: "diesel", gasoil: "diesel", hybride: "hybrid", hybrid: "hybrid" };
  const hint = rest.replace(/\b(phase \d|ph\d)\b/g, "").trim();
  if (hint) {
    const engineMatch = (e: { name: string; fuel: string | null }) => {
      const n = fold(e.name);
      return hint.split(" ").every((w) => (fuelWord[w] ? e.fuel === fuelWord[w] : n === w || n.startsWith(`${w} `) || n.includes(` ${w} `) || n.endsWith(` ${w}`)))
        && (startsWith(n, hint) || !/^\d/.test(hint) || hint.split(" ").some((w) => fuelWord[w]));
    };
    const withEngine = allGens.filter((g) => cat.engines.some((e) => e.generation_id === g.id && engineMatch(e)));
    if (withEngine.length) {
      return {
        make: mk,
        model,
        fitments: withEngine.map((g) => ({ make: mk.name, model: model.name, year_start: g.year_start, year_end: g.year_end ?? maxYear, generation_id: g.id })),
      };
    }
  }
  // Model only: every generation, flagged so the seller can be precise.
  const ys = allGens[0]!.year_start;
  const ye = Math.max(...allGens.map((g) => g.year_end ?? new Date().getUTCFullYear()));
  return {
    make: mk,
    model,
    fitments: allGens.map((g) => ({ make: mk.name, model: model.name, year_start: g.year_start, year_end: g.year_end ?? maxYear, generation_id: g.id })),
    note: msg("\"{value}\": no year or generation, saved for every {model} ({from}-{to}). Add the generation (e.g. {example}) if it does not fit them all.", {
      value: text, model: `${mk.name} ${model.name}`, from: ys, to: ye, example: `${model.name} ${allGens[allGens.length - 1]!.name.split(" ").pop()}`,
    }),
  };
}

// Single vehicle (kept for callers that parse one at a time).
export function parseVehicle(cat: Catalog, text: string): Fitment | Message {
  const r = parseVehicles(cat, text);
  return r.fitments[0] ?? r.messages[0] ?? msg("Vehicle skipped: empty");
}

// Brands sellers write for unbranded parts: saved with no brand, no warning.
const NO_BRAND = new Set(["generic", "generique", "sans marque", "no name", "noname", "oem style", "universal fit", "universel", "adaptable", "autre", "other", "بدون", "بدون ماركة"]);
const BRAND_ALIASES: Record<string, string> = { facets: "facet", mann: "mann filter", autofren: "autofren seinsa", "febi": "febi bilstein", magneti: "magneti marelli" };

export function findBrand(cat: Catalog, value: string): { id: number } | "none" | null {
  let v = fold(value);
  if (!v || NO_BRAND.has(v)) return "none";
  v = BRAND_ALIASES[v] ?? v;
  const compact = (s: string) => fold(s).replace(/ /g, "");
  const exact = cat.brands.find((b) => fold(b.name) === v || fold(b.slug) === v || compact(b.name) === v.replace(/ /g, ""));
  if (exact) return exact;
  // "Mann" → "Mann-Filter": the only brand starting with that word.
  const pre = cat.brands.filter((b) => startsWith(fold(b.name), v));
  return pre.length === 1 ? pre[0]! : null;
}

export type RowResult = {
  row: number;
  action: "create" | "update" | "error";
  title: string;
  part_id?: number;
  slug?: string;
  errors: Message[];
  warnings: Message[];
};

// English text with {placeholders}: the seller portal translates it.
export type Message = { text: string; params?: Record<string, string | number> };
const msg = (text: string, params?: Record<string, string | number>): Message => (params ? { text, params } : { text });

type Planned = {
  result: RowResult;
  data?: undefined | {
    title: string;
    category_id: number;
    brand_id: number | null;
    sku: string | null;
    price: number;
    quantity: number;
    condition: string;
    origin: string;
    description: string | null;
    image_url: string | null;
    oem: Array<{ number: string; norm: string }>;
    fitments: Fitment[];
    existing_id: number | null;
    old_quantity: number;
  };
};

const splitList = (s: string) => String(s || "").split(/[;|\n]+/).map((x) => x.trim()).filter(Boolean);

export async function planImport(DB: D1Database, sellerId: number, rows: Raw[], firstRow = 1): Promise<Planned[]> {
  const cat = await loadCatalog(DB);
  const canon = rows.map(canonicalRow);

  // The seller's parts with a reference used in this chunk.
  const skus = [...new Set(canon.map((r) => (r.sku || "").trim().toLowerCase()).filter(Boolean))];
  const existing = new Map<string, Array<{ id: number; quantity: number }>>();
  if (skus.length) {
    const marks = skus.map((_, i) => `?${i + 2}`).join(",");
    const res = await DB.prepare(
      `select id, lower(trim(sku)) as sku, quantity from parts where seller_id = ?1 and lower(trim(sku)) in (${marks}) and status != 'archived'`
    ).bind(sellerId, ...skus).all<{ id: number; sku: string; quantity: number }>();
    for (const r of res.results || []) existing.set(r.sku, [...(existing.get(r.sku) || []), { id: r.id, quantity: r.quantity }]);
  }

  const seenSku = new Set<string>();
  return canon.map((r, i): Planned => {
    const errors: Message[] = [];
    const warnings: Message[] = [];
    const title = (r.title || "").replace(/\s+/g, " ").trim();
    const result: RowResult = { row: firstRow + i, action: "error", title, errors, warnings };
    if (Object.values(r).every((v) => !v)) {
      errors.push(msg("Empty row"));
      return { result };
    }

    const sku = (r.sku || "").trim().slice(0, 60) || null;
    const skuKey = sku?.toLowerCase() || "";
    if (skuKey) {
      if (seenSku.has(skuKey)) errors.push(msg("Reference {sku} is twice in the file", { sku: sku! }));
      seenSku.add(skuKey);
    }
    const matches = skuKey ? existing.get(skuKey) || [] : [];
    if (matches.length > 1) errors.push(msg("Several of your parts have the reference {sku}", { sku: sku! }));
    const current = matches.length === 1 ? matches[0] : null;

    const price = parsePrice(r.price || "");
    if (price == null || price <= 0) errors.push(msg("Price missing or not a number (e.g. 350 or 1 200,50)"));
    else if (price > 100_000_000) errors.push(msg("Price too high"));

    let quantity = current ? current.quantity : 1;
    if (r.quantity) {
      const q = Number(String(r.quantity).replace(/\s/g, ""));
      if (!Number.isInteger(q) || q < 0 || q > 100000) errors.push(msg("Quantity must be a whole number (0 or more)"));
      else quantity = q;
    }

    // Existing reference: only price and stock change.
    if (current) {
      result.action = errors.length ? "error" : "update";
      result.part_id = current.id;
      return {
        result,
        data: errors.length ? undefined : {
          title, category_id: 0, brand_id: null, sku, price: price!, quantity, condition: "", origin: "", description: null,
          image_url: null, oem: [], fitments: [], existing_id: current.id, old_quantity: current.quantity,
        },
      };
    }

    if (title.length < 3) errors.push(msg("Title missing (at least 3 characters)"));
    if (title.length > 150) errors.push(msg("Title too long (150 characters at most)"));

    const category = findCategory(cat, r.category || "");
    if (!category) errors.push(r.category ? msg("Unknown category \"{value}\"", { value: r.category ?? "" }) : msg("Category missing"));

    const condition = r.condition ? CONDITIONS[fold(r.condition)] : "new";
    if (!condition) errors.push(msg("Unknown condition \"{value}\" (new, used or refurbished)", { value: r.condition ?? "" }));
    let origin = r.origin ? ORIGINS[fold(r.origin)] : condition === "used" ? "used" : "aftermarket";
    if (!origin) {
      warnings.push(msg("Unknown origin \"{value}\": saved as aftermarket", { value: r.origin ?? "" }));
      origin = "aftermarket";
    }

    let brandId: number | null = null;
    if (r.brand) {
      const b = findBrand(cat, r.brand);
      if (b && b !== "none") brandId = b.id;
      else if (!b) warnings.push(msg("Brand \"{value}\" is not in the catalog: left empty (suggest it from the part page)", { value: r.brand ?? "" }));
    }

    const oem: Array<{ number: string; norm: string }> = [];
    for (const n of splitList(r.oem || "").slice(0, MAX_OEM)) {
      const norm = normalizeNumber(n);
      if (norm.length < 3 || norm.length > 30) warnings.push(msg("Part number \"{value}\" skipped (3 to 30 letters or digits)", { value: n }));
      else if (!oem.some((x) => x.norm === norm)) oem.push({ number: n.replace(/\s+/g, " ").slice(0, 40), norm });
    }

    const vehicles = splitList(r.vehicles || "");
    if (vehicles.length > MAX_VEHICLES) warnings.push(msg("Only the first {n} vehicles are imported", { n: MAX_VEHICLES }));
    const parsed = parseVehicles(cat, r.vehicles || "");
    const fitments = parsed.fitments;
    warnings.push(...parsed.messages);
    if (!fitments.length && !parsed.universal) warnings.push(msg("No vehicle: buyers who search by car won't see this part"));

    let image: string | null = null;
    if (r.image_url) {
      if (/^https:\/\/[^\s"'<>]+$/i.test(r.image_url) && r.image_url.length <= 500) image = r.image_url;
      else warnings.push(msg("Photo link skipped (must start with https://)"));
    }

    if (errors.length) return { result };
    result.action = "create";
    return {
      result,
      data: {
        title, category_id: category!.id, brand_id: brandId, sku, price: price!, quantity, condition: condition!, origin,
        description: (r.description || "").trim().slice(0, 5000) || null, image_url: image, oem, fitments,
        existing_id: null, old_quantity: 0,
      },
    };
  });
}

function randomSuffix(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(36).padStart(2, "0")).join("").slice(0, 6);
}

// Writes the planned rows in one batch. Returns the ids of parts whose
// stock went from 0 to more (for back-in-stock alerts).
export async function applyImport(DB: D1Database, sellerId: number, plan: Planned[]): Promise<number[]> {
  const stmts: D1PreparedStatement[] = [];
  const restocked: number[] = [];
  for (const p of plan) {
    const d = p.data;
    if (!d) continue;
    if (d.existing_id) {
      stmts.push(
        DB.prepare("update parts set price = ?1, quantity = ?2, updated_at = datetime('now') where id = ?3 and seller_id = ?4")
          .bind(d.price, d.quantity, d.existing_id, sellerId)
      );
      if (d.old_quantity <= 0 && d.quantity > 0) restocked.push(d.existing_id);
      continue;
    }
    const slug = `${slugify(d.title) || "part"}-${randomSuffix()}`;
    p.result.slug = slug;
    const partId = `(select id from parts where slug = '${slug}')`; // slug: [a-z0-9-] only
    stmts.push(
      DB.prepare(
        `insert into parts (seller_id, category_id, brand_id, slug, title, description, sku, price, condition, quantity, status, featured, part_origin)
         values (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, 'pending', 0, ?11)`
      ).bind(sellerId, d.category_id, d.brand_id, slug, d.title, d.description, d.sku, d.price, d.condition, d.quantity, d.origin)
    );
    if (d.image_url) {
      stmts.push(
        DB.prepare(`insert into part_images (part_id, url, alt_text, sort_order, is_featured) select ${partId}, ?1, ?2, 1, 1`).bind(d.image_url, d.title)
      );
    }
    for (const f of d.fitments) {
      stmts.push(
        DB.prepare(
          `insert into part_compatibility (part_id, make, model, year_start, year_end, generation_id, engine_scope)
           select ${partId}, ?1, ?2, ?3, ?4, ?5, 'unspecified'`
        ).bind(f.make, f.model, f.year_start, f.year_end, f.generation_id)
      );
    }
    // OEM numbers: the part's own number, or the numbers an aftermarket
    // part replaces (same rule as the form, see utils/part-numbers.ts).
    const role = d.origin === "aftermarket" ? "replaces" : "own";
    for (const n of d.oem) {
      stmts.push(
        DB.prepare(
          `insert or ignore into part_numbers (number, number_norm, kind, brand_id, source, verification) values (?1, ?2, 'oem', null, 'seller', 'unverified')`
        ).bind(n.number, n.norm)
      );
      stmts.push(
        DB.prepare(
          `insert or ignore into part_listing_numbers (part_id, part_number_id, role)
           select ${partId}, (select id from part_numbers where number_norm = ?1 and coalesce(brand_id, 0) = 0), ?2`
        ).bind(n.norm, role)
      );
    }
  }
  if (stmts.length) await DB.batch(stmts);
  const created = plan.filter((p) => p.result.slug);
  if (created.length) {
    const res = await DB.prepare(`select id, slug from parts where slug in (${created.map((_, i) => `?${i + 1}`).join(",")})`)
      .bind(...created.map((p) => p.result.slug))
      .all<{ id: number; slug: string }>();
    for (const r of res.results || []) {
      const p = created.find((x) => x.result.slug === r.slug);
      if (p) p.result.part_id = r.id;
    }
  }
  return restocked;
}
