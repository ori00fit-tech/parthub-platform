#!/usr/bin/env bash
# ============================================================
# Seed Cloudflare D1 database
# Usage: bash scripts/seed-d1.sh [--local]
# ============================================================
set -e

BLUE='\033[0;34m'; GREEN='\033[0;32m'; RED='\033[0;31m'; NC='\033[0m'

DB_NAME="parthub-db"
LOCAL_FLAG=""

if [[ "$1" == "--local" ]]; then
  LOCAL_FLAG="--local"
  echo -e "${BLUE}Running in LOCAL mode${NC}"
fi

echo -e "${BLUE}Applying schema...${NC}"
wrangler d1 execute $DB_NAME $LOCAL_FLAG --file=infra/d1/schema.sql

echo -e "${BLUE}Applying indexes...${NC}"
wrangler d1 execute $DB_NAME $LOCAL_FLAG --file=infra/d1/indexes.sql

echo -e "${BLUE}Applying seed data...${NC}"
wrangler d1 execute $DB_NAME $LOCAL_FLAG --file=infra/d1/seed.sql

echo -e "${GREEN}D1 seeded successfully!${NC}"
