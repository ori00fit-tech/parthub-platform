#!/data/data/com.termux/files/usr/bin/bash
set -e

FILE="infra/d1/seed-vehicles-uk.sql"

if [ ! -f "$FILE" ]; then
  echo "Missing $FILE"
  exit 1
fi

python <<'PY'
import json
import os
import subprocess
from pathlib import Path

file_path = Path("infra/d1/seed-vehicles-uk.sql")
sql = file_path.read_text(encoding="utf-8")

statements = []
current = []
in_single = False
in_double = False

for ch in sql:
    if ch == "'" and not in_double:
        in_single = not in_single
    elif ch == '"' and not in_single:
        in_double = not in_double

    if ch == ";" and not in_single and not in_double:
        stmt = "".join(current).strip()
        if stmt:
            statements.append(stmt + ";")
        current = []
    else:
        current.append(ch)

tail = "".join(current).strip()
if tail:
    statements.append(tail)

for i, stmt in enumerate(statements, 1):
    print(f"Applying statement #{i} ...")
    payload = json.dumps({"sql": stmt})

    result = subprocess.run(
        [
            "curl",
            "-s",
            "-X",
            "POST",
            f"https://api.cloudflare.com/client/v4/accounts/{os.environ['CF_ACCOUNT_ID']}/d1/database/{os.environ['D1_DATABASE_ID']}/query",
            "-H",
            f"Authorization: Bearer {os.environ['CLOUDFLARE_API_TOKEN']}",
            "-H",
            "Content-Type: application/json",
            "--data",
            payload,
        ],
        capture_output=True,
        text=True,
        check=False,
    )

    print(result.stdout)
    if result.returncode != 0:
        raise SystemExit(result.returncode)

print("Vehicle mega seed applied successfully.")
PY
