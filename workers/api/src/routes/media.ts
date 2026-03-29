import { Hono } from "hono";
import type { Env, HonoVariables } from "../types";
import { authMiddleware } from "../middlewares/auth";
import { ok, fail } from "../utils/response";
import { dbRun } from "../utils/db";

export const mediaRoutes = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

// POST /api/v1/media/upload
mediaRoutes.post("/upload", authMiddleware, async (c) => {
  const sellerId = c.get("seller_id");
  const userId = c.get("user_id");

  const formData = await c.req.formData();
  const file = formData.get("file") as File | null;
  const context = formData.get("context") as string ?? "parts"; // parts | stores | reviews
  const contextId = formData.get("context_id") as string ?? "";

  if (!file) return fail(c, "No file provided");
  if (!ALLOWED_TYPES.includes(file.type)) return fail(c, "Only JPEG, PNG, WebP allowed");
  if (file.size > MAX_SIZE) return fail(c, "File too large (max 5MB)");

  const ext = file.type.split("/")[1];
  const key = `${context}/${sellerId ?? userId}/${contextId}/${Date.now()}.${ext}`;

  await c.env.MEDIA.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type },
  });

  const url = `https://media.parthub.site/${key}`;

  // If part image, insert record
  if (context === "parts" && contextId) {
    await dbRun(
      c.env.DB,
      "INSERT INTO part_images (part_id, url, sort_order) VALUES (?, ?, (SELECT COALESCE(MAX(sort_order),0)+1 FROM part_images WHERE part_id = ?))",
      [contextId, url, contextId]
    );
  }

  return ok(c, { url, key });
});

// DELETE /api/v1/media/:key
mediaRoutes.delete("/:key{.+}", authMiddleware, async (c) => {
  const key = c.req.param("key");
  await c.env.MEDIA.delete(key);
  return ok(c, { message: "Deleted" });
});
