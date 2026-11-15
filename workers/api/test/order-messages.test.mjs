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
const env = { DB, JWT_SECRET: "s", WHATSAPP_ACCESS_TOKEN: "t", WHATSAPP_PHONE_NUMBER_ID: "1" };
const tok = async (p) => "Bearer " + (await signToken(p, "s"));
const call = async (m, u, auth, body) => {
  const r = await app.request(u, { method: m, headers: { "Content-Type": "application/json", ...(auth ? { Authorization: auth } : {}) }, body: body ? JSON.stringify(body) : undefined }, env);
  return [r.status, await r.json()];
};
const results = {};
const check = (name, cond, extra = "") => { results[name] = cond ? "PASS" : `FAIL ${JSON.stringify(extra)}`; };
// Questions about an order (utils/order-messages.ts, migrations/0042).
const graph = [];
globalThis.fetch = async (url, init = {}) => {
  graph.push(JSON.parse(init.body || "null"));
  return new Response(JSON.stringify({ messages: [{ id: `wamid.${graph.length}` }] }), { status: 200, headers: { "content-type": "application/json" } });
};
const tick = () => new Promise((r) => setTimeout(r, 30));
const sent = (name) => graph.filter((g) => g?.template?.name === name);
sql.exec(`
  INSERT INTO users (id,name,email,password_hash,role,phone,locale) VALUES (1,'A','a@x','x','admin',NULL,'fr'),(2,'S1','s1@x','x','seller',NULL,'fr'),(3,'S2','s2@x','x','seller',NULL,'ar'),(4,'S3','s3@x','x','seller',NULL,'fr'),(7,'Buyer','b@x','x','buyer','0622222222','fr'),(8,'Other','o@x','x','buyer','0633333333','fr');
  INSERT INTO sellers (id,user_id,name,slug,status,location,whatsapp) VALUES (1,2,'Freins Casa','freins','active','Casablanca','0661000001'),(2,3,'Moteurs Fes','moteurs','active','Fes','0661000002'),(3,4,'Autre','autre','active','Rabat','0661000003');
  INSERT INTO categories (id,name,slug) VALUES (1,'Brakes','brakes');
  INSERT INTO parts (id,seller_id,category_id,title,slug,price,quantity,status) VALUES (1,1,1,'Pads','pads',10000,5,'active'),(2,2,1,'Belt','belt',5000,5,'active');
  INSERT INTO orders (id,buyer_id,reference,subtotal,shipping_fee,total,status) VALUES (50,7,'PH-2026-MSG00001',15000,0,15000,'confirmed');
  INSERT INTO order_items (order_id,part_id,seller_id,title,price,quantity,subtotal) VALUES (50,1,1,'Pads',10000,1,10000),(50,2,2,'Belt',5000,1,5000);
  INSERT INTO order_addresses (order_id, full_name, phone, address_line1, city) VALUES (50,'Buyer','0622222222','1 Rue','Rabat');
  INSERT INTO whatsapp_templates (name, language, status, source) VALUES ('parthub_order_question','fr','approved','meta'),('parthub_order_question','ar','approved','meta'),('parthub_order_answer','fr','approved','meta');
`);
const admin = await tok({ user_id: 1, role: "admin" });
const s1 = await tok({ user_id: 2, role: "seller", seller_id: 1 });
const s2 = await tok({ user_id: 3, role: "seller", seller_id: 2 });
const s3 = await tok({ user_id: 4, role: "seller", seller_id: 3 });
const buyer = await tok({ user_id: 7, role: "buyer" });
const other = await tok({ user_id: 8, role: "buyer" });
const B = "/api/v1/commerce/orders/PH-2026-MSG00001/messages";
const S = "/api/v1/marketplace/me/orders/50/messages";

// 1. The buyer sees one conversation per seller of the order.
let [st, r] = await call("GET", B, buyer);
check("one_thread_per_seller", st === 200 && r.data.length === 2 && r.data.every((t) => t.messages.length === 0), r);
check("other_buyer_404", (await call("GET", B, other))[0] === 404 && (await call("POST", B, other, { seller_id: 1, body: "x" }))[0] === 404);

// 2. Asking: checked text and seller; WhatsApp to that seller, once until read.
check("empty_refused", (await call("POST", B, buyer, { seller_id: 1, body: "   " }))[0] === 400);
check("too_long_refused", (await call("POST", B, buyer, { seller_id: 1, body: "x".repeat(1001) }))[0] === 400);
check("seller_not_in_order", (await call("POST", B, buyer, { seller_id: 3, body: "Bonjour" }))[0] === 400);
[st, r] = await call("POST", B, buyer, { seller_id: 1, body: "Est-ce une pièce\nd'origine ?" });
await tick();
check("question_saved", st === 200 && r.data?.sender === "buyer", r);
let q = sent("parthub_order_question");
check("seller_told_on_whatsapp", q.length === 1 && q[0].to === "212661000001" && q[0].template.components[0].parameters[1].text === "Est-ce une pièce d'origine ?", q);
await call("POST", B, buyer, { seller_id: 1, body: "Et la marque ?" });
await tick();
check("no_second_whatsapp_until_read", sent("parthub_order_question").length === 1);

// 3. Sellers: only their own conversation; others refused.
[, r] = await call("GET", "/api/v1/marketplace/me/messages/unread", s1);
check("unread_listed", r.data.length === 1 && r.data[0].unread === 2 && r.data[0].reference === "PH-2026-MSG00001", r);
[, r] = await call("GET", S, s2);
check("other_seller_sees_own_only", r.data.length === 0, r);
check("seller_not_in_order_404", (await call("GET", S, s3))[0] === 404 && (await call("POST", S, s3, { body: "x" }))[0] === 404);
[, r] = await call("GET", S, s1);
check("seller_reads", r.data.length === 2 && r.data[0].body.startsWith("Est-ce"), r);
check("now_read", (await call("GET", "/api/v1/marketplace/me/messages/unread", s1))[1].data.length === 0);

// 4. The seller answers: WhatsApp to the buyer with the store's name.
[st] = await call("POST", S, s1, { body: "Oui, origine Renault." });
await tick();
const a = sent("parthub_order_answer");
check("buyer_told", st === 200 && a.length === 1 && a[0].to === "212622222222" && a[0].template.components[0].parameters[1].text === "Freins Casa", a);
[, r] = await call("GET", B, buyer);
const t1 = r.data.find((t) => t.seller_id === 1);
check("buyer_sees_answer", t1.messages.length === 3 && t1.messages[2].sender === "seller", t1);
check("answer_marked_read", sql.prepare("select read_at from order_messages where sender = 'seller'").get().read_at !== null);

// 5. A new question after the seller read: WhatsApp again.
await call("POST", B, buyer, { seller_id: 1, body: "Merci, livraison demain ?" });
await tick();
check("whatsapp_again_after_read", sent("parthub_order_question").length === 2);

// 6. PartHub reads every conversation, without marking them read.
[st, r] = await call("GET", "/api/v1/admin/orders/50/messages", admin);
check("admin_reads", st === 200 && r.data.find((t) => t.seller_id === 1).messages.length === 4, r);
check("admin_does_not_mark_read", (await call("GET", "/api/v1/marketplace/me/messages/unread", s1))[1].data.length === 1);
check("seller_cannot_use_admin", (await call("GET", "/api/v1/admin/orders/50/messages", s1))[0] === 403);

// 7. At most 30 a day per person and conversation.
for (let i = 0; i < 30; i++) sql.prepare("insert into order_messages (order_id, seller_id, sender, sender_id, body) values (50, 2, 'buyer', 7, 'x')").run();
check("daily_limit", (await call("POST", B, buyer, { seller_id: 2, body: "Encore" }))[0] === 429);

console.log(results);
const fails = Object.values(results).filter((x) => x !== "PASS").length;
console.log(fails ? `${fails} FAIL` : "ALL PASS");
if (fails) process.exit(1);
