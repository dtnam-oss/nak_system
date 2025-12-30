#!/bin/bash

# =====================================================
# Test Script for Webhook API V2.0
# =====================================================

echo "🧪 Testing NAK Logistics Webhook API V2.0"
echo "=========================================="
echo ""

# Configuration
API_URL="${API_URL:-http://localhost:3000/api/webhook/appsheet}"
API_KEY="${APPSHEET_SECRET_KEY:-your-secret-key-here}"

echo "📍 API URL: $API_URL"
echo "🔑 API Key: ${API_KEY:0:10}..."
echo ""

# =====================================================
# Test Case 1: Add with "Kết thúc" status
# =====================================================
echo "🧪 TEST 1: Add trip with status 'Kết thúc'"
echo "Expected: status='approved', cost=5000000, distance=150"
echo ""

curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{
    "Action": "Add",
    "maChuyenDi": "TEST_001",
    "ngayTao": "2025-12-30",
    "tenKhachHang": "ABC Corporation",
    "tongDoanhThu": 5000000,
    "tongQuangDuong": 150,
    "trangThai": "Kết thúc",
    "tenTaiXe": "Nguyen Van A",
    "donViVanChuyen": "VENDOR",
    "loaiChuyen": "Theo chuyến",
    "loaiTuyen": "Đường dài",
    "data_json": {
      "chiTietLoTrinh": [
        {
          "Id": "1",
          "bien_kiem_soat": "51A-12345",
          "tai_trong": 10,
          "quang_duong": 150
        }
      ]
    }
  }' | jq '.'

echo ""
echo "----------------------------------------"
echo ""

# =====================================================
# Test Case 2: Edit with status "completed"
# =====================================================
echo "🧪 TEST 2: Edit trip with status 'completed'"
echo "Expected: status='approved'"
echo ""

curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{
    "Action": "Edit",
    "maChuyenDi": "TEST_001",
    "ngayTao": "2025-12-30",
    "tenKhachHang": "ABC Corporation Updated",
    "tongDoanhThu": 6000000,
    "tongQuangDuong": 180,
    "trangThai": "completed",
    "tenTaiXe": "Nguyen Van B",
    "donViVanChuyen": "NAK",
    "loaiChuyen": "Hai chiều",
    "loaiTuyen": "Nội thành",
    "data_json": {
      "chiTietLoTrinh": [
        {
          "Id": "1",
          "bien_kiem_soat": "51B-67890",
          "tai_trong": 15,
          "quang_duong": 180
        }
      ]
    }
  }' | jq '.'

echo ""
echo "----------------------------------------"
echo ""

# =====================================================
# Test Case 3: Add with string numbers
# =====================================================
echo "🧪 TEST 3: Add with string numbers and Vietnamese status"
echo "Expected: Numbers parsed correctly, status='pending'"
echo ""

curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{
    "Action": "Add",
    "maChuyenDi": "TEST_002",
    "ngayTao": "2025-12-30",
    "tenKhachHang": "XYZ Company",
    "tongDoanhThu": "3,500,000",
    "tongQuangDuong": "120.5",
    "trangThai": "Mới",
    "tenTaiXe": "Tran Van C",
    "donViVanChuyen": "XE NGOÀI",
    "loaiChuyen": "Một chiều",
    "loaiTuyen": "Liên tỉnh",
    "data_json": {
      "chiTietLoTrinh": []
    }
  }' | jq '.'

echo ""
echo "----------------------------------------"
echo ""

# =====================================================
# Test Case 4: Add without route name
# =====================================================
echo "🧪 TEST 4: Add without tenTuyen (auto-generate)"
echo "Expected: routeName='Đường dài - DEF Corp'"
echo ""

curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{
    "Action": "Add",
    "maChuyenDi": "TEST_003",
    "ngayTao": "2025-12-30",
    "tenKhachHang": "DEF Corp",
    "tongDoanhThu": 4000000,
    "tongQuangDuong": 200,
    "trangThai": "Hoàn tất",
    "loaiTuyen": "Đường dài",
    "data_json": {}
  }' | jq '.'

echo ""
echo "----------------------------------------"
echo ""

# =====================================================
# Test Case 5: Delete
# =====================================================
echo "🧪 TEST 5: Delete trip"
echo "Expected: success=true, action='delete'"
echo ""

curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{
    "Action": "Delete",
    "maChuyenDi": "TEST_003"
  }' | jq '.'

echo ""
echo "----------------------------------------"
echo ""

# =====================================================
# Test Case 6: Invalid status handling
# =====================================================
echo "🧪 TEST 6: Add with unknown status"
echo "Expected: status='pending' (fallback)"
echo ""

curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{
    "Action": "Add",
    "maChuyenDi": "TEST_004",
    "ngayTao": "2025-12-30",
    "tenKhachHang": "GHI Company",
    "tongDoanhThu": 2000000,
    "tongQuangDuong": 80,
    "trangThai": "UnknownStatus",
    "data_json": {}
  }' | jq '.'

echo ""
echo "=========================================="
echo "✅ All tests completed!"
echo ""
echo "📊 Next Steps:"
echo "1. Check Vercel logs for detailed normalization output"
echo "2. Verify database values using Vercel Data"
echo "3. Check Dashboard to see if KPIs updated correctly"
echo "4. Test sorting/filtering on cost and total_distance columns"
echo ""
