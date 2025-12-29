#!/bin/bash

# Simple Webhook Test - No dependencies required
# Usage: ./scripts/test-webhook-simple.sh

API_URL="https://nak-system.vercel.app/api/webhook/appsheet"
API_KEY="migration-2025-secure"

echo "=========================================="
echo "Testing AppSheet Webhook - ADD Action"
echo "=========================================="
echo ""

curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{
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
    "tongQuangDuong": 1700,
    "tongDoanhThu": 5000000,
    "bienSoXe": "51A-TEST",
    "data_json": {
      "thongTinChuyenDi": {
        "soXe": "51A-TEST"
      }
    }
  }'

echo ""
echo ""
echo "=========================================="
echo "Check database with this query:"
echo "=========================================="
echo "SELECT * FROM reconciliation_orders"
echo "WHERE order_id = 'test_webhook_001';"
