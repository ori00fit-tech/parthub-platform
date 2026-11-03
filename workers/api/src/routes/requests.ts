// ============================================================
// Part requests — "Request a part"
//
// Buyer:  POST   /api/v1/requests                         create a request
//         GET    /api/v1/requests/mine                    list my requests
//         GET    /api/v1/requests/mine/:id                request + offers
//         POST   /api/v1/requests/mine/:id/accept/:offerId accept an offer
//         POST   /api/v1/requests/mine/:id/close          close without accepting
//
// Seller: GET    /api/v1/requests/inbox                   open requests (matched|all)
//         GET    /api/v1/requests/inbox/:id               one request + my offer
//         PUT    /api/v1/requests/inbox/:id/offer         create / update my offer
//         DELETE /api/v1/requests/inbox/:id/offer         withdraw my offer
//
// Privacy: the buyer's phone is only shown to the seller whose offer was
// accepted, and a seller's phone/WhatsApp only to the buyer who accepted it.
// ============================================================
import { Hono } from "hono";
import type { Context } from "hono";
import type { Env, HonoVariables } from "../types";
import { authMiddleware } from "../middlewares/auth";
import { sellerGuard } from "../middlewares/seller";
import { resolveActor } from "../utils/seller-actor";
import { runInBackground } from "../utils/whatsapp";
import {
  notifyBuyerOfNewOffer,
  notifySellerOfAcceptance,
  notifySellersOfNewRequest,
} from "../utils/request-notifications";

type AppEnv = { Bindings: Env; Variables: HonoVariables };
export const requestsRoutes = new Hono<AppEnv>();

const REQUEST_TTL_DAYS = 14;
const MAX_OPEN_REQUESTS_PER_BUYER = 5;
const MAX_REQUESTS_PER_BUYER_PER_DAY = 10;
const MAX_OFFER_PRICE_CENTS = 10_000_000; // 100,000.00
const CONDITION_PREFS = ["any", "new", "used"] as const;
const OFFER_CONDITIONS = ["new", "used", "refurbished"] as const;

// Same envelope the other routes use; carries both `ok` and `success`
// so the storefront and the seller-portal clients both understand it.
function okRes(c: Context<AppEnv>, data: unknown, status: 200 | 201 = 200) {
  return c.json({ ok: true, success: true, data, meta: null, error: null }, status);
}
function failRes(c: Context<AppEnv>, status: 400 | 403 | 404 | 409 | 429, code: string, message: string) {
  return c.json({ ok: false, success: false, data: null, meta: null, error: { code, message } }, status);
}

function cleanText(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function optionalInt(value: unknown): number | null | "invalid" {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isInteger(n) ? n : "invalid";
}

function isAllowedImageUrl(url: string): boolean {
  return url.startsWith("/api/v1/media/") || /^https:\/\/[^\s]+$/i.test(url);
}

function generateRequestReference(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return `RQ-${Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("")}`;
}

function parseId(raw: string | undefined): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

// Fields every viewer may see (no buyer identity or phone).
const PUBLIC_REQUEST_FIELDS = `
  r.id, r.reference, r.make, r.model, r.year, r.engine, r.vin, r.category_id,
  c.name as category_name, r.part_name, r.oem_number, r.description, r.image_url,
  r.condition_pref, r.city, r.status, r.expires_at, r.created_at,
  case when r.status = 'open' and r.expires_at <= datetime('now') then 1 else 0 end as is_expired
`;

// ── Buyer ────────────────────────────────────────────────────

requestsRoutes.post("/", authMiddleware, async (c) => {
  const buyerId = c.get("user_id");
  const body = await c.req.json<Record<string, unknown>>().catch(() => ({} as Record<string, unknown>));

  const make = cleanText(body.make, 60);
  const model = cleanText(body.model, 80);
  const partName = cleanText(body.part_name, 120);
  const city = cleanText(body.city, 80);
  const phone = cleanText(body.phone, 30);
  const engine = cleanText(body.engine, 60) || null;
  const oemNumber = cleanText(body.oem_number, 60) || null;
  const description = cleanText(body.description, 1000) || null;
  const vin = cleanText(body.vin, 17).toUpperCase() || null;
  const imageUrl = cleanText(body.image_url, 500) || null;
  const conditionPref = cleanText(body.condition_pref, 10) || "any";
  const year = optionalInt(body.year);
  const categoryId = optionalInt(body.category_id);

  if (!make) return failRes(c, 400, "MAKE_REQUIRED", "Vehicle make is required");
  if (!model) return failRes(c, 400, "MODEL_REQUIRED", "Vehicle model is required");
  if (!partName) return failRes(c, 400, "PART_REQUIRED", "Describe the part you need");
  if (!city) return failRes(c, 400, "CITY_REQUIRED", "City is required");
  if (!/^\+?[0-9 ()-]{6,30}$/.test(phone)) return failRes(c, 400, "PHONE_INVALID", "A valid phone number is required");

  const maxYear = new Date().getUTCFullYear() + 1;
  if (year === "invalid" || (year !== null && (year < 1950 || year > maxYear))) {
    return failRes(c, 400, "YEAR_INVALID", `Year must be between 1950 and ${maxYear}`);
  }
  if (vin && !/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) {
    return failRes(c, 400, "VIN_INVALID", "VIN must be 17 letters/digits (no I, O or Q)");
  }
  if (!(CONDITION_PREFS as readonly string[]).includes(conditionPref)) {
    return failRes(c, 400, "CONDITION_INVALID", "condition_pref must be any, new or used");
  }
  if (imageUrl && !isAllowedImageUrl(imageUrl)) {
    return failRes(c, 400, "IMAGE_INVALID", "Invalid image URL");
  }
  if (categoryId === "invalid") return failRes(c, 400, "CATEGORY_INVALID", "Invalid category");
  if (categoryId !== null) {
    const cat = await c.env.DB.prepare("select id from categories where id = ?1").bind(categoryId).first();
    if (!cat) return failRes(c, 400, "CATEGORY_INVALID", "Invalid category");
  }

  // Basic anti-spam limits.
  const limits = await c.env.DB.prepare(
    `select
       sum(case when status = 'open' and expires_at > datetime('now') then 1 else 0 end) as open_count,
       sum(case when created_at > datetime('now', '-1 day') then 1 else 0 end) as day_count
     from part_requests where buyer_id = ?1`
  )
    .bind(buyerId)
    .first<{ open_count: number | null; day_count: number | null }>();

  if ((limits?.open_count ?? 0) >= MAX_OPEN_REQUESTS_PER_BUYER) {
    return failRes(c, 429, "TOO_MANY_OPEN", `You can have at most ${MAX_OPEN_REQUESTS_PER_BUYER} open requests`);
  }
  if ((limits?.day_count ?? 0) >= MAX_REQUESTS_PER_BUYER_PER_DAY) {
    return failRes(c, 429, "DAILY_LIMIT", "Daily request limit reached, try again tomorrow");
  }

  const reference = generateRequestReference();
  await c.env.DB.prepare(
    `insert into part_requests (
       reference, buyer_id, make, model, year, engine, vin, category_id, part_name,
       oem_number, description, image_url, condition_pref, city, phone, expires_at
     ) values (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15,
       datetime('now', ?16))`
  )
    .bind(
      reference, buyerId, make, model, year, engine, vin, categoryId, partName,
      oemNumber, description, imageUrl, conditionPref, city, phone, `+${REQUEST_TTL_DAYS} days`
    )
    .run();

  const created = await c.env.DB.prepare(
    `select ${PUBLIC_REQUEST_FIELDS}, r.phone
     from part_requests r left join categories c on c.id = r.category_id
     where r.reference = ?1`
  )
    .bind(reference)
    .first<{ id: number }>();

  if (created) runInBackground(c, notifySellersOfNewRequest(c.env, created.id));

  return okRes(c, created, 201);
});

requestsRoutes.get("/mine", authMiddleware, async (c) => {
  const buyerId = c.get("user_id");
  const rows = await c.env.DB.prepare(
    `select ${PUBLIC_REQUEST_FIELDS},
       (select count(*) from request_offers o
         where o.request_id = r.id and o.status in ('pending','accepted')) as offer_count,
       (select min(o.price) from request_offers o
         where o.request_id = r.id and o.status in ('pending','accepted')) as best_price
     from part_requests r left join categories c on c.id = r.category_id
     where r.buyer_id = ?1
     order by r.created_at desc, r.id desc
     limit 100`
  )
    .bind(buyerId)
    .all();

  return okRes(c, rows.results || []);
});

requestsRoutes.get("/mine/:id", authMiddleware, async (c) => {
  const buyerId = c.get("user_id");
  const id = parseId(c.req.param("id"));
  if (!id) return failRes(c, 400, "INVALID_ID", "Invalid request id");

  const request = await c.env.DB.prepare(
    `select ${PUBLIC_REQUEST_FIELDS}, r.phone, r.accepted_offer_id
     from part_requests r left join categories c on c.id = r.category_id
     where r.id = ?1 and r.buyer_id = ?2`
  )
    .bind(id, buyerId)
    .first();
  if (!request) return failRes(c, 404, "NOT_FOUND", "Request not found");

  const offers = await c.env.DB.prepare(
    `select o.id, o.price, o.condition, o.warranty_months, o.delivery_days, o.note,
       o.image_url, o.status, o.created_at, o.updated_at,
       s.id as seller_id, s.name as seller_name, s.slug as seller_slug,
       s.location as seller_location, s.seller_type,
       case when o.status = 'accepted' then s.phone end as seller_phone,
       case when o.status = 'accepted' then s.whatsapp end as seller_whatsapp
     from request_offers o join sellers s on s.id = o.seller_id
     where o.request_id = ?1 and o.status != 'withdrawn'
     order by (o.status = 'accepted') desc, o.price asc, o.id asc`
  )
    .bind(id)
    .all();

  return okRes(c, { ...request, offers: offers.results || [] });
});

requestsRoutes.post("/mine/:id/accept/:offerId", authMiddleware, async (c) => {
  const buyerId = c.get("user_id");
  const id = parseId(c.req.param("id"));
  const offerId = parseId(c.req.param("offerId"));
  if (!id || !offerId) return failRes(c, 400, "INVALID_ID", "Invalid id");

  const request = await c.env.DB.prepare(
    `select id, status, expires_at > datetime('now') as active
     from part_requests where id = ?1 and buyer_id = ?2`
  )
    .bind(id, buyerId)
    .first<{ id: number; status: string; active: number }>();
  if (!request) return failRes(c, 404, "NOT_FOUND", "Request not found");
  if (request.status !== "open" || !request.active) {
    return failRes(c, 409, "REQUEST_NOT_OPEN", "This request is no longer open");
  }

  const offer = await c.env.DB.prepare(
    "select id from request_offers where id = ?1 and request_id = ?2 and status = 'pending'"
  )
    .bind(offerId, id)
    .first();
  if (!offer) return failRes(c, 404, "OFFER_NOT_FOUND", "Offer not found or no longer available");

  // One transaction: mark the request fulfilled (only if still open), accept the
  // chosen offer and reject the others. The status guards make a double accept a no-op.
  const db = c.env.DB;
  const [requestUpdate] = await db.batch([
    db.prepare(
      `update part_requests set status = 'fulfilled', accepted_offer_id = ?1, updated_at = datetime('now')
       where id = ?2 and status = 'open'`
    ).bind(offerId, id),
    db.prepare(
      `update request_offers set status = 'accepted', updated_at = datetime('now')
       where id = ?1 and request_id = ?2 and status = 'pending'
         and exists (select 1 from part_requests where id = ?2 and accepted_offer_id = ?1)`
    ).bind(offerId, id),
    db.prepare(
      `update request_offers set status = 'rejected', updated_at = datetime('now')
       where request_id = ?1 and id != ?2 and status = 'pending'
         and exists (select 1 from part_requests where id = ?1 and accepted_offer_id = ?2)`
    ).bind(id, offerId),
  ]);

  if (!requestUpdate?.meta?.changes) {
    return failRes(c, 409, "REQUEST_NOT_OPEN", "This request is no longer open");
  }

  const accepted = await c.env.DB.prepare(
    `select o.id, o.price, o.condition, o.warranty_months, o.delivery_days, o.note, o.status,
       s.id as seller_id, s.name as seller_name, s.slug as seller_slug, s.location as seller_location,
       s.phone as seller_phone, s.whatsapp as seller_whatsapp
     from request_offers o join sellers s on s.id = o.seller_id where o.id = ?1`
  )
    .bind(offerId)
    .first();

  runInBackground(c, notifySellerOfAcceptance(c.env, offerId));

  return okRes(c, accepted);
});

requestsRoutes.post("/mine/:id/close", authMiddleware, async (c) => {
  const buyerId = c.get("user_id");
  const id = parseId(c.req.param("id"));
  if (!id) return failRes(c, 400, "INVALID_ID", "Invalid request id");

  const db = c.env.DB;
  const [closed] = await db.batch([
    db.prepare(
      `update part_requests set status = 'closed', updated_at = datetime('now')
       where id = ?1 and buyer_id = ?2 and status = 'open'`
    ).bind(id, buyerId),
    db.prepare(
      `update request_offers set status = 'rejected', updated_at = datetime('now')
       where request_id = ?1 and status = 'pending'
         and exists (select 1 from part_requests where id = ?1 and buyer_id = ?2 and status = 'closed')`
    ).bind(id, buyerId),
  ]);

  if (!closed?.meta?.changes) return failRes(c, 404, "NOT_FOUND", "Open request not found");
  return okRes(c, { id, status: "closed" });
});

// ── Seller ───────────────────────────────────────────────────

async function requireSeller(c: Context<AppEnv>) {
  const actor = await resolveActor(c);
  if (!actor.ok) return { error: failRes(c, actor.status, actor.code, actor.message) };
  if (!actor.sellerId) {
    return { error: failRes(c, 403, "SELLER_REQUIRED", "A seller store is required to answer requests") };
  }
  return { sellerId: actor.sellerId };
}

// A request "matches" a seller when they list parts for the same make
// (via compatibility) or in the same category.
const MATCH_SQL = `(
  exists (
    select 1 from parts p join part_compatibility pc on pc.part_id = p.id
    where p.seller_id = ?1 and lower(pc.make) = lower(r.make)
  )
  or (r.category_id is not null and exists (
    select 1 from parts p where p.seller_id = ?1 and p.category_id = r.category_id
  ))
)`;

requestsRoutes.get("/inbox", authMiddleware, sellerGuard, async (c) => {
  const auth = await requireSeller(c);
  if ("error" in auth) return auth.error;

  const scope = c.req.query("scope") === "all" ? "all" : "matched";
  const city = cleanText(c.req.query("city"), 80);
  const q = cleanText(c.req.query("q"), 80);

  const where = [
    // Open & not expired, or anything this seller already offered on.
    `((r.status = 'open' and r.expires_at > datetime('now')) or mo.id is not null)`,
  ];
  const params: unknown[] = [auth.sellerId];

  if (scope === "matched") where.push(`(${MATCH_SQL} or mo.id is not null)`);
  if (city) {
    params.push(city);
    where.push(`lower(r.city) = lower(?${params.length})`);
  }
  if (q) {
    params.push(`%${q}%`);
    const i = params.length;
    where.push(`(r.part_name like ?${i} or r.make like ?${i} or r.model like ?${i} or r.oem_number like ?${i})`);
  }

  const rows = await c.env.DB.prepare(
    `select ${PUBLIC_REQUEST_FIELDS},
       ${MATCH_SQL} as is_match,
       (select count(*) from request_offers o
         where o.request_id = r.id and o.status in ('pending','accepted')) as offer_count,
       mo.id as my_offer_id, mo.price as my_offer_price, mo.status as my_offer_status
     from part_requests r
     left join categories c on c.id = r.category_id
     left join request_offers mo on mo.request_id = r.id and mo.seller_id = ?1
     where ${where.join(" and ")}
     order by (mo.id is null) desc, r.created_at desc, r.id desc
     limit 100`
  )
    .bind(...params)
    .all();

  return okRes(c, rows.results || []);
});

requestsRoutes.get("/inbox/:id", authMiddleware, sellerGuard, async (c) => {
  const auth = await requireSeller(c);
  if ("error" in auth) return auth.error;
  const id = parseId(c.req.param("id"));
  if (!id) return failRes(c, 400, "INVALID_ID", "Invalid request id");

  const row = await c.env.DB.prepare(
    `select ${PUBLIC_REQUEST_FIELDS},
       (select count(*) from request_offers o
         where o.request_id = r.id and o.status in ('pending','accepted')) as offer_count,
       case when mo.status = 'accepted' then r.phone end as buyer_phone,
       case when mo.status = 'accepted' then u.name end as buyer_name
     from part_requests r
     left join categories c on c.id = r.category_id
     left join request_offers mo on mo.request_id = r.id and mo.seller_id = ?2
     join users u on u.id = r.buyer_id
     where r.id = ?1
       and ((r.status = 'open' and r.expires_at > datetime('now')) or mo.id is not null)`
  )
    .bind(id, auth.sellerId)
    .first();
  if (!row) return failRes(c, 404, "NOT_FOUND", "Request not found");

  const myOffer = await c.env.DB.prepare(
    `select id, price, condition, warranty_months, delivery_days, note, image_url, status, created_at, updated_at
     from request_offers where request_id = ?1 and seller_id = ?2`
  )
    .bind(id, auth.sellerId)
    .first();

  return okRes(c, { ...row, my_offer: myOffer ?? null });
});

requestsRoutes.put("/inbox/:id/offer", authMiddleware, sellerGuard, async (c) => {
  const auth = await requireSeller(c);
  if ("error" in auth) return auth.error;
  const id = parseId(c.req.param("id"));
  if (!id) return failRes(c, 400, "INVALID_ID", "Invalid request id");

  const body = await c.req.json<Record<string, unknown>>().catch(() => ({} as Record<string, unknown>));
  const price = Number(body.price);
  const condition = cleanText(body.condition, 15);
  const warranty = optionalInt(body.warranty_months);
  const delivery = optionalInt(body.delivery_days);
  const note = cleanText(body.note, 500) || null;
  const imageUrl = cleanText(body.image_url, 500) || null;

  if (!Number.isInteger(price) || price <= 0 || price > MAX_OFFER_PRICE_CENTS) {
    return failRes(c, 400, "PRICE_INVALID", "Price must be a positive amount in cents");
  }
  if (!(OFFER_CONDITIONS as readonly string[]).includes(condition)) {
    return failRes(c, 400, "CONDITION_INVALID", "condition must be new, used or refurbished");
  }
  if (warranty === "invalid" || (warranty !== null && (warranty < 0 || warranty > 36))) {
    return failRes(c, 400, "WARRANTY_INVALID", "Warranty must be 0–36 months");
  }
  if (delivery === "invalid" || (delivery !== null && (delivery < 0 || delivery > 60))) {
    return failRes(c, 400, "DELIVERY_INVALID", "Delivery must be 0–60 days");
  }
  if (imageUrl && !isAllowedImageUrl(imageUrl)) {
    return failRes(c, 400, "IMAGE_INVALID", "Invalid image URL");
  }

  const request = await c.env.DB.prepare(
    `select id from part_requests
     where id = ?1 and status = 'open' and expires_at > datetime('now')`
  )
    .bind(id)
    .first();
  if (!request) return failRes(c, 409, "REQUEST_NOT_OPEN", "This request is no longer open");

  // Insert, or update an offer that is still pending / was withdrawn.
  // Accepted or rejected offers are final.
  const result = await c.env.DB.prepare(
    `insert into request_offers (request_id, seller_id, price, condition, warranty_months, delivery_days, note, image_url)
     values (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
     on conflict (request_id, seller_id) do update set
       price = excluded.price, condition = excluded.condition,
       warranty_months = excluded.warranty_months, delivery_days = excluded.delivery_days,
       note = excluded.note, image_url = excluded.image_url,
       status = 'pending', updated_at = datetime('now')
     where request_offers.status in ('pending','withdrawn')`
  )
    .bind(id, auth.sellerId, price, condition, warranty ?? 0, delivery, note, imageUrl)
    .run();

  if (!result.meta?.changes) {
    return failRes(c, 409, "OFFER_FINAL", "Your offer was already accepted or declined");
  }

  const offer = await c.env.DB.prepare(
    `select id, price, condition, warranty_months, delivery_days, note, image_url, status, created_at, updated_at
     from request_offers where request_id = ?1 and seller_id = ?2`
  )
    .bind(id, auth.sellerId)
    .first<{ id: number }>();

  // Deduplicated per offer: updates or re-offers after a withdrawal don't re-notify.
  if (offer) runInBackground(c, notifyBuyerOfNewOffer(c.env, offer.id));

  return okRes(c, offer);
});

requestsRoutes.delete("/inbox/:id/offer", authMiddleware, sellerGuard, async (c) => {
  const auth = await requireSeller(c);
  if ("error" in auth) return auth.error;
  const id = parseId(c.req.param("id"));
  if (!id) return failRes(c, 400, "INVALID_ID", "Invalid request id");

  const result = await c.env.DB.prepare(
    `update request_offers set status = 'withdrawn', updated_at = datetime('now')
     where request_id = ?1 and seller_id = ?2 and status = 'pending'`
  )
    .bind(id, auth.sellerId)
    .run();

  if (!result.meta?.changes) return failRes(c, 404, "OFFER_NOT_FOUND", "No pending offer to withdraw");
  return okRes(c, { request_id: id, status: "withdrawn" });
});
