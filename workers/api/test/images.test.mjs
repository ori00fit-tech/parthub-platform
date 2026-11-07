const ROOT = new URL("../../../", import.meta.url).pathname; // repository root
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import app from "./.build/app.mjs";
import { signToken } from "./.build/auth.mjs";

const sql = new DatabaseSync(":memory:");
sql.exec(readFileSync(ROOT + "infra/d1/schema.sql", "utf8"));

function stmt(q) {
  let args = [];
  const s = {
    bind(...a) { args = a; return s; },
    async first() { return sql.prepare(q).get(...args) ?? null; },
    async all() { return { results: sql.prepare(q).all(...args) }; },
    async run() { const r = sql.prepare(q).run(...args); return { meta: { last_row_id: Number(r.lastInsertRowid), changes: r.changes } }; },
    _exec() { const r = sql.prepare(q).run(...args); return { meta: { changes: r.changes } }; },
  };
  return s;
}
const DB = {
  prepare: stmt,
  async batch(list) {
    sql.exec("BEGIN");
    try { const out = list.map((s) => s._exec()); sql.exec("COMMIT"); return out; }
    catch (e) { sql.exec("ROLLBACK"); throw e; }
  },
};

// In-memory R2 bucket with the subset of the API the worker uses.
const store = new Map();
const MEDIA = {
  async put(key, value, opts) { store.set(key, { bytes: new Uint8Array(value), httpMetadata: opts?.httpMetadata || {} }); },
  async get(key) {
    const o = store.get(key);
    if (!o) return null;
    return { body: o.bytes, httpMetadata: o.httpMetadata, httpEtag: '"etag"' };
  },
  async list({ prefix, limit }) {
    const objects = [...store.keys()].filter((k) => k.startsWith(prefix)).slice(0, limit).map((key) => ({ key }));
    return { objects };
  },
};
const env = { DB, MEDIA, JWT_SECRET: "s" };

const tok = async (p) => "Bearer " + (await signToken(p, "s"));
const results = {};
const check = (name, cond, extra = "") => { results[name] = cond ? "PASS" : `FAIL ${JSON.stringify(extra)}`; };

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52]);
const WEBP = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x24, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20]);
const HTML = new TextEncoder().encode("<html><script>alert(1)</script></html>");
const SVG = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');

async function upload(path, auth, bytes, { type = "image/png", name = "photo.png" } = {}) {
  const fd = new FormData();
  fd.append("file", new File([bytes], name, { type }));
  const r = await app.request(path, { method: "POST", headers: auth ? { Authorization: auth } : {}, body: fd }, env);
  return [r.status, await r.json()];
}
async function call(m, u, auth, body) {
  const r = await app.request(u, {
    method: m,
    headers: { "Content-Type": "application/json", ...(auth ? { Authorization: auth } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  }, env);
  return [r.status, await r.json()];
}

sql.exec(`
  INSERT INTO users (id,name,email,password_hash,role) VALUES (1,'B','b@x','x','buyer'),(2,'S','s@x','x','seller'),(3,'B2','b2@x','x','buyer');
  INSERT INTO sellers (id,user_id,name,slug,status) VALUES (1,2,'Shop','shop','active');
  INSERT INTO categories (id,name,slug) VALUES (1,'Engine','engine');
  INSERT INTO parts (id,seller_id,category_id,slug,title,price,quantity,status) VALUES (1,1,1,'p','P',1,1,'active');
  INSERT INTO part_compatibility (part_id,make,model,year_start) VALUES (1,'Renault','Clio',2010);
`);
const buyer = await tok({ user_id: 1, role: "buyer" });
const buyer2 = await tok({ user_id: 3, role: "buyer" });
const seller = await tok({ user_id: 2, role: "seller", seller_id: 1 });

// ── Buyer upload ──
let [st, b] = await upload("/api/v1/requests/images", null, JPEG);
check("upload_requires_auth", st === 401, st);

[st, b] = await upload("/api/v1/requests/images", buyer, JPEG, { type: "image/png", name: "weird name.PNG" });
const k1 = b.data?.key;
check("upload_jpeg_detected_by_bytes", st === 201 && /^uploads\/requests\/1\/\d{8}\/\d+-[a-z0-9]+\.jpg$/.test(k1) && store.get(k1).httpMetadata.contentType === "image/jpeg", [st, b]);
[st, b] = await upload("/api/v1/requests/images", buyer, WEBP, { type: "image/webp", name: "x.webp" });
check("upload_webp", st === 201 && b.data.key.endsWith(".webp"), [st, b]);
const url2 = b.data.url;

[st, b] = await upload("/api/v1/requests/images", buyer, HTML, { type: "image/png", name: "evil.png" });
check("html_disguised_as_png_rejected", st === 415, [st, b]);
[st, b] = await upload("/api/v1/requests/images", buyer, SVG, { type: "image/svg+xml", name: "x.svg" });
check("svg_rejected", st === 415, [st, b]);
[st, b] = await upload("/api/v1/requests/images", buyer, new Uint8Array(5 * 1024 * 1024 + 1), {});
check("too_large_rejected", st === 413, [st, b]);

// ── Seller upload also checks bytes now ──
[st, b] = await upload("/api/v1/media/upload", seller, HTML, { type: "image/jpeg", name: "x.jpg" });
check("seller_html_rejected", st === 415, [st, b]);
[st, b] = await upload("/api/v1/media/upload", seller, PNG, { type: "image/png", name: "My Part.png" });
check("seller_png_ok", st === 200 && /^uploads\/parts\/\d+-[a-z0-9]{6}-my-part\.png$/.test(b.data.key), [st, b]);
const sellerImg = b.data.url;

// ── Serving ──
let r = await app.request(`/api/v1/media/${k1}`, {}, env);
check("serve_image", r.status === 200 && r.headers.get("content-type") === "image/jpeg" && r.headers.get("x-content-type-options") === "nosniff" && /immutable/.test(r.headers.get("cache-control")), [r.status, Object.fromEntries(r.headers)]);
check("serve_bytes", new Uint8Array(await r.arrayBuffer())[0] === 0xff);
store.set("uploads/parts/old-evil.html", { bytes: HTML, httpMetadata: { contentType: "text/html" } });
r = await app.request("/api/v1/media/uploads/parts/old-evil.html", {}, env);
check("legacy_html_not_served", r.status === 404, r.status);
r = await app.request("/api/v1/media/secret/../uploads/x", {}, env);
check("path_traversal_404", r.status === 404, r.status);
r = await app.request("/api/v1/media/uploads/missing.jpg", {}, env);
check("missing_404", r.status === 404, r.status);

// ── Requests with photos ──
const base = { make: "Renault", model: "Clio", part_name: "Mirror", city: "Casa", phone: "0612345678" };
[st, b] = await call("POST", "/api/v1/requests", buyer, { ...base, images: [`/api/v1/media/${k1}`, url2] });
const reqId = b.data?.id;
check("create_with_images", st === 201 && JSON.stringify(b.data.images) === JSON.stringify([`/api/v1/media/${k1}`, url2]) && b.data.image_url === `/api/v1/media/${k1}`, [st, b]);

[st, b] = await call("POST", "/api/v1/requests", buyer, { ...base, images: ["https://evil.example/track.gif"] });
check("external_image_rejected", st === 400, [st, b]);
[st, b] = await call("POST", "/api/v1/requests", buyer2, { ...base, images: [`/api/v1/media/${k1}`] });
check("other_buyers_photo_rejected", st === 400, [st, b]);
[st, b] = await call("POST", "/api/v1/requests", buyer, { ...base, images: [sellerImg] });
check("non_request_media_rejected", st === 400, [st, b]);
[st, b] = await call("POST", "/api/v1/requests", buyer, { ...base, images: [`/api/v1/media/uploads/requests/1/../../parts/x.png`] });
check("traversal_url_rejected", st === 400, [st, b]);
[st, b] = await call("POST", "/api/v1/requests", buyer, { ...base, images: ["a", "b", "c", "d"].map((x) => `/api/v1/media/uploads/requests/1/20260101/${x}.jpg`) });
check("max_3_images", st === 400 && b.error.code === "TOO_MANY_IMAGES", [st, b]);
[st, b] = await call("POST", "/api/v1/requests", buyer, { ...base, images: [`/api/v1/media/${k1}`, `/api/v1/media/${k1}`] });
check("duplicates_collapsed", st === 201 && b.data.images.length === 1, [st, b]);

// Photos are visible to buyer and seller views.
[st, b] = await call("GET", `/api/v1/requests/mine/${reqId}`, buyer);
check("buyer_detail_images", b.data.images.length === 2, b.data.images);
[st, b] = await call("GET", "/api/v1/requests/mine", buyer);
check("buyer_list_images", Array.isArray(b.data[0].images), b.data[0]);
[st, b] = await call("GET", `/api/v1/requests/inbox/${reqId}`, seller);
check("seller_detail_images", b.data.images.length === 2, b.data.images);
[st, b] = await call("GET", "/api/v1/requests/inbox", seller);
check("seller_inbox_images", b.data.find((x) => x.id === reqId).images.length === 2, b.data);

// Legacy rows with only image_url still expose images[].
sql.exec(`UPDATE part_requests SET images = '[]', image_url = '/api/v1/media/uploads/requests/1/legacy.jpg' WHERE id = ${reqId}`);
[st, b] = await call("GET", `/api/v1/requests/mine/${reqId}`, buyer);
check("legacy_image_url_fallback", JSON.stringify(b.data.images) === JSON.stringify(["/api/v1/media/uploads/requests/1/legacy.jpg"]), b.data.images);

// Offer images: own media only.
[st, b] = await call("PUT", `/api/v1/requests/inbox/${reqId}/offer`, seller, { price: 100, condition: "used", image_url: "https://evil.example/x.png" });
check("offer_external_image_rejected", st === 400, [st, b]);
[st, b] = await call("PUT", `/api/v1/requests/inbox/${reqId}/offer`, seller, { price: 100, condition: "used", image_url: sellerImg });
check("offer_own_media_ok", st === 200 && b.data.image_url === sellerImg, [st, b]);

// ── Daily upload cap (20) ──
let last;
for (let i = 0; i < 20; i++) last = await upload("/api/v1/requests/images", buyer2, JPEG);
check("uploads_until_cap", last[0] === 201, last);
[st, b] = await upload("/api/v1/requests/images", buyer2, JPEG);
check("daily_upload_cap", st === 429, [st, b]);

console.log(results);
console.log(Object.values(results).every((v) => v === "PASS") ? "ALL PASS" : "SOME FAILED");
