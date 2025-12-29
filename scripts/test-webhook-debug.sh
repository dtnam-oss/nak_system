#!/bin/bash

# Debug Webhook - Test with exact AppSheet data format
# This simulates what AppSheet should send

API_URL="https://nak-system.vercel.app/api/webhook/appsheet"
API_KEY="migration-2025-secure"

echo "=========================================="
echo "Debug Webhook - Testing AppSheet Format"
echo "=========================================="
echo ""

# Test 1: Valid JSON with quoted values (CORRECT FORMAT)
echo "📝 Test 1: Correct JSON format (with quotes)"
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{
    "Action": "Add",
    "maChuyenDi": "nak_debug_001",
    "ngayTao": "30/12/2025",
    "tenKhachHang": "Test Debug Webhook",
    "loaiChuyen": "Theo tuyến",
    "loaiTuyen": "Cố định",
    "tenTuyen": "Test Route",
    "tenTaiXe": "Test Driver",
    "donViVanChuyen": "NAK",
    "trangThai": "Chờ giao hàng",
    "tongQuangDuong": "100",
    "tongDoanhThu": "1000000",
    "bienSoXe": "51A-TEST",
    "data_json": {}
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Test 1 PASSED (HTTP $HTTP_CODE)"
    echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
else
    echo "❌ Test 1 FAILED (HTTP $HTTP_CODE)"
    echo "$BODY"
fi

echo ""
echo "=========================================="
echo "Verify in database:"
echo "=========================================="
echo "Go to Neon SQL Editor and run:"
echo ""
echo "SELECT * FROM reconciliation_orders"
echo "WHERE order_id = 'nak_debug_001';"
echo ""
