#!/usr/bin/env bash
# Sets a new password for an ADMIN account in production, from the command
# line: the only way to recover an admin (the WhatsApp code and the reset
# links refuse admins, see workers/api/src/utils/password-reset.ts).
# Every session of that admin is signed out (token_version + 1).
#
# Usage (from the repository root, with Cloudflare access):
#   bash scripts/admin-set-password.sh admin@parthub.autos
# The password is asked twice, never shown, never written to a file.
set -euo pipefail
email="${1:-}"
[ -n "$email" ] || { echo "Usage: $0 <admin e-mail>" >&2; exit 1; }
source "$(dirname "$0")/_guard-production.sh" "set a new password for the admin $email (all their sessions end)"

read -r -s -p "New password (12+ characters): " pw1; echo
read -r -s -p "Again: " pw2; echo
[ "$pw1" = "$pw2" ] || { echo "The two passwords differ." >&2; exit 1; }
[ "${#pw1}" -ge 12 ] || { echo "Use at least 12 characters." >&2; exit 1; }

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/workers/api"
# Hash with the API's own code (PBKDF2), and build the SQL; the password
# goes through stdin only.
sql=$(printf '%s' "$pw1" | EMAIL="$email" node --input-type=module -e '
  import { createRequire } from "node:module";
  const require = createRequire(process.cwd() + "/package.json");
  const { build } = require("esbuild");
  const out = (await import("node:os")).tmpdir() + "/ph-auth-" + process.pid + ".mjs";
  await build({ entryPoints: ["src/utils/auth.ts"], bundle: true, format: "esm", platform: "neutral", outfile: out, logLevel: "error" });
  const { hashPassword } = await import(out);
  let pw = ""; for await (const c of process.stdin) pw += c;
  const q = (s) => "\x27" + String(s).replace(/\x27/g, "\x27\x27") + "\x27";
  const hash = await hashPassword(pw);
  process.stdout.write(`UPDATE users SET password_hash = ${q(hash)}, token_version = token_version + 1, updated_at = datetime(${q("now")}) WHERE lower(email) = lower(${q(process.env.EMAIL)}) AND role = ${q("admin")} AND is_active = 1;`);
')
unset pw1 pw2
out=$(npx --no-install wrangler d1 execute parthub-db --remote --json --command "$sql" 2>&1) || { echo "$out" >&2; exit 1; }
changes=$(printf '%s' "$out" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const j=JSON.parse(s.slice(s.indexOf("[")));console.log(j[0]?.meta?.changes ?? 0)}catch{console.log("?")}})')
if [ "$changes" = "1" ]; then
  echo "Done: new password set for $email; every session of this admin is signed out."
else
  echo "No active admin with that e-mail (changes: $changes). Nothing changed." >&2
  exit 1
fi
