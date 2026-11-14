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

// In-memory R2 bucket (with list cursors and head) the backup code uses.
function bucket({ failPut = false } = {}) {
  const store = new Map();
  return {
    store,
    async put(key, value, opts) {
      if (failPut) throw new Error("backup down");
      store.set(key, { bytes: new Uint8Array(value), httpMetadata: opts?.httpMetadata || {}, customMetadata: opts?.customMetadata || {} });
    },
    async head(key) { return store.has(key) ? { key } : null; },
    async get(key) {
      const o = store.get(key);
      if (!o) return null;
      return { body: o.bytes, httpMetadata: o.httpMetadata, customMetadata: o.customMetadata, httpEtag: '"e"', async arrayBuffer() { return o.bytes.buffer.slice(0); } };
    },
    async list({ prefix = "", limit = 1000, cursor } = {}) {
      const keys = [...store.keys()].filter((k) => k.startsWith(prefix)).sort();
      const start = cursor ? Number(cursor) : 0;
      const slice = keys.slice(start, start + limit);
      const truncated = start + limit < keys.length;
      return { objects: slice.map((key) => ({ key })), truncated, cursor: truncated ? String(start + limit) : undefined };
    },
  };
}

const tok = async (p) => "Bearer " + (await signToken(p, "s"));
const results = {};
const check = (name, cond, extra = "") => { results[name] = cond ? "PASS" : `FAIL ${JSON.stringify(extra)}`; };
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52]);

sql.exec(`
  INSERT INTO users (id,name,email,password_hash,role) VALUES (1,'B','b@x','x','buyer'),(2,'S','s@x','x','seller'),(3,'A','a@x','x','admin');
  INSERT INTO sellers (id,user_id,name,slug,status) VALUES (1,2,'Shop','shop','active');
`);
const buyer = await tok({ user_id: 1, role: "buyer" });
const seller = await tok({ user_id: 2, role: "seller", seller_id: 1 });
const admin = await tok({ user_id: 3, role: "admin" });

async function upload(env, path, auth) {
  const fd = new FormData();
  fd.append("file", new File([PNG], "p.png", { type: "image/png" }));
  const r = await app.request(path, { method: "POST", headers: { Authorization: auth }, body: fd }, env);
  return [r.status, await r.json()];
}
async function post(env, path, auth, body) {
  const r = await app.request(path, { method: "POST", headers: { Authorization: auth, "Content-Type": "application/json" }, body: JSON.stringify(body || {}) }, env);
  return [r.status, await r.json()];
}

// 1. Without a backup bucket: uploads work as before, the sync says so.
{
  const MEDIA = bucket();
  const env = { DB, MEDIA, JWT_SECRET: "s" };
  const [s] = await upload(env, "/api/v1/media/upload", seller);
  check("no backup: upload still works", s === 200 && MEDIA.store.size === 1, s);
  const [s2, b2] = await post(env, "/api/v1/admin/media/backup-sync", admin);
  check("no backup: sync refused with 409", s2 === 409 && b2.success === false, [s2, b2]);
}

// 2. With a backup bucket: both uploads land in both buckets.
{
  const MEDIA = bucket(), MEDIA_BACKUP = bucket();
  const env = { DB, MEDIA, MEDIA_BACKUP, JWT_SECRET: "s" };
  const [s1, b1] = await upload(env, "/api/v1/media/upload", seller);
  const [s2, b2] = await upload(env, "/api/v1/requests/images", buyer);
  const k1 = b1.data?.key, k2 = b2.data?.key;
  check("part photo copied", s1 === 200 && MEDIA_BACKUP.store.has(k1), [s1, b1]);
  check("request photo copied", s2 === 201 && MEDIA_BACKUP.store.has(k2), [s2, b2]);
  check("copy keeps content type", MEDIA_BACKUP.store.get(k1)?.httpMetadata?.contentType === "image/png");

  // Primary lost: the photo is still served from the backup.
  MEDIA.store.delete(k1);
  const r = await app.request("/api/v1/media/" + k1, {}, env);
  check("served from backup when primary is missing", r.status === 200 && r.headers.get("Content-Type") === "image/png", r.status);
}

// 3. Backup down: the upload still succeeds.
{
  const MEDIA = bucket(), MEDIA_BACKUP = bucket({ failPut: true });
  const env = { DB, MEDIA, MEDIA_BACKUP, JWT_SECRET: "s" };
  const err = console.error; console.error = () => {};
  const [s] = await upload(env, "/api/v1/media/upload", seller);
  console.error = err;
  check("backup failure does not fail the upload", s === 200 && MEDIA.store.size === 1, s);
}

// 4. Backfill: older photos copied page by page, admin only, idempotent.
{
  const MEDIA = bucket(), MEDIA_BACKUP = bucket();
  const env = { DB, MEDIA, MEDIA_BACKUP, JWT_SECRET: "s" };
  for (let i = 0; i < 250; i++) await MEDIA.put(`uploads/parts/old-${String(i).padStart(3, "0")}.png`, PNG, { httpMetadata: { contentType: "image/png" } });
  await MEDIA_BACKUP.put("uploads/parts/old-000.png", PNG, {});

  const [sDenied] = await post(env, "/api/v1/admin/media/backup-sync", seller);
  check("seller cannot run the sync", sDenied === 403, sDenied);

  let cursor = null, copied = 0, skipped = 0, pages = 0, done = false;
  while (!done && pages < 10) {
    const [s, b] = await post(env, "/api/v1/admin/media/backup-sync", admin, cursor ? { cursor } : {});
    if (s !== 200) { check("sync page", false, [s, b]); break; }
    copied += b.data.copied; skipped += b.data.skipped; cursor = b.data.cursor; done = b.data.done; pages++;
  }
  check("sync copies everything in pages", done && pages === 3 && copied === 249 && skipped === 1 && MEDIA_BACKUP.store.size === 250, { pages, copied, skipped });
  const [, again] = await post(env, "/api/v1/admin/media/backup-sync", admin);
  check("second run copies nothing", again.data.copied === 0 && again.data.skipped === 100, again.data);
}

console.log(JSON.stringify(results, null, 2));
const failed = Object.entries(results).filter(([, v]) => v !== "PASS");
console.log(`\n${Object.keys(results).length - failed.length}/${Object.keys(results).length} passed`);
if (failed.length) process.exit(1);
