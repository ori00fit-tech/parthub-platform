// A seller's shipping choices, through the sites: the seller picks their
// carriers (customer number, default), free delivery and delivery times in
// Store settings; the buyer sees them on the part page.
import { test, expect } from "@playwright/test";
import { URLS, ACCOUNTS, PASSWORD, english } from "./helpers.mjs";

test("the seller sets carriers, free delivery and times; the buyer sees them", async ({ page }) => {
  await english(page);
  await page.goto(`${URLS.seller}/auth`);
  await page.getByPlaceholder(/@/).fill(ACCOUNTS.seller.email);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.getByRole("button", { name: /^Sign in/ }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/auth"));

  await page.goto(`${URLS.seller}/store-settings`);
  const card = page.locator("form", { has: page.getByRole("heading", { name: "Shipping: my carriers and options" }) });
  await expect(card).toBeVisible();
  const amana = card.locator("li", { hasText: "Amana" });
  await amana.getByRole("checkbox").check();
  await amana.getByPlaceholder("My customer number (optional)").fill("AM-778");
  await amana.getByRole("radio").check();
  await card.locator("li", { hasText: "Sendit" }).getByRole("checkbox").check();
  await card.getByLabel("Free delivery from (MAD)").fill("200");
  await card.getByLabel("Days to deliver in my city").fill("1");
  await card.getByLabel("Days to deliver elsewhere in Morocco").fill("3");
  await card.getByRole("button", { name: "Save" }).click();
  await expect(card.getByText("Shipping saved")).toBeVisible();
  await expect(card.getByText("2 chosen.")).toBeVisible();

  await page.goto(`${URLS.store}/parts/plaquettes-de-frein-e2e`);
  await expect(page.getByText(/Free delivery from 200[.,]00/)).toBeVisible();
  await expect(page.getByText(/1 day\(s\) in Casablanca, 3 elsewhere/)).toBeVisible();
});
