const ROOT = new URL("../../../", import.meta.url).pathname; // repository root
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import app from "./.build/app.mjs";
import { signToken } from "./.build/auth.mjs";

const sql = new DatabaseSync(":memory:");
sql.exec(readFileSync(ROOT + "infra/d1/schema.sql", "utf8"));
// Approval needs a photo: these suites are about other rules, so every part gets one.
sql.exec("CREATE TRIGGER test_photo AFTER INSERT ON parts BEGIN INSERT INTO part_images (part_id, url, sort_order, is_featured) VALUES (NEW.id, 'https://img.test/p.jpg', 1, 1); END;");
const stmt = (q) => { let a = []; const s = { bind(...x) { a = x; return s; }, async first() { return sql.prepare(q).get(...a) ?? null; }, async all() { return { results: sql.prepare(q).all(...a) }; }, async run() { const r = sql.prepare(q).run(...a); return { meta: { last_row_id: Number(r.lastInsertRowid), changes: r.changes } }; } }; return s; };
const env = { DB: { prepare: stmt }, JWT_SECRET: "s" };
const results = {};
const check = (n, c, x = "") => { results[n] = c ? "PASS" : `FAIL ${JSON.stringify(x)}`; };
const call = async (m, u, tok, body) => {
  const r = await app.request(u, { method: m, headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok}` }, body: body ? JSON.stringify(body) : undefined }, env);
  return [r.status, await r.json()];
};

sql.exec(`
  INSERT INTO users (id,name,email,password_hash,role) VALUES (1,'S','s@x','x','seller');
  INSERT INTO sellers (id,user_id,name,slug,location,phone,description,status) VALUES (1,1,'Shop','shop','Fes','0612345678','Used Renault parts, tested, delivered across Morocco.','pending');
  INSERT INTO categories (id,name,slug) VALUES (1,'Brakes','brakes');
  INSERT INTO parts (id,seller_id,category_id,slug,title,price,quantity,status) VALUES (1,1,1,'pads','Pads',38000,2,'pending');
`);
sql.exec("INSERT INTO users (id,name,email,password_hash,role) VALUES (9,'Admin','admin9@x','x','admin')");
const admin = await signToken({ user_id: 9, role: "admin" }, "s");
const seller = await signToken({ user_id: 1, role: "seller", seller_id: 1 }, "s");
const note = (t, id) => sql.prepare(`SELECT status, moderation_note FROM ${t} WHERE id=?`).get(id);

// Sellers
let [st, b] = await call("PATCH", "/api/v1/admin/sellers/1/status", admin, { status: "rejected" });
check("seller_reject_needs_reason", st === 400 && note("sellers", 1).status === "pending", [st, b]);
[st] = await call("PATCH", "/api/v1/admin/sellers/1/status", admin, { status: "suspended", reason: "too short" });
check("seller_reason_min_length", st === 400, st);
[st] = await call("PATCH", "/api/v1/admin/sellers/999/status", admin, { status: "active" });
check("seller_not_found", st === 404, st);
const why = "Store name doesn't match the business documents you sent.";
[st] = await call("PATCH", "/api/v1/admin/sellers/1/status", admin, { status: "rejected", reason: why });
check("seller_rejected_saved", st === 200 && note("sellers", 1).moderation_note === why, note("sellers", 1));
[st, b] = await call("GET", "/api/v1/marketplace/me/readiness", seller);
check("seller_sees_reason", b.data.status === "rejected" && b.data.seller.moderation_note === why, b.data.seller);
await call("PATCH", "/api/v1/admin/sellers/1/status", admin, { status: "active" });
[st, b] = await call("GET", "/api/v1/marketplace/me/readiness", seller);
check("approve_clears_reason", b.data.status === "active" && b.data.seller.moderation_note === null && note("sellers", 1).moderation_note === null, [b.data.seller, note("sellers", 1)]);
[st] = await call("PATCH", "/api/v1/admin/sellers/1/status", admin, { status: "rejected", reason: "x".repeat(900) });
check("reason_capped_500", note("sellers", 1).moderation_note.length === 500, note("sellers", 1).moderation_note.length);
await call("PATCH", "/api/v1/admin/sellers/1/status", admin, { status: "active" });

// Parts
[st] = await call("PATCH", "/api/v1/admin/parts/1/status", admin, { status: "rejected" });
check("part_reject_needs_reason", st === 400, st);
const partWhy = "Photos show a different part than the title. Upload real photos.";
[st] = await call("PATCH", "/api/v1/admin/parts/1/status", admin, { status: "rejected", reason: partWhy });
check("part_rejected_saved", st === 200 && note("parts", 1).moderation_note === partWhy, note("parts", 1));
[st, b] = await call("GET", "/api/v1/marketplace/me/parts", seller);
const listed = (b.data || []).find((p) => p.id === 1);
check("seller_list_has_reason", listed?.status === "rejected" && listed?.moderation_note === partWhy, listed);
[st, b] = await call("GET", "/api/v1/marketplace/me/parts/1", seller);
check("seller_detail_has_reason", b.data?.moderation_note === partWhy, b.data);
[st] = await call("PATCH", "/api/v1/admin/parts/1/status", admin, { status: "archived" });
check("archive_no_reason_needed", st === 200 && note("parts", 1).status === "archived", [st, note("parts", 1)]);
[st] = await call("PATCH", "/api/v1/admin/parts/999/status", admin, { status: "active" });
check("part_not_found", st === 404, st);

// Seller edits a rejected part → back to review.
await call("PATCH", "/api/v1/admin/parts/1/status", admin, { status: "rejected", reason: partWhy });
[st] = await call("PUT", "/api/v1/marketplace/me/parts/1", seller, { category_id: 1, slug: "pads", title: "Pads (real photos)", price: 38000, status: "active" });
check("resubmit_goes_pending", st === 200 && note("parts", 1).status === "pending", [st, note("parts", 1)]);
await call("PATCH", "/api/v1/admin/parts/1/status", admin, { status: "active" });
check("approve_clears_part_reason", note("parts", 1).moderation_note === null, note("parts", 1));

// Non-admins can't moderate.
[st] = await call("PATCH", "/api/v1/admin/parts/1/status", seller, { status: "active" });
check("seller_cannot_moderate", st === 403, st);

// Photo rule: a part without any photo can't be approved (single or bulk).
sql.exec("DROP TRIGGER test_photo; INSERT INTO parts (id,seller_id,category_id,title,slug,price,status) VALUES (70,1,(SELECT id FROM categories LIMIT 1),'No photo part','no-photo-70',100,'pending'),(71,1,(SELECT id FROM categories LIMIT 1),'With photo','with-photo-71',100,'pending'); INSERT INTO part_images (part_id,url,sort_order,is_featured) VALUES (71,'https://img.test/x.jpg',1,1);");
{
  let [s70, b70] = await call("PATCH", "/api/v1/admin/parts/70/status", admin, { status: "active" });
  check("no_photo_refused", s70 === 409 && /photo/.test(b70.error) && note("parts", 70).status === "pending", [s70, b70]);
  [s70] = await call("PATCH", "/api/v1/admin/parts/70/status", admin, { status: "rejected", reason: "Please add a real photo of the part." });
  check("no_photo_can_reject", s70 === 200 && note("parts", 70).status === "rejected", s70);
  sql.exec("UPDATE parts SET status='pending' WHERE id=70");
  const [sb, bb] = await call("POST", "/api/v1/admin/parts/bulk-status", admin, { ids: [70, 71], status: "active" });
  check("bulk_no_photo", sb === 200 && JSON.stringify(bb.data.updated) === "[71]" && JSON.stringify(bb.data.no_photo) === "[70]" && note("parts", 70).status === "pending" && note("parts", 71).status === "active", bb);
}

console.log(results);
console.log(Object.values(results).every((v) => v === "PASS") ? "ALL PASS" : "SOME FAILED");

// Admin detail routes (the admin portal's details pages called routes that didn't exist).
{
  sql.exec("DELETE FROM part_images WHERE part_id = 1; INSERT INTO part_images (part_id,url,is_featured) VALUES (1,'/api/v1/media/uploads/parts/a.jpg',1); INSERT INTO part_compatibility (part_id,make,model,year_start,year_end) VALUES (1,'Renault','Clio',2012,2019); INSERT INTO part_specs (part_id,label,value) VALUES (1,'Position','Front');");
  await call("PATCH", "/api/v1/admin/parts/1/status", admin, { status: "rejected", reason: "Photos show a different part than the title." });
  const [s1, p1] = await call("GET", "/api/v1/admin/parts/1", admin);
  const d = p1.data || {};
  const r2 = {
    admin_part_detail: s1 === 200 && d.seller_name === "Shop" && d.images.length === 1 && d.compatibility.length === 1 && d.specs.length === 1 && d.moderation_note.startsWith("Photos"),
    admin_part_404: (await call("GET", "/api/v1/admin/parts/999", admin))[0] === 404,
  };
  const [s2, p2] = await call("GET", "/api/v1/admin/sellers/1", admin);
  r2.admin_seller_detail = s2 === 200 && p2.data.user_email === "s@x" && Array.isArray(p2.data.parts) && p2.data.parts.find((x) => x.id === 1)?.moderation_note?.startsWith("Photos");
  r2.admin_seller_404 = (await call("GET", "/api/v1/admin/sellers/999", admin))[0] === 404;
  r2.detail_admin_only = (await call("GET", "/api/v1/admin/parts/1", seller))[0] === 403;
  console.log(r2, Object.values(r2).every(Boolean) ? "DETAIL ALL PASS" : "DETAIL FAILED");
}
