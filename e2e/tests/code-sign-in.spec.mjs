// Sign in with a WhatsApp code, no password (POST /auth/login-code, then
// /auth/login-code/verify). The E2E API has no WhatsApp, so the test sets
// a known code on the request the page just made, straight in the local
// database, the way the API stores it (sha256 of JWT_SECRET|reset|code).
import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { join, resolve } from "node:path";
import { URLS, english } from "./helpers.mjs";

const ROOT = resolve(import.meta.dirname, "../..");
const API = join(ROOT, "workers/api");
const SECRET = "e2e-only-secret-0123456789abcdef0123456789"; // scripts/start-api.mjs

function plantCode(userId, code) {
  const hash = createHash("sha256").update(`${SECRET}|reset|${code}`).digest("hex");
  execFileSync(join(API, "node_modules/.bin/wrangler"), [
    "d1", "execute", "parthub-db", "--local", `--persist-to=${join(ROOT, "e2e/.state")}`,
    "--command", `UPDATE password_resets SET secret_hash = '${hash}' WHERE id = (SELECT max(id) FROM password_resets WHERE user_id = ${Number(userId)} AND used_at IS NULL)`,
  ], { cwd: API, stdio: ["ignore", "ignore", "inherit"] });
}

test("a seller signs in with a WhatsApp code, without the password", async ({ page }) => {
  await english(page);
  await page.goto(`${URLS.seller}/auth`);
  await page.getByRole("button", { name: "Sign in with a WhatsApp code" }).click();
  await page.getByLabel("Phone number").fill("06 11 00 00 01"); // the E2E seller (scripts/seed.mjs)
  await page.getByRole("button", { name: "Send me a code on WhatsApp" }).click();
  await expect(page.getByText("a 6-digit code was sent on WhatsApp", { exact: false })).toBeVisible();

  // A wrong code is refused.
  await page.getByLabel("Code received on WhatsApp").fill("000001");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(/wrong or has expired/);

  plantCode(9002, "246810");
  await page.getByLabel("Code received on WhatsApp").fill("246810");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).not.toHaveURL(/\/auth/);
  await expect(page.getByText("Seller session active")).toBeVisible();
  await expect(page.getByText("E2E Seller").first()).toBeVisible();
});

test("the storefront offers the WhatsApp code too", async ({ page }) => {
  await english(page);
  await page.goto(`${URLS.store}/auth`);
  await page.getByRole("button", { name: "Sign in with a WhatsApp code" }).click();
  await expect(page.getByLabel("Phone number")).toBeVisible();
  await page.getByRole("button", { name: "Sign in with my e-mail and password" }).click();
  await expect(page.locator('input[type="password"]')).toBeVisible();
});
