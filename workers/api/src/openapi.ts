// ============================================================
// The API contract for the apps (OpenAPI 3.1): every route the storefront,
// the seller portal and the coming mobile apps use. Not the admin (web
// only) nor the webhooks (Meta, carriers). Served at GET /api/v1/openapi.json.
// test/openapi.test.mjs keeps it true: every route here exists in the API,
// every app route of the API is here, and real answers match the schemas.
// ============================================================
import { VERSION } from "./version";

type Schema = Record<string, unknown>;
const ref = (name: string): Schema => ({ $ref: `#/components/schemas/${name}` });
const arr = (items: Schema): Schema => ({ type: "array", items });
const nul = (s: Schema): Schema => ({ anyOf: [s, { type: "null" }] });
const str: Schema = { type: "string" };
const int: Schema = { type: "integer" };
const num: Schema = { type: "number" };
const bool: Schema = { type: "boolean" };
const flag: Schema = { type: "integer", enum: [0, 1] };
const obj = (properties: Record<string, Schema>, required: string[] = []): Schema => ({ type: "object", properties, required });
const anyObj: Schema = { type: "object" };

// ── Schemas ────────────────────────────────────────────────────────────
const schemas: Record<string, Schema> = {
  Error: {
    type: "object",
    description:
      "Every failure. `error` is the English message (the apps translate it, see packages/shared server-messages), or { code, message } on older routes.",
    properties: {
      success: { const: false },
      ok: { const: false },
      error: { anyOf: [str, obj({ code: str, message: str }, ["message"])] },
      request_id: { ...str, description: "Unexpected errors (500): quote it to support; it is in the Worker logs." },
    },
    required: ["success", "ok", "error"],
  },
  Pagination: obj({ page: int, limit: int, total: int, total_pages: int, has_next: bool, has_prev: bool }, ["page", "limit", "total"]),
  User: obj(
    { id: int, name: str, email: str, phone: nul(str), role: { enum: ["buyer", "seller", "admin"] }, avatar_url: nul(str), created_at: str, seller_id: nul(int) },
    ["id", "name", "email", "role"]
  ),
  Session: obj(
    {
      access_token: { ...str, description: "JWT. Send as Authorization: Bearer. Sites: 7 days. Apps (client: app): 15 minutes, then POST /auth/refresh." },
      expires_in: { ...int, description: "Seconds the access token lives." },
      session_id: { ...str, description: "This device (GET /auth/sessions)." },
      refresh_token: { ...str, description: "Apps only, 60 days, changes at every refresh: keep only the newest (secure storage). Using an old one ends the session." },
      refresh_expires_at: str,
      password_weak: { ...bool, description: "The password would be refused today: ask the person to change it." },
      deletion_cancelled: { ...bool, description: "Signing in cancelled a pending account deletion." },
      user: ref("User"),
    },
    ["access_token", "user"]
  ),
  Message: obj({ message: str }, []),
  Category: obj({ id: int, name: str, slug: str }, ["id", "name", "slug"]),
  Make: obj({ id: int, name: str, slug: str }, ["id", "name"]),
  PartCard: obj(
    {
      id: int, slug: str, title: str, description: nul(str), sku: nul(str),
      price: { ...int, description: "Centimes (MAD × 100)." }, compare_price: nul(int),
      condition: { enum: ["new", "used", "refurbished"] }, quantity: int, status: str,
      brand_name: nul(str), category_name: nul(str), category_slug: nul(str),
      seller_name: str, seller_slug: str, seller_location: nul(str), image_url: nul(str), compatibility_count: int,
    },
    ["id", "slug", "title", "price", "condition", "quantity", "seller_name"]
  ),
  PartImage: obj({ id: int, url: str, alt_text: nul(str), sort_order: int, is_featured: flag }, ["id", "url"]),
  Compatibility: obj(
    { id: int, make: str, model: str, year_start: nul(int), year_end: nul(int), engine: nul(str), generation_id: nul(int), engine_id: nul(int), engine_scope: str },
    ["make", "model"]
  ),
  PartDetail: {
    allOf: [
      ref("PartCard"),
      obj(
        {
          seller_id: int, can_deliver: flag, can_pickup: flag, images: arr(ref("PartImage")), compatibility: arr(ref("Compatibility")),
          specs: arr(anyObj), part_numbers: arr(anyObj), related_parts: arr(anyObj), other_offers: arr(anyObj), reviews: arr(anyObj),
          rating: obj({ count: int, average: nul(num) }), fitment_notes: arr(str),
        },
        ["images", "compatibility"]
      ),
    ],
  },
  Order: obj(
    {
      id: int, reference: { ...str, description: "PH-YYYY-XXXXXXXX: what the buyer quotes." },
      status: { enum: ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"] },
      payment_status: str, shipping_status: str,
      subtotal: int, shipping_fee: int, discount: int, total: { ...int, description: "Centimes, paid cash on delivery." },
      notes: nul(str), delivered_at: nul(str), created_at: str, updated_at: str,
    },
    ["id", "reference", "status", "total", "created_at"]
  ),
  OrderItem: obj(
    {
      id: int, part_id: int, seller_id: int, title: str, price: int, quantity: int, subtotal: int, status: str,
      fulfillment: { enum: ["delivery", "pickup", "courier"] }, pickup_code: nul(str), pickup_until: nul(str),
      delivered_at: nul(str), can_report: bool, report_until: nul(str), issue: nul(anyObj),
    },
    ["id", "part_id", "title", "price", "quantity", "status", "fulfillment"]
  ),
  Shipment: obj(
    {
      id: int, seller_id: int, seller_name: str, method: str, fee: int, carrier: nul(str), carrier_name: nul(str),
      tracking_number: nul(str), tracking_url: nul(str), shipment_status: nul(str), attempts: int, amount_due: int, events: arr(anyObj),
    },
    ["id", "seller_id", "method", "fee"]
  ),
  OrderDetail: {
    allOf: [
      ref("Order"),
      obj(
        {
          items: arr(ref("OrderItem")),
          shipping_address: nul(obj({ full_name: str, phone: str, address_line1: str, city: str, country: str }, ["full_name"])),
          shipments: arr(ref("Shipment")), events: arr(anyObj), pickups: arr(anyObj),
        },
        ["items", "shipments"]
      ),
    ],
  },
  NewOrder: obj(
    {
      items: arr(obj({ part_id: int, quantity: { type: "integer", minimum: 1 } }, ["part_id", "quantity"])),
      shipping_address: obj(
        { full_name: str, phone: str, address_line1: str, address_line2: nul(str), city: str, state: nul(str), postal_code: nul(str), country: str },
        ["full_name", "phone"]
      ),
      fulfillment: { type: "object", description: "seller_id → { method: delivery|pickup|courier, collector_name?, collector_phone? }", additionalProperties: anyObj },
      notes: str,
    },
    ["items", "shipping_address"]
  ),
  SellerOrderSummary: obj(
    { id: int, reference: str, status: str, payment_status: str, created_at: str, buyer_name: str, total: int, item_count: int },
    ["id", "reference", "status", "total"]
  ),
  SellerOrder: obj(
    {
      id: int, reference: str, status: str, order_status: str, created_at: str, buyer_name: str, buyer_phone: str, buyer_city: str,
      items: arr(anyObj), shipment: nul(anyObj), shipment_events: arr(anyObj), events: arr(anyObj), issues: arr(anyObj),
      next_statuses: arr(str), fulfillment: str, amount_to_collect: int, total: int,
    },
    ["id", "reference", "status", "items", "next_statuses"]
  ),
  SellerPart: obj(
    {
      id: int, slug: str, title: str, price: int, quantity: int, status: { enum: ["draft", "pending", "active", "rejected", "archived"] },
      moderation_note: nul(str), image_url: nul(str), category_name: nul(str), created_at: str,
    },
    ["id", "title", "price", "quantity", "status"]
  ),
  FulfillmentOptions: obj(
    {
      flat_fee: int,
      groups: arr(obj({ seller_id: int, seller_name: str, methods: arr(str), delivery_fee: int, part_ids: arr(int), pickup: nul(anyObj) }, ["seller_id", "methods"])),
    },
    ["groups"]
  ),
};

// ── Operations ─────────────────────────────────────────────────────────
type Op = {
  tag: string;
  summary: string;
  auth?: boolean;
  body?: Schema | "multipart";
  data?: Schema; // the `data` of a success
  paginated?: boolean;
  status?: number;
  query?: string[];
};

// Path as in the API (":id") → OpenAPI ("{id}").
const P: Record<string, Partial<Record<"get" | "post" | "put" | "patch" | "delete", Op>>> = {
  "/api/v1/health": { get: { tag: "System", summary: "Status, version and database check", data: obj({ status: str, version: str, database: anyObj }, ["status", "version"]) } },
  "/api/v1/openapi.json": { get: { tag: "System", summary: "This contract" } },

  // Accounts
  "/api/v1/auth/register": { post: { tag: "Account", summary: "Create a buyer (or seller) account", status: 201, body: obj({ name: str, email: str, password: str, phone: str, role: { enum: ["buyer", "seller"] }, accept_terms: { const: true } }, ["name", "email", "password", "accept_terms"]), data: anyObj } },
  "/api/v1/auth/login": { post: { tag: "Account", summary: "Sign in. Apps send client: app (and the device's name and platform) to get a refresh token.", body: obj({ email: str, password: str, client: { enum: ["web", "app"] }, device_name: str, platform: { enum: ["android", "ios", "web", "other"] } }, ["email", "password"]), data: ref("Session") } },
  "/api/v1/auth/refresh": { post: { tag: "Account", summary: "Apps: a new access token and a new refresh token (the old one stops working)", body: obj({ refresh_token: str }, ["refresh_token"]), data: obj({ access_token: str, expires_in: int, refresh_token: str, refresh_expires_at: str, session_id: str }, ["access_token", "refresh_token"]) } },
  "/api/v1/auth/sessions": { get: { tag: "Account", summary: "My devices (current: true for this one)", auth: true, data: arr(obj({ id: str, client: { enum: ["web", "app"] }, device_name: nul(str), platform: nul(str), created_at: str, last_used_at: str, expires_at: str, current: bool }, ["id", "client", "current"])) } },
  "/api/v1/auth/sessions/:id": { delete: { tag: "Account", summary: "Sign one device out, at once", auth: true, data: ref("Message") } },
  "/api/v1/auth/me": { get: { tag: "Account", summary: "The signed-in account", auth: true, data: ref("User") } },
  "/api/v1/auth/logout": { post: { tag: "Account", summary: "Sign this device out; { everywhere: true } signs out every device", auth: true, body: obj({ everywhere: bool }), data: ref("Message") } },
  "/api/v1/auth/password": { post: { tag: "Account", summary: "Change the password (other devices signed out; returns a new token)", auth: true, body: obj({ current_password: str, new_password: str }, ["current_password", "new_password"]), data: obj({ access_token: str, message: str }, ["access_token"]) } },
  "/api/v1/auth/forgot": { post: { tag: "Account", summary: "Forgot password: a 6-digit code on WhatsApp (same answer whether the account exists)", body: obj({ identifier: { ...str, description: "E-mail or phone" } }, ["identifier"]), data: ref("Message") } },
  "/api/v1/auth/reset": { post: { tag: "Account", summary: "New password with the WhatsApp code", body: obj({ identifier: str, code: str, new_password: str }, ["identifier", "code", "new_password"]), data: obj({ email: str, message: str }) } },
  "/api/v1/auth/reset-link": { post: { tag: "Account", summary: "New password with a one-time link sent by PartHub", body: obj({ token: str, new_password: str }, ["token", "new_password"]), data: obj({ email: str, message: str }) } },
  "/api/v1/auth/delete-account": {
    get: { tag: "Account", summary: "Can this account be deleted now, and what blocks it", auth: true, data: obj({ grace_days: int, can_delete: bool, blockers: arr(obj({ code: str, message: str })) }, ["can_delete"]) },
    post: { tag: "Account", summary: "Delete the account (30 days to change one's mind: signing in cancels it)", auth: true, body: obj({ password: str, reason: str }, ["password"]), data: obj({ grace_days: int, message: str }) },
  },

  // Catalog
  "/api/v1/catalog/categories": { get: { tag: "Catalog", summary: "Part categories", data: arr(ref("Category")) } },
  "/api/v1/catalog/brands": { get: { tag: "Catalog", summary: "Part brands", data: arr(anyObj) } },
  "/api/v1/catalog/parts": { get: { tag: "Catalog", summary: "Parts on sale (filters: category, brand, make, model, year, q…)", query: ["page", "limit", "category", "brand", "make", "model", "year", "q", "sort"], data: arr(ref("PartCard")) } },
  "/api/v1/catalog/parts/:slug": { get: { tag: "Catalog", summary: "One part: photos, compatibility, part numbers, reviews, other offers", data: ref("PartDetail") } },
  "/api/v1/catalog/landing": { get: { tag: "Catalog", summary: "Data of a landing page (category / make / model)", data: anyObj } },
  "/api/v1/catalog/sitemap": { get: { tag: "Catalog", summary: "Addresses for the sitemap", data: anyObj } },
  "/api/v1/search": { get: { tag: "Catalog", summary: "Search by text, part number or vehicle, ranked", query: ["q", "make", "model", "year", "category", "brand", "condition", "min_price", "max_price", "sort", "page", "limit"], data: arr(ref("PartCard")) } },
  "/api/v1/search/suggestions": { get: { tag: "Catalog", summary: "Suggestions while typing", query: ["q"], data: anyObj } },
  "/api/v1/storefront/sellers/:slug": { get: { tag: "Catalog", summary: "A store's public page", data: anyObj } },
  "/api/v1/carriers": { get: { tag: "Catalog", summary: "Delivery companies sellers can choose", data: arr(anyObj) } },

  // Vehicles
  "/api/v1/vehicles/makes": { get: { tag: "Vehicles", summary: "Makes", data: arr(ref("Make")) } },
  "/api/v1/vehicles/models": { get: { tag: "Vehicles", summary: "Models of a make", query: ["make"], data: arr(anyObj) } },
  "/api/v1/vehicles/years": { get: { tag: "Vehicles", summary: "Years of a model", query: ["make", "model"], data: arr(anyObj) } },
  "/api/v1/vehicles/generations": { get: { tag: "Vehicles", summary: "Generations of a model", query: ["make", "model"], data: arr(anyObj) } },
  "/api/v1/vehicles/engines": { get: { tag: "Vehicles", summary: "Engines of a generation", query: ["generation_id"], data: arr(anyObj) } },
  "/api/v1/vehicles/engines-for": { get: { tag: "Vehicles", summary: "Engines of make / model / year", query: ["make", "model", "year"], data: arr(anyObj) } },

  // Buying
  "/api/v1/commerce/shipping": { get: { tag: "Buying", summary: "Delivery fee rules", data: anyObj } },
  "/api/v1/commerce/fulfillment-options": { get: { tag: "Buying", summary: "How each seller of a cart can deliver (delivery, pickup, courier) and the fees", query: ["parts", "city"], data: ref("FulfillmentOptions") } },
  "/api/v1/commerce/orders": {
    get: { tag: "Buying", summary: "My orders", auth: true, data: arr(ref("Order")) },
    post: { tag: "Buying", summary: "Place an order (cash on delivery). Send Idempotency-Key: a retry returns the same order (200).", auth: true, status: 201, body: ref("NewOrder"), data: ref("Order") },
  },
  "/api/v1/commerce/orders/:reference": { get: { tag: "Buying", summary: "One of my orders: lines, shipments, history, pickup codes", auth: true, data: ref("OrderDetail") } },
  "/api/v1/commerce/orders/:reference/received": { post: { tag: "Buying", summary: "I received the parts", auth: true, data: anyObj } },
  "/api/v1/commerce/orders/:reference/issues": { post: { tag: "Buying", summary: "Report a problem with a delivered part (7 days)", auth: true, status: 201, body: obj({ order_item_id: int, reason: str, details: str }, ["order_item_id", "reason", "details"]), data: anyObj } },
  "/api/v1/commerce/issues/:id/escalate": { post: { tag: "Buying", summary: "Ask PartHub to decide a claim", auth: true, data: anyObj } },
  "/api/v1/commerce/issues/:id/withdraw": { post: { tag: "Buying", summary: "Withdraw a claim", auth: true, data: anyObj } },
  "/api/v1/commerce/reviews": { post: { tag: "Buying", summary: "Review a delivered part", auth: true, status: 201, body: obj({ order_item_id: int, rating: { type: "integer", minimum: 1, maximum: 5 }, body: str }, ["order_item_id", "rating"]), data: anyObj } },
  "/api/v1/stock-alerts": { post: { tag: "Buying", summary: "Tell me when a part is back in stock", auth: true, body: obj({ part_id: int }, ["part_id"]), data: anyObj } },
  "/api/v1/stock-alerts/mine": { get: { tag: "Buying", summary: "My back-in-stock alerts", auth: true, data: arr(anyObj) } },
  "/api/v1/stock-alerts/:partId": { delete: { tag: "Buying", summary: "Stop an alert", auth: true, data: anyObj } },

  // Part requests
  "/api/v1/requests": { post: { tag: "Requests", summary: "Ask sellers for a part", auth: true, status: 201, body: anyObj, data: anyObj } },
  "/api/v1/requests/images": { post: { tag: "Requests", summary: "Upload a photo for a request", auth: true, body: "multipart", data: anyObj } },
  "/api/v1/requests/mine": { get: { tag: "Requests", summary: "My requests", auth: true, data: arr(anyObj) } },
  "/api/v1/requests/mine/:id": { get: { tag: "Requests", summary: "One request and its offers", auth: true, data: anyObj } },
  "/api/v1/requests/mine/:id/accept/:offerId": { post: { tag: "Requests", summary: "Accept an offer", auth: true, data: anyObj } },
  "/api/v1/requests/mine/:id/close": { post: { tag: "Requests", summary: "Close a request", auth: true, data: anyObj } },
  "/api/v1/requests/inbox": { get: { tag: "Requests", summary: "Seller: requests matching my store", auth: true, data: arr(anyObj) } },
  "/api/v1/requests/inbox/:id": { get: { tag: "Requests", summary: "Seller: one request", auth: true, data: anyObj } },
  "/api/v1/requests/inbox/:id/offer": {
    put: { tag: "Requests", summary: "Seller: make or change my offer", auth: true, body: anyObj, data: anyObj },
    delete: { tag: "Requests", summary: "Seller: withdraw my offer", auth: true, data: anyObj },
  },

  // Media
  "/api/v1/media/upload": { post: { tag: "Media", summary: "Upload a photo (JPEG, PNG, WebP; 5 MB): returns its URL", auth: true, body: "multipart", data: obj({ key: str, url: str }, ["url"]) } },
  "/api/v1/media/*": { get: { tag: "Media", summary: "A stored photo (path from the upload)" } },

  // Selling
  "/api/v1/marketplace/health": { get: { tag: "Selling", summary: "Seller API status" } },
  "/api/v1/marketplace/onboarding": {
    post: { tag: "Selling", summary: "Create my store", auth: true, body: anyObj, data: anyObj },
    put: { tag: "Selling", summary: "Update my store", auth: true, body: anyObj, data: anyObj },
  },
  "/api/v1/marketplace/me": { get: { tag: "Selling", summary: "My store", auth: true, data: anyObj } },
  "/api/v1/marketplace/me/agreement": { post: { tag: "Selling", summary: "Accept the seller agreement", auth: true, data: anyObj } },
  "/api/v1/marketplace/me/readiness": { get: { tag: "Selling", summary: "What my store still needs to sell", auth: true, data: anyObj } },
  "/api/v1/marketplace/me/fulfillment": { put: { tag: "Selling", summary: "Delivery / pickup settings and fees", auth: true, body: anyObj, data: anyObj } },
  "/api/v1/marketplace/dashboard": { get: { tag: "Selling", summary: "Dashboard numbers", auth: true, data: anyObj } },
  "/api/v1/marketplace/me/insights": { get: { tag: "Selling", summary: "Views and searches", auth: true, data: anyObj } },
  "/api/v1/marketplace/me/statement": { get: { tag: "Selling", summary: "Sales and commissions of a month", auth: true, data: anyObj } },
  "/api/v1/marketplace/me/invoices": { get: { tag: "Selling", summary: "PartHub's commission invoices", auth: true, data: anyObj } },
  "/api/v1/marketplace/me/reviews": { get: { tag: "Selling", summary: "Reviews of my parts", auth: true, data: arr(anyObj) } },
  "/api/v1/marketplace/me/catalog-suggestions": {
    get: { tag: "Selling", summary: "My catalog suggestions", auth: true, data: arr(anyObj) },
    post: { tag: "Selling", summary: "Suggest a vehicle or brand missing from the catalog", auth: true, body: anyObj, data: anyObj },
  },
  "/api/v1/marketplace/me/parts": {
    get: { tag: "Selling", summary: "My parts (every status)", auth: true, data: arr(ref("SellerPart")) },
    post: { tag: "Selling", summary: "Create a part from the guided form (goes to review)", auth: true, status: 201, body: anyObj, data: anyObj },
  },
  "/api/v1/marketplace/me/parts/import": { post: { tag: "Selling", summary: "Import parts from a CSV (preview, then apply)", auth: true, body: anyObj, data: anyObj } },
  "/api/v1/marketplace/me/parts/:id": {
    get: { tag: "Selling", summary: "One of my parts", auth: true, data: anyObj },
    put: { tag: "Selling", summary: "Edit one of my parts", auth: true, body: anyObj, data: anyObj },
  },
  "/api/v1/marketplace/me/parts/:id/compatibility": {
    get: { tag: "Selling", summary: "Vehicles a part fits", auth: true, data: arr(ref("Compatibility")) },
    post: { tag: "Selling", summary: "Add a vehicle", auth: true, body: anyObj, data: anyObj },
  },
  "/api/v1/marketplace/me/parts/:id/compatibility/:compatibilityId": { delete: { tag: "Selling", summary: "Remove a vehicle", auth: true, data: anyObj } },
  "/api/v1/marketplace/me/parts/:id/numbers": {
    get: { tag: "Selling", summary: "Part numbers (OEM / aftermarket)", auth: true, data: anyObj },
    put: { tag: "Selling", summary: "Set part numbers", auth: true, body: anyObj, data: anyObj },
  },
  "/api/v1/marketplace/me/parts/:id/fulfillment": { put: { tag: "Selling", summary: "Delivery available for this part", auth: true, body: anyObj, data: anyObj } },
  "/api/v1/marketplace/parts": { post: { tag: "Selling", summary: "Create a part (goes to review)", auth: true, status: 201, body: anyObj, data: anyObj } },
  "/api/v1/marketplace/parts/:id": {
    get: { tag: "Selling", summary: "A part (seller view)", auth: true, data: anyObj },
    put: { tag: "Selling", summary: "Edit a part", auth: true, body: anyObj, data: anyObj },
  },
  "/api/v1/marketplace/parts/:id/images": {
    get: { tag: "Selling", summary: "Photos of a part", auth: true, data: arr(ref("PartImage")) },
    post: { tag: "Selling", summary: "Add a photo (URL from /media/upload)", auth: true, body: obj({ url: str, sort_order: int, is_featured: bool }, ["url"]), data: anyObj },
  },
  "/api/v1/marketplace/parts/:id/images/:imageId": { delete: { tag: "Selling", summary: "Remove a photo", auth: true, data: anyObj } },
  "/api/v1/marketplace/parts/:id/images/:imageId/feature": { put: { tag: "Selling", summary: "Make a photo the main one", auth: true, data: anyObj } },
  "/api/v1/marketplace/me/orders": { get: { tag: "Selling", summary: "Orders of my store", auth: true, data: arr(ref("SellerOrderSummary")) } },
  "/api/v1/marketplace/me/orders/:id": { get: { tag: "Selling", summary: "One order (my lines): buyer, address, shipment, what I can do next", auth: true, data: ref("SellerOrder") } },
  "/api/v1/marketplace/me/orders/:id/status": { patch: { tag: "Selling", summary: "Confirm, ship (carrier, tracking), deliver (pickup: the buyer's code), or cancel (reason)", auth: true, body: obj({ status: { enum: ["confirmed", "shipped", "delivered", "cancelled"] }, note: str, code: str, carrier: str, tracking_number: str }, ["status"]), data: ref("SellerOrder") } },
  "/api/v1/marketplace/me/orders/:id/shipment": { post: { tag: "Selling", summary: "Record what the carrier says (no webhook): picked up … returned", auth: true, body: obj({ status: { enum: ["picked_up", "in_transit", "out_for_delivery", "failed_attempt", "returning", "returned"] }, note: str }, ["status"]), data: ref("SellerOrder") } },
  "/api/v1/marketplace/me/issues": { get: { tag: "Selling", summary: "Claims on my orders", auth: true, data: arr(anyObj) } },
  "/api/v1/marketplace/me/issues/:id/respond": { post: { tag: "Selling", summary: "Accept or refuse a claim", auth: true, body: obj({ decision: { enum: ["accept", "refuse"] }, note: str }, ["decision"]), data: anyObj } },
  "/api/v1/marketplace/me/issues/:id/resolve": { post: { tag: "Selling", summary: "The refund is done (whole or partial)", auth: true, body: obj({ note: str, refund_amount: num }), data: anyObj } },
};

const json = (schema: Schema) => ({ "application/json": { schema } });

function operation(method: string, path: string, op: Op) {
  const params = [...path.matchAll(/:([A-Za-z]+)/g)].map((m) => ({ name: m[1], in: "path", required: true, schema: str }));
  if (path.endsWith("/*")) params.push({ name: "path", in: "path", required: true, schema: str });
  for (const q of op.query || []) params.push({ name: q, in: "query", required: false, schema: str } as never);
  const success: Schema = {
    type: "object",
    properties: {
      success: { const: true }, ok: { const: true },
      ...(op.data ? { data: op.data } : {}),
      meta: {}, pagination: ref("Pagination"),
    },
    required: ["success", "ok"],
  };
  const id = `${method}_${path.replace(/^\/api\/v1\//, "").replace(/[/:*.-]+/g, "_").replace(/_+$/, "")}`;
  return {
    operationId: id,
    tags: [op.tag],
    summary: op.summary,
    ...(op.auth ? { security: [{ bearer: [] }] } : {}),
    ...(params.length ? { parameters: params } : {}),
    ...(op.body
      ? { requestBody: { required: true, content: op.body === "multipart" ? { "multipart/form-data": { schema: obj({ file: { type: "string", format: "binary" } }, ["file"]) } } : json(op.body) } }
      : {}),
    responses: {
      [String(op.status || 200)]: { description: "Success", content: json(success) },
      default: { description: "Failure (400 invalid, 401 not signed in, 403 not allowed, 404, 409 state, 429 too many, 500)", content: json(ref("Error")) },
    },
  };
}

export function openApiSpec() {
  const paths: Record<string, Record<string, unknown>> = {};
  for (const [path, ops] of Object.entries(P)) {
    const oa = path.replace(/:([A-Za-z]+)/g, "{$1}").replace(/\/\*$/, "/{path}");
    paths[oa] = Object.fromEntries(Object.entries(ops).map(([m, op]) => [m, operation(m, path, op as Op)]));
  }
  return {
    openapi: "3.1.0",
    info: {
      title: "PartHub API",
      version: VERSION,
      description:
        "The API of the PartHub sites and apps (Morocco, cash on delivery). Every answer is JSON with `success` and `ok` (same value); data in `data`, sometimes `meta` / `pagination`. Money in centimes (MAD × 100). Send `X-PartHub-Lang: ar|fr|en` with signed-in calls (WhatsApp messages use it). Error messages are English, translated by the apps. Admin and webhook routes are not part of this contract.",
    },
    servers: [{ url: "https://api.parthub.autos" }],
    components: {
      securitySchemes: { bearer: { type: "http", scheme: "bearer", bearerFormat: "JWT" } },
      schemas,
    },
    paths,
  };
}

// The API routes this contract covers, as "METHOD /path" with ":params".
export const CONTRACT_ROUTES = Object.entries(P).flatMap(([path, ops]) => Object.keys(ops).map((m) => `${m.toUpperCase()} ${path}`));
