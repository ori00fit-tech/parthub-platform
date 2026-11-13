// The marketplace's core path, through the three sites:
// a new buyer orders (cash on delivery) → the seller confirms, ships with a
// carrier, records "out for delivery", marks it delivered → the buyer sees
// it delivered → PartHub approves a waiting part, and the activity log
// shows it.
import { test, expect } from "@playwright/test";
import { URLS, BUYER, ACCOUNTS, PASSWORD, PARTS, english } from "./helpers.mjs";

test.describe.configure({ mode: "serial" });
let reference = "";

test("a new buyer orders a part, cash on delivery", async ({ page }) => {
  await english(page);
  await page.goto(`${URLS.store}/parts`);
  await expect(page.getByText(PARTS.onSale, { exact: true }).first()).toBeVisible();
  await page.goto(`${URLS.store}/parts/plaquettes-de-frein-e2e`);
  await expect(page.getByRole("heading", { level: 1, name: PARTS.onSale })).toBeVisible();
  await page.getByRole("button", { name: "Add to cart" }).first().click();
  await page.goto(`${URLS.store}/cart`);
  await page.getByRole("link", { name: "Continue to checkout" }).click();

  await page.getByRole("tab", { name: "New customer" }).click();
  await page.getByLabel("Email").fill(BUYER.email);
  await page.locator("#checkout-password").fill(BUYER.password);
  await page.getByLabel("Full name").fill(BUYER.name);
  await page.getByLabel("Phone").fill(BUYER.phone);
  await page.getByLabel("Address line 1").fill("12 Rue des Tests");
  await page.getByLabel("City").fill("Rabat");
  await page.getByRole("button", { name: "Place order" }).click();

  await page.waitForURL(/\/checkout\/success/);
  reference = new URL(page.url()).searchParams.get("order_id") || "";
  expect(reference).toMatch(/^PH-/);
});

test("the seller confirms, ships, records the carrier's update, delivers", async ({ page }) => {
  await english(page);
  await page.goto(`${URLS.seller}/auth`);
  await page.getByPlaceholder(/@/).fill(ACCOUNTS.seller.email);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.getByRole("button", { name: /^Sign in/ }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/auth"));

  await page.goto(`${URLS.seller}/orders`);
  // The order's card, then its "open" link.
  await page.locator("article, li, div.rounded-3xl").filter({ hasText: reference }).locator('a[href^="/orders/"]').first().click();
  await expect(page.getByText(reference).first()).toBeVisible();
  await page.getByRole("button", { name: "Confirm order" }).click();
  await expect(page.getByRole("button", { name: "Mark as shipped" })).toBeVisible();
  await page.locator("#ship-carrier").selectOption("amana");
  await page.locator("#ship-tracking").fill("AM123456789MA");
  await page.getByRole("button", { name: "Mark as shipped" }).click();

  await expect(page.locator("#ship-status")).toBeVisible();
  await page.locator("#ship-status").selectOption("out_for_delivery");
  await page.getByRole("button", { name: "Record" }).click();
  await expect(page.getByText("Saved. The buyer sees it on their order.")).toBeVisible();

  await page.getByRole("button", { name: "Mark as delivered" }).click();
  await expect(page.getByRole("button", { name: "Mark as delivered" })).toHaveCount(0);
});

test("the buyer sees the order delivered, with its history", async ({ page }) => {
  await english(page);
  await page.goto(`${URLS.store}/auth`);
  await page.getByPlaceholder("you@example.com").fill(BUYER.email);
  await page.locator('input[type="password"]').fill(BUYER.password);
  await page.getByRole("button", { name: "Sign in" }).last().click();
  await page.waitForURL((u) => !u.pathname.startsWith("/auth"));
  await page.goto(`${URLS.store}/orders/${reference}/tracking`);
  await expect(page.getByText("Delivered").first()).toBeVisible();
  await expect(page.getByText("AM123456789MA").first()).toBeVisible();
});

test("PartHub approves a waiting part; the activity log records it", async ({ page }) => {
  await english(page);
  await page.goto(`${URLS.admin}/auth`);
  await page.getByPlaceholder(/@/).fill(ACCOUNTS.admin.email);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.getByRole("button", { name: /Sign in/i }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/auth"));

  await page.goto(`${URLS.admin}/parts`);
  page.on("dialog", (d) => d.accept());
  // The part's row: the one with its selection box.
  const row = page.locator("div").filter({ has: page.getByLabel(`Select ${PARTS.pending}`) }).last();
  await row.getByRole("button", { name: "Approve", exact: true }).click();
  await expect(page.getByLabel(`Select ${PARTS.pending}`)).toHaveCount(0);

  await page.goto(`${URLS.admin}/audit-log`);
  await expect(page.getByText("/parts/9002/status").first()).toBeVisible();
  await expect(page.getByText(ACCOUNTS.admin.name).first()).toBeVisible();

  // The approved part is now on sale.
  await page.goto(`${URLS.store}/parts`);
  await expect(page.getByRole("link", { name: PARTS.pending }).first()).toBeVisible();
});
