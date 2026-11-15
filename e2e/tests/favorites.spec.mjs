// Saved parts: ♥ asks a visitor to sign in first, then saves on the
// account; the part is on /favorites and can be removed there.
import { test, expect } from "@playwright/test";
import { URLS, PARTS, english } from "./helpers.mjs";

const SAVER = { email: `saver-${Date.now().toString(36)}@parthub.test`, password: "Saver-Rabat-2026", name: "Saver E2E" };

test("a buyer saves a part and finds it in saved parts", async ({ page, request }) => {
  await english(page);
  const reg = await request.post(`${URLS.api}/api/v1/auth/register`, { data: { name: SAVER.name, email: SAVER.email, password: SAVER.password, role: "buyer", accept_terms: true } });
  expect(reg.ok()).toBeTruthy();

  // Not signed in: ♥ leads to sign-in, then back to the part.
  await page.goto(`${URLS.store}/parts/plaquettes-de-frein-e2e`);
  await page.getByRole("button", { name: "Save this part" }).click();
  await expect(page).toHaveURL(/\/auth\?redirect=/);
  await page.getByPlaceholder(/@/).fill(SAVER.email);
  await page.locator('input[type="password"]').fill(SAVER.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).last().click();
  await expect(page).toHaveURL(/\/parts\/plaquettes-de-frein-e2e/);

  await page.getByRole("button", { name: "Save this part" }).click();
  await expect(page.getByRole("button", { name: "Remove from saved parts" })).toHaveAttribute("aria-pressed", "true");

  await page.goto(`${URLS.store}/favorites`);
  await expect(page.getByRole("heading", { name: "Saved parts" })).toBeVisible();
  await expect(page.getByRole("link", { name: PARTS.onSale })).toBeVisible();

  // Still saved after a reload (on the account, not the page).
  await page.reload();
  await expect(page.getByRole("link", { name: PARTS.onSale })).toBeVisible();

  await page.getByRole("button", { name: "Remove from saved parts" }).click();
  await expect(page.getByText("No saved parts yet", { exact: false })).toBeVisible();
});
