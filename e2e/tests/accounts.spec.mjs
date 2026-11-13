// Accounts and languages: wrong password, "forgot password" reachable and
// working up to the code step, the public account-deletion page, Arabic in
// right-to-left, and a buyer kept out of the seller portal.
import { test, expect } from "@playwright/test";
import { URLS, ACCOUNTS, english } from "./helpers.mjs";

test("a wrong password is refused with a clear message", async ({ page }) => {
  await english(page);
  await page.goto(`${URLS.store}/auth`);
  await page.getByPlaceholder("you@example.com").fill(ACCOUNTS.seller.email);
  await page.locator('input[type="password"]').fill("not-the-password-1");
  await page.getByRole("button", { name: "Sign in" }).last().click();
  await expect(page.getByText(/Invalid credentials|wrong/i).first()).toBeVisible();
});

test("forgot password: from sign-in to the code step, same answer for anyone", async ({ page }) => {
  await english(page);
  await page.goto(`${URLS.store}/auth`);
  await page.getByPlaceholder("you@example.com").fill("nobody-e2e@parthub.test");
  await page.getByRole("link", { name: "Forgot your password?" }).click();
  await expect(page).toHaveURL(/\/forgot-password\?email=nobody-e2e/);
  await expect(page.getByLabel("E-mail or phone")).toHaveValue("nobody-e2e@parthub.test");
  await page.getByRole("button", { name: "Send me a code" }).click();
  await expect(page.getByText(/If an account matches/)).toBeVisible();
  await expect(page.getByLabel("Code received on WhatsApp")).toBeVisible();
  await expect(page.getByRole("link", { name: "Write to PartHub on WhatsApp" })).toHaveAttribute("href", /wa\.me\/212751411879/);
});

test("the account-deletion page is public (app stores link to it)", async ({ page }) => {
  await english(page);
  await page.goto(`${URLS.store}/delete-account`);
  await expect(page.getByRole("heading", { name: "Delete my PartHub account" })).toBeVisible();
  await expect(page.getByText(/30 days to change your mind/)).toBeVisible();
  await expect(page.locator(`a[href="/auth?redirect=/delete-account"]`)).toBeVisible();
});

test("Arabic: right to left, translated", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("parthub_lang", "ar"));
  await page.goto(`${URLS.store}/`);
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
});

test("a buyer cannot use the seller portal", async ({ page, request }) => {
  const email = `buyer2-${Date.now().toString(36)}@parthub.test`;
  const reg = await request.post(`${URLS.api}/api/v1/auth/register`, { data: { name: "Buyer Two", email, password: "Riad-Fes-2026-two", accept_terms: true } });
  expect(reg.ok()).toBeTruthy();
  await english(page);
  await page.goto(`${URLS.seller}/auth`);
  await page.getByPlaceholder(/@/).fill(email);
  await page.locator('input[type="password"]').fill("Riad-Fes-2026-two");
  await page.getByRole("button", { name: /^Sign in/ }).click();
  await expect(page).toHaveURL(/\/auth/);
});
