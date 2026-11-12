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

async function finish(env: Env, n: Notice, values: { sent: boolean; status: string; lang: string | null; id?: string | null | undefined; error?: string | null | undefined }) {
  await env.DB.prepare(
    `update whatsapp_notifications set sent = ?4, status = ?5, status_at = datetime('now'), template = ?6, language = ?7,
       wa_message_id = coalesce(?8, wa_message_id), error = ?9
     where kind = ?1 and ref_id = ?2 and recipient = ?3`
  )
    .bind(n.kind, n.refId, n.recipient, values.sent ? 1 : 0, values.status, n.template, values.lang, values.id ?? null, values.error ?? null)
    .run();
}

// Returns true when Meta accepted the message.
export async function notify(env: Env, n: Notice): Promise<boolean> {
  try {
    if (!isWhatsAppConfigured(env)) return false;
    const number = normalizeWhatsAppNumber(n.phone);
    if (!number) return false;
    const claim = await env.DB.prepare(
      "insert or ignore into whatsapp_notifications (kind, ref_id, recipient, template) values (?1, ?2, ?3, ?4)"
    )
      .bind(n.kind, n.refId, n.recipient, n.template)
      .run();
    if (!Number(claim.meta?.changes)) return false; // already sent (or being sent)

    if (await isOptedOut(env, number)) {
      await finish(env, n, { sent: false, status: "skipped", lang: null, error: "Opted out (STOP)" });
      return false;
    }
    const choice = await chooseLanguage(env, n.template, n.locale);
    if (!choice.lang) {
      await finish(env, n, { sent: false, status: "skipped", lang: null, error: choice.reason });
      return false;
    }
    const lang = (asLang(choice.lang) || "fr") as WaLang;
    const params = typeof n.params === "function" ? n.params(lang) : n.params;
    const res = await sendTemplateMessage(env, number, n.template, choice.lang, params, n.buttonPath);
    if (!res.ok) console.warn(`[whatsapp] ${n.template}/${choice.lang} → ${res.error}`);
    await finish(env, n, {
      sent: res.ok,
      status: res.ok ? "sent" : "failed",
      lang: choice.lang,
      id: res.ok ? res.id || null : null,
      error: res.ok ? null : res.error || "Meta refused the message",
    });
    return res.ok;
  } catch (err) {
    console.warn(`[whatsapp] ${n.template}: ${err instanceof Error ? err.message : String(err)}`);
    return false;
  }
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
