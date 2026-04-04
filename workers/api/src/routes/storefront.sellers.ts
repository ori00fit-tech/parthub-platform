import { Hono } from "hono";
import type { Env, HonoVariables } from "../types";
import { ok, fail } from "../utils/response";

export const storefrontSellersRoutes = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

storefrontSellersRoutes.get("/:slug", async (c) => {
  const slug = c.req.param("slug");

  const seller = await c.env.DB.prepare(
    `
    select
      s.id,
      s.name,
      s.slug,
      s.description,
      s.location,
      s.phone,
      s.status,
      s.created_at,
      (
        select count(*)
        from parts p
        where p.seller_id = s.id
          and p.status = 'active'
      ) as active_parts_count,
      (
        select count(*)
        from parts p
        where p.seller_id = s.id
          and exists (
            select 1
            from part_compatibility pc
            where pc.part_id = p.id
          )
      ) as fitment_ready_parts_count
    from sellers s
    where s.slug = ?1
      and s.status = 'active'
    limit 1
    `
  )
    .bind(slug)
    .first<Record<string, unknown> & { id: number }>();

  if (!seller) {
    return fail(c, "Seller not found", 404);
  }

  const parts = await c.env.DB.prepare(
    `
    select
      p.id,
      p.slug,
      p.title,
      p.price,
      p.compare_price,
      p.condition,
      p.quantity,
      p.featured,
      p.created_at,
      b.name as brand_name,
      c.name as category_name,
      (
        select pi.url
        from part_images pi
        where pi.part_id = p.id
        order by pi.is_featured desc, pi.sort_order asc, pi.id asc
        limit 1
      ) as image_url,
      (
        select count(*)
        from part_compatibility pc
        where pc.part_id = p.id
      ) as compatibility_count
    from parts p
    left join brands b on b.id = p.brand_id
    left join categories c on c.id = p.category_id
    where p.seller_id = ?1
      and p.status = 'active'
    order by p.featured desc, p.created_at desc
    limit 24
    `
  )
    .bind(seller.id)
    .all();

  return ok(c, {
    ...seller,
    parts: parts.results || [],
  });
});
