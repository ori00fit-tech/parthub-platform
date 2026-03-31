import { Hono } from "hono";
import type { Env, HonoVariables } from "../types";
import { authMiddleware } from "../middlewares/auth";

export const marketplaceRoutes = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

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

async function getPartById(DB: D1Database, id: number) {
  return DB.prepare(
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
      p.created_at,
      p.updated_at,
      b.name as brand_name,
      b.slug as brand_slug,
      c.name as category_name,
      c.slug as category_slug,
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
    left join categories c on c.id = p.category_id
    left join sellers s on s.id = p.seller_id
    where p.id = ?1
    limit 1
    `
  )
    .bind(id)
    .first();
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
    const body = await c.req.json<Record<string, unknown>>();

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

    if (!seller_id) return c.json(failure("SELLER_ID_REQUIRED", "seller_id is required"), 400);
    if (!category_id) return c.json(failure("CATEGORY_ID_REQUIRED", "category_id is required"), 400);
    if (!slug) return c.json(failure("SLUG_REQUIRED", "slug is required"), 400);
    if (!title) return c.json(failure("TITLE_REQUIRED", "title is required"), 400);
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

    const inserted = await c.env.DB.prepare(
      `
      insert into parts (
        seller_id, category_id, brand_id, slug, title, description, sku,
        price, compare_price, condition, quantity, weight_kg, status, featured
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

    const partId = Number(inserted.meta.last_row_id);

    if (image_url) {
      await c.env.DB.prepare(
        `
        insert into part_images (part_id, url, alt_text, sort_order, is_featured)
        values (?1, ?2, ?3, 1, 1)
        `
      )
        .bind(partId, String(image_url).trim(), String(title).trim())
        .run();
    }

    const created = await getPartById(c.env.DB, partId);

    return c.json(
      success(created, { message: "Part created successfully" }),
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

marketplaceRoutes.get("/parts/:id", async (c) => {
  try {
    const id = Number(c.req.param("id"));
    if (Number.isNaN(id)) {
      return c.json(failure("INVALID_ID", "Invalid part id"), 400);
    }

    const part = await getPartById(c.env.DB, id);
    if (!part) {
      return c.json(failure("NOT_FOUND", "Part not found"), 404);
    }

    const gallery = await c.env.DB.prepare(
      `
      select id, part_id, url, alt_text, sort_order, is_featured, created_at
      from part_images
      where part_id = ?1
      order by is_featured desc, sort_order asc, id asc
      `
    )
      .bind(id)
      .all();

    return c.json(
      success({
        ...part,
        gallery: gallery.results || [],
      })
    );
  } catch (error) {
    return c.json(
      failure(
        "GET_PART_FAILED",
        error instanceof Error ? error.message : "Unknown get part error"
      ),
      500
    );
  }
});

marketplaceRoutes.put("/parts/:id", async (c) => {
  try {
    const id = Number(c.req.param("id"));
    if (Number.isNaN(id)) {
      return c.json(failure("INVALID_ID", "Invalid part id"), 400);
    }

    const body = await c.req.json<Record<string, unknown>>();
    const {
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
    } = body ?? {};

    const existing = await c.env.DB.prepare(
      "select id from parts where id = ?1 limit 1"
    )
      .bind(id)
      .first();

    if (!existing) {
      return c.json(failure("NOT_FOUND", "Part not found"), 404);
    }

    if (!category_id) return c.json(failure("CATEGORY_ID_REQUIRED", "category_id is required"), 400);
    if (!slug) return c.json(failure("SLUG_REQUIRED", "slug is required"), 400);
    if (!title) return c.json(failure("TITLE_REQUIRED", "title is required"), 400);
    if (price == null || Number.isNaN(Number(price))) {
      return c.json(failure("PRICE_REQUIRED", "price is required"), 400);
    }

    const slugConflict = await c.env.DB.prepare(
      "select id from parts where slug = ?1 and id != ?2 limit 1"
    )
      .bind(String(slug).trim(), id)
      .first();

    if (slugConflict) {
      return c.json(failure("SLUG_EXISTS", "A part with this slug already exists"), 409);
    }

    await c.env.DB.prepare(
      `
      update parts
      set
        category_id = ?1,
        brand_id = ?2,
        slug = ?3,
        title = ?4,
        description = ?5,
        sku = ?6,
        price = ?7,
        compare_price = ?8,
        condition = ?9,
        quantity = ?10,
        weight_kg = ?11,
        status = ?12,
        featured = ?13,
        updated_at = datetime('now')
      where id = ?14
      `
    )
      .bind(
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
        featured ? 1 : 0,
        id
      )
      .run();

    const updated = await getPartById(c.env.DB, id);
    return c.json(success(updated, { message: "Part updated successfully" }));
  } catch (error) {
    return c.json(
      failure(
        "UPDATE_PART_FAILED",
        error instanceof Error ? error.message : "Unknown update error"
      ),
      500
    );
  }
});

marketplaceRoutes.post("/parts/:id/images", async (c) => {
  try {
    const partId = Number(c.req.param("id"));
    if (Number.isNaN(partId)) {
      return c.json(failure("INVALID_ID", "Invalid part id"), 400);
    }

    const body = await c.req.json<Record<string, unknown>>();
    const {
      url,
      alt_text,
      sort_order,
      is_featured,
    } = body ?? {};

    if (!url) {
      return c.json(failure("URL_REQUIRED", "url is required"), 400);
    }

    const part = await c.env.DB.prepare(
      "select id, title from parts where id = ?1 limit 1"
    )
      .bind(partId)
      .first<{ id: number; title: string }>();

    if (!part) {
      return c.json(failure("NOT_FOUND", "Part not found"), 404);
    }

    if (is_featured) {
      await c.env.DB.prepare(
        "update part_images set is_featured = 0 where part_id = ?1"
      )
        .bind(partId)
        .run();
    }

    const inserted = await c.env.DB.prepare(
      `
      insert into part_images (part_id, url, alt_text, sort_order, is_featured)
      values (?1, ?2, ?3, ?4, ?5)
      `
    )
      .bind(
        partId,
        String(url).trim(),
        alt_text ? String(alt_text).trim() : String(part.title),
        sort_order != null && sort_order !== "" ? Number(sort_order) : 1,
        is_featured ? 1 : 0
      )
      .run();

    const imageId = Number(inserted.meta.last_row_id);

    const image = await c.env.DB.prepare(
      `
      select id, part_id, url, alt_text, sort_order, is_featured, created_at
      from part_images
      where id = ?1
      limit 1
      `
    )
      .bind(imageId)
      .first();

    return c.json(success(image, { message: "Image added successfully" }), 201);
  } catch (error) {
    return c.json(
      failure(
        "ADD_IMAGE_FAILED",
        error instanceof Error ? error.message : "Unknown add image error"
      ),
      500
    );
  }
});

marketplaceRoutes.put("/parts/:id/images/:imageId/feature", async (c) => {
  try {
    const partId = Number(c.req.param("id"));
    const imageId = Number(c.req.param("imageId"));

    if (Number.isNaN(partId) || Number.isNaN(imageId)) {
      return c.json(failure("INVALID_ID", "Invalid id"), 400);
    }

    const image = await c.env.DB.prepare(
      "select id from part_images where id = ?1 and part_id = ?2 limit 1"
    )
      .bind(imageId, partId)
      .first();

    if (!image) {
      return c.json(failure("NOT_FOUND", "Image not found"), 404);
    }

    await c.env.DB.prepare(
      "update part_images set is_featured = 0 where part_id = ?1"
    )
      .bind(partId)
      .run();

    await c.env.DB.prepare(
      "update part_images set is_featured = 1 where id = ?1 and part_id = ?2"
    )
      .bind(imageId, partId)
      .run();

    const gallery = await c.env.DB.prepare(
      `
      select id, part_id, url, alt_text, sort_order, is_featured, created_at
      from part_images
      where part_id = ?1
      order by is_featured desc, sort_order asc, id asc
      `
    )
      .bind(partId)
      .all();

    return c.json(success(gallery.results || [], { message: "Featured image updated" }));
  } catch (error) {
    return c.json(
      failure(
        "FEATURE_IMAGE_FAILED",
        error instanceof Error ? error.message : "Unknown feature image error"
      ),
      500
    );
  }
});

marketplaceRoutes.delete("/parts/:id/images/:imageId", async (c) => {
  try {
    const partId = Number(c.req.param("id"));
    const imageId = Number(c.req.param("imageId"));

    if (Number.isNaN(partId) || Number.isNaN(imageId)) {
      return c.json(failure("INVALID_ID", "Invalid id"), 400);
    }

    const image = await c.env.DB.prepare(
      "select id from part_images where id = ?1 and part_id = ?2 limit 1"
    )
      .bind(imageId, partId)
      .first();

    if (!image) {
      return c.json(failure("NOT_FOUND", "Image not found"), 404);
    }

    await c.env.DB.prepare(
      "delete from part_images where id = ?1 and part_id = ?2"
    )
      .bind(imageId, partId)
      .run();

    const gallery = await c.env.DB.prepare(
      `
      select id, part_id, url, alt_text, sort_order, is_featured, created_at
      from part_images
      where part_id = ?1
      order by is_featured desc, sort_order asc, id asc
      `
    )
      .bind(partId)
      .all();

    return c.json(success(gallery.results || [], { message: "Image deleted successfully" }));
  } catch (error) {
    return c.json(
      failure(
        "DELETE_IMAGE_FAILED",
        error instanceof Error ? error.message : "Unknown delete image error"
      ),
      500
    );
  }
});

// ================================
// SELLER SELF / ONBOARDING / DASHBOARD
// ================================

marketplaceRoutes.get("/dashboard", authMiddleware, async (c) => {
  const sellerId = c.get("seller_id");

  if (!sellerId) {
    return c.json(failure("NOT_SELLER", "Seller account required"), 403);
  }

  const [activeParts, totalOrders, pendingOrders, avgRating] = await Promise.all([
    c.env.DB.prepare(
      "select count(*) as n from parts where seller_id = ?1 and status = 'active'"
    ).bind(sellerId).first<{ n: number }>(),

    c.env.DB.prepare(`
      select count(distinct o.id) as n
      from orders o
      join order_items oi on oi.order_id = o.id
      join parts p on p.id = oi.part_id
      where p.seller_id = ?1
    `).bind(sellerId).first<{ n: number }>(),

    c.env.DB.prepare(`
      select count(distinct o.id) as n
      from orders o
      join order_items oi on oi.order_id = o.id
      join parts p on p.id = oi.part_id
      where p.seller_id = ?1 and o.status = 'pending'
    `).bind(sellerId).first<{ n: number }>(),

    c.env.DB.prepare(`
      select avg(r.rating) as n
      from reviews r
      join parts p on p.id = r.part_id
      where p.seller_id = ?1
    `).bind(sellerId).first<{ n: number }>(),
  ]);

  return c.json(
    success({
      active_parts: activeParts?.n ?? 0,
      total_orders: totalOrders?.n ?? 0,
      pending_orders: pendingOrders?.n ?? 0,
      avg_rating: avgRating?.n ?? 0,
    })
  );
});

marketplaceRoutes.get("/me", authMiddleware, async (c) => {
  const sellerId = c.get("seller_id");
  const userId = c.get("user_id");

  if (!userId) {
    return c.json(failure("UNAUTHORIZED", "Authentication required"), 401);
  }

  if (!sellerId) {
    return c.json(failure("NOT_SELLER", "Seller account required"), 403);
  }

  const seller = await c.env.DB.prepare(`
    select
      s.*,
      u.name as user_name,
      u.email as user_email,
      u.phone as user_phone
    from sellers s
    join users u on u.id = s.user_id
    where s.id = ?1
    limit 1
  `).bind(sellerId).first();

  if (!seller) {
    return c.json(failure("SELLER_NOT_FOUND", "Seller profile not found"), 404);
  }

  return c.json(success(seller));
});

marketplaceRoutes.post("/onboarding", authMiddleware, async (c) => {
  const userId = c.get("user_id");

  if (!userId) {
    return c.json(failure("UNAUTHORIZED", "Authentication required"), 401);
  }

  const body = await c.req.json<Record<string, unknown>>();
  const displayName = String(body.display_name ?? "").trim();
  const slug = String(body.slug ?? "").trim();
  const phone = String(body.phone ?? "").trim();
  const city = String(body.city ?? "").trim();
  const description = String(body.description ?? "").trim();

  if (!displayName) return c.json(failure("DISPLAY_NAME_REQUIRED", "display_name is required"), 400);
  if (!slug) return c.json(failure("SLUG_REQUIRED", "slug is required"), 400);
  if (!city) return c.json(failure("CITY_REQUIRED", "city is required"), 400);

  const existingSeller = await c.env.DB.prepare(
    "select id from sellers where user_id = ?1 limit 1"
  ).bind(userId).first<{ id: number }>();

  if (existingSeller) {
    return c.json(failure("SELLER_EXISTS", "Seller profile already exists"), 409);
  }

  const slugConflict = await c.env.DB.prepare(
    "select id from sellers where slug = ?1 limit 1"
  ).bind(slug).first();

  if (slugConflict) {
    return c.json(failure("SLUG_EXISTS", "A seller with this slug already exists"), 409);
  }

  const inserted = await c.env.DB.prepare(`
    insert into sellers (
      user_id,
      name,
      slug,
      phone,
      location,
      description,
      status
    ) values (?1, ?2, ?3, ?4, ?5, ?6, 'active')
  `)
    .bind(userId, displayName, slug, phone || null, city, description || null)
    .run();

  const sellerId = Number(inserted.meta.last_row_id);

  const seller = await c.env.DB.prepare(`
    select
      s.*,
      u.name as user_name,
      u.email as user_email,
      u.phone as user_phone
    from sellers s
    join users u on u.id = s.user_id
    where s.id = ?1
    limit 1
  `).bind(sellerId).first();

  return c.json(success(seller, { message: "Seller onboarding completed" }), 201);
});

marketplaceRoutes.put("/onboarding", authMiddleware, async (c) => {
  const sellerId = c.get("seller_id");

  if (!sellerId) {
    return c.json(failure("NOT_SELLER", "Seller account required"), 403);
  }

  const body = await c.req.json<Record<string, unknown>>();
  const displayName = String(body.display_name ?? "").trim();
  const slug = String(body.slug ?? "").trim();
  const phone = String(body.phone ?? "").trim();
  const city = String(body.city ?? "").trim();
  const description = String(body.description ?? "").trim();

  if (!displayName) return c.json(failure("DISPLAY_NAME_REQUIRED", "display_name is required"), 400);
  if (!slug) return c.json(failure("SLUG_REQUIRED", "slug is required"), 400);
  if (!city) return c.json(failure("CITY_REQUIRED", "city is required"), 400);

  const slugConflict = await c.env.DB.prepare(
    "select id from sellers where slug = ?1 and id != ?2 limit 1"
  ).bind(slug, sellerId).first();

  if (slugConflict) {
    return c.json(failure("SLUG_EXISTS", "A seller with this slug already exists"), 409);
  }

  await c.env.DB.prepare(`
    update sellers
    set
      name = ?1,
      slug = ?2,
      phone = ?3,
      location = ?4,
      description = ?5
    where id = ?6
  `)
    .bind(displayName, slug, phone || null, city, description || null, sellerId)
    .run();

  const seller = await c.env.DB.prepare(`
    select
      s.*,
      u.name as user_name,
      u.email as user_email,
      u.phone as user_phone
    from sellers s
    join users u on u.id = s.user_id
    where s.id = ?1
    limit 1
  `).bind(sellerId).first();

  return c.json(success(seller, { message: "Seller profile updated" }));
});

marketplaceRoutes.get("/me/parts", authMiddleware, async (c) => {
  const sellerId = c.get("seller_id");

  if (!sellerId) {
    return c.json(failure("NOT_SELLER", "Seller account required"), 403);
  }

  const parts = await c.env.DB.prepare(`
    select
      p.*,
      b.name as brand_name,
      c.name as category_name,
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
    where p.seller_id = ?1
    order by p.created_at desc
  `).bind(sellerId).all();

  return c.json(success(parts.results || []));
});

marketplaceRoutes.get("/me/orders", authMiddleware, async (c) => {
  const sellerId = c.get("seller_id");

  if (!sellerId) {
    return c.json(failure("NOT_SELLER", "Seller account required"), 403);
  }

  const orders = await c.env.DB.prepare(`
    select
      o.id,
      o.order_number,
      o.status,
      o.payment_status,
      o.shipping_status,
      o.total,
      o.created_at,
      u.name as buyer_name,
      u.email as buyer_email
    from orders o
    join users u on u.id = o.buyer_id
    join order_items oi on oi.order_id = o.id
    join parts p on p.id = oi.part_id
    where p.seller_id = ?1
    group by o.id
    order by o.created_at desc
  `).bind(sellerId).all();

  return c.json(success(orders.results || []));
});

marketplaceRoutes.get("/me/orders/:id", authMiddleware, async (c) => {
  const sellerId = c.get("seller_id");
  const id = c.req.param("id");

  if (!sellerId) {
    return c.json(failure("NOT_SELLER", "Seller account required"), 403);
  }

  const order = await c.env.DB.prepare(`
    select
      o.*,
      u.name as buyer_name,
      u.email as buyer_email,
      u.phone as buyer_phone
    from orders o
    join users u on u.id = o.buyer_id
    where o.id = ?1
    limit 1
  `).bind(id).first();

  if (!order) {
    return c.json(failure("NOT_FOUND", "Order not found"), 404);
  }

  const items = await c.env.DB.prepare(`
    select
      oi.*,
      p.title as part_title,
      p.sku,
      (
        select pi.url
        from part_images pi
        where pi.part_id = p.id
        order by pi.is_featured desc, pi.sort_order asc, pi.id asc
        limit 1
      ) as image_url
    from order_items oi
    join parts p on p.id = oi.part_id
    where oi.order_id = ?1 and p.seller_id = ?2
    order by oi.id asc
  `).bind(id, sellerId).all();

  return c.json(
    success({
      ...(order as Record<string, unknown>),
      items: items.results || [],
    })
  );
});

marketplaceRoutes.get("/me/reviews", authMiddleware, async (c) => {
  const sellerId = c.get("seller_id");

  if (!sellerId) {
    return c.json(failure("NOT_SELLER", "Seller account required"), 403);
  }

  const reviews = await c.env.DB.prepare(`
    select
      r.id,
      r.rating,
      r.comment,
      r.created_at,
      u.name as buyer_name,
      u.email as buyer_email,
      p.title as part_title
    from reviews r
    join parts p on p.id = r.part_id
    join users u on u.id = r.buyer_id
    where p.seller_id = ?1
    order by r.created_at desc
  `).bind(sellerId).all();

  return c.json(success(reviews.results || []));
});
