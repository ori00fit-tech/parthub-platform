// Adds the security headers to every response, including the pages that
// Functions build (see _lib/security-headers.js).
import { SECURITY_HEADERS } from "./_lib/security-headers.js";

export async function onRequest(context) {
  const res = await context.next();
  const out = new Response(res.body, res);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    if (!out.headers.has(name)) out.headers.set(name, value);
  }
  return out;
}
