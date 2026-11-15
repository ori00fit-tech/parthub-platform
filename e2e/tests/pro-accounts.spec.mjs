// Professional accounts, end to end: the seller sets a pro price; a garage
// asks for a pro account; PartHub approves it; the garage sees the pro
// price (others only see that one exists).
import { test, expect } from "@playwright/test";
import { URLS, ACCOUNTS, PASSWORD, PARTS, english } from "./helpers.mjs";

const GARAGE = { email: `garage-${Date.now().toString(36)}@parthub.test`, password: "Garage-Atlas-2026", name: "Garage Atlas E2E" };

async function signIn(page, site, email, password, button = { name: "Sign in", exact: true }) {
  await page.goto(`${site}/auth`);
  await page.getByPlaceholder(/@/).fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", button).last().click();
  await page.waitForURL((u) => !u.pathname.startsWith("/auth"));
}

test("a garage gets the pro price once PartHub approves it", async ({ page, request }) => {
  await english(page);

  // The seller sets a pro price of 200 MAD on the part sold at 250 MAD.
  await signIn(page, URLS.seller, ACCOUNTS.seller.email, PASSWORD);
  await page.goto(`${URLS.seller}/parts/9001/edit`);
  await page.getByLabel("Pro price (MAD)").fill("200");
  await page.getByRole("button", { name: "Save pro price" }).click();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();

  // Anyone: only that a pro price exists.
  await page.goto(`${URLS.store}/parts/plaquettes-de-frein-e2e`);
  await expect(page.getByText("Garage or mechanic? A pro price is available")).toBeVisible();
  await expect(page.getByText("200", { exact: false }).filter({ hasText: /200[,.]00|200 MAD|200,00/ })).toHaveCount(0);

  // The garage creates its account and asks for pro.
  const reg = await request.post(`${URLS.api}/api/v1/auth/register`, { data: { name: GARAGE.name, email: GARAGE.email, password: GARAGE.password, phone: "0644556677", role: "buyer", accept_terms: true } });
  expect(reg.ok()).toBeTruthy();
  await page.evaluate(() => localStorage.clear());
  await english(page);
  await signIn(page, URLS.store, GARAGE.email, GARAGE.password);
  await page.goto(`${URLS.store}/account`);
  await page.getByLabel("Garage or workshop name").fill("Garage Atlas");
  await page.getByLabel("City").fill("Rabat");
  await page.getByRole("button", { name: "Ask for a pro account" }).click();
  await expect(page.getByText("Request sent for Garage Atlas", { exact: false })).toBeVisible();

  // PartHub approves it.
  const admin = await page.context().newPage();
  await english(admin);
  await signIn(admin, URLS.admin, ACCOUNTS.admin.email, PASSWORD, { name: /Sign in/i });
  await admin.goto(`${URLS.admin}/pro-accounts`);
  const card = admin.locator("div.rounded-3xl").filter({ hasText: "Garage Atlas" });
  await card.getByRole("button", { name: "Approve", exact: true }).click();
  await expect(admin.getByText("No requests here.")).toBeVisible();
  await admin.close();

  // The garage now sees and gets the pro price.
  await page.goto(`${URLS.store}/account`);
  await expect(page.getByText("Your pro account is approved", { exact: false })).toBeVisible();
  await page.goto(`${URLS.store}/parts/plaquettes-de-frein-e2e`);
  await expect(page.getByText("Pro price", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Public price:", { exact: false })).toBeVisible();
  await expect(page.getByText(PARTS.onSale).first()).toBeVisible();
});
