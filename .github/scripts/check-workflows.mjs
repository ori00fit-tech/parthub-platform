// Every workflow file must parse, and look like a workflow (on + jobs, each
// step with run or uses). Uses the yaml package from the API's tools.
import { readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../..");
let YAML;
try {
  YAML = createRequire(join(ROOT, "workers/api/package.json"))("yaml");
} catch {
  YAML = createRequire(join(ROOT, "package.json"))("yaml");
}
const dir = join(ROOT, ".github/workflows");
const bad = [];
for (const f of readdirSync(dir).filter((x) => /\.ya?ml$/.test(x))) {
  try {
    const doc = YAML.parse(readFileSync(join(dir, f), "utf8"), { strict: true, uniqueKeys: true });
    if (!doc || typeof doc !== "object" || !doc.on || !doc.jobs) throw new Error("no 'on' or 'jobs'");
    for (const [id, job] of Object.entries(doc.jobs)) {
      if (job.uses) continue; // a reusable workflow call
      for (const [i, step] of (job.steps || []).entries()) if (!step.run && !step.uses) throw new Error(`job ${id}, step ${i + 1}: no run or uses`);
    }
    console.log(`ok  ${f}`);
  } catch (err) {
    bad.push(f);
    console.log(`::error file=.github/workflows/${f}::${String(err.message).split("\n")[0]}`);
  }
}
if (bad.length) process.exit(1);
