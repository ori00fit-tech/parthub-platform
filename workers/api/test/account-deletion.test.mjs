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
// Account deletion (utils/account-deletion.ts, migrations/0034): closed at
// once, 30 days to change one's mind (sign in = cancel), then personal data
// erased while orders, money and reviews stay.
import { hashPassword } from "./.build/auth.mjs";
import worker from "./.build/index.mjs";
import { guardOff } from "./_guard-off.mjs";
guardOff(app, sql, env);
const pw = await hashPassword("Riad-Fes-2026-x");
sql.prepare("INSERT INTO users (id,name,email,password_hash,role,phone) VALUES (1,'Admin','admin@x.ma',?,'admin',NULL),(2,'Karim Seller','karim@x.ma',?,'seller','0611111111'),(7,'Ali Buyer','ali@x.ma',?,'buyer','0622222222')").run(pw, pw, pw);
sql.exec(`
  INSERT INTO sellers (id,user_id,name,slug,status,location,delivery_enabled,whatsapp,phone,pickup_address) VALUES (1,2,'Casa Freins','casa','active','Casablanca',1,'0661234567','0522000000','12 Rue X');
  INSERT INTO categories (id,name,slug) VALUES (1,'Brakes','brakes');
  INSERT INTO parts (id,seller_id,category_id,title,slug,price,quantity,status) VALUES (1,1,1,'Pads','pads',30000,10,'active');
`);
const login = (email) => call("POST", "/api/v1/auth/login", null, { email, password: "Riad-Fes-2026-x" });
let buyer = `Bearer ${(await login("ali@x.ma"))[1].data.access_token}`;
let seller = `Bearer ${(await login("karim@x.ma"))[1].data.access_token}`;
const admin = await tok({ user_id: 1, role: "admin" });

// 1. Open order → refused, with the reason; both sides.
const [, o] = await call("POST", "/api/v1/commerce/orders", buyer, { items: [{ part_id: 1, quantity: 1 }], shipping_address: { full_name: "Ali Buyer", phone: "0622222222", address_line1: "5 Rue Secret", city: "Rabat", country: "MA" } });
let [st, r] = await call("GET", "/api/v1/auth/delete-account", buyer);
check("check_lists_blockers", st === 200 && r.data.can_delete === false && r.data.blockers[0].code === "open_orders" && r.data.grace_days === 30, r);
[st, r] = await call("POST", "/api/v1/auth/delete-account", buyer, { password: "Riad-Fes-2026-x" });
check("open_order_refused", st === 409 && /open orders/.test(r.error), r);
[st, r] = await call("POST", "/api/v1/auth/delete-account", seller, { password: "Riad-Fes-2026-x" });
check("seller_open_order_refused", st === 409, r);
// Delivered more than 7 days ago: nothing open any more.
sql.prepare("update order_items set status = 'delivered', delivered_at = datetime('now', '-10 days') where order_id = ?").run(o.data.id);
sql.prepare("update orders set status = 'delivered' where id = ?").run(o.data.id);
sql.exec("INSERT INTO reviews (part_id, buyer_id, rating, body, status) VALUES (1, 7, 5, 'Bonne pièce', 'approved')");
sql.exec("INSERT INTO whatsapp_contacts (phone, name) VALUES ('212622222222','Ali'); INSERT INTO whatsapp_messages (wa_message_id, direction, phone, body) VALUES ('w1','in','212622222222','Bonjour, mon adresse est 5 Rue Secret')");
sql.exec("INSERT INTO stock_alerts (part_id, user_id) VALUES (1, 7)");

// 2. Wrong password → refused. Admin → refused.
[st] = await call("POST", "/api/v1/auth/delete-account", buyer, { password: "nope" });
check("needs_password", st === 400);
[st, r] = await call("POST", "/api/v1/auth/delete-account", admin, { password: "x" });
check("not_admin", st === 400 || st === 409, [st, r]);

// 3. Request → closed at once (sessions revoked), nothing erased yet.
[st, r] = await call("POST", "/api/v1/auth/delete-account", buyer, { password: "Riad-Fes-2026-x", reason: "Je n'en ai plus besoin" });
check("requested", st === 200 && /30 days/.test(r.data.message), r);
check("signed_out", (await call("GET", "/api/v1/auth/me", buyer))[0] === 401);
const u = () => sql.prepare("select * from users where id = 7").get();
check("nothing_erased_yet", u().name === "Ali Buyer" && u().deletion_requested_at !== null && u().deleted_at === null);

// 4. Sign in during the 30 days → cancelled, account as before.
[st, r] = await login("ali@x.ma");
check("signin_cancels", st === 200 && r.data.deletion_cancelled === true && u().deletion_requested_at === null &&
  sql.prepare("select cancelled_at from account_deletions where user_id = 7").get().cancelled_at !== null, r);
buyer = `Bearer ${r.data.access_token}`;

// 5. Seller: store hidden at once, given back as it was on cancel.
sql.prepare("update order_items set status = 'delivered', delivered_at = datetime('now', '-10 days') where order_id = ?").run(o.data.id);
[st, r] = await call("POST", "/api/v1/auth/delete-account", seller, { password: "Riad-Fes-2026-x" });
const store = () => sql.prepare("select * from sellers where id = 1").get();
check("store_hidden", st === 200 && store().status === "suspended", [st, r, store().status]);
[st, r] = await login("karim@x.ma");
check("store_back", r.data.deletion_cancelled === true && store().status === "active" && store().moderation_note === null, store());
seller = `Bearer ${r.data.access_token}`;

// 6. Request again, 31 days pass, the daily job erases.
await call("POST", "/api/v1/auth/delete-account", buyer, { password: "Riad-Fes-2026-x" });
sql.exec("update users set deletion_requested_at = datetime('now', '-31 days') where id = 7");
const jobs = [];
await worker.scheduled({ cron: "17 3 * * *" }, env, { waitUntil: (p) => jobs.push(p) });
await Promise.all(jobs);
const after = u();
const addr = sql.prepare("select * from order_addresses where order_id = ?").get(o.data.id);
check("personal_data_erased", after.name === "Deleted user #7" && after.email === "deleted-7@deleted.parthub.invalid" && after.phone === null &&
  after.password_hash === "!" && after.is_active === 0 && after.deleted_at !== null, after);
check("address_erased", addr.full_name === "Deleted user #7" && addr.phone === "" && addr.address_line1 === "" && addr.city === "Rabat", addr);
check("whatsapp_erased", sql.prepare("select count(*) n from whatsapp_messages where phone = '212622222222'").get().n === 0 &&
  sql.prepare("select count(*) n from whatsapp_contacts where phone = '212622222222'").get().n === 0);
check("alerts_erased", sql.prepare("select count(*) n from stock_alerts where user_id = 7").get().n === 0);
check("order_kept", sql.prepare("select total, status from orders where id = ?").get(o.data.id).total === 33500);
check("review_kept", sql.prepare("select body from reviews where buyer_id = 7").get().body === "Bonne pièce");
check("cannot_sign_in", (await login("ali@x.ma"))[0] === 401 && (await login("deleted-7@deleted.parthub.invalid"))[0] === 401);
check("history", sql.prepare("select count(*) n from account_deletions where user_id = 7 and completed_at is not null").get().n === 1);

// 7. A seller erased: store closed, parts archived, invoices untouched.
sql.exec("INSERT INTO commission_invoices (number, seller_id, period, amount, status, due_date) VALUES ('PH-C-1', 1, '2026-10', 0, 'paid', '2026-11-10')");
await call("POST", "/api/v1/auth/delete-account", seller, { password: "Riad-Fes-2026-x" });
sql.exec("update users set deletion_requested_at = datetime('now', '-31 days') where id = 2");
const jobs2 = [];
await worker.scheduled({ cron: "17 3 * * *" }, env, { waitUntil: (p) => jobs2.push(p) });
await Promise.all(jobs2);
check("store_erased", store().name === "Closed store #1" && store().phone === null && store().whatsapp === null && store().pickup_address === null && store().status === "suspended", store());
check("parts_archived", sql.prepare("select count(*) n from parts where seller_id = 1 and status != 'archived'").get().n === 0);
check("invoice_kept", sql.prepare("select count(*) n from commission_invoices where seller_id = 1").get().n === 1);
// Money owed blocks a seller.
sql.exec("INSERT INTO users (id,name,email,password_hash,role) VALUES (3,'S3','s3@x.ma','" + pw + "','seller'); INSERT INTO sellers (id,user_id,name,slug,status) VALUES (3,3,'S3','s3','active'); INSERT INTO commission_invoices (number, seller_id, period, amount, status, due_date) VALUES ('PH-C-2', 3, '2026-10', 5000, 'issued', '2026-11-10')");
const s3 = `Bearer ${(await login("s3@x.ma"))[1].data.access_token}`;
[st, r] = await call("POST", "/api/v1/auth/delete-account", s3, { password: "Riad-Fes-2026-x" });
check("money_owed_blocks", st === 409 && /owed/.test(r.error), r);

console.log(results);
const fails = Object.values(results).filter((v) => v !== "PASS").length;
console.log(fails ? `${fails} FAIL` : "ALL PASS");
process.exitCode = fails ? 1 : 0;
