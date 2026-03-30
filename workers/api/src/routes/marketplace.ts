import { Hono } from "hono";

export const marketplaceRoutes = new Hono();

function success(data: unknown, meta: unknown = null) {
  return {
    ok: true,
    data,
    meta,
    error: null,
  };
}

function failure(code: string, message: string) {
  return {
    ok: false,
    data: null,
    meta: null,
    error: { code, message },
  };
}

marketplaceRoutes.get("/health", (c) => {
  return c.json(
    success({
      service: "marketplace",
      status: "ok",
    })
  );
});

marketplaceRoutes.post("/parts", async (c) => {
  try {
    const body = await c.req.json();

    const {
      seller_id,
      category_id,
      brand_id,
      slug,
      title,
      description,
      sku,
      price,
      compare_price,
      condition,
      quantity,
      weight_kg,
      status,
      featured,
      image_url,
    } = body ?? {};

    if (!seller_id) {
      return c.json(failure("SELLER_ID_REQUIRED", "seller_id is required"), 400);
    }

    if (!category_id) {
      return c.json(failure("CATEGORY_ID_REQUIRED", "category_id is required"), 400);
    }

    if (!slug) {
      return c.json(failure("SLUG_REQUIRED", "slug is required"), 400);
    }

    if (!title) {
      return c.json(failure("TITLE_REQUIRED", "title is required"), 400);
    }

    if (price == null || Number.isNaN(Number(price))) {
      return c.json(failure("PRICE_REQUIRED", "price is required"), 400);
    }

    const existing = await c.env.DB.prepare(
      "select id from parts where slug = ?1 limit 1"
    )
      .bind(String(slug).trim())
      .first();

    if (existing) {
      return c.json(failure("SLUG_EXISTS", "A part with this slug already exists"), 409);
    }

    const insertPart = await c.env.DB.prepare(
      `
      insert into parts (
        seller_id,
        category_id,
        brand_id,
        slug,
        title,
        description,
        sku,
        price,
        compare_price,
        condition,
        quantity,
        weight_kg,
        status,
        featured
      ) values (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)
      `
    )
      .bind(
        Number(seller_id),
        Number(category_id),
        brand_id ? Number(brand_id) : null,
        String(slug).trim(),
        String(title).trim(),
        description ? String(description).trim() : null,
        sku ? String(sku).trim() : null,
        Number(price),
        compare_price != null && compare_price !== "" ? Number(compare_price) : null,
        condition ? String(condition).trim() : "new",
        quantity != null && quantity !== "" ? Number(quantity) : 1,
        weight_kg != null && weight_kg !== "" ? Number(weight_kg) : null,
        status ? String(status).trim() : "active",
        featured ? 1 : 0
      )
      .run();

    const partId = insertPart.meta.last_row_id;

    if (image_url) {
      await c.env.DB.prepare(
        `
        insert into part_images (
          part_id,
          url,
          alt_text,
          sort_order,
          is_featured
        ) values (?1, ?2, ?3, 1, 1)
        `
      )
        .bind(
          Number(partId),
          String(image_url).trim(),
          String(title).trim()
        )
        .run();
    }

    const created = await c.env.DB.prepare(
      `
      select
        p.id,
        p.slug,
        p.title,
        p.description,
        p.sku,
        p.price,
        p.compare_price,
        p.condition,
        p.quantity,
        p.status,
        p.featured,
        p.created_at,
        b.name as brand_name,
        b.slug as brand_slug,
        c2.name as category_name,
        c2.slug as category_slug,
        s.name as seller_name,
        s.slug as seller_slug,
        s.location as seller_location,
        (
          select pi.url
          from part_images pi
          where pi.part_id = p.id
          order by pi.is_featured desc, pi.sort_order asc, pi.id asc
          limit 1
        ) as image_url
      from parts p
      left join brands b on b.id = p.brand_id
      left join categories c2 on c2.id = p.category_id
      left join sellers s on s.id = p.seller_id
      where p.id = ?1
      limit 1
      `
    )
      .bind(Number(partId))
      .first();

    return c.json(
      success(created, {
        message: "Part created successfully",
      }),
      201
    );
  } catch (error) {
    return c.json(
      failure(
        "CREATE_PART_FAILED",
        error instanceof Error ? error.message : "Unknown create part error"
      ),
      500
    );
  }
});
