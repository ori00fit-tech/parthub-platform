#!/usr/bin/env bash
# ============================================================
# Quick API health check
# Usage: bash scripts/check-api.sh [BASE_URL]
# ============================================================
BASE_URL="${1:-http://localhost:8787}"
GREEN='\033[0;32m'; RED='\033[0;31m'; NC='\033[0m'

echo "Checking API at: $BASE_URL"
echo "---"

endpoints=(
  "GET /health"
  "GET /api/v1/catalog/categories"
  "GET /api/v1/catalog/vehicles/makes"
  "GET /api/v1/catalog/parts"
  "GET /api/v1/catalog/brands"
)

for entry in "${endpoints[@]}"; do
  method=$(echo $entry | cut -d' ' -f1)
  path=$(echo $entry | cut -d' ' -f2)
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X $method "$BASE_URL$path")
  if [[ "$STATUS" == "200" ]]; then
    echo -e "${GREEN}✓ $method $path → $STATUS${NC}"
  else
    echo -e "${RED}✗ $method $path → $STATUS${NC}"
  fi
done
