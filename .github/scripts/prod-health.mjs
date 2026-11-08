// Daily production check (read-only): .github/workflows/prod-health.yml.
// Fails (and GitHub e-mails the owner) when something a buyer or Google
// sees is wrong: site or API down, test/demo data public, pages not
// answering, unknown addresses indexed, admin routes open, CORS open.
// Usage: node .github/scripts/prod-health.mjs   (Node 18+)

const SITE = process.env.SITE_URL || "https://parthub.autos";
const API = process.env.API_URL || "https://api.parthub.autos";
// Words that mark test or demo data. London: the old test store's city.
const SUSPECT = /\b(test|tests|demo|lorem|ipsum|dummy|sample|exemple|example|fake|london|asdf|xxx)\b/i;
const MAX_PAGES = 40; // part / store / landing pages fetched from the sitemap

const problems = [];
const notes = [];
const fail = (msg) => problems.push(msg);

async function get(url, init = {}) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await fetch(url, { redirect: "manual", ...init, headers: { "User-Agent": "PartHub-health-check", ...(init.headers || {}) }, signal: AbortSignal.timeout(20000) });
    } catch (err) {
      if (attempt === 3) throw err;
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
}
async function status(url, init) {
  try { return (await get(url, init)).status; } catch (err) { return `error: ${err.message}`; }
}

// 1. Up
for (const [what, url, want] of [["API health", `${API}/health`, 200], ["Home", `${SITE}/`, 200], ["Catalog", `${SITE}/parts`, 200], ["robots.txt", `${SITE}/robots.txt`, 200], ["Seller portal", "https://seller.parthub.autos/", 200], ["Admin", "https://admin.parthub.autos/", 200]]) {
  const s = await status(url);
  if (s !== want) fail(`${what}: ${url} answered ${s} (expected ${want})`);
}

// 2. Public catalog: no test/demo parts or stores
const res = await get(`${API}/api/v1/catalog/parts?limit=100`).catch(() => null);
const parts = res && res.ok ? ((await res.json()).data || []) : null;
if (!parts) fail("Catalog API: /api/v1/catalog/parts did not answer");
else {
  notes.push(`public parts (first page): ${parts.length}`);
  for (const p of parts) {
    const text = [p.title, p.slug, p.seller_name, p.seller_slug, p.seller_city, p.location].filter(Boolean).join(" | ");
    if (SUSPECT.test(text)) fail(`Test/demo-looking part is public: "${p.title}" (${p.slug}) — seller ${p.seller_name || "?"}`);
  }
}

// 3. Sitemap: valid, no test/demo URLs, pages answer 200
const sm = await get(`${SITE}/sitemap.xml`).catch(() => null);
const xml = sm && sm.ok ? await sm.text() : "";
const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
if (!locs.length) fail("sitemap.xml is missing or empty");
else {
  notes.push(`sitemap URLs: ${locs.length}`);
  for (const u of locs) if (SUSPECT.test(decodeURIComponent(u).replace(/[-/]/g, " "))) fail(`Test/demo-looking URL in sitemap: ${u}`);
  const sample = [...locs.filter((u) => /\/(parts|sellers)\//.test(u)), ...locs.filter((u) => /\/voiture\//.test(u)).slice(0, 10)].slice(0, MAX_PAGES);
  for (const u of sample) {
    const r = await get(u).catch((e) => ({ status: `error: ${e.message}`, headers: new Headers() }));
    if (r.status !== 200) fail(`Sitemap page ${u} answered ${r.status}`);
    else if ((r.headers.get("x-robots-tag") || "").includes("noindex")) fail(`Sitemap page ${u} is marked noindex`);
  }
  notes.push(`sitemap pages checked: ${sample.length}`);
}

// 4. Unknown addresses are real 404s (no soft 404)
for (const p of ["/health-check-unknown-page", "/parts/health-check-no-such-part"]) {
  const s = await status(`${SITE}${p}`);
  if (s !== 404) fail(`Unknown address ${p} answered ${s} (expected 404)`);
}

// 5. Admin and seller routes need a token
for (const p of ["/api/v1/admin/revenue", "/api/v1/admin/invoices", "/api/v1/admin/analytics/search-demand", "/api/v1/marketplace/me/statement"]) {
  const s = await status(`${API}${p}`);
  if (s !== 401 && s !== 403) fail(`${p} answered ${s} without a token (expected 401)`);
}

// 6. CORS: our sites yes, others no
const acao = async (origin) => (await get(`${API}/api/v1/commerce/shipping`, { headers: { Origin: origin } }).catch(() => null))?.headers.get("access-control-allow-origin") ?? null;
if ((await acao("https://parthub.autos")) !== "https://parthub.autos") fail("CORS: the storefront origin is not allowed (the site cannot call the API)");
if ((await acao("https://health-check.invalid")) !== null) fail("CORS: a foreign origin is allowed");

for (const n of notes) console.log(`· ${n}`);
if (problems.length) {
  for (const p of problems) console.log(`::error::${p}`);
  console.log(`\n${problems.length} problem(s) found.`);
  process.exit(1);
}
console.log("Production OK");
