#!/usr/bin/env bash
# ============================================================
# Seed Cloudflare D1 database
# Usage: bash scripts/seed-d1.sh            (local database, default)
#        bash scripts/seed-d1.sh --remote   (production: asks for confirmation)
# ============================================================
set -e

BLUE='\033[0;34m'; GREEN='\033[0;32m'; RED='\033[0;31m'; NC='\033[0m'

DB_NAME="parthub-db"
LOCAL_FLAG="--local"

if [[ "${1:-}" == "--remote" ]]; then
  source "$(dirname "$0")/_guard-production.sh" "apply schema.sql, indexes.sql and the sample seed.sql to production"
  LOCAL_FLAG="--remote"
  echo -e "${RED}Running against PRODUCTION${NC}"
else
  echo -e "${BLUE}Running in LOCAL mode${NC}"
fi

# From the API folder (its wrangler.toml names the database), with the
# Wrangler installed in it.
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/workers/api"
WRANGLER="npx --no-install wrangler"

echo -e "${BLUE}Applying schema...${NC}"
$WRANGLER d1 execute $DB_NAME $LOCAL_FLAG --file="$ROOT/infra/d1/schema.sql"

echo -e "${BLUE}Applying indexes...${NC}"
$WRANGLER d1 execute $DB_NAME $LOCAL_FLAG --file="$ROOT/infra/d1/indexes.sql"

echo -e "${BLUE}Applying seed data...${NC}"
$WRANGLER d1 execute $DB_NAME $LOCAL_FLAG --file="$ROOT/infra/d1/seed.sql"

if [[ "$LOCAL_FLAG" == "--local" ]]; then
  echo -e "${BLUE}Applying the vehicle catalog (Morocco)...${NC}"
  $WRANGLER d1 execute $DB_NAME $LOCAL_FLAG --file="$ROOT/infra/d1/migrations/0017_seed_vehicle_catalog.sql"
fi

echo -e "${GREEN}D1 seeded successfully!${NC}"
