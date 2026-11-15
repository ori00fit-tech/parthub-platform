// Questions about an order: the buyer asks from the tracking page, the
// seller sees "waiting for your answer", answers from the order page, and
// the buyer reads the answer.
import { test, expect } from "@playwright/test";
import { URLS, ACCOUNTS, PASSWORD, english } from "./helpers.mjs";

const ASKER = { email: `asker-${Date.now().toString(36)}@parthub.test`, password: "Asker-Fes-2026-q", name: "Asker E2E" };

async function signIn(page, site, email, password) {
  await page.goto(`${site}/auth`);
  await page.getByPlaceholder(/@/).fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).last().click();
  await page.waitForURL((u) => !u.pathname.startsWith("/auth"));
}

test("a buyer asks the seller about the order and reads the answer", async ({ page, request }) => {
  await english(page);
  // A buyer and an order (API): one brake pad set from the E2E store.
  await request.post(`${URLS.api}/api/v1/auth/register`, { data: { name: ASKER.name, email: ASKER.email, password: ASKER.password, phone: "0655443322", role: "buyer", accept_terms: true } });
  const login = await (await request.post(`${URLS.api}/api/v1/auth/login`, { data: { email: ASKER.email, password: ASKER.password } })).json();
  const order = await (await request.post(`${URLS.api}/api/v1/commerce/orders`, {
    headers: { Authorization: `Bearer ${login.data.access_token}` },
    data: { items: [{ part_id: 9001, quantity: 1 }], shipping_address: { full_name: ASKER.name, phone: "0655443322", address_line1: "3 Rue Fès", city: "Fes", country: "MA" } },
  })).json();
  const ref = order.data.reference;
  expect(ref).toBeTruthy();

  // The buyer asks.
  await signIn(page, URLS.store, ASKER.email, ASKER.password);
  await page.goto(`${URLS.store}/orders/${ref}/tracking`);
  await expect(page.getByRole("heading", { name: "Questions to the seller" })).toBeVisible();
  await page.getByLabel("Your message").fill("Est-ce que les plaquettes vont sur une Logan 2015 ?");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.getByText("Est-ce que les plaquettes vont sur une Logan 2015 ?")).toBeVisible();

  // The seller sees it waiting and answers.
  const seller = await page.context().newPage();
  await english(seller);
  await signIn(seller, URLS.seller, ACCOUNTS.seller.email, PASSWORD);
  await seller.goto(`${URLS.seller}/orders`);
  await expect(seller.getByText("Buyers are waiting for your answer")).toBeVisible();
  await seller.getByRole("link", { name: new RegExp(ref) }).first().click();
  await expect(seller.getByText("Est-ce que les plaquettes vont sur une Logan 2015 ?")).toBeVisible();
  await seller.getByLabel("Your message").fill("Oui, Logan 1re génération jusqu’à 2016.");
  await seller.getByRole("button", { name: "Send", exact: true }).click();
  await expect(seller.getByText("Oui, Logan 1re génération jusqu’à 2016.")).toBeVisible();
  // Read now: no more waiting notice.
  await seller.goto(`${URLS.seller}/orders`);
  await expect(seller.getByRole("heading", { level: 1 }).first()).toBeVisible();
  await expect(seller.getByText("Buyers are waiting for your answer")).toHaveCount(0);
  await seller.close();

  // The buyer reads the answer.
  await page.reload();
  await expect(page.getByText("Oui, Logan 1re génération jusqu’à 2016.")).toBeVisible();
});
