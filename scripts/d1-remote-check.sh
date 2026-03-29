#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

if [ -z "${CF_ACCOUNT_ID:-}" ] || [ -z "${D1_DATABASE_ID:-}" ] || [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
  echo "Missing one of: CF_ACCOUNT_ID, D1_DATABASE_ID, CLOUDFLARE_API_TOKEN"
  exit 1
fi

run_query() {
  local sql="$1"
  local payload
  payload=$(printf '%s' "$sql" | python3 -c 'import json,sys; print(json.dumps({"sql": sys.stdin.read()}))')

  curl -s -X POST "https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT_ID/d1/database/$D1_DATABASE_ID/query" \
    -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    -H "Content-Type: application/json" \
    --data "$payload"
  echo
}

echo "=== tables ==="
run_query "select name from sqlite_master where type='table' order by name;"

echo "=== parts sample ==="
run_query "select id, name, slug from parts order by created_at desc limit 10;"
