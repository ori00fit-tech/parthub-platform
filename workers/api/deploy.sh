cd workers/api || exit
pnpm install
pnpm build || exit

curl -X PUT "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/workers/scripts/parthub-api" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/javascript" \
  --data-binary "@dist/index.js"

echo "✅ Deploy done"
