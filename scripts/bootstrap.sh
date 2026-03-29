#!/usr/bin/env bash
# ============================================================
# PartHub Platform – Bootstrap Script
# Run once after cloning the repo
# Usage: bash scripts/bootstrap.sh
# ============================================================
set -e

BLUE='\033[0;34m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'

echo -e "${BLUE}=== PartHub Bootstrap ===${NC}"

# Check pnpm
if ! command -v pnpm &>/dev/null; then
  echo -e "${YELLOW}pnpm not found. Installing via npm...${NC}"
  npm install -g pnpm
fi

# Check node
NODE_VER=$(node -v 2>/dev/null || echo "none")
echo -e "Node: ${NODE_VER}"

# Copy env
if [ ! -f .env ]; then
  cp .env.example .env
  echo -e "${YELLOW}.env created from .env.example – fill in your values!${NC}"
fi

# Install deps
echo -e "${BLUE}Installing dependencies...${NC}"
pnpm install

echo -e "${GREEN}Bootstrap complete!${NC}"
echo ""
echo "Next steps:"
echo "  1. Edit .env with your Cloudflare credentials"
echo "  2. Run: bash scripts/seed-d1.sh"
echo "  3. Run: pnpm dev"
