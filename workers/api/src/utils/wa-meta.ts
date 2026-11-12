// ============================================================
// Meta's side of the templates: read their review status, submit the
// missing ones (Admin › WhatsApp › Templates). Needs the WhatsApp Business
// account id (secret WHATSAPP_BUSINESS_ACCOUNT_ID) and an access token
// allowed to manage templates (whatsapp_business_management).
// Without the id, the admin sets each status by hand.
// ============================================================
import type { Env } from "../types";
import { GRAPH_API_VERSION } from "./whatsapp";
import { WA_LANGS, WA_TEMPLATES, WA_TEMPLATE_BY_NAME, metaTemplatePayload, type WaLang } from "./wa-templates";
import { asLang } from "./wa-notify";

export const TEMPLATE_STATUSES = ["draft", "pending", "approved", "rejected", "paused", "disabled", "error"] as const;
// Meta creates at most 100 templates an hour; a Worker call makes a limited
// number of sub-requests: submit in batches, the page repeats until done.
export const SUBMIT_BATCH = 20;

export function canManageTemplates(env: Env): boolean {
  return Boolean(env.WHATSAPP_ACCESS_TOKEN && env.WHATSAPP_BUSINESS_ACCOUNT_ID);
}

export function siteUrls(env: Env) {
  return {
    storefront: (env.STOREFRONT_URL || "https://parthub.autos").replace(/\/$/, ""),
    seller: (env.SELLER_PORTAL_URL || "https://seller.parthub.autos").replace(/\/$/, ""),
  };
}

type MetaTemplate = { id?: string; name?: string; language?: string; status?: string; category?: string; rejected_reason?: string };

async function graph(env: Env, path: string, init: RequestInit = {}): Promise<{ ok: boolean; body: any; error?: string }> {
  try {
    const res = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`, "Content-Type": "application/json" },
    });
    const body = (await res.json().catch(() => null)) as any;
    if (!res.ok) {
      const e = body?.error;
      return { ok: false, body, error: `${res.status} ${e?.code ?? ""} ${e?.error_user_msg || e?.message || ""}`.trim().slice(0, 400) };
    }
    return { ok: true, body };
  } catch (err) {
    return { ok: false, body: null, error: err instanceof Error ? err.message : String(err) };
  }
}

// Reads every template of the account and records the status of ours.
export async function syncTemplates(env: Env): Promise<{ ok: boolean; error?: string; found: number }> {
  if (!canManageTemplates(env)) return { ok: false, error: "WHATSAPP_BUSINESS_ACCOUNT_ID is not set", found: 0 };
  const seen: MetaTemplate[] = [];
  let path: string | null = `${env.WHATSAPP_BUSINESS_ACCOUNT_ID}/message_templates?fields=id,name,language,status,category,rejected_reason&limit=200`;
  for (let page = 0; path && page < 10; page++) {
    const res = await graph(env, path);
    if (!res.ok) return { ok: false, error: res.error || "Meta refused the request", found: seen.length };
    seen.push(...((res.body?.data as MetaTemplate[]) || []));
    const next: string | undefined = res.body?.paging?.next;
    path = next ? next.replace(/^https:\/\/graph\.facebook\.com\/v[\d.]+\//, "") : null;
  }
  const ours = seen.filter((t) => t.name && WA_TEMPLATE_BY_NAME[t.name] && t.language);
  const stmts = [
    // What Meta no longer has (deleted there) goes; hand-set rows stay.
    env.DB.prepare("DELETE FROM whatsapp_templates WHERE source = 'meta'"),
    ...ours.map((t) =>
      env.DB.prepare(
        `INSERT INTO whatsapp_templates (name, language, status, category, reason, meta_id, source, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'meta', datetime('now'))
         ON CONFLICT(name, language) DO UPDATE SET status = excluded.status, category = excluded.category,
           reason = excluded.reason, meta_id = excluded.meta_id, source = 'meta', updated_at = excluded.updated_at`
      ).bind(
        t.name,
        t.language,
        String(t.status || "pending").toLowerCase(),
        t.category || null,
        t.rejected_reason && t.rejected_reason !== "NONE" ? t.rejected_reason : null,
        t.id || null
      )
    ),
  ];
  await env.DB.batch(stmts);
  return { ok: true, found: ours.length };
}

// Creates in Meta the versions not there yet (all, or one template).
export async function submitTemplates(
  env: Env,
  only?: { name?: string | undefined; language?: string | undefined }
): Promise<{ ok: boolean; error?: string; submitted: Array<{ name: string; language: string; status: string; error?: string }>; remaining: number }> {
  if (!canManageTemplates(env)) return { ok: false, error: "WHATSAPP_BUSINESS_ACCOUNT_ID is not set", submitted: [], remaining: 0 };
  const synced = await syncTemplates(env);
  if (!synced.ok) return { ok: false, error: synced.error || "Could not read Meta's templates", submitted: [], remaining: 0 };
  const rows = await env.DB.prepare("SELECT name, language, source, status FROM whatsapp_templates").all<{ name: string; language: string; source: string; status: string }>();
  const inMeta = new Set((rows.results || []).filter((r) => r.source === "meta").map((r) => `${r.name}|${asLang(r.language)}`));
  // Refused at submission: retried only when that template is submitted
  // on its own (after its text is fixed), so a batch run always ends.
  const refused = new Set((rows.results || []).filter((r) => r.status === "error").map((r) => `${r.name}|${asLang(r.language)}`));
  const todo: Array<{ name: string; lang: WaLang }> = [];
  for (const t of WA_TEMPLATES) {
    if (only?.name && t.name !== only.name) continue;
    for (const lang of WA_LANGS) {
      if (only?.language && lang !== only.language) continue;
      const key = `${t.name}|${lang}`;
      if (!inMeta.has(key) && (only?.name || !refused.has(key))) todo.push({ name: t.name, lang });
    }
  }
  const urls = siteUrls(env);
  const submitted: Array<{ name: string; language: string; status: string; error?: string }> = [];
  for (const { name, lang } of todo.slice(0, SUBMIT_BATCH)) {
    const def = WA_TEMPLATE_BY_NAME[name];
    if (!def) continue;
    const res = await graph(env, `${env.WHATSAPP_BUSINESS_ACCOUNT_ID}/message_templates`, {
      method: "POST",
      body: JSON.stringify(metaTemplatePayload(def, lang, urls)),
    });
    const status = res.ok ? String(res.body?.status || "pending").toLowerCase() : "error";
    await env.DB.prepare(
      `INSERT INTO whatsapp_templates (name, language, status, category, reason, meta_id, source, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, datetime('now'))
       ON CONFLICT(name, language) DO UPDATE SET status = excluded.status, category = excluded.category, reason = excluded.reason,
         meta_id = excluded.meta_id, source = excluded.source, updated_at = excluded.updated_at`
    )
      .bind(name, lang, status, res.ok ? res.body?.category || def.category : null, res.ok ? null : res.error || null, res.ok ? res.body?.id || null : null, res.ok ? "meta" : "manual")
      .run();
    submitted.push(res.ok ? { name, language: lang, status } : { name, language: lang, status, error: res.error || "Meta refused it" });
  }
  return { ok: true, submitted, remaining: Math.max(0, todo.length - SUBMIT_BATCH) };
}

// What the admin page shows: the catalog, each language's status, and
// what was sent with each template over 30 days.
export async function templateCenter(env: Env) {
  const rows = await env.DB.prepare("SELECT name, language, status, category, reason, source, updated_at FROM whatsapp_templates")
    .all<{ name: string; language: string; status: string; category: string | null; reason: string | null; source: string; updated_at: string }>();
  const stats = await env.DB.prepare(
    `SELECT template, COUNT(*) AS total,
            SUM(CASE WHEN status IN ('sent','delivered','read') THEN 1 ELSE 0 END) AS sent,
            SUM(CASE WHEN status IN ('delivered','read') THEN 1 ELSE 0 END) AS delivered,
            SUM(CASE WHEN status = 'read' THEN 1 ELSE 0 END) AS read,
            SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed,
            SUM(CASE WHEN status = 'skipped' THEN 1 ELSE 0 END) AS skipped,
            (SELECT error FROM whatsapp_notifications x WHERE x.template = n.template AND x.error IS NOT NULL ORDER BY x.id DESC LIMIT 1) AS last_error
     FROM whatsapp_notifications n
     WHERE template IS NOT NULL AND created_at >= datetime('now', '-30 days')
     GROUP BY template`
  ).all<Record<string, any>>();
  const statsBy = new Map((stats.results || []).map((s) => [s.template as string, s]));
  const urls = siteUrls(env);
  return {
    can_manage: canManageTemplates(env),
    sending: Boolean(env.WHATSAPP_ACCESS_TOKEN && env.WHATSAPP_PHONE_NUMBER_ID),
    languages: WA_LANGS,
    templates: WA_TEMPLATES.map((t) => {
      const versions: Record<string, unknown> = {};
      for (const r of (rows.results || []).filter((x) => x.name === t.name)) {
        const l = asLang(r.language);
        if (l) versions[l] = { code: r.language, status: r.status, category: r.category, reason: r.reason, source: r.source, updated_at: r.updated_at };
      }
      const s = statsBy.get(t.name);
      return {
        name: t.name,
        audience: t.audience,
        category: t.category,
        trigger: t.trigger,
        legacy: Boolean(t.legacy),
        params: t.params,
        body: t.body,
        button: t.button ? { text: t.button.text, url: `${urls[t.button.site]}/{{1}}`, example: t.button.example } : null,
        versions,
        stats: {
          total: Number(s?.total || 0),
          sent: Number(s?.sent || 0),
          delivered: Number(s?.delivered || 0),
          read: Number(s?.read || 0),
          failed: Number(s?.failed || 0),
          skipped: Number(s?.skipped || 0),
          last_error: s?.last_error || null,
        },
      };
    }),
  };
}
