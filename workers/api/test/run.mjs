// API test runner: node test/run.mjs [name ...]
// Bundles the Worker (src/app.ts) and the JWT helpers with esbuild, then
// runs each *.test.mjs in its own process against an in-memory SQLite
// database built from infra/d1/schema.sql (node:sqlite, Node 22.5+).
// A suite fails when it exits non-zero or prints "FAIL".
import { build } from "esbuild";
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const api = join(here, "..");
const common = { bundle: true, format: "esm", platform: "neutral", mainFields: ["module", "main"], logLevel: "warning" };
await build({ ...common, entryPoints: [join(api, "src/app.ts")], outfile: join(here, ".build/app.mjs") });
await build({ ...common, entryPoints: [join(api, "src/utils/auth.ts")], outfile: join(here, ".build/auth.mjs") });

const only = process.argv.slice(2);
const suites = readdirSync(here)
  .filter((f) => f.endsWith(".test.mjs"))
  .filter((f) => !only.length || only.some((o) => f.includes(o)))
  .sort();

let failed = 0;
for (const file of suites) {
  const res = spawnSync(process.execPath, ["--no-warnings", join(here, file)], { encoding: "utf8", timeout: 120_000 });
  const out = `${res.stdout || ""}${res.stderr || ""}`;
  const ok = res.status === 0 && !/\bFAIL/.test(out);
  if (!ok) failed++;
  console.log(`${ok ? "✓" : "✗"} ${file}`);
  if (!ok) console.log(out.split("\n").map((l) => `    ${l}`).join("\n"));
}
console.log(`\n${suites.length - failed}/${suites.length} suites passed`);
process.exit(failed ? 1 : 0);
