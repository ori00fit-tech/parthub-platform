#!/usr/bin/env bash
# Remove all node_modules recursively (useful in Termux)
echo "Cleaning node_modules..."
find . -name "node_modules" -type d -prune -exec rm -rf '{}' +
echo "Done."
