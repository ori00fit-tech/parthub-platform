export const URLS = {
  api: `http://localhost:${process.env.E2E_API_PORT || 8788}`,
  store: `http://localhost:${process.env.E2E_STORE_PORT || 4310}`,
  seller: `http://localhost:${process.env.E2E_SELLER_PORT || 4311}`,
  admin: `http://localhost:${process.env.E2E_ADMIN_PORT || 4312}`,
};
export { PASSWORD, ACCOUNTS, PARTS } from "../scripts/seed.mjs";

// The sites in English (the texts below are the source strings).
export async function english(page) {
  await page.addInitScript(() => localStorage.setItem("parthub_lang", "en"));
}

// A new buyer for this run (the database is fresh, but runs may be repeated locally).
export const BUYER = {
  email: `buyer-${Date.now().toString(36)}@parthub.test`,
  password: "Riad-Fes-2026-e2e",
  name: "Youssef E2E",
  phone: "0622334455",
};
