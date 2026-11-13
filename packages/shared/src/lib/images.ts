// Photos stored by PartHub (R2, served by the API at /api/v1/media/uploads/…).
// The API stores them as paths ("/api/v1/media/uploads/parts/x.jpg"): a page
// must prefix the API's address, or the site's own address returns its HTML.
// mediaSrc() does it, and asks for a smaller copy when image resizing is on
// (Cloudflare Image Transformations on the parthub.autos zone: /cdn-cgi/image).
// Each app calls configureImages() once at start (main.jsx).

let config = { apiBase: "", resize: false };

let listening = false;

export function configureImages(next: { apiBase?: string; resize?: boolean }) {
  config = { ...config, ...next, apiBase: (next.apiBase ?? config.apiBase).replace(/\/$/, "") };
  // One safety net for every page: a resized copy that fails (resizing
  // switched off at Cloudflare) falls back to the original photo.
  if (config.resize && !listening && typeof document !== "undefined") {
    listening = true;
    document.addEventListener(
      "error",
      (e) => {
        const img = e.target as HTMLImageElement | null;
        if (!img || img.tagName !== "IMG" || !img.src.includes("/cdn-cgi/image/")) return;
        img.removeAttribute("srcset");
        img.src = img.src.replace(/\/cdn-cgi\/image\/[^/]+/, "");
      },
      true
    );
  }
}

const OURS = /\/api\/v1\/media\/uploads\//;

// The address of a photo, `width` pixels wide at most when resizing is on.
export function mediaSrc(url: string | null | undefined, width?: number): string {
  if (!url) return "";
  const abs = url.startsWith("/") ? `${config.apiBase}${url}` : url;
  if (!width || !config.resize || !OURS.test(abs)) return abs;
  try {
    const u = new URL(abs);
    return `${u.origin}/cdn-cgi/image/width=${Math.round(width)},quality=75,format=auto,fit=scale-down${u.pathname}`;
  } catch {
    return abs;
  }
}

// srcset for sharp photos on any screen (only when resizing is on).
export function mediaSrcSet(url: string | null | undefined, width: number): string | undefined {
  if (!url || !config.resize || !OURS.test(url)) return undefined;
  return `${mediaSrc(url, width)} 1x, ${mediaSrc(url, width * 2)} 2x`;
}

// If a resized copy fails (resizing switched off at Cloudflare), show the original.
export function mediaFallback(url: string | null | undefined) {
  return (e: { currentTarget: HTMLImageElement }) => {
    const original = mediaSrc(url);
    const img = e.currentTarget;
    if (original && img.src !== original) {
      img.removeAttribute("srcset");
      img.src = original;
    }
  };
}

// Props for an <img> of a stored photo: <img {...mediaProps(url, 480)} alt="" />
export function mediaProps(url: string | null | undefined, width?: number) {
  const srcSet = width ? mediaSrcSet(url, width) : undefined;
  return { src: mediaSrc(url, width), ...(srcSet ? { srcSet } : {}), onError: mediaFallback(url) };
}
