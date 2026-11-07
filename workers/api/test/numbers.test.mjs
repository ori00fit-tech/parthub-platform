const ROOT = new URL("../../../", import.meta.url).pathname; // repository root
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import app from "./.build/app.mjs";
import { signToken } from "./.build/auth.mjs";

const sql = new DatabaseSync(":memory:");
sql.exec(readFileSync(ROOT + "infra/d1/schema.sql", "utf8"));
// The Morocco layer migration adds seller_type, used by the buyer offer view.

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
const env = { DB, JWT_SECRET: "s" };
const tok = async (p) => "Bearer " + (await signToken(p, "s"));
const call = async (m, u, auth, body) => {
  const r = await app.request(u, {
    method: m,
    headers: { "Content-Type": "application/json", ...(auth ? { Authorization: auth } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  }, env);
  return [r.status, await r.json()];
};
const results = {};
const check = (name, cond, extra = "") => { results[name] = cond ? "PASS" : `FAIL ${JSON.stringify(extra)}`; };
sql.exec(`
  INSERT INTO users (id,name,email,password_hash,role) VALUES (2,'S1','s1@x','x','seller'),(3,'S2','s2@x','x','seller'),(4,'S3','s3@x','x','seller'),(9,'Admin','a@x','x','admin');
  INSERT INTO sellers (id,user_id,name,slug,status,location) VALUES (1,2,'Casse One','one','active','Casablanca'),(2,3,'Shop Two','two','active','Rabat'),(3,4,'Pending Shop','three','pending','Fes');
  INSERT INTO categories (id,name,slug) VALUES (1,'Electrical','electrical');
  INSERT INTO brands (id,name,slug) VALUES (1,'Valeo','valeo'),(2,'Bosch','bosch');
  INSERT INTO parts (id,seller_id,category_id,brand_id,slug,title,price,quantity,status,sku,part_origin) VALUES
    (1,1,1,NULL,'alt-oem','Alternateur Renault origine',150000,1,'active','RN-1','oem'),
    (2,2,1,1,'alt-valeo','Alternateur Valeo',120000,3,'active',NULL,'aftermarket'),
    (3,2,1,2,'alt-bosch','Alternateur Bosch',110000,0,'active',NULL,'aftermarket'),
    (4,3,1,1,'alt-hidden','Alternateur boutique en attente',90000,2,'active',NULL,'aftermarket'),
    (5,1,1,NULL,'old-sku','Old listing with sku only',50000,1,'active','82 00-123.456','used');
`);
const s1 = await tok({ user_id: 2, role: "seller", seller_id: 1 });
const s2 = await tok({ user_id: 3, role: "seller", seller_id: 2 });
const s3 = await tok({ user_id: 4, role: "seller", seller_id: 3 });
const admin = await tok({ user_id: 9, role: "admin" });
const search = async (q) => (await call("GET", `/api/v1/search?q=${encodeURIComponent(q)}`, null))[1].data.map((p) => p.slug);

// Seller numbers
let [st, b] = await call("PUT", "/api/v1/marketplace/me/parts/1/numbers", s1, { numbers: [{ number: "7701 208 174", kind: "oem", role: "own" }] });
check("save_own_oem", st === 200 && b.data.length === 1 && b.data[0].number === "7701 208 174" && b.data[0].number_norm === "7701208174", [st, b]);
[st, b] = await call("PUT", "/api/v1/marketplace/me/parts/2/numbers", s2, { numbers: [
  { number: "439745", kind: "aftermarket", role: "own", brand_id: 1 },
  { number: "7701-208-174", kind: "oem", role: "replaces" },
  { number: "7701.208.174", kind: "oem", role: "replaces" },
] });
check("save_claim_dedup", st === 200 && b.data.length === 2 && b.data.some((n) => n.role === "replaces" && n.number_norm === "7701208174"), b.data);
check("same_number_reused", sql.prepare("select count(*) n from part_numbers where number_norm='7701208174'").get().n === 1);
const link = sql.prepare("select * from part_number_links").all();
check("claim_creates_unverified_link", link.length === 1 && link[0].verification === "unverified" && link[0].source === "seller_claim", link);
[st] = await call("PUT", "/api/v1/marketplace/me/parts/1/numbers", s2, { numbers: [] });
check("not_owner_404", st === 404, st);
[st, b] = await call("PUT", "/api/v1/marketplace/me/parts/3/numbers", s2, { numbers: [{ number: "ab", kind: "oem" }] });
check("too_short_400", st === 400, [st, b]);
await call("PUT", "/api/v1/marketplace/me/parts/3/numbers", s2, { numbers: [{ number: "0 986 049 950", kind: "aftermarket", role: "own", brand_id: 2 }, { number: "7701208174", kind: "oem", role: "replaces" }] });
await call("PUT", "/api/v1/marketplace/me/parts/4/numbers", s3, { numbers: [{ number: "7701208174", kind: "oem", role: "replaces" }] }).catch(() => null);
sql.exec("INSERT INTO part_numbers (number, number_norm, kind) VALUES ('7701208174','7701208174','oem') ON CONFLICT DO NOTHING; INSERT OR IGNORE INTO part_listing_numbers (part_id, part_number_id, role) SELECT 4, id, 'replaces' FROM part_numbers WHERE number_norm='7701208174' AND brand_id IS NULL");

// Search by number, any spelling
let r = await search("7701 208 174");
check("search_oem_spaces", r.includes("alt-oem") && r.includes("alt-valeo") && r.includes("alt-bosch") && r[0] === "alt-oem" || r.slice(0, 3).includes("alt-oem"), r);
r = await search("7701-208-174");
check("search_oem_dashes", r.includes("alt-oem"), r);
r = await search("439745");
check("search_maker_number_only_own_before_verification", r.includes("alt-valeo") && !r.includes("alt-oem"), r);
r = await search("8200123456");
check("search_legacy_sku_normalized", r.includes("old-sku"), r);
r = await search("74");
check("short_query_no_number_match", !r.includes("alt-oem"), r);

// Other offers on the part page
[st, b] = await call("GET", "/api/v1/catalog/parts/alt-oem", null);
const offers = b.data.other_offers.map((o) => o.slug);
check("other_offers_same_number", offers.join() === "alt-valeo,alt-bosch", [offers, b.data.other_offers]);
check("other_offers_in_stock_first_then_price", b.data.other_offers[0].slug === "alt-valeo" && b.data.other_offers[0].matched_number, b.data.other_offers);
check("pending_store_hidden", !offers.includes("alt-hidden"));
check("part_numbers_on_page", b.data.part_numbers.length === 1 && b.data.part_numbers[0].role === "own", b.data.part_numbers);

// Admin verifies the claim: the Valeo number now finds the OEM listing too
[st, b] = await call("GET", "/api/v1/admin/pending-counts", admin);
check("admin_count", b.data.numbers === 2, b.data);
[st, b] = await call("GET", "/api/v1/admin/part-numbers/links", admin);
const valeoLink = b.data.find((l) => l.from_number === "439745");
check("admin_queue", b.data.length === 2 && valeoLink.to_number === "7701 208 174" && valeoLink.claimed_by === "S2" && valeoLink.claimed_on.includes("Valeo"), b.data);
[st] = await call("POST", `/api/v1/admin/part-numbers/links/${valeoLink.id}/decide`, s1, { decision: "verify" });
check("seller_cannot_verify", st === 401 || st === 403, st);
[st, b] = await call("POST", `/api/v1/admin/part-numbers/links/${valeoLink.id}/decide`, admin, { decision: "verify" });
check("verify_link", st === 200 && b.data.verification === "verified", b);
r = await search("439745");
// Valeo ↔ OEM verified: the OEM listing is found; listings that claim to
// replace the OEM number (Bosch) come along as the sellers' claims.
check("verified_link_searches_both_ways", r.includes("alt-valeo") && r.includes("alt-oem"), r);
[st, b] = await call("GET", "/api/v1/catalog/parts/alt-valeo", null);
check("valeo_page_offers_via_link", b.data.other_offers.map((o) => o.slug).includes("alt-oem"), b.data.other_offers);
const boschLink = (await call("GET", "/api/v1/admin/part-numbers/links", admin))[1].data[0];
[st, b] = await call("POST", `/api/v1/admin/part-numbers/links/${boschLink.id}/decide`, admin, { decision: "reject" });
check("reject_link", b.data.verification === "rejected");
r = await search("0986049950");
check("rejected_link_not_used", r.includes("alt-bosch") && !r.includes("alt-oem"), r);

// Admin records a link directly
[st, b] = await call("POST", "/api/v1/admin/part-numbers/links", admin, { from: { number: "8200 660 034", kind: "oem" }, to: { number: "7701 208 174", kind: "oem" }, relation: "supersedes" });
check("admin_create_link", st === 200 && b.data.verification === "verified" && b.data.relation === "supersedes", [st, b]);
r = await search("8200660034");
check("superseded_number_finds_listings", r.includes("alt-oem"), r);
[st] = await call("POST", "/api/v1/admin/part-numbers/links", admin, { from: { number: "123456" }, to: { number: "12-34-56" } });
check("same_number_refused", st === 400, st);

let bad = 0;
for (const [k, v] of Object.entries(results)) { console.log(v.startsWith("PASS") ? "PASS" : "FAIL", k, v.startsWith("PASS") ? "" : v); if (!v.startsWith("PASS")) bad++; }
console.log(bad ? `${bad} failed` : `all ${Object.keys(results).length} passed`);
