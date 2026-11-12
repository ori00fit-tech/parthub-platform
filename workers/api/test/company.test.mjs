// The operating company (packages/shared/src/legal/company.js): nothing
// shown while it is not registered; once the required fields are filled,
// the legal notice exists (only filled lines), and the footer / invoice
// line is built. Same module the storefront's sitemap reads.
const ROOT = new URL("../../../", import.meta.url).pathname;
const results = {};
const check = (name, cond, extra = "") => { results[name] = cond ? "PASS" : `FAIL ${JSON.stringify(extra)}`; };
const company = await import(ROOT + "packages/shared/src/legal/company.js");

// Today: not registered.
check("not_registered_yet", company.companyRegistered() === false && company.companyLine() === "");
const { onRequestGet: sitemap } = await import("./.build/sitemap.mjs").catch(() => ({}));
if (sitemap) {
  const http = await import("node:http");
  const server = http.createServer((q, s) => { s.writeHead(200, { "content-type": "application/json" }); s.end(JSON.stringify({ data: { parts: [], sellers: [], landings: [] } })); }).listen(0);
  const r = await sitemap({ request: new Request("https://parthub.autos/sitemap.xml"), env: { API_BASE_URL: `http://127.0.0.1:${server.address().port}` } });
  const xml = await r.text();
  check("sitemap_no_notice", r.status === 200 && xml.includes("/legal/terms") && !xml.includes("/legal/notice"), xml.slice(0, 300));
  server.close();
}

// Required fields: a missing one is "not registered".
const filled = { ...company.COMPANY, name: "PartHub SARL", legalForm: "SARL", capitalMad: 100000, address: "12 Rue Exemple", city: "Tanger", rc: "123456 — Tanger", ice: "001234567000089", manager: "A. Exemple" };
check("registered_when_filled", company.companyRegistered(filled) === true);
check("missing_ice_not_registered", company.companyRegistered({ ...filled, ice: " " }) === false);
check("company_line", company.companyLine(filled) === "PartHub SARL · RC 123456 — Tanger · ICE 001234567000089", company.companyLine(filled));

// Once registered: the notice page exists, with only the filled lines.
Object.assign(company.COMPANY, filled);
const legal = await import(ROOT + "packages/shared/src/legal/content.js");
check("notice_listed", legal.LEGAL_DOC_IDS.includes("notice"), legal.LEGAL_DOC_IDS);
const fr = legal.legalDoc("notice", "fr");
const items = fr.sections[0].items;
check("notice_fr", fr.title === "Mentions légales" && items.includes("Raison sociale: PartHub SARL") && items.includes("Siège social: 12 Rue Exemple, Tanger") && items.includes("ICE: 001234567000089"), items);
check("notice_only_filled_lines", !items.some((i) => i.startsWith("Identifiant fiscal")) && !items.some((i) => i.startsWith("Taxe professionnelle")), items);
check("notice_capital", items.some((i) => /^Capital social: 100[.\s\u202f\u00a0]000 MAD$/.test(i)), items);
check("notice_host", fr.sections[1].items[0] === "Cloudflare, Inc.");
check("notice_ar_en", legal.legalDoc("notice", "ar").title === "الإشعار القانوني" && legal.legalDoc("notice", "en").title === "Legal notice");

console.log(results);
const fails = Object.values(results).filter((v) => v !== "PASS").length;
console.log(fails ? `${fails} FAIL` : "ALL PASS");
process.exitCode = fails ? 1 : 0;
