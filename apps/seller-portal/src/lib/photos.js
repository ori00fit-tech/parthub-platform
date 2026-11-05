import { SELLER_TOKEN_KEY } from "@parthub/shared";
import { BASE_URL } from "./api";
import { serverMessage, t } from "../i18n";

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.85;

// Phone photos are often 4–8 MB. Downscale to 1600px and re-encode as JPEG in
// the browser so uploads are fast on mobile data and under the 5 MB limit.
// If the browser can't decode the file (e.g. HEIC on desktop), the original
// is sent and the server decides.
export async function compressImage(file) {
  if (!file?.type?.startsWith("image/") || file.type === "image/gif") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
    if (!blob || (blob.size >= file.size && scale === 1)) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

// Upload one part photo (POST /api/v1/media/upload). Returns the stored URL.
export async function uploadPartPhoto(file) {
  const body = new FormData();
  body.append("file", await compressImage(file));
  const token = localStorage.getItem(SELLER_TOKEN_KEY);
  let res;
  try {
    res = await fetch(`${BASE_URL}/api/v1/media/upload`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body,
    });
  } catch {
    throw new Error(serverMessage("Failed to fetch"));
  }
  let data = {};
  try {
    data = await res.json();
  } catch {
    // ignore
  }
  if (!res.ok || !data?.data?.url) {
    const raw = data?.error?.message || (typeof data?.error === "string" ? data.error : "");
    throw new Error(serverMessage(raw) || t("Upload failed"));
  }
  return data.data.url;
}
