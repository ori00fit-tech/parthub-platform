// Help & FAQ: reachable from the footer, answers open on a click, the links
// lead to the right pages.
import { test, expect } from "@playwright/test";
import { URLS, english } from "./helpers.mjs";

test("the help page answers the main questions", async ({ page }) => {
  await english(page);
  await page.goto(URLS.store + "/");
  await page.locator('footer a[href="/help"]').click();
  await expect(page.getByRole("heading", { level: 1, name: "Help and frequently asked questions" })).toBeVisible();
  const answer = page.getByText("within 7 days of delivery. The seller pays", { exact: false });
  await expect(answer).toBeHidden();
  await page.getByText("Can I return a part?").click();
  await expect(answer).toBeVisible();
  await page.locator("#returns").getByRole("link", { name: "Returns policy" }).click();
  await expect(page).toHaveURL(/\/legal\/returns$/);
});
