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
  INSERT INTO users (id,name,email,password_hash,role) VALUES
    (1,'Buyer','b@x','x','buyer'), (2,'S1','s1@x','x','seller'), (3,'S2','s2@x','x','seller'),
    (4,'S3','s3@x','x','seller'), (5,'Other buyer','o@x','x','buyer');
  INSERT INTO sellers (id,user_id,name,slug,status,phone,whatsapp,location) VALUES
    (1,2,'Casse Casa','casse-casa','active','0611','212611','Casablanca'),
    (2,3,'Auto Rabat','auto-rabat','active','0622','212622','Rabat'),
    (3,4,'Pending Shop','pending-shop','pending','0633',NULL,'Fes');
  INSERT INTO categories (id,name,slug) VALUES (1,'Engine','engine'), (2,'Brakes','brakes');
  INSERT INTO parts (id,seller_id,category_id,slug,title,price,quantity,status) VALUES
    (1,1,1,'p1','Clio engine',100000,1,'active'), (2,2,2,'p2','Pads',5000,5,'active');
  INSERT INTO part_compatibility (part_id,make,model,year_start) VALUES (1,'Renault','Clio',2010);
`);

const buyer = await tok({ user_id: 1, role: "buyer" });
const other = await tok({ user_id: 5, role: "buyer" });
const s1 = await tok({ user_id: 2, role: "seller", seller_id: 1 });
const s2 = await tok({ user_id: 3, role: "seller", seller_id: 2 });
const s3 = await tok({ user_id: 4, role: "seller", seller_id: 3 });

const base = { make: "Renault", model: "Clio", year: 2014, part_name: "Alternator", city: "Casablanca", phone: "+212 600 000 000" };

// ── Create ──
let [st, b] = await call("POST", "/api/v1/requests", null, base);
check("create_requires_auth", st === 401, st);
[st, b] = await call("POST", "/api/v1/requests", buyer, { ...base, phone: "abc" });
check("create_bad_phone", st === 400, [st, b]);
[st, b] = await call("POST", "/api/v1/requests", buyer, { ...base, vin: "123" });
check("create_bad_vin", st === 400, [st, b]);
[st, b] = await call("POST", "/api/v1/requests", buyer, { ...base, year: 1800 });
check("create_bad_year", st === 400, [st, b]);
[st, b] = await call("POST", "/api/v1/requests", buyer, { ...base, image_url: "javascript:alert(1)" });
check("create_bad_image", st === 400, [st, b]);
[st, b] = await call("POST", "/api/v1/requests", buyer, { ...base, vin: "vf1bb05cf12345678", category_id: 1 });
check("create_ok", st === 201 && b.ok && b.success && /^RQ-[A-Z2-9]{8}$/.test(b.data.reference) && b.data.vin === "VF1BB05CF12345678", [st, b]);
const reqId = b.data.id;

// A request matching nobody but the category of seller 2 (brakes).
[st, b] = await call("POST", "/api/v1/requests", buyer, { ...base, make: "Dacia", model: "Logan", part_name: "Brake disc", category_id: 2, city: "Rabat" });
const req2 = b.data.id;

// ── Seller inbox matching ──
[st, b] = await call("GET", "/api/v1/requests/inbox", s1);
const s1ids = b.data.map((r) => r.id);
check("s1_matched_by_make", st === 200 && s1ids.includes(reqId) && !s1ids.includes(req2), s1ids);
check("inbox_hides_phone", b.data.every((r) => !("phone" in r) && !("buyer_id" in r)), b.data[0]);
[st, b] = await call("GET", "/api/v1/requests/inbox", s2);
check("s2_matched_by_category", b.data.map((r) => r.id).includes(req2) && !b.data.map((r) => r.id).includes(reqId), b.data.map((r) => r.id));
[st, b] = await call("GET", "/api/v1/requests/inbox?scope=all", s2);
check("scope_all", b.data.length === 2, b.data.length);
[st, b] = await call("GET", "/api/v1/requests/inbox?scope=all&city=rabat", s2);
check("city_filter", b.data.length === 1 && b.data[0].id === req2, b.data.map((r) => r.id));
[st, b] = await call("GET", "/api/v1/requests/inbox?scope=all&q=altern", s2);
check("text_filter", b.data.length === 1 && b.data[0].id === reqId, b.data.map((r) => r.id));
[st] = await call("GET", "/api/v1/requests/inbox", s3);
check("pending_seller_blocked", st === 403, st);
[st] = await call("GET", "/api/v1/requests/inbox", buyer);
check("buyer_blocked_from_inbox", st === 403, st);

// ── Offers ──
[st, b] = await call("PUT", `/api/v1/requests/inbox/${reqId}/offer`, s1, { price: -5, condition: "used" });
check("offer_bad_price", st === 400, [st, b]);
[st, b] = await call("PUT", `/api/v1/requests/inbox/${reqId}/offer`, s1, { price: 1000, condition: "broken" });
check("offer_bad_condition", st === 400, [st, b]);
[st, b] = await call("PUT", `/api/v1/requests/inbox/${reqId}/offer`, s1, { price: 80000, condition: "used", warranty_months: 3, delivery_days: 2, note: "Tested" });
check("offer_create", st === 200 && b.data.status === "pending" && b.data.price === 80000, [st, b]);
[st, b] = await call("PUT", `/api/v1/requests/inbox/${reqId}/offer`, s1, { price: 75000, condition: "used", warranty_months: 3 });
check("offer_update", st === 200 && b.data.price === 75000, [st, b]);
const offers = () => sql.prepare("SELECT COUNT(*) n FROM request_offers WHERE request_id=?").get(reqId).n;
check("offer_upsert_single_row", offers() === 1, offers());
[st, b] = await call("PUT", `/api/v1/requests/inbox/${reqId}/offer`, s2, { price: 90000, condition: "refurbished", warranty_months: 6 });
const s2OfferId = b.data.id;
// Withdraw and re-offer.
[st] = await call("DELETE", `/api/v1/requests/inbox/${reqId}/offer`, s2);
check("offer_withdraw", st === 200, st);
[st, b] = await call("GET", `/api/v1/requests/mine/${reqId}`, buyer);
check("withdrawn_hidden_from_buyer", b.data.offers.length === 1, b.data.offers.length);
[st, b] = await call("PUT", `/api/v1/requests/inbox/${reqId}/offer`, s2, { price: 85000, condition: "refurbished", warranty_months: 6 });
check("reoffer_after_withdraw", st === 200 && b.data.status === "pending", [st, b]);

// ── Buyer view ──
[st, b] = await call("GET", "/api/v1/requests/mine", buyer);
const mine = b.data.find((r) => r.id === reqId);
check("mine_list", st === 200 && mine.offer_count === 2 && mine.best_price === 75000, mine);
[st, b] = await call("GET", `/api/v1/requests/mine/${reqId}`, buyer);
check("mine_detail_sorted_by_price", b.data.offers[0].price === 75000 && b.data.offers[1].price === 85000, b.data.offers.map((o) => o.price));
check("seller_contact_hidden_before_accept", b.data.offers.every((o) => o.seller_phone == null && o.seller_whatsapp == null), b.data.offers);
[st] = await call("GET", `/api/v1/requests/mine/${reqId}`, other);
check("other_buyer_cannot_view", st === 404, st);
const s1OfferId = b.data.offers[0].id;
[st] = await call("POST", `/api/v1/requests/mine/${reqId}/accept/${s1OfferId}`, other);
check("other_buyer_cannot_accept", st === 404, st);

// ── Accept ──
[st, b] = await call("POST", `/api/v1/requests/mine/${reqId}/accept/${s1OfferId}`, buyer);
check("accept_ok", st === 200 && b.data.status === "accepted" && b.data.seller_phone === "0611" && b.data.seller_whatsapp === "212611", [st, b]);
const rq = sql.prepare("SELECT status, accepted_offer_id FROM part_requests WHERE id=?").get(reqId);
const s2o = sql.prepare("SELECT status FROM request_offers WHERE request_id=? AND seller_id=2").get(reqId);
check("request_fulfilled", rq.status === "fulfilled" && rq.accepted_offer_id === s1OfferId, rq);
check("others_rejected", s2o.status === "rejected", s2o);
[st] = await call("POST", `/api/v1/requests/mine/${reqId}/accept/${s1OfferId}`, buyer);
check("double_accept_rejected", st === 409, st);
[st, b] = await call("PUT", `/api/v1/requests/inbox/${reqId}/offer`, s2, { price: 1, condition: "used" });
check("no_offer_after_fulfilled", st === 409, [st, b]);

// Seller who won sees buyer contact; the loser does not, but still sees the request.
[st, b] = await call("GET", `/api/v1/requests/inbox/${reqId}`, s1);
check("winner_sees_buyer_phone", st === 200 && b.data.buyer_phone === "+212 600 000 000" && b.data.my_offer.status === "accepted", [st, b]);
[st, b] = await call("GET", `/api/v1/requests/inbox/${reqId}`, s2);
check("loser_no_buyer_phone", st === 200 && b.data.buyer_phone == null && b.data.my_offer.status === "rejected", [st, b]);
[st, b] = await call("GET", "/api/v1/requests/inbox", s2);
check("fulfilled_visible_to_offerer", b.data.some((r) => r.id === reqId && r.my_offer_status === "rejected"), b.data.map((r) => [r.id, r.my_offer_status]));

// ── Close ──
[st] = await call("PUT", `/api/v1/requests/inbox/${req2}/offer`, s2, { price: 3000, condition: "new" });
[st] = await call("POST", `/api/v1/requests/mine/${req2}/close`, other);
check("other_cannot_close", st === 404, st);
[st] = await call("POST", `/api/v1/requests/mine/${req2}/close`, buyer);
const r2 = sql.prepare("SELECT status FROM part_requests WHERE id=?").get(req2).status;
const r2o = sql.prepare("SELECT status FROM request_offers WHERE request_id=?").get(req2).status;
check("close_ok", st === 200 && r2 === "closed" && r2o === "rejected", [st, r2, r2o]);

// ── Expiry ──
sql.exec("UPDATE part_requests SET status='open', expires_at = datetime('now','-1 day') WHERE id = " + req2);
[st, b] = await call("GET", "/api/v1/requests/inbox?scope=all", s1);
check("expired_hidden_from_new_sellers", !b.data.some((r) => r.id === req2), b.data.map((r) => r.id));
[st, b] = await call("GET", "/api/v1/requests/mine", buyer);
check("expired_flag_for_buyer", b.data.find((r) => r.id === req2).is_expired === 1, b.data);

// ── Limits ──
sql.exec("DELETE FROM part_requests");
for (let i = 0; i < 5; i++) await call("POST", "/api/v1/requests", buyer, base);
[st, b] = await call("POST", "/api/v1/requests", buyer, base);
check("open_limit", st === 429, [st, b]);

console.log(results);
console.log(Object.values(results).every((v) => v === "PASS") ? "ALL PASS" : "SOME FAILED");
