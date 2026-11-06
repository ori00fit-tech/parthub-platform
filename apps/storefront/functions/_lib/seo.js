// Server-side SEO for the storefront (Cloudflare Pages Functions).
//
// The storefront is a single-page app: crawlers and link previews (Google,
// WhatsApp, Facebook) get index.html before any JavaScript runs. These
// helpers put the real title, description, preview image, canonical URL and
// schema.org data into that HTML for part and store pages, and build
// robots.txt and sitemap.xml. Text is in French, the usual language of
// Moroccan e-commerce search.

const DEFAULT_API = "https://parthub-api.ori00fit-c96.workers.dev";
export const SITE_NAME = "PartHub";

export function apiBase(env) {
  return String(env?.API_BASE_URL || DEFAULT_API).replace(/\/$/, "");
}

// GET an API path; { status, data } (data null when missing or on error).
export async function api(env, path) {
  const res = await fetch(`${apiBase(env)}${path}`, {
    headers: { accept: "application/json" },
    cf: { cacheTtl: 300, cacheEverything: true },
  });
  if (!res.ok) return { status: res.status, data: null };
  const body = await res.json().catch(() => null);
  return { status: 200, data: body?.data ?? null };
}

// Uploaded media may be an API path (/api/v1/media/...).
export function absoluteMedia(env, url) {
  if (!url) return "";
  return url.startsWith("/") ? `${apiBase(env)}${url}` : url;
}

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
}

export function clip(text, max = 160) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

// 3800 centimes → "38,00 MAD"
export function priceText(centimes) {
  const value = Number(centimes) / 100;
  if (!Number.isFinite(value)) return "";
  return `${value.toLocaleString("fr-MA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD`;
}

// JSON inside <script> must not close the tag.
function jsonLdTag(data) {
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`;
}

// index.html with this page's head. Falls back to the plain shell on error.
export async function renderShell(context, meta) {
  const { request, env } = context;
  const shell = await env.ASSETS.fetch(new URL("/", request.url));
  const { title, description, url, image, type = "website", jsonLd = [], noindex = false, status = 200 } = meta;

  const tags = [
    `<link rel="canonical" href="${escapeHtml(url)}" />`,
    noindex ? `<meta name="robots" content="noindex" />` : "",
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:type" content="${escapeHtml(type)}" />`,
    `<meta property="og:locale" content="fr_MA" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:url" content="${escapeHtml(url)}" />`,
    image ? `<meta property="og:image" content="${escapeHtml(image)}" />` : "",
    `<meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}" />`,
    ...jsonLd.map(jsonLdTag),
  ].filter(Boolean).join("\n    ");

  const rewritten = new HTMLRewriter()
    .on("title", { element: (el) => el.setInnerContent(title) })
    .on('meta[name="description"]', { element: (el) => el.setAttribute("content", description) })
    .on("head", { element: (el) => el.append(`    ${tags}\n`, { html: true }) })
    .transform(shell);

  const headers = new Headers(rewritten.headers);
  headers.set("content-type", "text/html; charset=utf-8");
  headers.set("cache-control", "public, max-age=300");
  return new Response(rewritten.body, { status, headers });
}

export function origin(request) {
  return new URL(request.url).origin;
}

// Plain index.html (the app shows its own "not found" / error state).
export function plainShell(context) {
  return context.env.ASSETS.fetch(new URL("/", context.request.url));
}

const CONDITION = {
  new: "https://schema.org/NewCondition",
  used: "https://schema.org/UsedCondition",
  refurbished: "https://schema.org/RefurbishedCondition",
};
const CONDITION_FR = { new: "neuve", used: "d'occasion", refurbished: "reconditionnée" };

export function conditionSchema(condition) {
  return CONDITION[condition] || CONDITION.new;
}

export function conditionFr(condition) {
  return CONDITION_FR[condition] || "";
}

export function ratingSchema(rating) {
  const count = Number(rating?.count || 0);
  if (!count || rating?.average == null) return null;
  return { "@type": "AggregateRating", ratingValue: Number(rating.average), reviewCount: count, bestRating: 5, worstRating: 1 };
}
