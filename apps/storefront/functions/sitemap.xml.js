// /sitemap.xml — home, parts list, every active part and store, the
// category / car landing pages that have parts, legal pages.
import { api, origin } from "./_lib/seo.js";

const STATIC = ["/", "/parts", "/sell", "/request-part", "/legal/terms", "/legal/returns", "/legal/privacy", "/legal/seller"];

const xmlEscape = (s) => String(s).replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]);
const day = (value) => {
  const d = new Date(`${String(value || "").replace(" ", "T")}Z`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
};

export async function onRequestGet(context) {
  const base = origin(context.request);
  let parts = [];
  let sellers = [];
  let landings = [];
  let ok = true;
  try {
    const { data } = await api(context.env, "/api/v1/catalog/sitemap");
    parts = data?.parts || [];
    sellers = data?.sellers || [];
    landings = data?.landings || [];
    ok = Boolean(data);
  } catch {
    ok = false;
  }

  // API down: answer 503 + Retry-After, not a sitemap with only the static
  // pages (Google would read that as "every part page is gone"). Google
  // keeps the last good sitemap and comes back.
  if (!ok) {
    return new Response("Sitemap temporarily unavailable\n", {
      status: 503,
      headers: { "content-type": "text/plain; charset=utf-8", "retry-after": "300", "cache-control": "no-store" },
    });
  }

  const entry = (path, lastmod, priority) =>
    `  <url><loc>${xmlEscape(base + path)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}${priority ? `<priority>${priority}</priority>` : ""}</url>`;
  const urls = [
    ...STATIC.map((p) => entry(p, null, p === "/" ? "1.0" : p === "/parts" ? "0.9" : "0.3")),
    ...landings.map((path) => entry(path, null, path.split("/").length <= 3 ? "0.7" : "0.6")),
    ...parts.map((p) => entry(`/parts/${encodeURIComponent(p.slug)}`, day(p.updated_at), "0.8")),
    ...sellers.map((s) => entry(`/sellers/${encodeURIComponent(s.slug)}`, day(s.updated_at), "0.6")),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
  return new Response(xml, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
