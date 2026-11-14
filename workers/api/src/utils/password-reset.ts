// ============================================================
// Forgot password (migrations/0033).
//  - Self-service: the person gives their e-mail or phone; a 6-digit code
//    goes on WhatsApp to the account's OWN number (users.phone, or the
//    store's WhatsApp / phone for a seller) — never to an order address,
//    which can be someone else's. Template parthub_reset_code
//    (Authentication). 15 minutes, 5 wrong codes, used once.
//  - Assisted: someone who gets no code writes to PartHub on WhatsApp; an
//    admin creates a one-time link (60 minutes) and sends it in the chat.
//    Not for admin accounts. Logged in the activity log.
// Admin accounts: neither (an admin's phone or a colleague must not be enough
// to take the platform); they use scripts/admin-set-password.sh.
// The answer to "forgot" never says whether an account exists.
// A reset changes the password and signs out every device.
// ============================================================
import type { Env } from "../types";
import { hashPassword } from "./auth";
import { normalizeWhatsAppNumber } from "./whatsapp";
import { notify } from "./wa-notify";
import { clearAttempts } from "./rate-limit";

export const CODE_MINUTES = 15;
export const LINK_MINUTES = 60;
export const MAX_CODE_TRIES = 5;
export const RESET_TEMPLATE = "parthub_reset_code";

type Account = { id: number; name: string; email: string; role: string; locale: string | null; phone: string | null; token_version: number };

const sqlTime = (d: Date) => d.toISOString().slice(0, 19).replace("T", " ");

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
const secretHash = (env: Env, secret: string) => sha256Hex(`${env.JWT_SECRET || ""}|reset|${secret}`);

function sameHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// The digits a phone may be stored with: 2126…, 06…, 002126…
function phoneForms(input: string): string[] {
  const intl = normalizeWhatsAppNumber(input);
  if (!intl) return [];
  const forms = new Set([intl, `00${intl}`]);
  if (intl.startsWith("212")) forms.add(`0${intl.slice(3)}`);
  return [...forms];
}
const DIGITS = "replace(replace(replace(replace(replace(coalesce(%s, ''), ' ', ''), '-', ''), '.', ''), '+', ''), '/', '')";

// An e-mail or a phone → the account, with the number its code goes to.
export async function findAccount(env: Env, identifier: string): Promise<Account | null> {
  const id = String(identifier || "").trim();
  if (!id) return null;
  const cols = `u.id, u.name, u.email, u.role, u.locale, u.token_version,
    coalesce(nullif(trim(u.phone), ''), nullif(trim(s.whatsapp), ''), nullif(trim(s.phone), '')) as phone`;
  if (id.includes("@")) {
    return env.DB.prepare(`select ${cols} from users u left join sellers s on s.user_id = u.id where lower(u.email) = lower(?1) and u.is_active = 1`)
      .bind(id).first<Account>();
  }
  const forms = phoneForms(id);
  if (!forms.length) return null;
  const marks = forms.map((_, i) => `?${i + 1}`).join(",");
  // One account per number, or none (a shared number cannot prove who asks).
  const rows = await env.DB.prepare(
    `select ${cols} from users u left join sellers s on s.user_id = u.id
     where u.is_active = 1 and (${DIGITS.replace("%s", "u.phone")} in (${marks})
        or ${DIGITS.replace("%s", "s.whatsapp")} in (${marks}) or ${DIGITS.replace("%s", "s.phone")} in (${marks}))
     limit 2`
  ).bind(...forms).all<Account>();
  return rows.results?.length === 1 ? rows.results[0]! : null;
}

// Self-service: a new code (the older ones stop working), sent on WhatsApp.
// Returns false when the account has no number to send it to.
export async function sendResetCode(env: Env, account: Account): Promise<boolean> {
  if (!normalizeWhatsAppNumber(account.phone)) return false;
  const code = String(crypto.getRandomValues(new Uint32Array(1))[0]! % 1_000_000).padStart(6, "0");
  await env.DB.prepare("update password_resets set used_at = datetime('now') where user_id = ?1 and used_at is null").bind(account.id).run();
  const res = await env.DB.prepare(
    "insert into password_resets (user_id, channel, secret_hash, expires_at) values (?1, 'whatsapp', ?2, ?3)"
  ).bind(account.id, await secretHash(env, code), sqlTime(new Date(Date.now() + CODE_MINUTES * 60_000))).run();
  return notify(env, {
    kind: "password_code",
    refId: Number(res.meta?.last_row_id),
    recipient: `user:${account.id}`,
    phone: account.phone,
    locale: account.locale,
    template: RESET_TEMPLATE,
    params: [code],
    buttonPath: code, // the "copy code" button carries the code too
  });
}

// Assisted: a one-time link for the account, made by an admin.
export async function createResetLink(env: Env, account: Account, adminId: number): Promise<{ url: string; expires_at: string }> {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  const token = btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const expires = sqlTime(new Date(Date.now() + LINK_MINUTES * 60_000));
  await env.DB.prepare("update password_resets set used_at = datetime('now') where user_id = ?1 and used_at is null").bind(account.id).run();
  await env.DB.prepare(
    "insert into password_resets (user_id, channel, secret_hash, expires_at, created_by) values (?1, 'admin_link', ?2, ?3, ?4)"
  ).bind(account.id, await secretHash(env, token), expires, adminId).run();
  const site = account.role === "seller"
    ? (env.SELLER_PORTAL_URL || "https://seller.parthub.autos")
    : (env.STOREFRONT_URL || "https://parthub.autos");
  return { url: `${site.replace(/\/$/, "")}/reset-password?token=${token}`, expires_at: expires };
}

type ResetRow = { id: number; user_id: number; secret_hash: string; attempts: number };

// The code for an account: right → the reset; wrong → one try less.
export async function checkCode(env: Env, account: Account, code: string): Promise<{ ok: true; resetId: number } | { ok: false; error: string }> {
  const row = await env.DB.prepare(
    `select id, user_id, secret_hash, attempts from password_resets
     where user_id = ?1 and channel = 'whatsapp' and used_at is null and expires_at > datetime('now')
     order by id desc limit 1`
  ).bind(account.id).first<ResetRow>();
  if (!row || row.attempts >= MAX_CODE_TRIES) return { ok: false, error: "This code is wrong or has expired. Ask for a new one." };
  const clean = String(code || "").replace(/\D/g, "");
  if (clean.length !== 6 || !sameHex(await secretHash(env, clean), row.secret_hash)) {
    await env.DB.prepare("update password_resets set attempts = attempts + 1 where id = ?1").bind(row.id).run();
    return { ok: false, error: "This code is wrong or has expired. Ask for a new one." };
  }
  return { ok: true, resetId: row.id };
}

// The token of a link → the reset and its account.
export async function checkLink(env: Env, token: string): Promise<{ resetId: number; userId: number } | null> {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(String(token || ""))) return null;
  const row = await env.DB.prepare(
    `select r.id, r.user_id from password_resets r join users u on u.id = r.user_id
     where r.secret_hash = ?1 and r.channel = 'admin_link' and r.used_at is null and r.expires_at > datetime('now') and u.is_active = 1`
  ).bind(await secretHash(env, token)).first<{ id: number; user_id: number }>();
  return row ? { resetId: row.id, userId: row.user_id } : null;
}

// Sets the new password (already checked by the policy), uses the reset,
// signs out every device, and lifts sign-in blocks on the account.
export async function applyReset(env: Env, resetId: number, userId: number, password: string): Promise<boolean> {
  const used = await env.DB.prepare("update password_resets set used_at = datetime('now') where id = ?1 and used_at is null").bind(resetId).run();
  if (!Number(used.meta?.changes)) return false; // used at the same moment by another request
  await env.DB.prepare(
    "update users set password_hash = ?2, token_version = token_version + 1, updated_at = datetime('now') where id = ?1"
  ).bind(userId, await hashPassword(password)).run();
  const user = await env.DB.prepare("select email from users where id = ?1").bind(userId).first<{ email: string }>();
  if (user) await clearAttempts(env.DB, `login:email:${user.email.trim().toLowerCase()}`);
  return true;
}
