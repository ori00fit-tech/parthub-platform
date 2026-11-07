// Server-side SEO for the storefront (Cloudflare Pages Functions).
//
// The storefront is a single-page app: crawlers and link previews (Google,
// WhatsApp, Facebook) get index.html before any JavaScript runs. These
// helpers put the real title, description, preview image, canonical URL and
// schema.org data into that HTML for part and store pages, and build
// robots.txt and sitemap.xml. Text is in French, the usual language of
// Moroccan e-commerce search.

import site from "./site.json";

// Addresses: written into site.json by the "Deploy Pages" workflow from the
// repository variables API_BASE_URL and SITE_URL (empty = defaults below).
const DEFAULT_API = "https://api.parthub.autos";
// Canonical address: the same page reached on *.pages.dev or a preview
// deployment counts as one page on the main domain for Google.
const DEFAULT_SITE = "https://parthub.autos";
export const SITE_NAME = "PartHub";

export function apiBase(env) {
  return String(env?.API_BASE_URL || site.apiBase || DEFAULT_API).replace(/\/$/, "");
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
  const { title, description, url, image, type = "website", jsonLd = [], noindex = false, status = 200, content = "" } = meta;

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
    .on("html", { element: (el) => el.setAttribute("lang", "fr") })
    .on("head", { element: (el) => el.append(`    ${tags}\n`, { html: true }) })
    // Readable page (heading, text, links) for crawlers and previews that
    // don't run JavaScript; React replaces it when the app starts.
    .on("div#root", { element: (el) => el.setInnerContent(fallbackHtml(title, description, content), { html: true }) })
    .transform(shell);

  const headers = new Headers(rewritten.headers);
  headers.set("content-type", "text/html; charset=utf-8");
  headers.set("cache-control", "public, max-age=300");
  return new Response(rewritten.body, { status, headers });
}

// The page as plain HTML inside #root: an <h1>, the description, any extra
// HTML the page passes (already escaped), and links to the main pages.
export function fallbackHtml(title, description, content = "") {
  const heading = String(title).split(" | ")[0];
  return [
    `<main style="max-width:960px;margin:0 auto;padding:24px 16px;font-family:'IBM Plex Sans',system-ui,sans-serif;color:#0f172a">`,
    `<h1 style="font-size:28px;line-height:1.25;margin:0 0 12px">${escapeHtml(heading)}</h1>`,
    `<p style="margin:0 0 16px;color:#475569">${escapeHtml(description)}</p>`,
    content,
    `<nav aria-label="PartHub"><ul style="display:flex;flex-wrap:wrap;gap:16px;list-style:none;padding:0;margin:16px 0 0">`,
    `<li><a href="/parts">Toutes les pièces auto</a></li>`,
    `<li><a href="/vehicle-selector">Chercher par véhicule</a></li>`,
    `<li><a href="/request-part">Demander une pièce</a></li>`,
    `<li><a href="/sell">Vendre sur PartHub</a></li>`,
    `<li><a href="/legal">Conditions et confidentialité</a></li>`,
    `</ul></nav>`,
    `</main>`,
  ].join("");
}

// Canonical address of the site (custom domain once SITE_URL is set), so
// the same page reached on *.pages.dev counts as one page for Google.
export function origin(request) {
  const host = new URL(request.url);
  // Local development keeps its own address.
  if (host.hostname === "localhost" || host.hostname === "127.0.0.1") return String(site.siteUrl || host.origin).replace(/\/$/, "");
  return String(site.siteUrl || DEFAULT_SITE).replace(/\/$/, "");
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
