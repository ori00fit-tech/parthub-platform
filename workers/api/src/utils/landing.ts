// Landing pages for search engines: a part category, a car make, a car
// model, or a category for one model (/pieces/filters, /voiture/dacia,
// /voiture/dacia/logan, /voiture/dacia/logan/filters on the storefront).
//
// A page lists the active parts of active stores in its scope. Vehicle
// scope = the part has a compatibility row for that make (and model): rows
// keep the make / model names, matched to the catalog without case.

export type LandingScope = {
  category: { id: number; slug: string; name: string } | null;
  make: { id: number; slug: string; name: string } | null;
  model: { id: number; slug: string; name: string } | null;
};

const PART_LIMIT = 24;

// Resolves the slugs. null = a slug is unknown (page not found).
export async function resolveLanding(
  DB: D1Database,
  q: { category?: string; make?: string; model?: string }
): Promise<LandingScope | null> {
  const scope: LandingScope = { category: null, make: null, model: null };
  if (q.category) {
    scope.category = await DB.prepare("select id, slug, name from categories where slug = ?1")
      .bind(q.category.toLowerCase())
      .first<LandingScope["category"]>();
    if (!scope.category) return null;
  }
  if (q.make) {
    scope.make = await DB.prepare("select id, slug, name from vehicle_makes where slug = ?1")
      .bind(q.make.toLowerCase())
      .first<LandingScope["make"]>();
    if (!scope.make) return null;
  }
  if (q.model) {
    if (!scope.make) return null;
    scope.model = await DB.prepare("select id, slug, name from vehicle_models where make_id = ?1 and slug = ?2")
      .bind(scope.make.id, q.model.toLowerCase())
      .first<LandingScope["model"]>();
    if (!scope.model) return null;
  }
  if (!scope.category && !scope.make) return null;
  return scope;
}

// "where" for the parts of this scope (p = parts, s = sellers, c = categories).
function scopeWhere(scope: LandingScope): { sql: string; binds: unknown[] } {
  const where = ["p.status = 'active'", "s.status = 'active'"];
  const binds: unknown[] = [];
  if (scope.category) {
    binds.push(scope.category.id);
    where.push(`p.category_id = ?${binds.length}`);
  }
  if (scope.make) {
    binds.push(scope.make.name);
    let vehicle = `lower(pc.make) = lower(?${binds.length})`;
    if (scope.model) {
      binds.push(scope.model.name);
      vehicle += ` and lower(pc.model) = lower(?${binds.length})`;
    }
    where.push(`exists (select 1 from part_compatibility pc where pc.part_id = p.id and ${vehicle})`);
  }
  return { sql: where.join(" and "), binds };
}

export async function landingData(DB: D1Database, scope: LandingScope) {
  const { sql, binds } = scopeWhere(scope);
  const from = `from parts p join sellers s on s.id = p.seller_id left join categories c on c.id = p.category_id`;

  const countRow = await DB.prepare(`select count(*) as n ${from} where ${sql}`).bind(...binds).first<{ n: number }>();
  const total = Number(countRow?.n || 0);

  const parts = total
    ? (
        await DB.prepare(
          `select p.id, p.slug, p.title, p.price, p.condition, p.quantity, p.part_origin,
                  b.name as brand_name, s.name as seller_name, s.location as seller_location,
                  (select pi.url from part_images pi where pi.part_id = p.id order by pi.is_featured desc, pi.sort_order asc, pi.id asc limit 1) as image_url
           ${from} left join brands b on b.id = p.brand_id
           where ${sql}
           order by case when p.quantity > 0 then 0 else 1 end, p.featured desc, coalesce(p.updated_at, p.created_at) desc
           limit ${PART_LIMIT}`
        ).bind(...binds).all()
      ).results || []
    : [];

  // Links to narrower pages, each with its part count.
  const categories = !scope.category && total
    ? (
        await DB.prepare(
          `select c.slug, c.name, count(distinct p.id) as count ${from}
           where ${sql} and c.id is not null group by c.id order by count desc, c.name`
        ).bind(...binds).all()
      ).results || []
    : [];

  // A make's models (make page), or the makes a category fits (category page).
  let models: unknown[] = [];
  if (scope.make && !scope.model && total) {
    const n = binds.length;
    models = (
      await DB.prepare(
        `select vm.slug, vm.name, count(distinct p.id) as count ${from}
         join part_compatibility pc2 on pc2.part_id = p.id and lower(pc2.make) = lower(?${n + 1})
         join vehicle_models vm on vm.make_id = ?${n + 2} and lower(vm.name) = lower(pc2.model)
         where ${sql} group by vm.id order by count desc, vm.name`
      ).bind(...binds, scope.make.name, scope.make.id).all()
    ).results || [];
  }
  let makes: unknown[] = [];
  if (scope.category && !scope.make && total) {
    makes = (
      await DB.prepare(
        `select mk.slug, mk.name, count(distinct p.id) as count ${from}
         join part_compatibility pc2 on pc2.part_id = p.id
         join vehicle_makes mk on lower(mk.name) = lower(pc2.make)
         where ${sql} group by mk.id order by count desc, mk.name`
      ).bind(...binds).all()
    ).results || [];
  }

  const generations = scope.model
    ? (
        await DB.prepare("select name, year_start, year_end from vehicle_generations where model_id = ?1 order by year_start, sort_order")
          .bind(scope.model.id)
          .all()
      ).results || []
    : [];

  return {
    category: scope.category ? { slug: scope.category.slug, name: scope.category.name } : null,
    make: scope.make ? { slug: scope.make.slug, name: scope.make.name } : null,
    model: scope.model ? { slug: scope.model.slug, name: scope.model.name } : null,
    total,
    parts,
    categories,
    models,
    makes,
    generations,
  };
}

// Every landing page with at least one part, for sitemap.xml. Paths are
// storefront paths.
export async function landingIndex(DB: D1Database) {
  const live = `from parts p join sellers s on s.id = p.seller_id where p.status = 'active' and s.status = 'active'`;
  const [cats, vehicles, combos] = await Promise.all([
    DB.prepare(
      `select c.slug, count(*) as count from categories c join parts p on p.category_id = c.id
       join sellers s on s.id = p.seller_id where p.status = 'active' and s.status = 'active' group by c.id`
    ).all<{ slug: string; count: number }>(),
    DB.prepare(
      `select mk.slug as make, vm.slug as model, count(distinct p.id) as count
       ${live.replace("where", `join part_compatibility pc on pc.part_id = p.id
         join vehicle_makes mk on lower(mk.name) = lower(pc.make)
         left join vehicle_models vm on vm.make_id = mk.id and lower(vm.name) = lower(pc.model)
         where`)}
       group by mk.id, vm.id`
    ).all<{ make: string; model: string | null; count: number }>(),
    DB.prepare(
      `select mk.slug as make, vm.slug as model, c.slug as category, count(distinct p.id) as count
       ${live.replace("where", `join categories c on c.id = p.category_id
         join part_compatibility pc on pc.part_id = p.id
         join vehicle_makes mk on lower(mk.name) = lower(pc.make)
         join vehicle_models vm on vm.make_id = mk.id and lower(vm.name) = lower(pc.model)
         where`)}
       group by mk.id, vm.id, c.id`
    ).all<{ make: string; model: string; category: string; count: number }>(),
  ]);

  const paths = new Set<string>();
  for (const r of cats.results || []) paths.add(`/pieces/${r.slug}`);
  for (const r of vehicles.results || []) {
    paths.add(`/voiture/${r.make}`);
    if (r.model) paths.add(`/voiture/${r.make}/${r.model}`);
  }
  for (const r of combos.results || []) paths.add(`/voiture/${r.make}/${r.model}/${r.category}`);
  return [...paths].slice(0, 5000);
}
