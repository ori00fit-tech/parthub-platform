// The company that operates PartHub: one place, used by the "Mentions
// légales" page (/legal/notice), the footer, the sitemap and the commission
// invoices. Plain JavaScript, no import: the storefront's Cloudflare
// Functions read it too.
//
// Empty until PartHub SARL is registered. Nothing about the company is
// shown before the required fields (COMPANY_REQUIRED) are filled, so
// nothing incomplete or guessed is ever published. When the company is
// registered: fill the fields, have them checked, and bump LEGAL_VERSION
// in content.js (terms, seller agreement and privacy then name the
// operator, and sellers accept the new version in their portal).

export const COMPANY = {
  name: "", // e.g. "PartHub SARL"
  legalForm: "", // e.g. "SARL" (société à responsabilité limitée)
  capitalMad: null, // share capital in MAD, e.g. 100000
  address: "", // registered office (siège social), street and number
  city: "", // e.g. "Tanger"
  rc: "", // Registre de commerce: number and court, e.g. "123456 — Tanger"
  ice: "", // Identifiant commun de l'entreprise (15 digits)
  ifNumber: "", // Identifiant fiscal
  taxePro: "", // Taxe professionnelle (patente)
  manager: "", // gérant(s), as in the statuts
  phone: "",
  email: "support@parthub.autos",
  cndp: "", // CNDP declaration / authorisation reference(s), once obtained
};

// PartHub's WhatsApp number (support, notifications): international digits.
export const SUPPORT_WHATSAPP = "212751411879";

// Without these, the company is treated as not registered yet.
export const COMPANY_REQUIRED = ["name", "address", "city", "rc", "ice"];

export function companyRegistered(company = COMPANY) {
  return COMPANY_REQUIRED.every((k) => String(company[k] ?? "").trim() !== "");
}

// "PartHub SARL · RC 123456 Tanger · ICE 001234567000089" (footer,
// invoices), or "" while not registered.
export function companyLine(company = COMPANY) {
  if (!companyRegistered(company)) return "";
  return [company.name, `RC ${company.rc}`, `ICE ${company.ice}`].join(" · ");
}

// Hosting provider (identified on the notice page, as usual for sites).
export const HOSTING = {
  name: "Cloudflare, Inc.",
  address: "101 Townsend Street, San Francisco, CA 94107, United States",
  website: "https://www.cloudflare.com",
};
