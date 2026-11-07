// Adds the security headers to every response, including the pages that
// Functions build (see _lib/security-headers.js).
import { SECURITY_HEADERS } from "./_lib/security-headers.js";

export async function onRequest(context) {
  const res = await context.next();
  const out = new Response(res.body, res);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    if (!out.headers.has(name)) out.headers.set(name, value);
  }
  // Built files have a content hash in their name: cache them for a year.
  if (out.ok && new URL(context.request.url).pathname.startsWith("/assets/")) {
    out.headers.set("Cache-Control", "public, max-age=31536000, immutable");
  }
  return out;
}
