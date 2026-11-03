import { Hono } from "hono";
import type { Env, HonoVariables } from "../types";
import { authMiddleware } from "../middlewares/auth";
import { sellerGuard } from "../middlewares/seller";
import {
  MEDIA_URL_PREFIX,
  SERVABLE_IMAGE_TYPES,
  buildPartImageKey,
  readImageUpload,
} from "../utils/media";

export const mediaRoutes = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

// Responses carry both `ok` (used by the seller portal) and `success` (shared API shape).
function uploadFail(message: string, code: string) {
  return { ok: false, success: false, data: null, error: { code, message } };
}

// POST /api/v1/media/upload — seller part images
mediaRoutes.post("/upload", authMiddleware, sellerGuard, async (c) => {
  const form = await c.req.formData();
  const file = form.get("file");

  const image = await readImageUpload(file);
  if (!image.ok) return c.json(uploadFail(image.message, image.code), image.status);

  const key = buildPartImageKey((file as File).name, image.type);

  await c.env.MEDIA.put(key, image.bytes, {
    httpMetadata: { contentType: image.type.mime },
    customMetadata: { uploaded_by: String(c.get("user_id")) },
  });

  return c.json({
    ok: true,
    success: true,
    data: { key, url: `${MEDIA_URL_PREFIX}${key}` },
    error: null,
  });
});

// GET /api/v1/media/<key> — serve an uploaded image from R2.
// Only image types are served; anything else stored before uploads were
// restricted is refused rather than rendered by the browser.
mediaRoutes.get("/*", async (c) => {
  const key = decodeURIComponent(c.req.path.slice(MEDIA_URL_PREFIX.length));
  if (!key.startsWith("uploads/") || key.includes("..")) {
    return c.json(uploadFail("Not found", "NOT_FOUND"), 404);
  }

  const object = await c.env.MEDIA.get(key);
  if (!object) return c.json(uploadFail("Not found", "NOT_FOUND"), 404);

  const contentType = object.httpMetadata?.contentType || "";
  if (!SERVABLE_IMAGE_TYPES.has(contentType)) {
    return c.json(uploadFail("Not found", "NOT_FOUND"), 404);
  }

  return new Response(object.body, {
    headers: {
      "Content-Type": contentType,
      // Keys contain a timestamp and random id, so content never changes.
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      ETag: object.httpEtag,
    },
  });
});
