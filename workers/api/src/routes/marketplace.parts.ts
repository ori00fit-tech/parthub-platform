import { Hono } from "hono";
import type { Env, HonoVariables } from "../types";
import { fail, ok } from "../utils/response";

export const marketplacePartsRoutes = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

marketplacePartsRoutes.get("/:slug", async (c) => {
  const slug = c.req.param("slug");

  const part = await c.env.DB.prepare(
    `
    select
      p.id,
      p.seller_id,
      p.category_id,
      p.brand_id,
      p.slug,
      p.title,
      p.description,
      p.sku,
      p.price,
      p.compare_price,
      p.condition,
      p.quantity,
      p.weight_kg,
      p.status,
      p.featured,
      p.part_origin,
      p.created_at,
      p.updated_at,
      b.name as brand_name,
      b.slug as brand_slug,
      c.name as category_name,
      c.slug as category_slug,
      s.name as seller_name,
      s.slug as seller_slug,
      s.location as seller_location,
      s.seller_type,
      (
        select pi.url
        from part_images pi
        where pi.part_id = p.id
        order by pi.is_featured desc, pi.sort_order asc, pi.id asc
        limit 1
      ) as image_url
    from parts p
    left join brands b on b.id = p.brand_id
    left join categories c on c.id = p.category_id
    left join sellers s on s.id = p.seller_id
    where p.slug = ?1
      and p.status = 'active'
    limit 1
    `
  )
    .bind(slug)
    .first<Record<string, unknown> & { id: number }>();

  if (!part) {
    return fail(c, "Part not found", 404);
  }

  const [images, specs, compatibility, relatedParts] = await Promise.all([
    c.env.DB.prepare(
      `
      select id, part_id, url, alt_text, sort_order, is_featured, created_at
      from part_images
      where part_id = ?1
      order by is_featured desc, sort_order asc, id asc
      `
    )
      .bind(part.id)
      .all(),

    c.env.DB.prepare(
      `
      select id, label, value, sort_order
      from part_specs
      where part_id = ?1
      order by sort_order asc, id asc
      `
    )
      .bind(part.id)
      .all(),

    c.env.DB.prepare(
      `
      select
        id,
        part_id,
        make,
        model,
        year_start,
        year_end,
        engine,
        trim,
        notes
      from part_compatibility
      where part_id = ?1
      order by lower(make) asc, lower(model) asc, year_start desc, id desc
      `
    )
      .bind(part.id)
      .all(),

    c.env.DB.prepare(
      `
      select
        rp.id,
        rp.slug,
        rp.title,
        rp.price,
        rp.compare_price,
        rp.condition,
        rp.quantity,
        b.name as brand_name,
        c.name as category_name,
        (
          select pi.url
          from part_images pi
          where pi.part_id = rp.id
          order by pi.is_featured desc, pi.sort_order asc, pi.id asc
          limit 1
        ) as image_url
      from parts rp
      left join brands b on b.id = rp.brand_id
      left join categories c on c.id = rp.category_id
      where rp.status = 'active'
        and rp.id != ?1
        and (
          rp.category_id = ?2
          or (rp.brand_id is not null and rp.brand_id = ?3)
        )
      order by rp.featured desc, rp.created_at desc
      limit 4
      `
    )
      .bind(part.id, part.category_id ?? null, part.brand_id ?? null)
      .all(),
  ]);

  return ok(c, {
    ...part,
    images: images.results ?? [],
    media: images.results ?? [],
    specs: specs.results ?? [],
    compatibility: compatibility.results ?? [],
    related_parts: relatedParts.results ?? [],
    compatibility_count: Array.isArray(compatibility.results) ? compatibility.results.length : 0,
    fitment_notes: (compatibility.results ?? [])
      .map((row) => {
        const item = row as Record<string, unknown>;
        const yearStart = item.year_start ? String(item.year_start) : "";
        const yearEnd = item.year_end ? String(item.year_end) : "";
        const yearLabel =
          yearStart && yearEnd ? `${yearStart}-${yearEnd}` : yearStart || "";
        return [yearLabel, item.make, item.model, item.engine, item.trim]
          .filter(Boolean)
          .join(" ");
      })
      .filter(Boolean),
  });
});
