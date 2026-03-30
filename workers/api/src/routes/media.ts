import { Hono } from "hono";
import { buildPartImageKey } from "../utils/media";

export const mediaRoutes = new Hono();

function success(data: unknown, meta: unknown = null) {
  return {
    ok: true,
    data,
    meta,
    error: null,
  };
}

function failure(code: string, message: string) {
  return {
    ok: false,
    data: null,
    meta: null,
    error: {
      code,
      message,
    },
  };
}

mediaRoutes.get("/health", (c) => {
  return c.json(
    success({
      service: "media",
      status: "ok",
    })
  );
});

mediaRoutes.post("/upload", async (c) => {
  try {
    const contentType = c.req.header("content-type") || "";

    if (!contentType.includes("multipart/form-data")) {
      return c.json(
        failure("INVALID_CONTENT_TYPE", "Expected multipart/form-data"),
        400
      );
    }

    const body = await c.req.parseBody();
    const file = body.file;

    if (!file || !(file instanceof File)) {
      return c.json(
        failure("FILE_REQUIRED", "A file field is required"),
        400
      );
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return c.json(
        failure(
          "UNSUPPORTED_FILE_TYPE",
          "Only JPG, PNG, and WEBP images are allowed"
        ),
        400
      );
    }

    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      return c.json(
        failure("FILE_TOO_LARGE", "Image must be 5MB or smaller"),
        400
      );
    }

    const key = buildPartImageKey(file.name);
    const arrayBuffer = await file.arrayBuffer();

    await c.env.MEDIA.put(key, arrayBuffer, {
      httpMetadata: {
        contentType: file.type,
      },
    });

    const publicUrl = `https://pub-be9a8908c38644218fbb6a343a760049.r2.dev/${key}`;

    return c.json(
      success(
        {
          key,
          url: publicUrl,
          filename: file.name,
          content_type: file.type,
          size: file.size,
        },
        {
          bucket: "parthub-media",
        }
      )
    );
  } catch (error) {
    return c.json(
      failure(
        "UPLOAD_FAILED",
        error instanceof Error ? error.message : "Unknown upload error"
      ),
      500
    );
  }
});
