#!/usr/bin/env bash
# ============================================================
# Repo diagnostics – check structure & tools
# Usage: bash scripts/repo-diagnostics.sh
# ============================================================
GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

echo -e "${BLUE}=== PartHub Diagnostics ===${NC}"
echo ""

check() {
  if $1 &>/dev/null; then echo -e "${GREEN}✓ $2${NC}"; else echo -e "${RED}✗ $2${NC}"; fi
}

# Tools
echo -e "${BLUE}Tools:${NC}"
check "command -v node" "node $(node -v 2>/dev/null)"
check "command -v pnpm" "pnpm $(pnpm -v 2>/dev/null)"
check "command -v wrangler" "wrangler $(wrangler --version 2>/dev/null | head -1)"
check "command -v git" "git $(git --version 2>/dev/null)"

echo ""
echo -e "${BLUE}Key files:${NC}"
for f in package.json pnpm-workspace.yaml turbo.json .env workers/api/wrangler.toml infra/d1/schema.sql; do
  if [ -f "$f" ]; then echo -e "${GREEN}✓ $f${NC}"; else echo -e "${RED}✗ $f missing${NC}"; fi
done

echo ""
echo -e "${BLUE}node_modules:${NC}"
for pkg in apps/storefront apps/seller-portal apps/admin workers/api; do
  if [ -d "$pkg/node_modules" ]; then
    echo -e "${GREEN}✓ $pkg/node_modules${NC}"
  else
    echo -e "${YELLOW}⚠ $pkg/node_modules not installed${NC}"
  fi
done

echo ""
echo -e "${BLUE}Env vars:${NC}"
if [ -f .env ]; then
  for key in JWT_SECRET CF_D1_DATABASE_ID CF_R2_BUCKET VITE_API_BASE_URL; do
    val=$(grep "^$key=" .env | cut -d'=' -f2)
    if [ -n "$val" ] && [ "$val" != "your-super-secret-key-min-32-chars" ]; then
      echo -e "${GREEN}✓ $key is set${NC}"
    else
      echo -e "${YELLOW}⚠ $key not set${NC}"
    fi
  done
else
  echo -e "${RED}✗ .env file missing – run bootstrap.sh${NC}"
fi
