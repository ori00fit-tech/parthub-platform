import { Hono } from "hono";
import type { Env, HonoVariables } from "../types";
import { authMiddleware } from "../middlewares/auth";
import { sellerGuard } from "../middlewares/seller";
import { buildPartImageKey } from "../utils/media";

export const mediaRoutes = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

// Responses carry both `ok` (used by the seller portal) and `success` (shared API shape).
function uploadFail(message: string, code: string) {
  return { ok: false, success: false, data: null, error: { code, message } };
}

mediaRoutes.post("/upload", authMiddleware, sellerGuard, async (c) => {
  const form = await c.req.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return c.json(uploadFail("file is required", "FILE_REQUIRED"), 400);
  }

  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return c.json(uploadFail("Only JPEG, PNG, WebP or GIF images are allowed", "INVALID_FILE_TYPE"), 415);
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return c.json(uploadFail("File is too large (max 5 MB)", "FILE_TOO_LARGE"), 413);
  }

  const key = buildPartImageKey(file.name);

  await c.env.MEDIA.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type },
    customMetadata: { uploaded_by: String(c.get("user_id")) },
  });

  return c.json({
    ok: true,
    success: true,
    data: { key, url: `/api/v1/media/${key}` },
    error: null,
  });
});
