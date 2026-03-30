export function sanitizeFilename(filename: string) {
  return filename
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]/g, "-")
    .replace(/-+/g, "-");
}

export function buildPartImageKey(filename: string) {
  const clean = sanitizeFilename(filename || "image.jpg");
  const stamp = Date.now();
  return `uploads/parts/${stamp}-${clean}`;
}
