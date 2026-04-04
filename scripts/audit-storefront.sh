#!/data/data/com.termux/files/usr/bin/bash
set -e

ROOT="${1:-$HOME/downloads/parthub-platform}"
APP_DIR="$ROOT/apps/storefront"
REPORT="$ROOT/storefront-audit-report.txt"

if [ ! -d "$APP_DIR" ]; then
  echo "Storefront directory not found: $APP_DIR"
  exit 1
fi

{
  echo "========================================"
  echo "PARTHUB STOREFRONT AUDIT REPORT"
  echo "========================================"
  echo "Date: $(date)"
  echo "Root: $ROOT"
  echo "App:  $APP_DIR"
  echo

  echo "----------------------------------------"
  echo "1) PAGE FILES"
  echo "----------------------------------------"
  find "$APP_DIR/src/pages" -maxdepth 1 -type f 2>/dev/null | sort
  echo

  echo "----------------------------------------"
  echo "2) ROUTES IN App.jsx"
  echo "----------------------------------------"
  grep -n "Route path=" "$APP_DIR/src/App.jsx" || true
  echo

  echo "----------------------------------------"
  echo "3) TODO / FIXME / XXX"
  echo "----------------------------------------"
  grep -RInE "TODO|FIXME|XXX|HACK" "$APP_DIR/src" --include="*.js" --include="*.jsx" || true
  echo

  echo "----------------------------------------"
  echo "4) LARGE FILES"
  echo "----------------------------------------"
  find "$APP_DIR/src" -type f \( -name "*.js" -o -name "*.jsx" \) -exec wc -l {} + | sort -nr | head -20
  echo

  echo "----------------------------------------"
  echo "5) BUILD CHECK"
  echo "----------------------------------------"
  cd "$ROOT"
  pnpm --filter @parthub/storefront build
  echo "Storefront build: OK"
  echo

} | tee "$REPORT"

echo
echo "Audit report saved to: $REPORT"
