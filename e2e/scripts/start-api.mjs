// Starts the real API (wrangler dev, local D1) on a fresh database for the
// E2E run: schema, indexes, sample categories, the vehicle catalog, then
// the E2E accounts and parts (e2e/scripts/seed.mjs). Nothing touches
// Cloudflare: --local, own state folder.
import { execFileSync, spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { seedSql } from "./seed.mjs";

const ROOT = resolve(import.meta.dirname, "../..");
const API = join(ROOT, "workers/api");
const STATE = join(ROOT, "e2e/.state");
const PORT = process.env.E2E_API_PORT || "8788";
const wrangler = join(API, "node_modules/.bin/wrangler");

rmSync(STATE, { recursive: true, force: true });
const run = (file) =>
  execFileSync(wrangler, ["d1", "execute", "parthub-db", "--local", `--persist-to=${STATE}`, `--file=${file}`], { cwd: API, stdio: ["ignore", "ignore", "inherit"] });
for (const f of ["infra/d1/schema.sql", "infra/d1/indexes.sql", "infra/d1/seed.sql", "infra/d1/migrations/0017_seed_vehicle_catalog.sql"]) run(join(ROOT, f));
const tmp = mkdtempSync(join(tmpdir(), "parthub-e2e-"));
const seedFile = join(tmp, "seed.sql");
writeFileSync(seedFile, await seedSql());
run(seedFile);
console.log("[e2e] database ready");

const child = spawn(
  wrangler,
  [
    "dev", "--local", `--persist-to=${STATE}`, `--port=${PORT}`, "--ip=127.0.0.1", "--show-interactive-dev-session=false",
    "--var", "APP_ENV:development",
    "--var", "JWT_SECRET:e2e-only-secret-0123456789abcdef0123456789",
    "--var", `STOREFRONT_URL:http://localhost:${process.env.E2E_STORE_PORT || 4310}`,
    "--var", `SELLER_PORTAL_URL:http://localhost:${process.env.E2E_SELLER_PORT || 4311}`,
  ],
  { cwd: API, stdio: "inherit" }
);
const stop = () => child.kill("SIGTERM");
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
child.on("exit", (code) => process.exit(code ?? 0));
