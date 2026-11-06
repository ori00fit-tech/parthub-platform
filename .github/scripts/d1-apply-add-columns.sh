#!/usr/bin/env bash
# Apply a migration file that adds several columns and may also contain other
# statements (UPDATE backfills, CREATE INDEX IF NOT EXISTS ...).
# Each single-line "ALTER TABLE ... ADD COLUMN ..." is applied on its own
# through d1-apply-add-column.sh ("duplicate column" = already applied), then
# the rest of the file runs once. The rest must be safe to run again.
# Uses file imports only (they work when D1's daily read limit is hit).
#
# Usage (from workers/api): d1-apply-add-columns.sh <migration file>
set -uo pipefail

file="$1"
here="$(dirname "$0")"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

mapfile -t alters < <(grep -iE '^[[:space:]]*ALTER TABLE .* ADD COLUMN ' "$file")
n=0
for stmt in "${alters[@]}"; do
  n=$((n + 1))
  echo "$stmt" > "$tmp/column-$n.sql"
  echo "→ $stmt"
  "$here/d1-apply-add-column.sh" "$tmp/column-$n.sql" || exit $?
done

grep -viE '^[[:space:]]*ALTER TABLE .* ADD COLUMN ' "$file" > "$tmp/rest.sql"
if grep -vE '^[[:space:]]*(--.*)?$' "$tmp/rest.sql" | grep -q .; then
  echo "→ other statements of $(basename "$file")"
  "$here/d1-exec-retry.sh" --file="$tmp/rest.sql" || exit $?
fi
echo "Applied $(basename "$file")"
