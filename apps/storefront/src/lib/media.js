import { BASE_URL } from "./api";
import { serverMessage, t } from "../i18n";

// Uploaded media is served by the API (/api/v1/media/...), not the storefront.
export function mediaUrl(path) {
  if (!path) return "";
  return path.startsWith("/") ? `${BASE_URL}${path}` : path;
}

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.85;

// Phone photos are often 4–8 MB. Downscale to 1600px and re-encode as JPEG
// in the browser so uploads stay small and under the 5 MB server limit.
// If the browser can't decode the file (e.g. HEIC on desktop Chrome), the
// original is returned and the server decides.
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
    ctx.fillStyle = "#ffffff"; // transparent PNGs → white, not black, in JPEG
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
    if (!blob) return file;
    // Keep the original if re-encoding didn't help (already small JPEG/WebP).
    if (blob.size >= file.size && scale === 1) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

function readToken() {
  try {
    return localStorage.getItem("parthub_buyer_token") || "";
  } catch {
    return "";
  }
}

export async function uploadRequestImage(file) {
  const body = new FormData();
  body.append("file", await compressImage(file));

  const token = readToken();
  let res;
  try {
    res = await fetch(`${BASE_URL}/api/v1/requests/images`, {
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
  if (!res.ok) throw new Error(serverMessage(data?.error?.message || (typeof data?.error === "string" ? data.error : "")) || t("Photo upload failed"));
  return data.data; // { key, url }
}
