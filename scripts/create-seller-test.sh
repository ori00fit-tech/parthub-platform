#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

API_BASE="${API_BASE:-https://parthub-api.ori00fit-c96.workers.dev}"

SELLER_NAME="${SELLER_NAME:-Test Seller}"
SELLER_EMAIL="${SELLER_EMAIL:-seller.test.$(date +%s)@parthub.local}"
SELLER_PASSWORD="${SELLER_PASSWORD:-Seller123!}"
STORE_NAME="${STORE_NAME:-Test Seller Parts}"
STORE_SLUG="${STORE_SLUG:-test-seller-parts-$(date +%s)}"
STORE_PHONE="${STORE_PHONE:-+440700000000}"
STORE_CITY="${STORE_CITY:-London}"
STORE_DESCRIPTION="${STORE_DESCRIPTION:-Demo seller account for seller portal testing.}"

AUTH_REGISTER_CANDIDATES=(
  "/auth/register"
  "/api/auth/register"
  "/api/v1/auth/register"
)

AUTH_LOGIN_CANDIDATES=(
  "/auth/login"
  "/api/auth/login"
  "/api/v1/auth/login"
)

ONBOARDING_CANDIDATES=(
  "/marketplace/onboarding"
  "/api/marketplace/onboarding"
  "/api/v1/marketplace/onboarding"
)

post_json() {
  local url="$1"
  local payload="$2"
  curl -sS -X POST "$url" \
    -H "Content-Type: application/json" \
    --data "$payload"
}

post_json_auth() {
  local url="$1"
  local token="$2"
  local payload="$3"
  curl -sS -X POST "$url" \
    -H "Authorization: Bearer $token" \
    -H "Content-Type: application/json" \
    --data "$payload"
}

put_json_auth() {
  local url="$1"
  local token="$2"
  local payload="$3"
  curl -sS -X PUT "$url" \
    -H "Authorization: Bearer $token" \
    -H "Content-Type: application/json" \
    --data "$payload"
}

looks_like_success_or_validation() {
  local body="$1"
  if printf '%s' "$body" | grep -q '"error":"Route not found"'; then
    return 1
  fi
  return 0
}

extract_token() {
  local body="$1"
  local token=""
  token=$(printf '%s' "$body" | sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p')
  if [ -z "$token" ]; then
    token=$(printf '%s' "$body" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
  fi
  if [ -z "$token" ]; then
    token=$(printf '%s' "$body" | sed -n 's/.*"data":{"access_token":"\([^"]*\)".*/\1/p')
  fi
  if [ -z "$token" ]; then
    token=$(printf '%s' "$body" | sed -n 's/.*"data":{"token":"\([^"]*\)".*/\1/p')
  fi
  printf '%s' "$token"
}

REGISTER_PAYLOAD=$(cat <<JSON
{
  "name": "$SELLER_NAME",
  "email": "$SELLER_EMAIL",
  "password": "$SELLER_PASSWORD",
  "role": "seller"
}
JSON
)

LOGIN_PAYLOAD=$(cat <<JSON
{
  "email": "$SELLER_EMAIL",
  "password": "$SELLER_PASSWORD"
}
JSON
)

ONBOARDING_PAYLOAD=$(cat <<JSON
{
  "display_name": "$STORE_NAME",
  "slug": "$STORE_SLUG",
  "phone": "$STORE_PHONE",
  "city": "$STORE_CITY",
  "description": "$STORE_DESCRIPTION"
}
JSON
)

echo "==> API_BASE: $API_BASE"
echo "==> Creating seller user: $SELLER_EMAIL"

REGISTER_RESPONSE=""
REGISTER_ROUTE=""
for path in "${AUTH_REGISTER_CANDIDATES[@]}"; do
  url="${API_BASE}${path}"
  echo "==> Trying register route: $url"
  response=$(post_json "$url" "$REGISTER_PAYLOAD")
  if looks_like_success_or_validation "$response"; then
    REGISTER_RESPONSE="$response"
    REGISTER_ROUTE="$path"
    break
  fi
done

if [ -z "$REGISTER_ROUTE" ]; then
  echo ""
  echo "ERROR: No working register route found."
  exit 1
fi

echo "==> Register route matched: $REGISTER_ROUTE"
echo "$REGISTER_RESPONSE"

LOGIN_RESPONSE=""
LOGIN_ROUTE=""
for path in "${AUTH_LOGIN_CANDIDATES[@]}"; do
  url="${API_BASE}${path}"
  echo "==> Trying login route: $url"
  response=$(post_json "$url" "$LOGIN_PAYLOAD")
  if looks_like_success_or_validation "$response"; then
    LOGIN_RESPONSE="$response"
    LOGIN_ROUTE="$path"
    break
  fi
done

if [ -z "$LOGIN_ROUTE" ]; then
  echo ""
  echo "ERROR: No working login route found."
  exit 1
fi

echo "==> Login route matched: $LOGIN_ROUTE"
TOKEN=$(extract_token "$LOGIN_RESPONSE")

if [ -z "$TOKEN" ]; then
  echo ""
  echo "ERROR: Could not extract access token from login response."
  echo "$LOGIN_RESPONSE"
  exit 1
fi

echo "==> Access token extracted"

ONBOARDING_RESPONSE=""
ONBOARDING_ROUTE=""
ONBOARDING_METHOD=""
for path in "${ONBOARDING_CANDIDATES[@]}"; do
  url="${API_BASE}${path}"

  echo "==> Trying onboarding POST route: $url"
  response=$(post_json_auth "$url" "$TOKEN" "$ONBOARDING_PAYLOAD")
  if looks_like_success_or_validation "$response"; then
    ONBOARDING_RESPONSE="$response"
    ONBOARDING_ROUTE="$path"
    ONBOARDING_METHOD="POST"
    break
  fi

  echo "==> Trying onboarding PUT route: $url"
  response=$(put_json_auth "$url" "$TOKEN" "$ONBOARDING_PAYLOAD")
  if looks_like_success_or_validation "$response"; then
    ONBOARDING_RESPONSE="$response"
    ONBOARDING_ROUTE="$path"
    ONBOARDING_METHOD="PUT"
    break
  fi
done

if [ -z "$ONBOARDING_ROUTE" ]; then
  echo ""
  echo "WARNING: No working onboarding route found."
else
  echo "==> Onboarding route matched: $ONBOARDING_METHOD $ONBOARDING_ROUTE"
  echo "$ONBOARDING_RESPONSE"
fi

echo ""
echo "========================================"
echo "SELLER TEST ACCOUNT READY"
echo "Email:    $SELLER_EMAIL"
echo "Password: $SELLER_PASSWORD"
echo "Store:    $STORE_NAME"
echo "Slug:     $STORE_SLUG"
echo "Register: $REGISTER_ROUTE"
echo "Login:    $LOGIN_ROUTE"
if [ -n "$ONBOARDING_ROUTE" ]; then
  echo "Onboard:  $ONBOARDING_METHOD $ONBOARDING_ROUTE"
else
  echo "Onboard:  NOT FOUND"
fi
echo "========================================"
