// A link to another page opens it at the top (it used to keep the scroll
// position of the page before); back returns where the visitor was.
import { test, expect } from "@playwright/test";
import { URLS, english } from "./helpers.mjs";

test("a link opens the next page at the top", async ({ page }) => {
  await english(page);
  await page.setViewportSize({ width: 390, height: 640 });
  await page.goto(URLS.store + "/");
  const terms = page.locator('footer a[href="/legal/terms"]');
  await terms.scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(200);
  await terms.click();
  await expect(page).toHaveURL(/\/legal\/terms$/);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
});
