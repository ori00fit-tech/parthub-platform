#!/usr/bin/env bash
URL="${1:-http://localhost:3000}"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$URL")
echo "Storefront $URL → HTTP $STATUS"
