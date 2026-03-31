import { Hono } from "hono";
import type { Env, HonoVariables } from "../types";
import { fail, ok } from "../utils/response";

export const mediaRoutes = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

mediaRoutes.post("/upload", async (c) => {
  const form = await c.req.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return fail(c, "file is required", 400);
  }

  const key = `${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
  const arrayBuffer = await file.arrayBuffer();

  await c.env.MEDIA.put(key, arrayBuffer, {
    httpMetadata: {
      contentType: file.type || "application/octet-stream",
    },
  });

  return ok(c, {
    key,
    url: `/api/v1/media/${key}`,
  });
});
