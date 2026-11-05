#!/usr/bin/env bash
# Apply a migration file that adds one column (ALTER TABLE ... ADD COLUMN).
# SQLite has no "ADD COLUMN IF NOT EXISTS", so a "duplicate column" error
# means the migration was already applied and is treated as success.
# Uses a file import, which still works when D1's daily read limit is hit.
# Temporary Cloudflare errors are retried (see d1-exec-retry.sh).
#
# Usage (from workers/api): d1-apply-add-column.sh <migration file>
set -uo pipefail

file="$1"
out=$("$(dirname "$0")/d1-exec-retry.sh" --file="$file" 2>&1)
code=$?
echo "$out"

if [ $code -eq 0 ]; then
  echo "Applied $(basename "$file")"
  exit 0
fi

if echo "$out" | grep -qi "duplicate column"; then
  echo "$(basename "$file"): column already exists — nothing to do"
  exit 0
fi

exit $code
