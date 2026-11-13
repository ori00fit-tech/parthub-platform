// Builds one site against the local API and serves it (vite preview).
// Usage: node serve-app.mjs storefront|seller-portal|admin <port>
import { execFileSync, spawn } from "node:child_process";
import { join, resolve } from "node:path";

const [app, port] = process.argv.slice(2);
const ROOT = resolve(import.meta.dirname, "../..");
const dir = join(ROOT, "apps", app);
const api = `http://localhost:${process.env.E2E_API_PORT || 8788}`;
const env = {
  ...process.env,
  VITE_API_BASE_URL: api,
  VITE_SELLER_API_BASE_URL: api,
  VITE_ADMIN_API_BASE_URL: api,
  VITE_SELLER_PORTAL_URL: `http://localhost:${process.env.E2E_SELLER_PORT || 4311}`,
};
const vite = join(dir, "node_modules/.bin/vite");
execFileSync(vite, ["build", "--outDir", "dist-e2e", "--emptyOutDir"], { cwd: dir, env, stdio: ["ignore", "ignore", "inherit"] });
const child = spawn(vite, ["preview", "--outDir", "dist-e2e", "--port", port, "--strictPort", "--host", "127.0.0.1"], { cwd: dir, env, stdio: "inherit" });
const stop = () => child.kill("SIGTERM");
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
child.on("exit", (code) => process.exit(code ?? 0));
