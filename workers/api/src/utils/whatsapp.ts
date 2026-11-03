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

const GRAPH_API_VERSION = "v20.0";

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

export async function sendWhatsAppTemplate(
  env: Env,
  to: string,
  template: string,
  params: string[],
  options: { language?: string } = {}
): Promise<boolean> {
  if (!isWhatsAppConfigured(env)) return false;

  const number = normalizeWhatsAppNumber(to);
  if (!number) return false;

  const components = params.length
    ? [
        {
          type: "body",
          // WhatsApp rejects empty parameters and caps them at 1024 chars.
          parameters: params.map((text) => ({ type: "text", text: (text || "-").slice(0, 1024) })),
        },
      ]
    : [];

  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: number,
          type: "template",
          template: {
            name: template,
            language: { code: options.language || env.WHATSAPP_TEMPLATE_LANG || "fr" },
            components,
          },
        }),
      }
    );

    if (!res.ok) {
      console.warn(`[whatsapp] ${template} → ${res.status}: ${(await res.text()).slice(0, 300)}`);
    }
    return res.ok;
  } catch (err) {
    console.warn(`[whatsapp] ${template} failed:`, err instanceof Error ? err.message : err);
    return false;
  }
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
