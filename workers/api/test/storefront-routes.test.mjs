// Storefront: the page list used for 404s (functions/_lib/routes.js) must
// match <Routes> in src/App.jsx, and the middleware must turn unknown
// addresses into a real 404 + noindex while leaving real pages alone.
import { readFileSync } from "node:fs";
const ROOT = new URL("../../../", import.meta.url).pathname;
const { ROUTES, isKnownPage } = await import(ROOT + "apps/storefront/functions/_lib/routes.js");
const { onRequest } = await import(ROOT + "apps/storefront/functions/_middleware.js");
const results = {};
const check = (name, cond, extra = "") => { results[name] = cond ? "PASS" : `FAIL ${JSON.stringify(extra)}`; };

const app = readFileSync(ROOT + "apps/storefront/src/App.jsx", "utf8");
const fromApp = [...app.matchAll(/<Route\s+path="([^"]+)"/g)].map((m) => m[1]).filter((p) => p !== "*");
check("same_routes_as_app", JSON.stringify([...fromApp].sort()) === JSON.stringify([...ROUTES].sort()), { onlyInApp: fromApp.filter((r) => !ROUTES.includes(r)), onlyInList: ROUTES.filter((r) => !fromApp.includes(r)) });

for (const p of ["/", "/parts", "/parts/filtre-a-huile-x", "/voiture/dacia/logan/freinage", "/orders/PH-1/tracking", "/legal/cgu", "/parts/"]) check(`known ${p}`, isKnownPage(p));
for (const p of ["/some/random/path", "/sellers", "/parts/a/b", "/voiture/a/b/c/d", "/admin"]) check(`unknown ${p}`, !isKnownPage(p));

const html = "<!doctype html><html lang=\"fr\"><head><title>PartHub</title></head><body><div id=root></div></body></html>";
const run = async (path, res) => onRequest({ request: new Request(`https://parthub.autos${path}`), next: async () => res });
const page = () => new Response(html, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
let r = await run("/some/random/path", page());
let body = await r.text();
check("soft404_status", r.status === 404, r.status);
check("soft404_noindex", body.includes('<meta name="robots" content="noindex">') && r.headers.get("x-robots-tag") === "noindex", body.slice(0, 120));
check("soft404_app_still_renders", body.includes('<div id=root>'));
r = await run("/parts/filtre", page());
check("real_page_untouched", r.status === 200 && !(await r.text()).includes("noindex"));
r = await run("/logo.png", new Response("png", { status: 200, headers: { "content-type": "image/png" } }));
check("files_untouched", r.status === 200);
r = await run("/robots.txt", page());
check("missing_txt_404", r.status === 404);
const { SECURITY_HEADERS } = await import(ROOT + "apps/storefront/functions/_lib/security-headers.js");
const h404 = (await run("/nope", page())).headers;
check("security_headers_on_404", Object.keys(SECURITY_HEADERS).every((k) => h404.has(k)), [...h404.keys()]);

// Sitemap: full list when the API answers; 503 + Retry-After when it does
// not (never a sitemap with only the static pages).
const http = await import("node:http");
let apiUp = true;
const server = http.createServer((req, res) => {
  if (!apiUp) { res.writeHead(500); return res.end(); }
  res.writeHead(200, { "content-type": "application/json" });
  res.end(JSON.stringify({ data: { parts: [{ slug: "plaquettes-logan", updated_at: "2026-11-01 10:00:00" }], sellers: [{ slug: "garage-atlas" }], landings: ["/voiture/dacia"] } }));
}).listen(0);
const port = server.address().port;
const { onRequestGet: sitemap } = await import("./.build/sitemap.mjs");
const smEnv = { API_BASE_URL: `http://127.0.0.1:${port}` };
let sm = await sitemap({ request: new Request("https://parthub.autos/sitemap.xml"), env: smEnv });
let smText = await sm.text();
check("sitemap_ok", sm.status === 200 && smText.includes("/parts/plaquettes-logan") && smText.includes("/sellers/garage-atlas"), [sm.status, smText.slice(0, 200)]);
apiUp = false;
sm = await sitemap({ request: new Request("https://parthub.autos/sitemap.xml"), env: smEnv });
check("sitemap_api_down_503", sm.status === 503 && sm.headers.get("retry-after") === "300" && !(await sm.text()).includes("<urlset"), sm.status);
server.close();

console.log(results);
const fails = Object.values(results).filter((v) => v !== "PASS").length;
console.log(fails ? `${fails} FAIL` : "ALL PASS");
process.exitCode = fails ? 1 : 0;
