// /robots.txt — let crawlers in, keep private pages out, point to the sitemap.
export function onRequestGet({ request }) {
  const base = new URL(request.url).origin;
  const body = [
    "User-agent: *",
    "Allow: /",
    "Disallow: /cart",
    "Disallow: /checkout",
    "Disallow: /account",
    "Disallow: /orders",
    "Disallow: /requests",
    "Disallow: /auth",
    "Disallow: /compare",
    "",
    `Sitemap: ${base}/sitemap.xml`,
    "",
  ].join("\n");
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=86400" } });
}
