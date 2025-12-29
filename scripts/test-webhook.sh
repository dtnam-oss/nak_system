#!/bin/bash

# Test AppSheet Webhook API
# Usage: ./scripts/test-webhook.sh [action]
# Actions: add, edit, delete

set -e

# Configuration
API_URL="https://nak-system.vercel.app/api/webhook/appsheet"
API_KEY="migration-2025-secure"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Get action from argument or default to 'add'
ACTION=${1:-add}

echo "=================================================="
echo "Testing AppSheet Webhook API"
echo "=================================================="
print_info "API URL: $API_URL"
print_info "Action: $ACTION"
echo ""

# Test 1: Add/Upsert Action
if [ "$ACTION" = "add" ]; then
    print_info "Test 1: Testing ADD action..."

    PAYLOAD='{
      "Action": "Add",
      "maChuyenDi": "test_webhook_001",
      "ngayTao": "2025-12-30",
      "tenKhachHang": "Công ty Test Webhook",
      "loaiChuyen": "Một chiều",
      "loaiTuyen": "Liên tỉnh",
      "tenTuyen": "TP.HCM - Hà Nội",
      "tenTaiXe": "Nguyễn Văn Test",
      "donViVanChuyen": "NAK",
      "trangThai": "Chờ giao hàng",
      "tongQuangDuong": "1,700",
      "tongDoanhThu": "5,000,000",
      "bienSoXe": "51A-TEST",
      "trongLuong": 15.5,
      "data_json": {
        "thongTinChuyenDi": {
          "soXe": "51A-TEST",
          "taiXe": "Nguyễn Văn Test",
          "quangDuong": 1700,
          "taiTrong": 15.5
        },
        "chiTietLoTrinh": [
          {
            "thuTu": 1,
            "loTrinh": "TP.HCM - Hà Nội",
            "quangDuong": 1700,
            "taiTrong": 15.5,
            "thanhTien": 5000000
          }
        ]
      }
    }'

    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL" \
      -H "Content-Type: application/json" \
      -H "x-api-key: $API_KEY" \
      -d "$PAYLOAD")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" = "200" ]; then
        print_success "ADD request successful (HTTP $HTTP_CODE)"
        echo "$BODY" | jq '.'
    else
        print_error "ADD request failed (HTTP $HTTP_CODE)"
        echo "$BODY"
    fi
fi

# Test 2: Edit Action
if [ "$ACTION" = "edit" ]; then
    print_info "Test 2: Testing EDIT action..."

    PAYLOAD='{
      "Action": "Edit",
      "maChuyenDi": "test_webhook_001",
      "trangThai": "Đang giao hàng",
      "tongDoanhThu": "6,000,000",
      "data_json": {
        "thongTinChuyenDi": {
          "soXe": "51A-TEST-UPDATED"
        }
      }
    }'

    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL" \
      -H "Content-Type: application/json" \
      -H "x-api-key: $API_KEY" \
      -d "$PAYLOAD")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" = "200" ]; then
        print_success "EDIT request successful (HTTP $HTTP_CODE)"
        echo "$BODY" | jq '.'
    else
        print_error "EDIT request failed (HTTP $HTTP_CODE)"
        echo "$BODY"
    fi
fi

# Test 3: Delete Action
if [ "$ACTION" = "delete" ]; then
    print_info "Test 3: Testing DELETE action..."

    PAYLOAD='{
      "Action": "Delete",
      "maChuyenDi": "test_webhook_001"
    }'

    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL" \
      -H "Content-Type: application/json" \
      -H "x-api-key: $API_KEY" \
      -d "$PAYLOAD")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" = "200" ]; then
        print_success "DELETE request successful (HTTP $HTTP_CODE)"
        echo "$BODY" | jq '.'
    else
        print_error "DELETE request failed (HTTP $HTTP_CODE)"
        echo "$BODY"
    fi
fi

# Test 4: Unauthorized (Wrong API Key)
if [ "$ACTION" = "auth" ]; then
    print_info "Test 4: Testing authentication (wrong API key)..."

    PAYLOAD='{"Action": "Add", "maChuyenDi": "test"}'

    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL" \
      -H "Content-Type: application/json" \
      -H "x-api-key: wrong-key" \
      -d "$PAYLOAD")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" = "401" ]; then
        print_success "Authentication test passed (HTTP $HTTP_CODE - Unauthorized)"
        echo "$BODY" | jq '.'
    else
        print_error "Authentication test failed (expected 401, got HTTP $HTTP_CODE)"
        echo "$BODY"
    fi
fi

echo ""
echo "=================================================="
print_info "Test completed!"
echo "=================================================="
