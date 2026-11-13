// Photo addresses (packages/shared/src/lib/images.ts) and the storefront's
// /api/v1/media proxy (apps/storefront/functions/api/v1/media/[[path]].js).
// A stored photo is a path: pages must use the API's address, or the
// site answered its HTML (photos broken on part and store pages, Nov 2026).
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
const require = createRequire(import.meta.url);
const { build } = require("esbuild");
const ROOT = new URL("../../../", import.meta.url).pathname;
const results = {};
const check = (name, cond, extra = "") => { results[name] = cond ? "PASS" : `FAIL ${JSON.stringify(extra)}`; };
const bundle = async (entry, name) => {
  const out = join(tmpdir(), `ph-${name}-${process.pid}.mjs`);
  await build({ entryPoints: [ROOT + entry], bundle: true, format: "esm", platform: "neutral", outfile: out, logLevel: "error" });
  return import(out);
};

const img = await bundle("packages/shared/src/lib/images.ts", "images");
const path = "/api/v1/media/uploads/parts/1794-abc.jpg";
img.configureImages({ apiBase: "https://api.parthub.autos/", resize: false });
check("path_gets_api_address", img.mediaSrc(path) === `https://api.parthub.autos${path}`, img.mediaSrc(path));
check("no_resize_when_off", img.mediaSrc(path, 480) === `https://api.parthub.autos${path}` && img.mediaSrcSet(path, 480) === undefined);
check("empty", img.mediaSrc(null) === "" && img.mediaSrc("") === "");
check("other_urls_untouched", img.mediaSrc("https://cdn.example.com/x.jpg", 480) === "https://cdn.example.com/x.jpg" && img.mediaSrc("blob:http://x/1") === "blob:http://x/1");
img.configureImages({ resize: true });
check("resized_copy", img.mediaSrc(path, 480) === `https://api.parthub.autos/cdn-cgi/image/width=480,quality=75,format=auto,fit=scale-down${path}`, img.mediaSrc(path, 480));
check("srcset_1x_2x", img.mediaSrcSet(path, 160) === `${img.mediaSrc(path, 160)} 1x, ${img.mediaSrc(path, 320)} 2x`);
check("no_width_original", img.mediaSrc(path) === `https://api.parthub.autos${path}`);
check("foreign_not_resized", img.mediaSrc("https://cdn.example.com/x.jpg", 480) === "https://cdn.example.com/x.jpg");

// The storefront proxy.
const proxy = await bundle("apps/storefront/functions/api/v1/media/[[path]].js", "proxy");
const calls = [];
globalThis.fetch = async (url) => {
  calls.push(String(url));
  if (String(url).endsWith("/broken.jpg")) return new Response("<html>", { status: 200, headers: { "content-type": "text/html" } });
  if (String(url).endsWith("/missing.jpg")) return new Response("{}", { status: 404, headers: { "content-type": "application/json" } });
  return new Response(new Uint8Array([0xff, 0xd8, 0xff]), { status: 200, headers: { "content-type": "image/jpeg" } });
};
const get = (p) => proxy.onRequestGet({ request: new Request(`https://parthub.autos${p}`), env: {} });
let r = await get(path);
check("proxy_serves_image", r.status === 200 && r.headers.get("content-type") === "image/jpeg" && /immutable/.test(r.headers.get("cache-control")) && calls[0] === `https://api.parthub.autos${path}`, [r.status, calls]);
r = await get("/api/v1/media/uploads/parts/missing.jpg");
check("proxy_missing_404", r.status === 404);
r = await get("/api/v1/media/uploads/parts/broken.jpg");
check("proxy_only_images", r.status === 404);
const before = calls.length;
r = await get("/api/v1/media/other/x.jpg");
check("proxy_only_uploads", r.status === 404 && calls.length === before);
r = await get("/api/v1/media/uploads/../secret");
check("proxy_no_traversal", r.status === 404);

console.log(results);
const fails = Object.values(results).filter((v) => v !== "PASS").length;
console.log(fails ? `${fails} FAIL` : "ALL PASS");
process.exitCode = fails ? 1 : 0;
