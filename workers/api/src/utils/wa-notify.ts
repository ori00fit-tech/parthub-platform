// ============================================================
// Event notifications on WhatsApp, in the recipient's language
//
// notify() is the one way an event sends a template:
//  1. claims (kind, ref, recipient) in whatsapp_notifications, so a retry
//     or a second click never sends twice;
//  2. picks the language: the recipient's (users.locale) if Meta approved
//     that version, else French, Arabic, English, the first approved;
//  3. sends, and records the template, the language, Meta's message id
//     (delivery status then comes by webhook) or why nothing was sent
//     (status 'skipped' or 'failed', with the reason in `error`).
//
// Templates never registered at all (the five sent before the catalog,
// while Meta's status was not read yet) keep the old behaviour: sent in
// WHATSAPP_TEMPLATE_LANG. A catalog template no version of which is known
// is skipped: nothing goes to Meta that it would refuse.
// Best-effort: never throws, never blocks the request (runInBackground).
// ============================================================
import type { Env } from "../types";
import { isOptedOut, isWhatsAppConfigured, normalizeWhatsAppNumber, sendTemplateMessage } from "./whatsapp";
import { WA_LANGS, WA_TEMPLATE_BY_NAME, type WaLang } from "./wa-templates";

export type Notice = {
  kind: string; // event, e.g. "order_shipped"
  refId: number; // the row the event is about (order line, issue, ...)
  recipient: string; // "buyer:<user id>", "seller:<seller id>" or "user:<user id>"
  phone: string | null | undefined;
  locale?: string | null | undefined;
  template: string;
  params: string[] | ((lang: WaLang) => string[]);
  buttonPath?: string | undefined; // the template's URL button: path after the site
};

export function asLang(value: unknown): WaLang | null {
  const v = String(value ?? "").slice(0, 2).toLowerCase();
  return (WA_LANGS as readonly string[]).includes(v) ? (v as WaLang) : null;
}

// Which language to send `template` in, or why none.
export async function chooseLanguage(
  env: Env,
  template: string,
  locale: string | null | undefined
): Promise<{ lang: string; reason?: undefined } | { lang: null; reason: string }> {
  const rows = await env.DB.prepare("select language, status from whatsapp_templates where name = ?1")
    .bind(template)
    .all<{ language: string; status: string }>()
    .then((r) => r.results || [])
    .catch(() => [] as Array<{ language: string; status: string }>);
  const def = WA_TEMPLATE_BY_NAME[template];
  if (!rows.length) {
    if (!def || def.legacy) return { lang: asLang(env.WHATSAPP_TEMPLATE_LANG) || env.WHATSAPP_TEMPLATE_LANG || "fr" };
    return { lang: null, reason: "Template not submitted to Meta yet" };
  }
  // Meta's language code as registered ("fr", "ar", "en" or "en_US"...), by our language.
  const approved = new Map<WaLang, string>();
  for (const r of rows) {
    const l = asLang(r.language);
    if (l && r.status === "approved" && !approved.has(l)) approved.set(l, r.language);
  }
  const order = [asLang(locale), "fr", "ar", "en"].filter((l, i, a): l is WaLang => Boolean(l) && a.indexOf(l) === i);
  const lang = order.find((l) => approved.has(l));
  if (lang) return { lang: approved.get(lang) as string };
  return { lang: null, reason: `No approved language (${rows.map((r) => `${r.language}: ${r.status}`).join(", ")})` };
}

type Payload = { number: string; locale: string | null; params: Record<WaLang, string[]>; button: string | null };
type Row = { id: number; kind: string; template: string; created_at: string; attempts: number; payload: Payload };

async function finish(env: Env, id: number, values: { sent: boolean; status: string; lang: string | null; msgId?: string | null | undefined; error?: string | null | undefined; tried: boolean }) {
  await env.DB.prepare(
    `update whatsapp_notifications set sent = ?2, status = ?3, status_at = datetime('now'), language = ?4,
       wa_message_id = coalesce(?5, wa_message_id), error = ?6, attempts = attempts + ?7
     where id = ?1`
  )
    .bind(id, values.sent ? 1 : 0, values.status, values.lang, values.msgId ?? null, values.error ?? null, values.tried ? 1 : 0)
    .run();
}

// One try: STOP, then the language, then Meta. Used by notify() and the retries.
async function attempt(env: Env, row: Row): Promise<boolean> {
  const p = row.payload;
  if (await isOptedOut(env, p.number)) {
    await finish(env, row.id, { sent: false, status: "skipped", lang: null, error: OPTED_OUT, tried: false });
    return false;
  }
  const choice = await chooseLanguage(env, row.template, p.locale);
  if (!choice.lang) {
    // Not a try: retried once Meta approves a language.
    await finish(env, row.id, { sent: false, status: "skipped", lang: null, error: choice.reason, tried: false });
    return false;
  }
  const lang = (asLang(choice.lang) || "fr") as WaLang;
  const res = await sendTemplateMessage(env, p.number, row.template, choice.lang, p.params[lang] || p.params.fr, p.button || undefined);
  if (!res.ok) console.warn(`[whatsapp] ${row.template}/${choice.lang} → ${res.error}`);
  await finish(env, row.id, {
    sent: res.ok,
    status: res.ok ? "sent" : "failed",
    lang: choice.lang,
    msgId: res.ok ? res.id || null : null,
    error: res.ok ? null : res.error || "Meta refused the message",
    tried: true,
  });
  return res.ok;
}

const OPTED_OUT = "Opted out (STOP)";

// Returns true when Meta accepted the message.
export async function notify(env: Env, n: Notice): Promise<boolean> {
  try {
    if (!isWhatsAppConfigured(env)) return false;
    const number = normalizeWhatsAppNumber(n.phone);
    if (!number) return false;
    // Everything needed to send it later too (a retry recomputes nothing).
    const params = Object.fromEntries(WA_LANGS.map((l) => [l, typeof n.params === "function" ? n.params(l) : n.params])) as Record<WaLang, string[]>;
    const payload: Payload = { number, locale: asLang(n.locale), params, button: n.buttonPath ?? null };
    const claim = await env.DB.prepare(
      "insert or ignore into whatsapp_notifications (kind, ref_id, recipient, template, payload) values (?1, ?2, ?3, ?4, ?5)"
    )
      .bind(n.kind, n.refId, n.recipient, n.template, JSON.stringify(payload))
      .run();
    if (!Number(claim.meta?.changes)) return false; // already sent (or being sent)
    const id = Number(claim.meta?.last_row_id);
    return attempt(env, { id, kind: n.kind, template: n.template, created_at: "", attempts: 0, payload });
  } catch (err) {
    console.warn(`[whatsapp] ${n.template}: ${err instanceof Error ? err.message : String(err)}`);
    return false;
  }
}

// ── Retries ────────────────────────────────────────────────────────────
// A message skipped because no language was approved yet, or refused by
// Meta, is tried again (cron every 15 minutes, and right after the admin
// reads the templates' status) while it still makes sense: each kind has
// its own shelf life ("out for delivery today" is wrong the next day).
export const MAX_ATTEMPTS = 3;
const SHELF_HOURS: Record<string, number> = {
  out_for_delivery: 8,
  delivery_attempt_failed: 24,
  order_received: 24,
  order_confirmed: 48,
  pickup_ready: 48,
  password_changed: 24,
  new_request: 24,
  new_offer: 72,
  back_in_stock: 72,
};
const DEFAULT_SHELF_HOURS = 48;

export function shelfHours(kind: string): number {
  return SHELF_HOURS[kind] ?? (kind.startsWith("shipping_delayed") ? 24 : DEFAULT_SHELF_HOURS);
}

export async function retryWhatsApp(env: Env, limit = 40): Promise<{ tried: number; sent: number }> {
  const out = { tried: 0, sent: 0 };
  if (!isWhatsAppConfigured(env)) return out;
  const rows = await env.DB.prepare(
    `select id, kind, template, created_at, attempts, payload from whatsapp_notifications
     where status in ('skipped', 'failed') and payload is not null and attempts < ?1
       and coalesce(error, '') != ?2 and created_at >= datetime('now', '-72 hours')
     order by id limit ?3`
  )
    .bind(MAX_ATTEMPTS, OPTED_OUT, limit)
    .all<{ id: number; kind: string; template: string; created_at: string; attempts: number; payload: string }>();
  const now = Date.now();
  for (const r of rows.results || []) {
    const age = (now - Date.parse(`${r.created_at.replace(" ", "T")}Z`)) / 3_600_000;
    if (age > shelfHours(r.kind)) continue;
    let payload: Payload;
    try {
      payload = JSON.parse(r.payload) as Payload;
    } catch {
      continue;
    }
    out.tried++;
    if (await attempt(env, { ...r, payload })) out.sent++;
  }
  return out;
}

// Money in centimes → "520.00 MAD".
export function mad(cents: number | null | undefined): string {
  return `${(Number(cents || 0) / 100).toFixed(2)} MAD`;
}

// "15/11/2026" or "15/11/2026 14:05", Morocco time.
export function moroccoDate(value: string | Date | null | undefined, withTime = false): string {
  const d = value instanceof Date ? value : new Date(`${String(value ?? "").replace(" ", "T")}${/Z|[+-]\d\d:?\d\d$/.test(String(value ?? "")) ? "" : "Z"}`);
  if (Number.isNaN(d.getTime())) return "-";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Casablanca",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit", hour12: false } : {}),
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value || "";
  return `${get("day")}/${get("month")}/${get("year")}${withTime ? ` ${get("hour")}:${get("minute")}` : ""}`;
}
