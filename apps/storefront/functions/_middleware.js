// Adds the security headers to every response, including the pages that
// Functions build (see _lib/security-headers.js).
import { SECURITY_HEADERS } from "./_lib/security-headers.js";
import { isKnownPage } from "./_lib/routes.js";

export async function onRequest(context) {
  const path = new URL(context.request.url).pathname;
  // Machine-read files (/.well-known/..., *.json, *.txt) that don't exist
  // must be a 404, not the app's HTML (the single-page fallback).
  let res = await context.next();
  if ((path.startsWith("/.well-known/") || /\.(json|txt|xml)$/.test(path)) && (res.headers.get("content-type") || "").includes("text/html")) {
    res = new Response("Not found\n", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  }
  // An address that is no page of the site: the app still shows its "page
  // not found" screen, but with status 404 and noindex, so search engines
  // don't index it as a copy of the home page (a "soft 404").
  else if (res.status === 200 && (res.headers.get("content-type") || "").includes("text/html") && !/\.[a-z0-9]+$/i.test(path) && !isKnownPage(path)) {
    const html = (await res.text()).replace("<head>", '<head><meta name="robots" content="noindex">');
    const headers = new Headers(res.headers);
    headers.set("X-Robots-Tag", "noindex");
    headers.delete("content-length");
    res = new Response(html, { status: 404, headers });
  }
  const out = new Response(res.body, res);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    if (!out.headers.has(name)) out.headers.set(name, value);
  }
  // Built files have a content hash in their name: cache them for a year.
  if (out.ok && path.startsWith("/assets/")) {
    out.headers.set("Cache-Control", "public, max-age=31536000, immutable");
  }
  return out;
}
