#!/data/data/com.termux/files/usr/bin/bash
set -e

FILE="infra/d1/seed-mega-uk.sql"

if [ ! -f "$FILE" ]; then
  echo "Missing $FILE"
  exit 1
fi

awk 'BEGIN { RS=";"; ORS="" } { gsub(/^[[:space:]\n\r]+|[[:space:]\n\r]+$/, "", $0); if (length($0) > 0) print $0 ";" "\n" }' "$FILE" | \
while IFS= read -r stmt; do
  [ -z "$stmt" ] && continue

  echo "Applying statement..."
  curl -s -X POST "https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT_ID/d1/database/$D1_DATABASE_ID/query" \
    -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    -H "Content-Type: application/json" \
    --data "$(printf '{"sql":%s}' "$(printf '%s' "$stmt" | python -c 'import json,sys; print(json.dumps(sys.stdin.read()))')")"
  echo
done

echo "Mega seed applied."
