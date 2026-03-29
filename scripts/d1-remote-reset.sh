#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

if [ -z "${CF_ACCOUNT_ID:-}" ] || [ -z "${D1_DATABASE_ID:-}" ] || [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
  echo "Missing one of: CF_ACCOUNT_ID, D1_DATABASE_ID, CLOUDFLARE_API_TOKEN"
  exit 1
fi

TABLES=$(curl -s -X POST "https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT_ID/d1/database/$D1_DATABASE_ID/query" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"sql":"select name from sqlite_master where type='\''table'\'' and name not like '\''_cf_%'\'';"}' \
  | python3 -c 'import sys, json; data=json.load(sys.stdin); rows=data.get("result",[{}])[0].get("results",[]); print("\n".join(r["name"] for r in rows))')

for table in $TABLES; do
  echo "Dropping table: $table"
  curl -s -X POST "https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT_ID/d1/database/$D1_DATABASE_ID/query" \
    -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    -H "Content-Type: application/json" \
    --data "{\"sql\":\"DROP TABLE IF EXISTS $table;\"}"
  echo
done

echo "Reset done."
