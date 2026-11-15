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

const tok = async (p) => "Bearer " + (await signToken(p, "s"));
const env = { DB, JWT_SECRET: "s" };
const results = {};
const check = (name, cond, extra = "") => { results[name] = cond ? "PASS" : `FAIL ${JSON.stringify(extra)}`; };
async function call(m, u, auth, body) {
  const r = await app.request(u, { method: m, headers: { "Content-Type": "application/json", ...(auth ? { Authorization: auth } : {}) }, body: body ? JSON.stringify(body) : undefined }, env);
  return [r.status, await r.json()];
}

sql.exec(`
  INSERT INTO users (id,name,email,password_hash,role) VALUES (1,'Admin','a@x','x','admin'),(2,'Seller','s@x','x','seller'),(3,'Pending','p@x','x','seller'),(4,'Buyer','b@x','x','buyer');
  INSERT INTO sellers (id,user_id,name,slug,status,location) VALUES (1,2,'Shop','shop','active','Casablanca'),(2,3,'New shop','new-shop','pending','Fes');
  INSERT INTO categories (id,name,slug) VALUES (1,'Brakes','brakes');
  INSERT INTO parts (id,seller_id,category_id,title,slug,price,quantity,status) VALUES (1,1,1,'Pads','pads',10000,3,'active');
`);
const admin = await tok({ user_id: 1, role: "admin" });
const seller = await tok({ user_id: 2, role: "seller", seller_id: 1 });
const buyer = await tok({ user_id: 4, role: "buyer" });
const URL1 = "/api/v1/admin/sellers/1/verification";

// Nobody but an admin.
check("seller_refused", (await call("PUT", URL1, seller, { verified: true, note: "self check" }))[0] === 403);
check("buyer_refused", (await call("PUT", URL1, buyer, { verified: true, note: "self check" }))[0] === 403);
check("anonymous_refused", (await call("PUT", URL1, null, { verified: true, note: "x" }))[0] === 401);

// Not verified at first: no badge anywhere.
let [, page] = await call("GET", "/api/v1/storefront/sellers/shop");
let [, part] = await call("GET", "/api/v1/catalog/parts/pads");
check("starts_unverified", page.data?.verified === 0 && part.data?.seller_verified === 0, [page.data?.verified, part.data?.seller_verified]);

// A note is required; a store still waiting cannot be verified.
check("note_required", (await call("PUT", URL1, admin, { verified: true }))[0] === 400);
check("flag_required", (await call("PUT", URL1, admin, { note: "RC checked" }))[0] === 400);
check("pending_store_refused", (await call("PUT", "/api/v1/admin/sellers/2/verification", admin, { verified: true, note: "RC 12345 checked" }))[0] === 409);
check("missing_store_404", (await call("PUT", "/api/v1/admin/sellers/99/verification", admin, { verified: true, note: "RC 12345 checked" }))[0] === 404);

// Verify.
let [st, b] = await call("PUT", URL1, admin, { verified: true, note: "RC 12345 + visite du magasin" });
check("verify_ok", st === 200 && b.data?.verified === true && b.data?.verification_note === "RC 12345 + visite du magasin", [st, b]);
const row = sql.prepare("select verified_at, verified_by from sellers where id = 1").get();
check("who_and_when_stored", row.verified_by === 1 && !!row.verified_at, row);
[, page] = await call("GET", "/api/v1/storefront/sellers/shop");
[, part] = await call("GET", "/api/v1/catalog/parts/pads");
check("badge_public", page.data?.verified === 1 && part.data?.seller_verified === 1, [page.data?.verified, part.data?.seller_verified]);
const [, list] = await call("GET", "/api/v1/catalog/parts");
const [, found] = await call("GET", "/api/v1/search?q=pads");
check("badge_in_lists", list.data?.[0]?.seller_verified === 1, list.data?.[0]);
check("badge_in_search", (found.data?.items || found.data || []).some?.((p) => p.seller_verified === 1) ?? false, found.data);
check("note_not_public", !JSON.stringify(page).includes("RC 12345") && !JSON.stringify(part).includes("RC 12345"));
const audit = sql.prepare("select count(*) n from admin_audit_log where path like '%/verification'").get().n;
check("audited", audit >= 1, audit);

// Remove the badge.
[st, b] = await call("PUT", URL1, admin, { verified: false });
const after = sql.prepare("select verified_at, verified_by, verification_note from sellers where id = 1").get();
check("unverify_clears", st === 200 && b.data?.verified === false && after.verified_at === null && after.verification_note === null, [st, after]);
[, page] = await call("GET", "/api/v1/storefront/sellers/shop");
check("badge_gone", page.data?.verified === 0);

console.log(results);
const fails = Object.values(results).filter((v) => v !== "PASS").length;
console.log(fails ? `${fails} FAIL` : "ALL PASS");
if (fails) process.exit(1);
