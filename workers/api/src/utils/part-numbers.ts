// Part numbers (OEM and aftermarket references) — see
// infra/d1/migrations/0019_part_numbers.sql.

export const MAX_NUMBERS_PER_LISTING = 12;

// "7701 208-174" / "7701.208.174" → "7701208174": what search compares.
export function normalizeNumber(value: unknown): string {
  return String(value ?? "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[^A-Z0-9]/g, "");
}

export type NumberInput = { number: string; norm: string; kind: "oem" | "aftermarket"; role: "own" | "replaces"; brand_id: number | null };

// Validates the list a seller sends for a listing.
export function readNumbersInput(value: unknown): NumberInput[] | string {
  if (!Array.isArray(value)) return "numbers must be a list";
  if (value.length > MAX_NUMBERS_PER_LISTING) return `At most ${MAX_NUMBERS_PER_LISTING} part numbers per listing`;
  const out: NumberInput[] = [];
  const seen = new Set<string>();
  for (const raw of value as Array<Record<string, unknown>>) {
    const number = String(raw?.number ?? "").trim().replace(/\s+/g, " ").slice(0, 40);
    const norm = normalizeNumber(number);
    if (!norm) continue;
    if (norm.length < 3 || norm.length > 30) return "A part number must have 3 to 30 letters or digits";
    const kind = raw?.kind === "aftermarket" ? "aftermarket" : "oem";
    const role = raw?.role === "replaces" ? "replaces" : "own";
    // OEM numbers belong to the car maker (no part brand); aftermarket
    // numbers to their parts maker.
    const brandId = kind === "aftermarket" && Number.isInteger(Number(raw?.brand_id)) && Number(raw?.brand_id) > 0 ? Number(raw?.brand_id) : null;
    const key = `${norm}|${brandId ?? 0}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ number, norm, kind, role, brand_id: brandId });
  }
  return out;
}

async function ensureNumber(DB: D1Database, n: NumberInput): Promise<number> {
  await DB.prepare(
    `insert or ignore into part_numbers (number, number_norm, kind, brand_id, source, verification)
     values (?1, ?2, ?3, ?4, 'seller', 'unverified')`
  ).bind(n.number, n.norm, n.kind, n.brand_id).run();
  const row = await DB.prepare("select id from part_numbers where number_norm = ?1 and coalesce(brand_id, 0) = ?2")
    .bind(n.norm, n.brand_id ?? 0)
    .first<{ id: number }>();
  if (!row) throw new Error("part number not saved");
  return row.id;
}

// Replace a listing's numbers. A listing that has its own number(s) and
// says it replaces others creates unverified "equivalent" links between
// them: they count for every listing only once an admin verifies them.
export async function saveListingNumbers(DB: D1Database, partId: number, numbers: NumberInput[], userId: number | null) {
  const ids: Array<{ id: number; role: string }> = [];
  for (const n of numbers) ids.push({ id: await ensureNumber(DB, n), role: n.role });
  await DB.prepare("delete from part_listing_numbers where part_id = ?1").bind(partId).run();
  for (const { id, role } of ids) {
    await DB.prepare("insert or ignore into part_listing_numbers (part_id, part_number_id, role) values (?1, ?2, ?3)")
      .bind(partId, id, role)
      .run();
  }
  const own = ids.filter((x) => x.role === "own");
  const replaces = ids.filter((x) => x.role === "replaces");
  for (const a of own) {
    for (const b of replaces) {
      if (a.id === b.id) continue;
      await DB.prepare(
        `insert or ignore into part_number_links (from_id, to_id, relation, source, verification, created_by)
         values (?1, ?2, 'equivalent', 'seller_claim', 'unverified', ?3)`
      ).bind(a.id, b.id, userId).run();
    }
  }
  return listingNumbers(DB, partId);
}

export async function listingNumbers(DB: D1Database, partId: number) {
  const res = await DB.prepare(
    `select pn.id, pn.number, pn.number_norm, pn.kind, pn.brand_id, b.name as brand_name, pn.verification, pln.role
     from part_listing_numbers pln
     join part_numbers pn on pn.id = pln.part_number_id
     left join brands b on b.id = pn.brand_id
     where pln.part_id = ?1
     order by case pln.role when 'own' then 0 else 1 end, case pn.kind when 'oem' then 0 else 1 end, pn.number`
  ).bind(partId).all();
  return res.results || [];
}

// SQL: ids of the numbers that are "the same part" as number id ?N — the
// number itself and the ones linked to it by a verified link (both ways).
export function sameReferenceIdsSql(param: string): string {
  return `(
    select ${param}
    union select l.to_id from part_number_links l where l.from_id = ${param} and l.verification in ('admin_approved','verified')
    union select l.from_id from part_number_links l where l.to_id = ${param} and l.verification in ('admin_approved','verified')
  )`;
}

// Other active listings that carry one of this listing's numbers, directly
// or through a verified link. Cheapest first.
export async function otherOffers(DB: D1Database, partId: number, limit = 10) {
  const res = await DB.prepare(
    `with mine as (
       select pln.part_number_id as id from part_listing_numbers pln where pln.part_id = ?1
     ),
     related as (
       select id from mine
       union select l.to_id from part_number_links l join mine m on m.id = l.from_id where l.verification in ('admin_approved','verified')
       union select l.from_id from part_number_links l join mine m on m.id = l.to_id where l.verification in ('admin_approved','verified')
     )
     select p.id, p.slug, p.title, p.price, p.condition, p.quantity, p.part_origin,
            s.name as seller_name, s.slug as seller_slug, s.location as seller_location,
            b.name as brand_name,
            (select pn.number from part_listing_numbers x join part_numbers pn on pn.id = x.part_number_id
             where x.part_id = p.id and x.part_number_id in (select id from related) limit 1) as matched_number,
            (select pi.url from part_images pi where pi.part_id = p.id order by pi.is_featured desc, pi.sort_order asc, pi.id asc limit 1) as image_url
     from parts p
     join sellers s on s.id = p.seller_id
     left join brands b on b.id = p.brand_id
     where p.id != ?1 and p.status = 'active' and s.status = 'active'
       and exists (select 1 from part_listing_numbers x where x.part_id = p.id and x.part_number_id in (select id from related))
     order by case when p.quantity > 0 then 0 else 1 end, p.price asc
     limit ?2`
  ).bind(partId, limit).all();
  return res.results || [];
}
