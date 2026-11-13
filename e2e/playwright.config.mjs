// E2E: the real API (wrangler dev, local D1, fresh data) and the three
// sites built against it, driven by a browser. Run: pnpm --filter
// @parthub/e2e test (CI: .github/workflows/e2e.yml). Nothing touches
// production.
import { defineConfig, devices } from "@playwright/test";

const API = Number(process.env.E2E_API_PORT || 8788);
const STORE = Number(process.env.E2E_STORE_PORT || 4310);
const SELLER = Number(process.env.E2E_SELLER_PORT || 4311);
const ADMIN = Number(process.env.E2E_ADMIN_PORT || 4312);
const CI = Boolean(process.env.CI);
// A browser at another path (else Playwright's own, PLAYWRIGHT_BROWSERS_PATH).
const executablePath = process.env.E2E_CHROMIUM || undefined;

export default defineConfig({
  testDir: "./tests",
  // One shared database: the scenarios run in order.
  workers: 1,
  fullyParallel: false,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: CI ? 1 : 0,
  reporter: CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    trace: CI ? "retain-on-failure" : "off",
    screenshot: "only-on-failure",
    locale: "en-GB",
    ...devices["Desktop Chrome"],
    launchOptions: executablePath ? { executablePath } : {},
  },
  webServer: [
    { command: "node scripts/start-api.mjs", url: `http://localhost:${API}/api/v1/health`, timeout: 180_000, reuseExistingServer: !CI },
    { command: `node scripts/serve-app.mjs storefront ${STORE}`, url: `http://localhost:${STORE}`, timeout: 180_000, reuseExistingServer: !CI },
    { command: `node scripts/serve-app.mjs seller-portal ${SELLER}`, url: `http://localhost:${SELLER}`, timeout: 180_000, reuseExistingServer: !CI },
    { command: `node scripts/serve-app.mjs admin ${ADMIN}`, url: `http://localhost:${ADMIN}`, timeout: 180_000, reuseExistingServer: !CI },
  ],
});
