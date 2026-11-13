// Photos, end to end: a seller uploads a real photo; the buyer sees it on the
// part page, the store page and in the list (the path stored by the API must
// be loaded from the API, not the site — broken in production in Nov 2026).
import { test, expect } from "@playwright/test";
import { deflateSync } from "node:zlib";
import { URLS, ACCOUNTS, PASSWORD, english } from "./helpers.mjs";

// A real 64×48 PNG (blue), built here: no file in the repository.
function png(width, height) {
  const crc = (buf) => {
    let c = ~0;
    for (const b of buf) { c ^= b; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); }
    return ~c >>> 0;
  };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 2;
  const row = Buffer.concat([Buffer.from([0]), Buffer.from(Array(width).fill([30, 80, 200]).flat())]);
  const raw = Buffer.concat(Array(height).fill(row));
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

test("a seller's photo shows on the part page, the store page and the list", async ({ page, request }) => {
  const login = await request.post(`${URLS.api}/api/v1/auth/login`, { data: { email: ACCOUNTS.seller.email, password: PASSWORD } });
  const token = (await login.json()).data.access_token;
  const up = await request.post(`${URLS.api}/api/v1/media/upload`, {
    headers: { Authorization: `Bearer ${token}` },
    multipart: { file: { name: "brake.png", mimeType: "image/png", buffer: png(64, 48) } },
  });
  expect(up.ok(), await up.text()).toBeTruthy();
  const url = (await up.json()).data.url;
  expect(url).toMatch(/^\/api\/v1\/media\/uploads\//);
  const add = await request.post(`${URLS.api}/api/v1/marketplace/parts/9001/images`, { headers: { Authorization: `Bearer ${token}` }, data: { url, sort_order: 0, is_featured: true } });
  expect(add.ok(), await add.text()).toBeTruthy();

  const loaded = async () => page.$$eval("img", (els) => els.filter((i) => i.src.includes("/api/v1/media/uploads/")).map((i) => i.complete && i.naturalWidth > 0));
  await english(page);
  for (const path of ["/parts/plaquettes-de-frein-e2e", "/sellers/e2e-freins", "/parts"]) {
    await page.goto(`${URLS.store}${path}`);
    await expect.poll(async () => (await loaded()).length, { message: `photos on ${path}` }).toBeGreaterThan(0);
    await page.waitForLoadState("networkidle");
    const states = await loaded();
    expect(states.every(Boolean), `${path}: ${JSON.stringify(states)}`).toBeTruthy();
  }
});
