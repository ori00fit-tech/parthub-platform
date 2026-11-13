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
// Duplicate and fake orders (utils/order-guard.ts, migrations/0030):
// idempotency key (also at the same moment), same cart within minutes,
// cap on orders waiting for confirmation, limits per buyer and per phone.
sql.exec(`
  INSERT INTO users (id,name,email,password_hash,role,phone) VALUES (2,'S1','s1@x','x','seller','0611111111'),(7,'Ali','b@x','x','buyer','0622222222'),(8,'Ali2','c@x','x','buyer','0699999999');
  INSERT INTO sellers (id,user_id,name,slug,status,location,delivery_enabled) VALUES (1,2,'Casa Freins','casa','active','Casablanca',1);
  INSERT INTO categories (id,name,slug) VALUES (1,'Brakes','brakes');
`);
for (let i = 1; i <= 30; i++) sql.prepare("INSERT INTO parts (id,seller_id,category_id,title,slug,price,quantity,status) VALUES (?,1,1,?,?,10000,100,'active')").run(i, `Part ${i}`, `p${i}`);
const buyer = await tok({ user_id: 7, role: "buyer" });
const buyer2 = await tok({ user_id: 8, role: "buyer" });
const addr = (phone = "0622222222") => ({ full_name: "Ali", phone, address_line1: "1 Rue Y", city: "Rabat", country: "MA" });
const place = async (items, { key, who = buyer, phone } = {}) => {
  const r = await app.request("/api/v1/commerce/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: who, ...(key ? { "Idempotency-Key": key } : {}) },
    body: JSON.stringify({ items, shipping_address: addr(phone) }),
  }, env);
  return [r.status, await r.json()];
};
const orders = () => sql.prepare("select count(*) n from orders").get().n;
const stock = (id) => sql.prepare("select quantity from parts where id = ?").get(id).quantity;
const reset = () => { sql.exec("delete from order_shipments; delete from order_items; delete from order_addresses; delete from orders; delete from auth_attempts"); };

// 1. Same key twice → the first order, stock taken once.
let [st, r] = await place([{ part_id: 1, quantity: 2 }], { key: "checkout-aaaa-1111" });
const first = r.data.reference;
check("first_created", st === 201 && stock(1) === 98, [st, r]);
[st, r] = await place([{ part_id: 1, quantity: 2 }], { key: "checkout-aaaa-1111" });
check("same_key_same_order", st === 200 && r.data.reference === first && r.meta.duplicate === "same_key" && orders() === 1 && stock(1) === 98, [st, r, orders()]);
// Same key, different cart (a client bug): still the first order, never a second one.
[st, r] = await place([{ part_id: 2, quantity: 1 }], { key: "checkout-aaaa-1111" });
check("same_key_wins", r.data.reference === first && orders() === 1);

// 2. Same key at the same moment → one order (unique index), stock taken once.
const raced = await Promise.all([1, 2, 3].map(() => place([{ part_id: 3, quantity: 1 }], { key: "checkout-race-2222" })));
const refs = new Set(raced.map(([, x]) => x.data?.reference));
check("race_one_order", refs.size === 1 && sql.prepare("select count(*) n from orders where idempotency_key = 'checkout-race-2222'").get().n === 1 && stock(3) === 99,
  [raced.map(([s, x]) => [s, x.data?.reference, x.error]), stock(3)]);

// 2b. Same cart at the same moment with DIFFERENT keys (two tabs) → one order.
// Slow the duplicate check down so the three requests all pass it before
// any of them writes: only the unique index can stop the extra orders.
const realPrepare = DB.prepare;
DB.prepare = (q) => {
  const st = realPrepare(q);
  if (/cart_hash = \?2 and status = 'pending'/.test(q) && !/select \*/.test(q)) {
    const first = st.first.bind(st);
    st.first = async () => { const r = await first(); await new Promise((res) => setTimeout(res, 50)); return r; };
  }
  return st;
};
const tabs = await Promise.all(["tab-one-aaaa1111", "tab-two-bbbb2222", "tab-three-cccc3333"].map((k) => place([{ part_id: 11, quantity: 1 }], { key: k })));
DB.prepare = realPrepare;
const tabRefs = new Set(tabs.map(([, x]) => x.data?.reference));
check("race_different_keys_one_order", tabRefs.size === 1 && sql.prepare("select count(*) n from order_items where part_id = 11").get().n === 1 && stock(11) === 99,
  [tabs.map(([s, x]) => [s, x.data?.reference, x.meta, x.error]), stock(11)]);

// 3. No key: same cart within minutes → same order; another quantity → new order.
[st, r] = await place([{ part_id: 4, quantity: 1 }]);
const noKey = r.data.reference;
[st, r] = await place([{ part_id: 4, quantity: 1 }]);
check("same_cart_same_order", st === 200 && r.data.reference === noKey && r.meta.duplicate === "same_cart");
[st, r] = await place([{ part_id: 4, quantity: 2 }]);
check("other_quantity_new_order", st === 201 && r.data.reference !== noKey);
// Once the seller confirmed it, the same cart is a new order (a real re-order).
sql.prepare("update orders set status = 'confirmed' where reference = ?").run(noKey);
[st, r] = await place([{ part_id: 4, quantity: 1 }]);
check("reorder_after_confirmation", st === 201 && r.data.reference !== noKey);
// A key that is not a key (too short) is ignored: the cart check still works.
[st, r] = await place([{ part_id: 4, quantity: 1 }], { key: "x" });
check("bad_key_ignored", st === 200 && r.meta.duplicate === "same_cart");

// 4. At most 5 orders waiting for confirmation.
reset();
for (let i = 5; i < 10; i++) await place([{ part_id: i, quantity: 1 }]);
[st, r] = await place([{ part_id: 10, quantity: 1 }]);
check("open_orders_cap", st === 409 && /5 orders waiting/.test(r.error), [st, r]);
sql.exec("update orders set status = 'confirmed'");
[st, r] = await place([{ part_id: 10, quantity: 1 }]);
check("cap_frees_after_confirmation", st === 201, [st, r]);

// 5. At most 8 orders an hour per buyer.
reset();
env.ORDER_MAX_OPEN = "100";
let last;
for (let i = 1; i <= 9; i++) last = await place([{ part_id: i, quantity: 1 }]);
check("buyer_rate_limit", last[0] === 429 && /Too many orders/.test(last[1].error) && orders() === 8, [last, orders()]);

// 6. At most 12 a day per phone, whatever the account.
reset();
let lastPhone;
for (let i = 1; i <= 13; i++) {
  lastPhone = await place([{ part_id: i, quantity: 1 }], { who: i % 2 ? buyer : buyer2, phone: "06 55 44 33 22" });
  if (i % 7 === 0) sql.exec("delete from auth_attempts where key like 'order:buyer:%'"); // only the phone limit counts here
}
check("phone_rate_limit", lastPhone[0] === 429 && orders() === 12, [lastPhone, orders()]);

// 7. The sites may send the header (CORS).
const pre = await app.request("/api/v1/commerce/orders", { method: "OPTIONS", headers: { Origin: "https://parthub.autos", "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type,authorization,idempotency-key" } }, env);
check("cors_allows_key", /idempotency-key/i.test(pre.headers.get("access-control-allow-headers") || ""), pre.headers.get("access-control-allow-headers"));


const fails = Object.values(results).filter((v) => v !== "PASS").length;
console.log(fails ? `${fails} FAIL` : "ALL PASS");
process.exitCode = fails ? 1 : 0;
