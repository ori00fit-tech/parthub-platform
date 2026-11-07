const ROOT = new URL("../../../", import.meta.url).pathname; // repository root
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import app from "./.build/app.mjs";
import { signToken, verifyToken } from "./.build/auth.mjs";

const sql = new DatabaseSync(":memory:");
sql.exec(readFileSync(ROOT + "infra/d1/schema.sql", "utf8"));
const stmt = (q) => { let a = []; const s = { bind(...x) { a = x; return s; }, async first() { return sql.prepare(q).get(...a) ?? null; }, async all() { return { results: sql.prepare(q).all(...a) }; }, async run() { const r = sql.prepare(q).run(...a); return { meta: { last_row_id: Number(r.lastInsertRowid), changes: r.changes } }; }, _exec() { const r = sql.prepare(q).run(...a); return { meta: { changes: r.changes } }; } }; return s; };
const DB = { prepare: stmt, async batch(l) { sql.exec("BEGIN"); try { const o = l.map((s) => s._exec()); sql.exec("COMMIT"); return o; } catch (e) { sql.exec("ROLLBACK"); throw e; } } };
const env = { DB, JWT_SECRET: "s" };
const results = {};
const check = (n, c, x = "") => { results[n] = c ? "PASS" : `FAIL ${JSON.stringify(x)}`; };
const call = async (m, u, tok, body) => {
  const r = await app.request(u, { method: m, headers: { "Content-Type": "application/json", ...(tok ? { Authorization: `Bearer ${tok}` } : {}) }, body: body ? JSON.stringify(body) : undefined }, env);
  return [r.status, await r.json()];
};
const statusOf = async (tok) => (await call("GET", "/api/v1/marketplace/me/readiness", tok))[1].data;

sql.exec(`
  INSERT INTO users (id,name,email,password_hash,role) VALUES (1,'Youssef','y@x','x','seller'),(2,'Buyer','b@x','x','buyer'),(9,'Admin','a@x','x','admin');
  INSERT INTO categories (id,name,slug) VALUES (1,'Brakes','brakes');
`);
const sellerNoStore = await signToken({ user_id: 1, role: "seller" }, "s");
const buyer = await signToken({ user_id: 2, role: "buyer" }, "s");

// Buyers can't read readiness.
let [st] = await call("GET", "/api/v1/marketplace/me/readiness", buyer);
check("buyer_forbidden", st === 403, st);

// 1. Seller account, no store yet.
let r = await statusOf(sellerNoStore);
check("no_store", r.status === "no_store" && r.seller === null && r.access_token === null && r.items.every((i) => !i.done), r);
check("items_have_actions", r.items.length === 8 && r.items.every((i) => i.action && i.action.to.startsWith("/")), r.items.map((i) => i.id));

// 2. Create store: validation.
[st] = await call("POST", "/api/v1/marketplace/onboarding", sellerNoStore, { display_name: "Casse Casa", slug: "Casse Casa", city: "Casablanca", accept_agreement: true });
check("slug_validated", st === 400, st);
[st] = await call("POST", "/api/v1/marketplace/onboarding", sellerNoStore, { display_name: "Casse Casa", slug: "casse-casa", city: "Casablanca", logo_url: "javascript:alert(1)", accept_agreement: true });
check("logo_validated", st === 400, st);

// Create store → fresh token with seller_id.
let body;
[st, body] = await call("POST", "/api/v1/marketplace/onboarding", sellerNoStore, { display_name: "Casse Casa", slug: "casse-casa", city: "Casablanca", accept_agreement: true });
const fresh = body.data?.access_token;
const payload = fresh ? await verifyToken(fresh, "s") : {};
check("store_created_with_token", st === 201 && payload.seller_id === body.data.id && payload.role === "seller", [st, payload]);
check("starts_pending", body.data.status === "pending", body.data.status);

// A token issued before the store existed keeps working: the store comes
// from the account on each request, so no new token is needed.
r = await statusOf(sellerNoStore);
check("old_token_sees_store", r.seller?.id === body.data.id && r.access_token == null, r);
r = await statusOf(fresh);
check("fresh_token_no_refresh", r.access_token === null, r.access_token);
check("setup_after_create", r.status === "setup" && r.items.find((i) => i.id === "store").done && !r.items.find((i) => i.id === "contact").done, r.items);

// 3. Update store: phone, description, logo, whatsapp are saved.
[st, body] = await call("PUT", "/api/v1/marketplace/onboarding", fresh, { display_name: "Casse Casa", slug: "casse-casa", city: "Casablanca", phone: "0612345678", whatsapp: "212612345678", description: "Used Renault and Dacia parts, tested, delivered across Morocco.", logo_url: "/api/v1/media/uploads/parts/123-logo.png" });
const row = sql.prepare("SELECT phone, whatsapp, description, logo_url FROM sellers WHERE user_id = 1").get();
check("profile_saved", st === 200 && row.whatsapp === "212612345678" && row.logo_url === "/api/v1/media/uploads/parts/123-logo.png", [st, row]);
[st] = await call("PUT", "/api/v1/marketplace/onboarding", fresh, { display_name: "Casse Casa", slug: "casse-casa", city: "Casablanca", phone: "abc" });
check("phone_validated", st === 400, st);
r = await statusOf(fresh);
check("still_setup_without_parts", r.status === "setup" && !r.items.find((i) => i.id === "first_part").done && r.items.find((i) => i.id === "logo").done, r.status);

// 4. First part → all required done → pending review.
[st] = await call("POST", "/api/v1/marketplace/me/parts", fresh, { category_id: 1, slug: "pads-1", title: "Front pads", price: 38000, quantity: 2, condition: "used" });
r = await statusOf(fresh);
check("pending_review", st === 201 && r.status === "pending_review" && r.items.filter((i) => i.required).every((i) => i.done), [st, r.status]);
check("percent_progress", r.percent > 50 && r.percent < 100, r.percent);
check("photos_fitment_optional_open", !r.items.find((i) => i.id === "photos").done && !r.items.find((i) => i.id === "fitment").done, r.items);

// 5. Photo + fitment → 100%.
const partId = sql.prepare("SELECT id FROM parts WHERE slug='pads-1'").get().id;
sql.exec(`INSERT INTO part_images (part_id,url) VALUES (${partId}, '/api/v1/media/uploads/parts/x.jpg'); INSERT INTO part_compatibility (part_id,make,model,year_start) VALUES (${partId},'Renault','Clio',2012);`);
r = await statusOf(fresh);
check("all_done_100", r.percent === 100 && r.status === "pending_review", [r.percent, r.status]);

// 6. Admin decisions.
const admin = await signToken({ user_id: 9, role: "admin" }, "s");
const sellerId = sql.prepare("SELECT id FROM sellers WHERE user_id=1").get().id;
await call("PATCH", `/api/v1/admin/sellers/${sellerId}/status`, admin, { status: "active" });
r = await statusOf(fresh);
check("active", r.status === "active" && r.seller.status === "active", r.status);
await call("PATCH", `/api/v1/admin/sellers/${sellerId}/status`, admin, { status: "suspended", reason: "Repeated complaints about parts not matching photos." });
r = await statusOf(fresh);
check("suspended", r.status === "suspended", r.status);

// 7. A buyer who opens a store becomes a seller.
[st, body] = await call("POST", "/api/v1/marketplace/onboarding", buyer, { display_name: "Buyer Shop", slug: "buyer-shop", city: "Rabat", accept_agreement: true });
const role = sql.prepare("SELECT role FROM users WHERE id=2").get().role;
check("buyer_upgraded_to_seller", st === 201 && role === "seller" && (await verifyToken(body.data.access_token, "s")).role === "seller", [st, role]);

console.log(results);
console.log(Object.values(results).every((v) => v === "PASS") ? "ALL PASS" : "SOME FAILED");
