#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

if [ -z "${CF_ACCOUNT_ID:-}" ] || [ -z "${D1_DATABASE_ID:-}" ] || [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
  echo "Missing one of: CF_ACCOUNT_ID, D1_DATABASE_ID, CLOUDFLARE_API_TOKEN"
  exit 1
fi

python3 <<'PY'
from pathlib import Path
import json
import subprocess
import sys
import os

account_id = os.environ["CF_ACCOUNT_ID"]
db_id = os.environ["D1_DATABASE_ID"]
token = os.environ["CLOUDFLARE_API_TOKEN"]

sql = Path("infra/d1/seed.sql").read_text(encoding="utf-8")

lines = []
for line in sql.splitlines():
    stripped = line.strip()
    if stripped.startswith("--") or stripped == "":
        continue
    lines.append(line)

clean = "\n".join(lines)
statements = [s.strip() + ";" for s in clean.split(";") if s.strip()]

for i, stmt in enumerate(statements, start=1):
    print(f"Applying seed statement #{i} ...", flush=True)

    payload = json.dumps({"sql": stmt})
    result = subprocess.run(
        [
            "curl", "-s", "-X", "POST",
            f"https://api.cloudflare.com/client/v4/accounts/{account_id}/d1/database/{db_id}/query",
            "-H", f"Authorization: Bearer {token}",
            "-H", "Content-Type: application/json",
            "--data", payload
        ],
        capture_output=True,
        text=True
    )

    print(result.stdout.strip())

    if '"success":false' in result.stdout:
        print("\nFAILED STATEMENT:\n")
        print(stmt)
        sys.exit(1)

print("Seed applied successfully.")
PY
