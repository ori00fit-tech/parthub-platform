// ============================================================
// WhatsApp Cloud API helpers
//
// Notifications are best-effort: if WhatsApp isn't configured, the number is
// invalid, or Meta rejects the call, we log and move on. They never block or
// fail the request that triggered them.
//
// Template messages must be approved in Meta Business Manager first. The
// templates used here are documented in infra/docs/whatsapp-notifications.md.
// ============================================================
import type { Context } from "hono";
import type { Env } from "../types";

export const GRAPH_API_VERSION = "v20.0";

export function isWhatsAppConfigured(env: Env): boolean {
  return Boolean(env.WHATSAPP_ACCESS_TOKEN && env.WHATSAPP_PHONE_NUMBER_ID);
}

// Converts a stored phone number to the international digits WhatsApp expects.
// Handles Moroccan local numbers ("06 12 34 56 78" → "212612345678") and the
// "00" international prefix. Returns null when the result can't be a valid number.
export function normalizeWhatsAppNumber(phone: string | null | undefined): string | null {
  let digits = String(phone ?? "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("00")) digits = digits.slice(2);
  else if (digits.startsWith("0")) digits = `212${digits.slice(1)}`;
  return digits.length >= 10 && digits.length <= 15 ? digits : null;
}

// Sends an approved template. Returns WhatsApp's message id (truthy) so
// its delivery status can be followed (webhook), or false. Numbers that
// replied STOP are skipped. (Event notifications go through
// utils/wa-notify.ts, which also picks the language.)
export async function sendWhatsAppTemplate(
  env: Env,
  to: string,
  template: string,
  params: string[],
  options: { language?: string; buttonPath?: string } = {}
): Promise<string | false> {
  if (!isWhatsAppConfigured(env)) return false;

  const number = normalizeWhatsAppNumber(to);
  if (!number) return false;
  if (await isOptedOut(env, number)) return false;

  const res = await sendTemplateMessage(env, number, template, options.language || env.WHATSAPP_TEMPLATE_LANG || "fr", params, options.buttonPath);
  if (!res.ok) console.warn(`[whatsapp] ${template} → ${res.error}`);
  return res.ok ? res.id || "sent" : false;
}

// One template message to a normalized number, in one language. The URL
// button (if the template has one) gets `buttonPath` as its {{1}}.
export async function sendTemplateMessage(
  env: Env,
  number: string,
  template: string,
  language: string,
  params: string[],
  buttonPath?: string
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const components: Array<Record<string, unknown>> = [];
  if (params.length) {
    components.push({
      type: "body",
      // WhatsApp rejects empty parameters, new lines in them, and caps them at 1024 chars.
      parameters: params.map((text) => ({ type: "text", text: (String(text ?? "").replace(/\s*\n\s*/g, " ").trim() || "-").slice(0, 1024) })),
    });
  }
  if (buttonPath) {
    components.push({ type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: buttonPath.replace(/^\//, "") }] });
  }
  return graphSend(env, {
    to: number,
    type: "template",
    template: { name: template, language: { code: language }, components },
  });
}

// A free text message (replies from the admin inbox). WhatsApp only allows
// it within 24 hours of the person's last message.
export async function sendWhatsAppText(env: Env, to: string, text: string): Promise<{ ok: boolean; id?: string; error?: string }> {
  if (!isWhatsAppConfigured(env)) return { ok: false, error: "WhatsApp is not configured" };
  const number = normalizeWhatsAppNumber(to);
  if (!number) return { ok: false, error: "Invalid number" };
  return graphSend(env, { to: number, type: "text", text: { body: text.slice(0, 4096), preview_url: true } });
}

async function graphSend(env: Env, message: Record<string, unknown>): Promise<{ ok: boolean; id?: string; error?: string }> {
  try {
    const res = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", ...message }),
    });
    const body = (await res.json().catch(() => null)) as { messages?: Array<{ id?: string }>; error?: { message?: string; code?: number } } | null;
    if (!res.ok) return { ok: false, error: `${res.status} ${body?.error?.code ?? ""} ${body?.error?.message ?? ""}`.trim().slice(0, 300) };
    const id = body?.messages?.[0]?.id;
    return id ? { ok: true, id } : { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function isOptedOut(env: Env, number: string): Promise<boolean> {
  try {
    const row = await env.DB.prepare("select opted_out_at from whatsapp_contacts where phone = ?1").bind(number).first<{ opted_out_at: string | null }>();
    return Boolean(row?.opted_out_at);
  } catch {
    return false; // table not there yet: never block a notification for that
  }
}

// ── Webhook (Meta → PartHub) ───────────────────────────────────────────
// Meta signs every POST with the app secret: X-Hub-Signature-256 =
// "sha256=" + HMAC-SHA256(app secret, raw body).
export async function verifyMetaSignature(appSecret: string | undefined, rawBody: string, header: string | null): Promise<boolean> {
  if (!appSecret || !header?.startsWith("sha256=")) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(appSecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const expected = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
  const got = header.slice(7).toLowerCase();
  if (got.length !== expected.length) return false;
  let d = 0;
  for (let i = 0; i < got.length; i++) d |= got.charCodeAt(i) ^ expected.charCodeAt(i);
  return d === 0;
}

const STOP_WORDS = /^(stop|arret|arreter|unsubscribe|desabonner|إيقاف|توقف|الغاء الاشتراك)$/;
const START_WORDS = /^(start|reprendre|subscribe|abonner|تفعيل)$/;
const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^\p{L}\p{N} ]/gu, "").trim();
const tsText = (unix: unknown) => {
  const n = Number(unix);
  return (Number.isFinite(n) && n > 0 ? new Date(n * 1000) : new Date()).toISOString().slice(0, 19).replace("T", " ");
};

type WaStatus = { id?: string; status?: string; timestamp?: string; recipient_id?: string; errors?: Array<{ code?: number; title?: string; message?: string; error_data?: { details?: string } }> };
type WaMessage = {
  id?: string; from?: string; timestamp?: string; type?: string;
  text?: { body?: string }; button?: { text?: string }; interactive?: { button_reply?: { title?: string }; list_reply?: { title?: string } };
  image?: { caption?: string }; document?: { caption?: string; filename?: string }; location?: { latitude?: number; longitude?: number; name?: string };
};

function messageText(m: WaMessage): string {
  if (m.type === "text") return m.text?.body || "";
  if (m.type === "button") return m.button?.text || "";
  if (m.type === "interactive") return m.interactive?.button_reply?.title || m.interactive?.list_reply?.title || "";
  if (m.type === "image") return m.image?.caption ? `[image] ${m.image.caption}` : "[image]";
  if (m.type === "document") return `[document] ${m.document?.filename || m.document?.caption || ""}`.trim();
  if (m.type === "location") return `[location] ${m.location?.name || ""} ${m.location?.latitude ?? ""},${m.location?.longitude ?? ""}`.trim();
  return `[${m.type || "message"}]`;
}

// Applies one webhook body: delivery statuses of what we sent, and the
// messages people send us. Idempotent (Meta retries).
export async function handleWhatsAppWebhook(DB: D1Database, body: unknown): Promise<{ statuses: number; messages: number; opt_outs: number }> {
  const out = { statuses: 0, messages: 0, opt_outs: 0 };
  const entries = (body as { entry?: Array<{ changes?: Array<{ field?: string; value?: Record<string, unknown> }> }> })?.entry || [];
  for (const entry of entries) {
    for (const change of entry.changes || []) {
      const value = change.value || {};
      for (const st of (value.statuses as WaStatus[] | undefined) || []) {
        if (!st.id || !st.status) continue;
        const at = tsText(st.timestamp);
        const err = st.errors?.[0] ? `${st.errors[0].code ?? ""} ${st.errors[0].title || st.errors[0].message || ""} ${st.errors[0].error_data?.details || ""}`.trim().slice(0, 300) : null;
        // Statuses can arrive out of order: never go back from read / failed.
        const rank = "case ?2 when 'sent' then 1 when 'delivered' then 2 when 'read' then 3 when 'failed' then 4 else 0 end";
        const cur = "case coalesce(status, '') when 'sent' then 1 when 'delivered' then 2 when 'read' then 3 when 'failed' then 4 else 0 end";
        await DB.batch([
          DB.prepare(`update whatsapp_notifications set status = ?2, status_at = ?3, error = coalesce(?4, error) where wa_message_id = ?1 and ${rank} > ${cur}`).bind(st.id, st.status, at, err),
          DB.prepare(`update whatsapp_messages set status = ?2, error = coalesce(?4, error) where wa_message_id = ?1 and direction = 'out' and ${rank} > ${cur} and ?3 is not null`).bind(st.id, st.status, at, err),
        ]);
        out.statuses++;
      }
      const names = new Map<string, string>();
      for (const ct of (value.contacts as Array<{ wa_id?: string; profile?: { name?: string } }> | undefined) || []) {
        if (ct.wa_id && ct.profile?.name) names.set(ct.wa_id, ct.profile.name.slice(0, 120));
      }
      for (const m of (value.messages as WaMessage[] | undefined) || []) {
        if (!m.id || !m.from) continue;
        const text = messageText(m).slice(0, 4096);
        const at = tsText(m.timestamp);
        const ins = await DB.prepare(
          "insert or ignore into whatsapp_messages (wa_message_id, direction, phone, type, body, created_at) values (?1, 'in', ?2, ?3, ?4, ?5)"
        ).bind(m.id, m.from, m.type || "text", text, at).run();
        if (!Number(ins.meta?.changes)) continue; // retry of a message already stored
        const word = fold(text);
        const optOut = STOP_WORDS.test(word);
        const optIn = START_WORDS.test(word);
        await DB.prepare(
          `insert into whatsapp_contacts (phone, name, last_inbound_at, opted_out_at, updated_at) values (?1, ?2, ?3, case when ?4 then ?3 else null end, datetime('now'))
           on conflict(phone) do update set name = coalesce(excluded.name, name),
             last_inbound_at = max(coalesce(last_inbound_at, ''), excluded.last_inbound_at),
             opted_out_at = case when ?4 then excluded.last_inbound_at when ?5 then null else opted_out_at end,
             updated_at = datetime('now')`
        ).bind(m.from, names.get(m.from) ?? null, at, optOut ? 1 : 0, optIn ? 1 : 0).run();
        out.messages++;
        if (optOut) out.opt_outs++;
      }
    }
  }
  return out;
}

// Run work after the response is sent (Cloudflare `waitUntil`). Outside a
// Worker (tests, local scripts) there is no execution context, so the promise
// just runs on its own.
export function runInBackground(c: Context, work: Promise<unknown>): void {
  const safe = work.catch((err) =>
    console.warn("[background] task failed:", err instanceof Error ? err.message : err)
  );
  try {
    c.executionCtx.waitUntil(safe);
  } catch {
    // No execution context available.
  }
}
