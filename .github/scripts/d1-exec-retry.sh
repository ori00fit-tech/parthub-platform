#!/usr/bin/env bash
# Run "wrangler d1 execute --remote" with the given arguments, retrying when
# Cloudflare answers with a transient error (internal error / code 7500,
# 5xx, timeouts). Prints wrangler's output; exits with wrangler's code.
#
# Usage (from workers/api): d1-exec-retry.sh --file=<migration> | --command=<sql>
set -uo pipefail

attempts=4
delay=5
for i in $(seq 1 "$attempts"); do
  out=$(npx --yes wrangler@4 d1 execute "$DB_NAME" --remote "$@" 2>&1)
  code=$?
  echo "$out"
  [ $code -eq 0 ] && exit 0
  if echo "$out" | grep -qiE "internal error|code: 7500|\b50[0-9]\b|timed out|timeout|ECONNRESET|fetch failed"; then
    if [ "$i" -lt "$attempts" ]; then
      echo "::warning::Cloudflare D1 returned a temporary error (attempt $i/$attempts). Retrying in ${delay}s…"
      sleep "$delay"
      delay=$((delay * 2))
      continue
    fi
  fi
  exit $code
done
exit $code
