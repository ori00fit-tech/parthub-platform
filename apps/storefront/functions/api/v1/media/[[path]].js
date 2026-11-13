// /api/v1/media/… on the storefront's own address: the photo, from the API.
// Photos are stored as paths (/api/v1/media/uploads/…); anything that uses
// such a path on parthub.autos (a page, a shared link, an old e-mail) gets
// the image instead of the site's HTML. Only uploads, only images.
const API = "https://api.parthub.autos";

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/v1/media/uploads/") || url.pathname.includes("..")) {
    return new Response("Not found\n", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  }
  const origin = String(env?.API_ORIGIN || API).replace(/\/$/, "");
  const res = await fetch(`${origin}${url.pathname}`, { cf: { cacheEverything: true, cacheTtl: 86400 } });
  const type = res.headers.get("content-type") || "";
  if (!res.ok || !type.startsWith("image/")) {
    return new Response("Not found\n", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  }
  return new Response(res.body, {
    status: 200,
    headers: {
      "content-type": type,
      // Stored photos never change (their name has a timestamp and a random part).
      "cache-control": "public, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
    },
  });
}

export const onRequestHead = onRequestGet;
