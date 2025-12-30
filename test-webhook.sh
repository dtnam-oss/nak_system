#!/bin/bash

# Test AppSheet Webhook API with Debug Logging
# Usage: ./test-webhook.sh [local|production]

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default to local
ENV=${1:-local}

if [ "$ENV" = "local" ]; then
    API_URL="http://localhost:3000/api/webhook/appsheet"
    echo -e "${YELLOW}Testing LOCAL endpoint: $API_URL${NC}"
elif [ "$ENV" = "production" ]; then
    API_URL="https://your-app.vercel.app/api/webhook/appsheet"
    echo -e "${YELLOW}Testing PRODUCTION endpoint: $API_URL${NC}"
else
    echo -e "${RED}Invalid environment. Use: local or production${NC}"
    exit 1
fi

# Get API key from .env.local
if [ -f .env.local ]; then
    export $(cat .env.local | grep APPSHEET_SECRET_KEY | xargs)
else
    echo -e "${RED}Error: .env.local file not found${NC}"
    exit 1
fi

if [ -z "$APPSHEET_SECRET_KEY" ]; then
    echo -e "${RED}Error: APPSHEET_SECRET_KEY not found in .env.local${NC}"
    exit 1
fi

echo -e "${GREEN}API Key found (first 10 chars): ${APPSHEET_SECRET_KEY:0:10}...${NC}"
echo ""

# Test 1: Valid Add Request
echo -e "${GREEN}========== TEST 1: Valid Add Request ==========${NC}"
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $APPSHEET_SECRET_KEY" \
  -d @test-webhook-payload.json \
  --silent --show-error --write-out "\n\nHTTP Status: %{http_code}\n" \
  | jq '.'

echo ""
echo ""

# Test 2: Invalid API Key
echo -e "${YELLOW}========== TEST 2: Invalid API Key ==========${NC}"
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "x-api-key: INVALID_KEY_12345" \
  -d @test-webhook-payload.json \
  --silent --show-error --write-out "\n\nHTTP Status: %{http_code}\n" \
  | jq '.'

echo ""
echo ""

# Test 3: Invalid JSON
echo -e "${YELLOW}========== TEST 3: Invalid JSON ==========${NC}"
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $APPSHEET_SECRET_KEY" \
  -d '{"Action": "Add", "maChuyenDi": INVALID_JSON}' \
  --silent --show-error --write-out "\n\nHTTP Status: %{http_code}\n" \
  | jq '.'

echo ""
echo ""

# Test 4: Missing Required Field
echo -e "${YELLOW}========== TEST 4: Missing Required Field ==========${NC}"
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $APPSHEET_SECRET_KEY" \
  -d '{"Action": "Add", "ngayTao": "30/12/2024"}' \
  --silent --show-error --write-out "\n\nHTTP Status: %{http_code}\n" \
  | jq '.'

echo ""
echo ""

# Test 5: Update Request
echo -e "${GREEN}========== TEST 5: Update Request ==========${NC}"
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $APPSHEET_SECRET_KEY" \
  -d '{
    "Action": "Update",
    "maChuyenDi": "TEST_20241230_001",
    "ngayTao": "30/12/2024",
    "tenKhachHang": "XYZ Updated Company",
    "trangThai": "Đã duyệt",
    "tongDoanhThu": 6000000
  }' \
  --silent --show-error --write-out "\n\nHTTP Status: %{http_code}\n" \
  | jq '.'

echo ""
echo ""

# Test 6: Delete Request
echo -e "${YELLOW}========== TEST 6: Delete Request ==========${NC}"
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $APPSHEET_SECRET_KEY" \
  -d '{
    "Action": "Delete",
    "maChuyenDi": "TEST_20241230_001"
  }' \
  --silent --show-error --write-out "\n\nHTTP Status: %{http_code}\n" \
  | jq '.'

echo ""
echo -e "${GREEN}========== ALL TESTS COMPLETED ==========${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Check Vercel logs for [APPSHEET_DEBUG] messages"
echo "2. Compare the logs from this test vs AppSheet webhook"
echo "3. Look for differences in:"
echo "   - Headers (Content-Type, x-api-key)"
echo "   - Raw body format"
echo "   - JSON structure"
echo "   - Field values and types"
