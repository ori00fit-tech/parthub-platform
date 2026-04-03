cd workers/api || exit
pnpm install || exit
pnpm exec wrangler deploy || exit
echo "✅ API deployed"
