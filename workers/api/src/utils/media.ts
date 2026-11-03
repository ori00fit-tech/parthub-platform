// ============================================================
// Media helpers shared by seller uploads and buyer request photos.
//
// The file type is detected from the file's first bytes ("magic numbers"),
// never from the browser-supplied Content-Type or file name, so a renamed
// HTML/SVG/script file can't be stored and later served as an image.
// ============================================================

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MEDIA_URL_PREFIX = "/api/v1/media/";

export type ImageType = { mime: string; ext: string };

export const SERVABLE_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export function detectImageType(bytes: Uint8Array): ImageType | null {
  const starts = (sig: number[], offset = 0) => sig.every((b, i) => bytes[offset + i] === b);

  if (starts([0xff, 0xd8, 0xff])) return { mime: "image/jpeg", ext: "jpg" };
  if (starts([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { mime: "image/png", ext: "png" };
  if (starts([0x47, 0x49, 0x46, 0x38]) && (bytes[4] === 0x37 || bytes[4] === 0x39) && bytes[5] === 0x61) {
    return { mime: "image/gif", ext: "gif" };
  }
  // RIFF....WEBP
  if (starts([0x52, 0x49, 0x46, 0x46]) && starts([0x57, 0x45, 0x42, 0x50], 8)) {
    return { mime: "image/webp", ext: "webp" };
  }
  return null;
}

export function sanitizeFilename(filename: string) {
  return filename
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/, "") // extension comes from the detected type
    .replace(/[^a-z0-9\-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "image";
}

function randomId(length = 10) {
  const alphabet = "abcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

export function buildPartImageKey(filename: string, type: ImageType) {
  return `uploads/parts/${Date.now()}-${randomId(6)}-${sanitizeFilename(filename)}.${type.ext}`;
}

// Day bucket (UTC, YYYYMMDD) lets us count a user's uploads per day with an
// R2 prefix listing, without an extra table.
export function utcDayBucket(date = new Date()) {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

export function requestImagePrefix(userId: number) {
  return `uploads/requests/${userId}/`;
}

export function buildRequestImageKey(userId: number, type: ImageType, date = new Date()) {
  return `${requestImagePrefix(userId)}${utcDayBucket(date)}/${Date.now()}-${randomId()}.${type.ext}`;
}

export type ImageCheck =
  | { ok: true; bytes: ArrayBuffer; type: ImageType }
  | { ok: false; status: 400 | 413 | 415; code: string; message: string };

export async function readImageUpload(file: unknown): Promise<ImageCheck> {
  if (!(file instanceof File)) {
    return { ok: false, status: 400, code: "FILE_REQUIRED", message: "file is required" };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, status: 413, code: "FILE_TOO_LARGE", message: "File is too large (max 5 MB)" };
  }
  const bytes = await file.arrayBuffer();
  const type = detectImageType(new Uint8Array(bytes, 0, Math.min(16, bytes.byteLength)));
  if (!type) {
    return {
      ok: false,
      status: 415,
      code: "INVALID_FILE_TYPE",
      message: "Only JPEG, PNG, WebP or GIF images are allowed",
    };
  }
  return { ok: true, bytes, type };
}
