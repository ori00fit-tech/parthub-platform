// ============================================================
// Devices and tokens (migrations/0035).
// Every sign-in creates a session; its id (sid) is in the access token and
// the auth middleware refuses a token whose session was signed out.
//  - client "web" (the sites): access token for 7 days, no refresh.
//  - client "app" (mobile): access token for 15 minutes + refresh token for
//    60 days, "<sid>.<secret>", replaced at each refresh. Presenting the
//    previous one again means someone kept a copy: the session ends.
// Password change / reset, sign-out everywhere and account deletion bump
// users.token_version: every session made before stops (checked here too).
// ============================================================
import type { Env } from "../types";
import { signToken } from "./auth";

export const WEB_TTL = 7 * 86400;
export const APP_ACCESS_TTL = 15 * 60;
export const APP_REFRESH_DAYS = 60;

export type Client = "web" | "app";
type UserForToken = { id: number; role: "buyer" | "seller" | "admin"; seller_id: number | null; token_version: number };

const sqlTime = (d: Date) => d.toISOString().slice(0, 19).replace("T", " ");
const rand = (bytes: number) =>
  btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(bytes)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function sameHex(a: string, b: string) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

// "Chrome on Android", "Safari on iPhone", … from the browser's User-Agent.
export function describeDevice(ua: string | null | undefined): { name: string; platform: string } {
  const u = String(ua || "");
  const os = /iPhone/.test(u) ? "iPhone" : /iPad/.test(u) ? "iPad" : /Android/.test(u) ? "Android" : /Windows/.test(u) ? "Windows" : /Mac OS X|Macintosh/.test(u) ? "Mac" : /Linux/.test(u) ? "Linux" : "";
  const browser = /Edg\//.test(u) ? "Edge" : /OPR\/|Opera/.test(u) ? "Opera" : /SamsungBrowser/.test(u) ? "Samsung Internet" : /Firefox\//.test(u) ? "Firefox" : /Chrome\//.test(u) ? "Chrome" : /Safari\//.test(u) ? "Safari" : "";
  const name = browser && os ? `${browser} on ${os}` : browser || os || "Browser";
  const platform = os === "Android" ? "android" : os === "iPhone" || os === "iPad" ? "ios" : "web";
  return { name, platform };
}

const cleanText = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

// A new session and its tokens.
export async function startSession(
  env: Env,
  user: UserForToken,
  opts: { client: Client; deviceName?: unknown; platform?: unknown; userAgent?: string | null | undefined; ip?: string | null | undefined }
): Promise<{ access_token: string; expires_in: number; session_id: string; refresh_token?: string; refresh_expires_at?: string }> {
  const sid = rand(16);
  const ua = describeDevice(opts.userAgent);
  const platform = cleanText(opts.platform, 20)?.toLowerCase();
  const device = cleanText(opts.deviceName, 80) || (opts.client === "app" ? "App" : ua.name);
  let refresh: string | undefined;
  let expires: Date;
  if (opts.client === "app") {
    refresh = `${sid}.${rand(32)}`;
    expires = new Date(Date.now() + APP_REFRESH_DAYS * 86400_000);
  } else {
    expires = new Date(Date.now() + WEB_TTL * 1000);
  }
  await env.DB.prepare(
    `insert into sessions (id, user_id, client, device_name, platform, token_version, refresh_hash, ip, expires_at)
     values (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`
  )
    .bind(
      sid, user.id, opts.client, device,
      platform && ["android", "ios", "web", "other"].includes(platform) ? platform : opts.client === "app" ? "other" : ua.platform,
      Number(user.token_version || 0), refresh ? await sha256(refresh) : null, (opts.ip || "").slice(0, 64) || null, sqlTime(expires)
    )
    .run();
  const ttl = opts.client === "app" ? APP_ACCESS_TTL : WEB_TTL;
  const access_token = await accessToken(env, user, sid, ttl);
  return {
    access_token,
    expires_in: ttl,
    session_id: sid,
    ...(refresh ? { refresh_token: refresh, refresh_expires_at: sqlTime(expires) } : {}),
  };
}

export function accessToken(env: Env, user: UserForToken, sid: string | null, ttl = WEB_TTL) {
  const base = { user_id: user.id, role: user.role, tv: Number(user.token_version || 0), ...(sid ? { sid } : {}) };
  return signToken(user.seller_id != null ? { ...base, seller_id: user.seller_id } : base, env.JWT_SECRET, ttl);
}

// The app's refresh: a new access token and a new refresh token.
export async function refreshSession(
  env: Env,
  presented: string
): Promise<{ ok: true; access_token: string; expires_in: number; refresh_token: string; refresh_expires_at: string; session_id: string } | { ok: false; error: string }> {
  const bad = { ok: false as const, error: "Session expired, please sign in again" };
  const sid = String(presented || "").split(".")[0] || "";
  if (!/^[A-Za-z0-9_-]{10,40}$/.test(sid)) return bad;
  const s = await env.DB.prepare(
    `select s.id, s.user_id, s.refresh_hash, s.prev_refresh_hash, s.token_version, s.revoked_at, s.expires_at, s.client,
            u.role, u.is_active, u.token_version as user_tv, sl.id as seller_id
     from sessions s join users u on u.id = s.user_id left join sellers sl on sl.user_id = u.id where s.id = ?1`
  ).bind(sid).first<{
    id: string; user_id: number; refresh_hash: string | null; prev_refresh_hash: string | null; token_version: number; revoked_at: string | null;
    expires_at: string; client: string; role: "buyer" | "seller" | "admin"; is_active: number; user_tv: number; seller_id: number | null;
  }>();
  if (!s || s.client !== "app" || !s.refresh_hash || s.revoked_at) return bad;
  const hash = await sha256(presented);
  if (s.prev_refresh_hash && sameHex(hash, s.prev_refresh_hash)) {
    // An old refresh token came back: someone else has a copy.
    await revokeSession(env.DB, s.id, "refresh token reused");
    return bad;
  }
  if (!sameHex(hash, s.refresh_hash)) return bad;
  if (s.expires_at <= sqlTime(new Date()) || !Number(s.is_active) || Number(s.user_tv) !== Number(s.token_version)) {
    await revokeSession(env.DB, s.id, "expired");
    return bad;
  }
  const next = `${s.id}.${rand(32)}`;
  const expires = sqlTime(new Date(Date.now() + APP_REFRESH_DAYS * 86400_000));
  const rotated = await env.DB.prepare(
    `update sessions set prev_refresh_hash = refresh_hash, refresh_hash = ?2, last_used_at = datetime('now'), expires_at = ?3
     where id = ?1 and refresh_hash = ?4 and revoked_at is null`
  ).bind(s.id, await sha256(next), expires, s.refresh_hash).run();
  if (!Number(rotated.meta?.changes)) return bad; // refreshed at the same moment by another request
  const user = { id: s.user_id, role: s.role, seller_id: s.seller_id, token_version: s.token_version };
  return {
    ok: true,
    access_token: await accessToken(env, user, s.id, APP_ACCESS_TTL),
    expires_in: APP_ACCESS_TTL,
    refresh_token: next,
    refresh_expires_at: expires,
    session_id: s.id,
  };
}

export async function revokeSession(DB: D1Database, sid: string, reason: string, userId?: number) {
  const res = await DB.prepare(
    `update sessions set revoked_at = datetime('now'), revoked_reason = ?2 where id = ?1 and revoked_at is null ${userId ? "and user_id = ?3" : ""}`
  ).bind(...(userId ? [sid, reason, userId] : [sid, reason])).run();
  return Number(res.meta?.changes) > 0;
}

// The person's devices, newest use first (only those still valid).
export async function listSessions(DB: D1Database, userId: number, tokenVersion: number) {
  const rows = await DB.prepare(
    `select id, client, device_name, platform, ip, created_at, last_used_at, expires_at from sessions
     where user_id = ?1 and revoked_at is null and expires_at > datetime('now') and token_version = ?2
     order by last_used_at desc, created_at desc limit 50`
  ).bind(userId, tokenVersion).all<Record<string, unknown>>();
  return rows.results || [];
}
