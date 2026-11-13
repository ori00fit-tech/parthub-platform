// The E2E data: an admin, a seller with an active store, two parts on sale
// and two waiting for review (with a photo, so they can be approved).
// Passwords are hashed with the API's own code (utils/auth.ts).
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

export const PASSWORD = "E2e-Parthub-2026!";
export const ACCOUNTS = {
  admin: { email: "e2e-admin@parthub.test", name: "E2E Admin" },
  seller: { email: "e2e-seller@parthub.test", name: "E2E Seller" },
};
export const PARTS = { onSale: "Plaquettes de frein E2E", pending: "Disque de frein E2E" };

const ROOT = resolve(import.meta.dirname, "../..");

async function hasher() {
  // esbuild comes with the API package.
  const { build } = createRequire(join(ROOT, "workers/api/package.json"))("esbuild");
  const out = join(tmpdir(), `parthub-e2e-auth-${process.pid}.mjs`);
  await build({ entryPoints: [join(ROOT, "workers/api/src/utils/auth.ts")], bundle: true, format: "esm", platform: "neutral", outfile: out, logLevel: "error" });
  return (await import(out)).hashPassword;
}

export async function seedSql() {
  const hash = await hasher();
  const pw = await hash(PASSWORD);
  const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
  return `
INSERT INTO users (id, name, email, password_hash, role, phone, is_active, terms_accepted_at, terms_version) VALUES
  (9001, ${q(ACCOUNTS.admin.name)}, ${q(ACCOUNTS.admin.email)}, ${q(pw)}, 'admin', NULL, 1, datetime('now'), '2026-11'),
  (9002, ${q(ACCOUNTS.seller.name)}, ${q(ACCOUNTS.seller.email)}, ${q(pw)}, 'seller', '0611000001', 1, datetime('now'), '2026-11');
INSERT INTO sellers (id, user_id, slug, name, phone, whatsapp, location, status, delivery_enabled, agreement_accepted_at, agreement_version)
  VALUES (9001, 9002, 'e2e-freins', 'E2E Freins', '0611000001', '0611000001', 'Casablanca', 'active', 1, datetime('now'), '2026-11');
INSERT INTO parts (id, seller_id, category_id, title, slug, price, quantity, status, condition, description) VALUES
  (9001, 9001, (SELECT id FROM categories ORDER BY id LIMIT 1), ${q(PARTS.onSale)}, 'plaquettes-de-frein-e2e', 25000, 20, 'active', 'new', 'Avant, toutes marques.'),
  (9002, 9001, (SELECT id FROM categories ORDER BY id LIMIT 1), ${q(PARTS.pending)}, 'disque-de-frein-e2e', 40000, 5, 'pending', 'new', 'Disque ventilé.');
INSERT INTO part_images (part_id, url, sort_order, is_featured) VALUES
  (9001, 'https://parthub.autos/og-image.png', 1, 1),
  (9002, 'https://parthub.autos/og-image.png', 1, 1);
`;
}
