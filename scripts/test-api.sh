#!/bin/bash

# =====================================================
# NAK Logistics API Testing Script
# Test all API endpoints and filters
# =====================================================

BASE_URL="${1:-http://localhost:3000}"
API_ENDPOINT="$BASE_URL/api/reconciliation"

echo "🚀 NAK Logistics API Testing"
echo "================================"
echo "Base URL: $BASE_URL"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to test endpoint
test_endpoint() {
  local name="$1"
  local url="$2"
  local expected_status="${3:-200}"

  TOTAL_TESTS=$((TOTAL_TESTS + 1))

  echo -e "${YELLOW}Test $TOTAL_TESTS:${NC} $name"
  echo "URL: $url"

  # Make request and capture status code
  response=$(curl -s -w "\n%{http_code}" "$url")
  status_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')

  # Check status code
  if [ "$status_code" -eq "$expected_status" ]; then
    echo -e "${GREEN}✓ Status: $status_code${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))

    # Parse JSON and show summary
    if [ "$status_code" -eq 200 ]; then
      record_count=$(echo "$body" | jq -r '.records | length' 2>/dev/null || echo "N/A")
      total_count=$(echo "$body" | jq -r '.total' 2>/dev/null || echo "N/A")
      echo "  Records: $record_count"
      echo "  Total: $total_count"

      # Show first record sample
      if [ "$record_count" != "N/A" ] && [ "$record_count" -gt 0 ]; then
        first_record=$(echo "$body" | jq -r '.records[0]' 2>/dev/null)
        echo "  First Record:"
        echo "$first_record" | jq -r '
          "    ID: \(.id)",
          "    Mã chuyến: \(.maChuyenDi)",
          "    Khách hàng: \(.tenKhachHang)",
          "    Loại chuyến: \(.loaiChuyen)",
          "    Loại tuyến: \(.loaiTuyen)",
          "    Đơn vị vận chuyển: \(.donViVanChuyen)",
          "    Tài xế: \(.tenTaiXe)",
          "    Quãng đường: \(.tongQuangDuong) km",
          "    Doanh thu: \(.tongDoanhThu | tonumber) VND"
        ' 2>/dev/null || echo "    (Error parsing record)"
      fi
    fi
  else
    echo -e "${RED}✗ Status: $status_code (expected $expected_status)${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
    echo "Error response:"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
  fi

  echo ""
}

# =====================================================
# Test Cases
# =====================================================

echo "📊 Basic Tests"
echo "---"

# Test 1: Basic query (no filters)
test_endpoint \
  "Get all records (no filters)" \
  "$API_ENDPOINT"

# Test 2: Limit parameter
test_endpoint \
  "Get first 5 records (limit=5)" \
  "$API_ENDPOINT?limit=5"

# Test 3: Date range filter
test_endpoint \
  "Filter by date range (2024-12-25 to 2024-12-29)" \
  "$API_ENDPOINT?fromDate=2024-12-25&toDate=2024-12-29"

echo ""
echo "🔍 Filter Tests"
echo "---"

# Test 4: Provider filter (NAK)
test_endpoint \
  "Filter by provider (NAK)" \
  "$API_ENDPOINT?donViVanChuyen=NAK"

# Test 5: Provider filter (VENDOR)
test_endpoint \
  "Filter by provider (VENDOR)" \
  "$API_ENDPOINT?donViVanChuyen=VENDOR"

# Test 6: Trip type filter
test_endpoint \
  "Filter by trip type (Một chiều)" \
  "$API_ENDPOINT?loaiChuyen=Một%20chiều"

# Test 7: Route type filter
test_endpoint \
  "Filter by route type (Liên tỉnh)" \
  "$API_ENDPOINT?loaiTuyen=Liên%20tỉnh"

# Test 8: Status filter
test_endpoint \
  "Filter by status (approved)" \
  "$API_ENDPOINT?status=approved"

# Test 9: Customer filter
test_endpoint \
  "Filter by customer (ABC)" \
  "$API_ENDPOINT?khachHang=ABC"

echo ""
echo "🔎 Search Tests"
echo "---"

# Test 10: Search by order ID
test_endpoint \
  "Search by order ID (NAK-2024)" \
  "$API_ENDPOINT?searchQuery=NAK-2024"

# Test 11: Search by driver name
test_endpoint \
  "Search by driver name (Nguyễn)" \
  "$API_ENDPOINT?searchQuery=Nguyễn"

# Test 12: Search by route
test_endpoint \
  "Search by route (Hà Nội)" \
  "$API_ENDPOINT?searchQuery=Hà%20Nội"

echo ""
echo "🎯 Complex Filter Combinations"
echo "---"

# Test 13: Multiple filters
test_endpoint \
  "Multiple filters (NAK + Liên tỉnh + approved)" \
  "$API_ENDPOINT?donViVanChuyen=NAK&loaiTuyen=Liên%20tỉnh&status=approved"

# Test 14: Date range + provider + limit
test_endpoint \
  "Date range + provider + limit" \
  "$API_ENDPOINT?fromDate=2024-12-01&toDate=2024-12-31&donViVanChuyen=NAK&limit=10"

# Test 15: Search + filters
test_endpoint \
  "Search + provider filter" \
  "$API_ENDPOINT?searchQuery=ABC&donViVanChuyen=VENDOR"

echo ""
echo "🚫 Edge Cases"
echo "---"

# Test 16: Empty result (invalid filter)
test_endpoint \
  "Invalid provider (should return empty)" \
  "$API_ENDPOINT?donViVanChuyen=INVALID"

# Test 17: Very large limit
test_endpoint \
  "Very large limit (2000, should cap at 1000)" \
  "$API_ENDPOINT?limit=2000"

# Test 18: Invalid date format (should still work, might return all)
test_endpoint \
  "Invalid date format" \
  "$API_ENDPOINT?fromDate=invalid-date"

echo ""
echo "================================"
echo "📊 Test Summary"
echo "================================"
echo -e "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
  echo -e "${GREEN}✓ All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}✗ Some tests failed${NC}"
  exit 1
fi
