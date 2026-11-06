import { Hono } from "hono";
import type { Env, HonoVariables } from "../types";
import { authMiddleware } from "../middlewares/auth";
import { sellerGuard } from "../middlewares/seller";
import { resolveActor } from "../utils/seller-actor";
import { signToken } from "../utils/auth";
import { loadReadiness } from "../utils/seller-readiness";
import { LEGAL_VERSION } from "../utils/legal";
import { notifyBackInStock } from "../utils/stock-alerts";
import { type IssueRow, cleanNote, issuesForOrder, loadIssue, nowText, publicIssue, updateIssue } from "../utils/issues";
import { type LineStatus, SELLER_NEXT, logOrderEvent, refreshOrderStatus, rollupStatus, setLineStatus } from "../utils/fulfillment";
import { runInBackground } from "../utils/whatsapp";

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

const PART_STATUSES = ["draft", "pending", "active", "rejected", "archived"] as const;

// Decide the stored status of a part after a create/update.
// Admins may set any valid status. Sellers cannot self-publish: asking for
// "active" keeps an already-approved part active, otherwise it goes to the
// moderation queue ("pending"). Sellers may still save drafts or archive.
// oem | aftermarket | used (migration 0008). Anything else falls back.
const PART_ORIGINS = ["oem", "aftermarket", "used"] as const;
function resolvePartOrigin(value: unknown): string | null {
  const v = typeof value === "string" ? value.trim().toLowerCase() : "";
  return (PART_ORIGINS as readonly string[]).includes(v) ? v : null;
}

function resolvePartStatus(
  requested: unknown,
  current: string | null,
  isAdmin: boolean
): string {
  const wanted = typeof requested === "string" ? requested.trim() : "";

  if (isAdmin) {
    return (PART_STATUSES as readonly string[]).includes(wanted) ? wanted : current ?? "active";
  }

  if (wanted === "draft" || wanted === "archived") return wanted;
  if (current === "active" && (wanted === "active" || wanted === "")) return "active";
  return "pending";
}

// Returns the part if the actor may modify it, otherwise null.
async function findOwnedPart(
  DB: D1Database,
  partId: number,
  actor: { isAdmin: boolean; sellerId: number | null }
) {
  const part = await DB.prepare("select id, title, seller_id, status from parts where id = ?1 limit 1")
    .bind(partId)
    .first<{ id: number; title: string; seller_id: number; status: string }>();

  if (!part) return null;
  if (!actor.isAdmin && part.seller_id !== actor.sellerId) return null;
  return part;
}

// Store images: our own uploads or an https URL (no javascript:, data:, …).
function cleanImageUrl(value: unknown): string | null | "invalid" {
  const v = typeof value === "string" ? value.trim() : "";
  if (!v) return null;
  if (/^\/api\/v1\/media\/uploads\/[a-z0-9/_.-]+$/i.test(v) && !v.includes("..")) return v;
  if (/^https:\/\/[^\s"'<>]+$/i.test(v) && v.length <= 500) return v;
  return "invalid";
}

function cleanPhone(value: unknown): string | null | "invalid" {
  const v = typeof value === "string" ? value.trim() : "";
  if (!v) return null;
  return /^\+?[0-9 ()-]{6,30}$/.test(v) ? v : "invalid";
}

// A token that carries the seller id, so a seller who just created their
// store doesn't have to sign in again.
async function sellerSessionToken(env: Env, userId: number, sellerId: number) {
  if (!env.JWT_SECRET) return null;
  return signToken({ user_id: userId, role: "seller", seller_id: sellerId }, env.JWT_SECRET);
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

marketplaceRoutes.post("/parts", authMiddleware, sellerGuard, async (c) => {
  try {
    const actor = await resolveActor(c);
    if (!actor.ok) return c.json(failure(actor.code, actor.message), actor.status);

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

    // Sellers always create parts for their own store; only admins may pick a seller.
    const targetSellerId = actor.isAdmin ? Number(seller_id) : actor.sellerId;

    if (!targetSellerId) return c.json(failure("SELLER_ID_REQUIRED", "seller_id is required"), 400);
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
        targetSellerId,
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
        resolvePartStatus(status, null, actor.isAdmin),
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

marketplaceRoutes.put("/parts/:id", authMiddleware, sellerGuard, async (c) => {
  try {
    const actor = await resolveActor(c);
    if (!actor.ok) return c.json(failure(actor.code, actor.message), actor.status);

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

    const existing = await findOwnedPart(c.env.DB, id, actor);

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
        resolvePartStatus(status, existing.status, actor.isAdmin),
        featured ? 1 : 0,
        id
      )
      .run();

    const updated = await getPartById(c.env.DB, id);
    // Back in stock? Tell the buyers who asked (no-op when nobody is waiting).
    runInBackground(c, notifyBackInStock(c.env, id));
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

// GET /api/v1/marketplace/parts/:id/images — the part's photos, main first.
marketplaceRoutes.get("/parts/:id/images", authMiddleware, sellerGuard, async (c) => {
  const actor = await resolveActor(c);
  if (!actor.ok) return c.json(failure(actor.code, actor.message), actor.status);

  const partId = Number(c.req.param("id"));
  if (Number.isNaN(partId)) return c.json(failure("INVALID_ID", "Invalid part id"), 400);
  if (!(await findOwnedPart(c.env.DB, partId, actor))) {
    return c.json(failure("NOT_FOUND", "Part not found"), 404);
  }

  const gallery = await c.env.DB.prepare(
    `select id, part_id, url, alt_text, sort_order, is_featured, created_at
     from part_images where part_id = ?1
     order by is_featured desc, sort_order asc, id asc`
  )
    .bind(partId)
    .all();
  return c.json(success(gallery.results || []));
});

marketplaceRoutes.post("/parts/:id/images", authMiddleware, sellerGuard, async (c) => {
  try {
    const actor = await resolveActor(c);
    if (!actor.ok) return c.json(failure(actor.code, actor.message), actor.status);

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

    const part = await findOwnedPart(c.env.DB, partId, actor);

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

marketplaceRoutes.put("/parts/:id/images/:imageId/feature", authMiddleware, sellerGuard, async (c) => {
  try {
    const actor = await resolveActor(c);
    if (!actor.ok) return c.json(failure(actor.code, actor.message), actor.status);

    const partId = Number(c.req.param("id"));
    const imageId = Number(c.req.param("imageId"));

    if (Number.isNaN(partId) || Number.isNaN(imageId)) {
      return c.json(failure("INVALID_ID", "Invalid id"), 400);
    }

    if (!(await findOwnedPart(c.env.DB, partId, actor))) {
      return c.json(failure("NOT_FOUND", "Part not found"), 404);
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

marketplaceRoutes.delete("/parts/:id/images/:imageId", authMiddleware, sellerGuard, async (c) => {
  try {
    const actor = await resolveActor(c);
    if (!actor.ok) return c.json(failure(actor.code, actor.message), actor.status);

    const partId = Number(c.req.param("id"));
    const imageId = Number(c.req.param("imageId"));

    if (Number.isNaN(partId) || Number.isNaN(imageId)) {
      return c.json(failure("INVALID_ID", "Invalid id"), 400);
    }

    if (!(await findOwnedPart(c.env.DB, partId, actor))) {
      return c.json(failure("NOT_FOUND", "Part not found"), 404);
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

    // Orders waiting for this seller to confirm their own lines.
    c.env.DB.prepare(`
      select count(distinct oi.order_id) as n
      from order_items oi
      where oi.seller_id = ?1 and oi.status = 'pending'
    `).bind(sellerId).first<{ n: number }>(),

    c.env.DB.prepare(`
      select avg(r.rating) as n
      from reviews r
      join parts p on p.id = r.part_id
      where p.seller_id = ?1
    `).bind(sellerId).first<{ n: number }>(),
  ]);

  // Demand the seller can serve by restocking: parts with buyers waiting
  // (counts only, buyers stay anonymous). Best-effort: the dashboard still
  // loads if the stock_alerts table is missing (migration 0012 not run yet).
  let waitingParts: Array<{ id: number; title: string; slug: string; quantity: number; status: string; waiting_count: number }> = [];
  try {
    const res = await c.env.DB.prepare(`
      select p.id, p.title, p.slug, p.quantity, p.status, count(sa.id) as waiting_count
      from stock_alerts sa
      join parts p on p.id = sa.part_id
      where p.seller_id = ?1 and sa.status = 'active'
      group by p.id
      order by waiting_count desc, p.title asc
      limit 5
    `).bind(sellerId).all<{ id: number; title: string; slug: string; quantity: number; status: string; waiting_count: number }>();
    waitingParts = res.results || [];
  } catch {
    waitingParts = [];
  }
  const waitingTotal = await c.env.DB.prepare(`
      select count(distinct sa.user_id) as n from stock_alerts sa join parts p on p.id = sa.part_id
      where p.seller_id = ?1 and sa.status = 'active'
    `)
    .bind(sellerId)
    .first<{ n: number }>()
    .catch(() => ({ n: 0 }));

  return c.json(
    success({
      active_parts: activeParts?.n ?? 0,
      total_orders: totalOrders?.n ?? 0,
      pending_orders: pendingOrders?.n ?? 0,
      avg_rating: avgRating?.n ?? 0,
      waiting_buyers: waitingTotal?.n ?? 0,
      waiting_parts: waitingParts,
    })
  );
});

// GET /api/v1/marketplace/me/readiness — store status + setup checklist.
// Looks the store up by user, so it also works with a token issued before
// the store existed; in that case it returns a fresh token with seller_id.
marketplaceRoutes.get("/me/readiness", authMiddleware, async (c) => {
  const userId = Number(c.get("user_id"));
  const role = c.get("user_role");
  if (role !== "seller" && role !== "admin") {
    return c.json(failure("NOT_SELLER", "Seller account required"), 403);
  }

  const readiness = await loadReadiness(c.env.DB, userId);
  const tokenSellerId = c.get("seller_id");
  const access_token =
    readiness.seller && Number(tokenSellerId) !== readiness.seller.id && role === "seller"
      ? await sellerSessionToken(c.env, userId, readiness.seller.id)
      : null;

  return c.json(
    success({
      status: readiness.status,
      percent: readiness.percent,
      items: readiness.items,
      parts: readiness.parts,
      seller: readiness.seller
        ? {
            id: readiness.seller.id,
            name: readiness.seller.name,
            slug: readiness.seller.slug,
            status: readiness.seller.status,
            // Only shown while the decision stands.
            moderation_note:
              readiness.seller.status === "rejected" || readiness.seller.status === "suspended"
                ? readiness.seller.moderation_note
                : null,
          }
        : null,
      access_token,
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

// POST /api/v1/marketplace/me/agreement — accept the seller agreement
// (for stores opened before it existed, or after a new version).
marketplaceRoutes.post("/me/agreement", authMiddleware, async (c) => {
  const userId = Number(c.get("user_id"));
  const res = await c.env.DB.prepare(
    "update sellers set agreement_accepted_at = datetime('now'), agreement_version = ?1, updated_at = datetime('now') where user_id = ?2"
  )
    .bind(LEGAL_VERSION, userId)
    .run();
  if (!res.meta.changes) return c.json(failure("SELLER_NOT_FOUND", "Seller profile not found"), 404);
  return c.json(success({ agreement_version: LEGAL_VERSION }, { message: "Seller agreement accepted" }));
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
  const whatsapp = cleanPhone(body.whatsapp);
  const logoUrl = cleanImageUrl(body.logo_url);

  if (!displayName) return c.json(failure("DISPLAY_NAME_REQUIRED", "display_name is required"), 400);
  if (!slug) return c.json(failure("SLUG_REQUIRED", "slug is required"), 400);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return c.json(failure("SLUG_INVALID", "Store address may only use lowercase letters, digits and dashes"), 400);
  }
  if (!city) return c.json(failure("CITY_REQUIRED", "city is required"), 400);
  if (cleanPhone(phone) === "invalid") return c.json(failure("PHONE_INVALID", "Enter a valid phone number"), 400);
  if (whatsapp === "invalid") return c.json(failure("WHATSAPP_INVALID", "Enter a valid WhatsApp number"), 400);
  if (logoUrl === "invalid") return c.json(failure("LOGO_INVALID", "Logo must be an uploaded image or an https link"), 400);
  if (body.accept_agreement !== true) {
    return c.json(failure("AGREEMENT_REQUIRED", "Please accept the seller agreement to open your store"), 400);
  }

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
      whatsapp,
      logo_url,
      status,
      agreement_accepted_at,
      agreement_version
    ) values (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 'pending', datetime('now'), ?9)
  `)
    .bind(userId, displayName, slug, phone || null, city, description || null, whatsapp, logoUrl, LEGAL_VERSION)
    .run();

  const sellerId = Number(inserted.meta.last_row_id);

  // A buyer opening a store becomes a seller.
  await c.env.DB.prepare("update users set role = 'seller' where id = ?1 and role = 'buyer'")
    .bind(userId)
    .run();
  const access_token = await sellerSessionToken(c.env, Number(userId), sellerId);

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

  return c.json(success({ ...(seller as Record<string, unknown>), access_token }, { message: "Seller onboarding completed" }), 201);
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
  const whatsapp = cleanPhone(body.whatsapp);
  const logoUrl = cleanImageUrl(body.logo_url);
  const bannerUrl = cleanImageUrl(body.banner_url);
  if (cleanPhone(phone) === "invalid") return c.json(failure("PHONE_INVALID", "Enter a valid phone number"), 400);
  if (whatsapp === "invalid") return c.json(failure("WHATSAPP_INVALID", "Enter a valid WhatsApp number"), 400);
  if (logoUrl === "invalid") return c.json(failure("LOGO_INVALID", "Logo must be an uploaded image or an https link"), 400);
  if (bannerUrl === "invalid") return c.json(failure("BANNER_INVALID", "Banner must be an uploaded image or an https link"), 400);

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
      description = ?5,
      whatsapp = ?6,
      logo_url = ?7,
      banner_url = ?8,
      updated_at = datetime('now')
    where id = ?9
  `)
    .bind(displayName, slug, phone || null, city, description || null, whatsapp, logoUrl, bannerUrl, sellerId)
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



marketplaceRoutes.post("/me/parts", authMiddleware, async (c) => {
  try {
    const sellerId = c.get("seller_id");

    if (!sellerId) {
      return c.json(failure("NOT_SELLER", "Seller account required"), 403);
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
      image_url,
      part_origin,
    } = body ?? {};

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
        price, compare_price, condition, quantity, weight_kg, status, featured, part_origin
      ) values (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)
      `
    )
      .bind(
        Number(sellerId),
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
        resolvePartStatus(status, null, false),
        featured ? 1 : 0,
        resolvePartOrigin(part_origin) || "aftermarket"
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

    return c.json(success(created, { message: "Part created successfully" }), 201);
  } catch (error) {
    return c.json(
      failure(
        "CREATE_SELLER_PART_FAILED",
        error instanceof Error ? error.message : "Unknown create seller part error"
      ),
      500
    );
  }
});

marketplaceRoutes.get("/me/parts/:id", authMiddleware, async (c) => {
  try {
    const sellerId = c.get("seller_id");
    const partId = Number(c.req.param("id"));

    if (!sellerId) {
      return c.json(failure("NOT_SELLER", "Seller account required"), 403);
    }

    if (Number.isNaN(partId)) {
      return c.json(failure("INVALID_ID", "Invalid part id"), 400);
    }

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
        p.moderation_note,
        p.featured,
        p.part_origin,
        p.created_at,
        p.updated_at,
        (
          select pi.url
          from part_images pi
          where pi.part_id = p.id
          order by pi.is_featured desc, pi.sort_order asc, pi.id asc
          limit 1
        ) as image_url,
        (
          select count(*) from stock_alerts sa
          where sa.part_id = p.id and sa.status = 'active'
        ) as waiting_count
      from parts p
      where p.id = ?1 and p.seller_id = ?2
      limit 1
      `
    )
      .bind(partId, Number(sellerId))
      .first();

    if (!part) {
      return c.json(failure("PART_NOT_FOUND", "Part not found for this seller"), 404);
    }

    return c.json(success(part));
  } catch (error) {
    return c.json(
      failure(
        "GET_SELLER_PART_FAILED",
        error instanceof Error ? error.message : "Unknown get seller part error"
      ),
      500
    );
  }
});

marketplaceRoutes.put("/me/parts/:id", authMiddleware, async (c) => {
  try {
    const sellerId = c.get("seller_id");
    const partId = Number(c.req.param("id"));

    if (!sellerId) {
      return c.json(failure("NOT_SELLER", "Seller account required"), 403);
    }

    if (Number.isNaN(partId)) {
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
      image_url,
      part_origin,
    } = body ?? {};

    const existing = await c.env.DB.prepare(
      "select id, status from parts where id = ?1 and seller_id = ?2 limit 1"
    )
      .bind(partId, Number(sellerId))
      .first<{ id: number; status: string }>();

    if (!existing) {
      return c.json(failure("PART_NOT_FOUND", "Part not found for this seller"), 404);
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
      .bind(String(slug).trim(), partId)
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
        part_origin = coalesce(?16, part_origin),
        updated_at = datetime('now')
      where id = ?14 and seller_id = ?15
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
        resolvePartStatus(status, existing.status, false),
        featured ? 1 : 0,
        partId,
        Number(sellerId),
        resolvePartOrigin(part_origin)
      )
      .run();

    if (image_url) {
      const existingImage = await c.env.DB.prepare(
        `
        select id
        from part_images
        where part_id = ?1
        order by is_featured desc, sort_order asc, id asc
        limit 1
        `
      )
        .bind(partId)
        .first<{ id: number }>();

      if (existingImage) {
        await c.env.DB.prepare(
          `
          update part_images
          set url = ?1, alt_text = ?2
          where id = ?3
          `
        )
          .bind(String(image_url).trim(), String(title).trim(), existingImage.id)
          .run();
      } else {
        await c.env.DB.prepare(
          `
          insert into part_images (part_id, url, alt_text, sort_order, is_featured)
          values (?1, ?2, ?3, 1, 1)
          `
        )
          .bind(partId, String(image_url).trim(), String(title).trim())
          .run();
      }
    }

    const updated = await getPartById(c.env.DB, partId);
    // Back in stock? Tell the buyers who asked (no-op when nobody is waiting).
    runInBackground(c, notifyBackInStock(c.env, partId));
    return c.json(success(updated, { message: "Part updated successfully" }));
  } catch (error) {
    return c.json(
      failure(
        "UPDATE_SELLER_PART_FAILED",
        error instanceof Error ? error.message : "Unknown update seller part error"
      ),
      500
    );
  }
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
      ) as image_url,
      -- Buyers who asked to be told when this part is back in stock.
      (
        select count(*) from stock_alerts sa
        where sa.part_id = p.id and sa.status = 'active'
      ) as waiting_count
    from parts p
    left join brands b on b.id = p.brand_id
    left join categories c on c.id = p.category_id
    where p.seller_id = ?1
    order by p.created_at desc
  `).bind(sellerId).all();

  return c.json(success(parts.results || []));
});

// The seller's own store id, checked against the signed-in user.
async function ownSellerId(c: { env: Env; get: (k: "user_id" | "seller_id") => unknown }): Promise<number | null> {
  const sellerId = Number(c.get("seller_id"));
  const userId = Number(c.get("user_id"));
  if (!sellerId || !userId) return null;
  const row = await c.env.DB.prepare("select id from sellers where id = ?1 and user_id = ?2 limit 1")
    .bind(sellerId, userId)
    .first<{ id: number }>();
  return row ? row.id : null;
}

// GET /api/v1/marketplace/me/orders — orders with at least one of the
// seller's parts. status / subtotal cover the seller's own lines only.
marketplaceRoutes.get("/me/orders", authMiddleware, async (c) => {
  const sellerId = await ownSellerId(c);
  if (!sellerId) return c.json(failure("NOT_SELLER", "Seller account required"), 403);

  const rows = await c.env.DB.prepare(`
    select
      o.id,
      o.reference,
      cast(o.id as text) as order_number,
      o.payment_status,
      o.created_at,
      coalesce(u.name, 'Buyer') as buyer_name,
      u.email as buyer_email,
      sum(oi.subtotal) as total,
      sum(oi.quantity) as item_count,
      group_concat(oi.status) as line_statuses
    from orders o
    join order_items oi on oi.order_id = o.id and oi.seller_id = ?1
    left join users u on u.id = o.buyer_id
    group by o.id
    order by o.created_at desc
  `).bind(sellerId).all<Record<string, unknown> & { line_statuses: string | null }>();

  const orders = (rows.results || []).map(({ line_statuses, ...o }) => ({
    ...o,
    status: rollupStatus(String(line_statuses || "").split(",").filter(Boolean)),
  }));
  return c.json(success(orders));
});

async function loadSellerOrder(DB: D1Database, sellerId: number, orderId: number) {
  const order = await DB.prepare(`
    select o.id, o.reference, cast(o.id as text) as order_number, o.status as order_status,
           o.payment_status, o.notes, o.created_at,
           coalesce(u.name, 'Buyer') as buyer_name, u.email as buyer_email,
           a.full_name as ship_name, a.phone as buyer_phone, a.address_line1, a.address_line2,
           a.city as buyer_city, a.state, a.postal_code, a.country
    from orders o
    left join users u on u.id = o.buyer_id
    left join order_addresses a on a.order_id = o.id
    where o.id = ?1 and exists (select 1 from order_items oi where oi.order_id = o.id and oi.seller_id = ?2)
    limit 1
  `).bind(orderId, sellerId).first<Record<string, unknown>>();
  if (!order) return null;

  const items = await DB.prepare(`
    select oi.id, oi.part_id, oi.title, oi.sku, oi.price, oi.quantity, oi.subtotal, oi.status,
           oi.status_updated_at, oi.delivered_at, p.slug as part_slug,
           (select pi.url from part_images pi where pi.part_id = oi.part_id
            order by pi.is_featured desc, pi.sort_order asc, pi.id asc limit 1) as image_url
    from order_items oi
    left join parts p on p.id = oi.part_id
    where oi.order_id = ?1 and oi.seller_id = ?2
    order by oi.id
  `).bind(orderId, sellerId).all<{ id: number; status: string; subtotal: number }>();
  const lines = items.results || [];

  const events = await DB.prepare(
    "select event, note, created_by, created_at from order_events where order_id = ?1 order by created_at asc, id asc"
  ).bind(orderId).all();

  const others = await DB.prepare(
    "select count(*) as n from order_items where order_id = ?1 and seller_id != ?2"
  ).bind(orderId, sellerId).first<{ n: number }>();

  const status = rollupStatus(lines.map((l) => l.status));
  const issues = await issuesForOrder(DB, orderId, sellerId);
  return {
    ...order,
    issues,
    status,
    total: lines.reduce((sum, l) => sum + Number(l.subtotal || 0), 0),
    next_statuses: SELLER_NEXT[status] ?? [],
    has_other_sellers: Number(others?.n || 0) > 0,
    items: lines,
    events: events.results || [],
  };
}

// GET /api/v1/marketplace/me/orders/:id — the seller's lines of one order,
// the delivery details and the order history.
marketplaceRoutes.get("/me/orders/:id", authMiddleware, async (c) => {
  const sellerId = await ownSellerId(c);
  if (!sellerId) return c.json(failure("NOT_SELLER", "Seller account required"), 403);
  const orderId = Number(c.req.param("id"));
  if (!Number.isInteger(orderId) || orderId <= 0) return c.json(failure("NOT_FOUND", "Order not found"), 404);
  const order = await loadSellerOrder(c.env.DB, sellerId, orderId);
  if (!order) return c.json(failure("NOT_FOUND", "Order not found"), 404);
  return c.json(success(order));
});

// GET /api/v1/marketplace/me/issues?status=active|all — returns and complaints
// on the seller's parts. "active" (default) = open, accepted, refused, escalated.
marketplaceRoutes.get("/me/issues", authMiddleware, async (c) => {
  const sellerId = await ownSellerId(c);
  if (!sellerId) return c.json(failure("NOT_SELLER", "Seller account required"), 403);
  const all = c.req.query("status") === "all";
  const rows = await c.env.DB.prepare(`
    select i.*, o.reference, oi.title as part_title, oi.subtotal, coalesce(u.name, 'Buyer') as buyer_name
    from order_issues i
    join orders o on o.id = i.order_id
    join order_items oi on oi.id = i.order_item_id
    left join users u on u.id = i.buyer_id
    where i.seller_id = ?1 ${all ? "" : "and i.status != 'closed'"}
    order by case i.status when 'open' then 0 when 'escalated' then 1 when 'accepted' then 2 when 'refused' then 3 else 4 end, i.created_at desc
    limit 200
  `).bind(sellerId).all<IssueRow>();
  const waiting = await c.env.DB.prepare(
    "select count(*) as n from order_issues where seller_id = ?1 and status = 'open'"
  ).bind(sellerId).first<{ n: number }>();
  return c.json(success({ items: (rows.results || []).map(publicIssue), waiting: Number(waiting?.n || 0) }));
});

async function sellerIssue(c: Parameters<typeof ownSellerId>[0] & { req: { param: (k: string) => string } }) {
  const sellerId = await ownSellerId(c);
  if (!sellerId) return { sellerId: null, issue: null };
  const issue = await loadIssue(c.env.DB, Number(c.req.param("id")));
  return { sellerId, issue: issue && issue.seller_id === sellerId ? issue : null };
}

// POST /api/v1/marketplace/me/issues/:id/respond { decision: accept|refuse, note }
marketplaceRoutes.post("/me/issues/:id/respond", authMiddleware, async (c) => {
  const { sellerId, issue } = await sellerIssue(c);
  if (!sellerId) return c.json(failure("NOT_SELLER", "Seller account required"), 403);
  if (!issue) return c.json(failure("NOT_FOUND", "Claim not found"), 404);
  if (issue.status !== "open") return c.json(failure("ALREADY_ANSWERED", "This claim was already answered"), 409);
  const body = await c.req.json<{ decision?: unknown; note?: unknown }>().catch(() => ({} as { decision?: unknown; note?: unknown }));
  const decision = String(body.decision || "");
  const note = cleanNote(body.note);
  if (decision !== "accept" && decision !== "refuse") {
    return c.json(failure("INVALID_DECISION", "Choose to accept or refuse the claim"), 400);
  }
  if (decision === "refuse" && !note) {
    return c.json(failure("NOTE_REQUIRED", "Explain to the buyer why you refuse"), 400);
  }
  const updated = await updateIssue(
    c.env.DB,
    issue,
    { status: decision === "accept" ? "accepted" : "refused", seller_note: note, seller_replied_at: nowText() },
    decision === "accept" ? "issue_accepted" : "issue_refused",
    `seller:${sellerId}`,
    note
  );
  return c.json(success(publicIssue(updated), { message: "Reply sent to the buyer" }));
});

// POST /api/v1/marketplace/me/issues/:id/resolve — the refund is done.
marketplaceRoutes.post("/me/issues/:id/resolve", authMiddleware, async (c) => {
  const { sellerId, issue } = await sellerIssue(c);
  if (!sellerId) return c.json(failure("NOT_SELLER", "Seller account required"), 403);
  if (!issue) return c.json(failure("NOT_FOUND", "Claim not found"), 404);
  if (issue.status !== "accepted") return c.json(failure("NOT_ACCEPTED", "Accept the claim before marking it refunded"), 409);
  const body = await c.req.json<{ note?: unknown }>().catch(() => ({} as { note?: unknown }));
  const updated = await updateIssue(
    c.env.DB, issue, { status: "closed", outcome: "buyer", closed_at: nowText() }, "issue_refunded", `seller:${sellerId}`, cleanNote(body.note)
  );
  return c.json(success(publicIssue(updated), { message: "Claim closed" }));
});

// PATCH /api/v1/marketplace/me/orders/:id/status { status, note? }
// Moves all of the seller's open lines of the order one step:
// pending → confirmed → shipped → delivered, or cancelled before shipping.
marketplaceRoutes.patch("/me/orders/:id/status", authMiddleware, async (c) => {
  const sellerId = await ownSellerId(c);
  if (!sellerId) return c.json(failure("NOT_SELLER", "Seller account required"), 403);
  const orderId = Number(c.req.param("id"));
  const body = await c.req.json<{ status?: unknown; note?: unknown }>().catch(() => ({} as { status?: unknown; note?: unknown }));
  const next = String(body.status || "") as LineStatus;
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 500) || null : null;

  const order = Number.isInteger(orderId) && orderId > 0 ? await loadSellerOrder(c.env.DB, sellerId, orderId) : null;
  if (!order) return c.json(failure("NOT_FOUND", "Order not found"), 404);
  if (!(order.next_statuses as string[]).includes(next)) {
    return c.json(failure("INVALID_STATUS", "This order cannot move to that status"), 409);
  }
  if (next === "cancelled" && !note) {
    return c.json(failure("NOTE_REQUIRED", "Tell the buyer why the order is cancelled"), 400);
  }

  const lineIds = order.items
    .filter((l) => l.status !== "cancelled" && l.status !== "delivered")
    .map((l) => l.id);
  const restocked = await setLineStatus(c.env.DB, lineIds, next);
  await logOrderEvent(c.env.DB, orderId, next, `seller:${sellerId}`, note);
  await refreshOrderStatus(c.env.DB, orderId);
  for (const partId of restocked) runInBackground(c, notifyBackInStock(c.env, partId));

  const updated = await loadSellerOrder(c.env.DB, sellerId, orderId);
  return c.json(success(updated, { message: "Order updated" }));
});

marketplaceRoutes.get("/me/reviews", authMiddleware, async (c) => {
  try {
    const sellerId = c.get("seller_id");

    if (!sellerId) {
      return c.json(failure("NOT_SELLER", "Seller account required"), 403);
    }

    const reviews = await c.env.DB.prepare(`
      select
        r.id,
        r.rating,
        null as comment,
        r.created_at,
        u.name as buyer_name,
        u.email as buyer_email,
        p.title as part_title
      from reviews r
      join users u on u.id = r.buyer_id
      join parts p on p.id = r.part_id
      where p.seller_id = ?1
      order by r.created_at desc
    `).bind(sellerId).all();

    return c.json(success(reviews.results || []));
  } catch (error) {
    return c.json(
      failure(
        "GET_SELLER_REVIEWS_FAILED",
        error instanceof Error ? error.message : "Unknown seller reviews error"
      ),
      500
    );
  }
});


async function getOwnedPartForSeller(
  DB: D1Database,
  sellerId: number,
  partId: number
) {
  return DB.prepare(
    `
    select id, seller_id, title
    from parts
    where id = ?1 and seller_id = ?2
    limit 1
    `
  )
    .bind(partId, sellerId)
    .first<{ id: number; seller_id: number; title: string }>();
}

marketplaceRoutes.get("/me/parts/:id/compatibility", authMiddleware, async (c) => {
  try {
    const sellerId = c.get("seller_id");
    const partId = Number(c.req.param("id"));

    if (!sellerId) {
      return c.json(failure("NOT_SELLER", "Seller account required"), 403);
    }

    if (Number.isNaN(partId)) {
      return c.json(failure("INVALID_ID", "Invalid part id"), 400);
    }

    const ownedPart = await getOwnedPartForSeller(c.env.DB, Number(sellerId), partId);

    if (!ownedPart) {
      return c.json(failure("PART_NOT_FOUND", "Part not found for this seller"), 404);
    }

    const result = await c.env.DB.prepare(
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
      .bind(partId)
      .all();

    return c.json(success(result.results || []));
  } catch (error) {
    return c.json(
      failure(
        "GET_COMPATIBILITY_FAILED",
        error instanceof Error ? error.message : "Unknown compatibility error"
      ),
      500
    );
  }
});

marketplaceRoutes.post("/me/parts/:id/compatibility", authMiddleware, async (c) => {
  try {
    const sellerId = c.get("seller_id");
    const partId = Number(c.req.param("id"));

    if (!sellerId) {
      return c.json(failure("NOT_SELLER", "Seller account required"), 403);
    }

    if (Number.isNaN(partId)) {
      return c.json(failure("INVALID_ID", "Invalid part id"), 400);
    }

    const ownedPart = await getOwnedPartForSeller(c.env.DB, Number(sellerId), partId);

    if (!ownedPart) {
      return c.json(failure("PART_NOT_FOUND", "Part not found for this seller"), 404);
    }

    const body = await c.req.json<Record<string, unknown>>();
    const make = String(body.make || "").trim();
    const model = String(body.model || "").trim();
    const yearStartRaw = body.year_start;
    const yearEndRaw = body.year_end;
    const engine = body.engine ? String(body.engine).trim() : null;
    const trim = body.trim ? String(body.trim).trim() : null;
    const notes = body.notes ? String(body.notes).trim() : null;

    const yearStart = yearStartRaw != null && yearStartRaw !== "" ? Number(yearStartRaw) : null;
    const yearEnd = yearEndRaw != null && yearEndRaw !== "" ? Number(yearEndRaw) : null;

    if (!make) {
      return c.json(failure("MAKE_REQUIRED", "make is required"), 400);
    }

    if (!model) {
      return c.json(failure("MODEL_REQUIRED", "model is required"), 400);
    }

    if (yearStart == null || Number.isNaN(yearStart)) {
      return c.json(failure("YEAR_START_REQUIRED", "year_start is required"), 400);
    }

    if (yearEnd != null && Number.isNaN(yearEnd)) {
      return c.json(failure("INVALID_YEAR_END", "year_end is invalid"), 400);
    }

    if (yearEnd != null && yearEnd < yearStart) {
      return c.json(failure("INVALID_YEAR_RANGE", "year_end must be greater than or equal to year_start"), 400);
    }

    const duplicate = await c.env.DB.prepare(
      `
      select id
      from part_compatibility
      where part_id = ?1
        and lower(make) = lower(?2)
        and lower(model) = lower(?3)
        and year_start = ?4
        and coalesce(year_end, -1) = coalesce(?5, -1)
      limit 1
      `
    )
      .bind(partId, make, model, yearStart, yearEnd)
      .first();

    if (duplicate) {
      return c.json(failure("COMPATIBILITY_EXISTS", "This compatibility row already exists"), 409);
    }

    const inserted = await c.env.DB.prepare(
      `
      insert into part_compatibility (
        part_id, make, model, year_start, year_end, engine, trim, notes
      ) values (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
      `
    )
      .bind(partId, make, model, yearStart, yearEnd, engine, trim, notes)
      .run();

    const compatibilityId = Number(inserted.meta.last_row_id);

    const created = await c.env.DB.prepare(
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
      where id = ?1
      limit 1
      `
    )
      .bind(compatibilityId)
      .first();

    return c.json(success(created, { message: "Compatibility added successfully" }), 201);
  } catch (error) {
    return c.json(
      failure(
        "ADD_COMPATIBILITY_FAILED",
        error instanceof Error ? error.message : "Unknown add compatibility error"
      ),
      500
    );
  }
});

marketplaceRoutes.delete("/me/parts/:id/compatibility/:compatibilityId", authMiddleware, async (c) => {
  try {
    const sellerId = c.get("seller_id");
    const partId = Number(c.req.param("id"));
    const compatibilityId = Number(c.req.param("compatibilityId"));

    if (!sellerId) {
      return c.json(failure("NOT_SELLER", "Seller account required"), 403);
    }

    if (Number.isNaN(partId) || Number.isNaN(compatibilityId)) {
      return c.json(failure("INVALID_ID", "Invalid id"), 400);
    }

    const ownedPart = await getOwnedPartForSeller(c.env.DB, Number(sellerId), partId);

    if (!ownedPart) {
      return c.json(failure("PART_NOT_FOUND", "Part not found for this seller"), 404);
    }

    const existing = await c.env.DB.prepare(
      `
      select id
      from part_compatibility
      where id = ?1 and part_id = ?2
      limit 1
      `
    )
      .bind(compatibilityId, partId)
      .first();

    if (!existing) {
      return c.json(failure("COMPATIBILITY_NOT_FOUND", "Compatibility row not found"), 404);
    }

    await c.env.DB.prepare(
      `
      delete from part_compatibility
      where id = ?1 and part_id = ?2
      `
    )
      .bind(compatibilityId, partId)
      .run();

    return c.json(success({ id: compatibilityId }, { message: "Compatibility deleted successfully" }));
  } catch (error) {
    return c.json(
      failure(
        "DELETE_COMPATIBILITY_FAILED",
        error instanceof Error ? error.message : "Unknown delete compatibility error"
      ),
      500
    );
  }
});
