// Which web pages may call the API from a browser (CORS). The API uses
// Bearer tokens (no cookies), so this is defence in depth: other sites
// cannot read API responses from a visitor's browser. Server-to-server
// calls (Pages Functions, WhatsApp webhooks) send no Origin and are not
// affected.

const SITES = ["https://parthub.autos", "https://www.parthub.autos", "https://seller.parthub.autos", "https://admin.parthub.autos"];
// Cloudflare Pages projects (production and preview addresses).
const PAGES = /^https:\/\/([a-z0-9-]+\.)?parthub-platform(-seller|-admin)?\.pages\.dev$/;
const LOCAL = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

export function allowedOrigin(origin: string, env: { APP_ENV?: string; STOREFRONT_URL?: string; SELLER_PORTAL_URL?: string; ADMIN_URL?: string }): string | null {
  if (!origin) return null;
  const extra = [env.STOREFRONT_URL, env.SELLER_PORTAL_URL, env.ADMIN_URL].filter(Boolean).map((u) => String(u).replace(/\/$/, ""));
  if (SITES.includes(origin) || extra.includes(origin) || PAGES.test(origin)) return origin;
  if (env.APP_ENV !== "production" && LOCAL.test(origin)) return origin;
  return null;
}
