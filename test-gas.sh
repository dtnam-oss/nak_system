#!/bin/bash

# Test GAS Payslip Service directly
# Run this to test if GAS is working properly

GAS_URL="https://script.google.com/macros/s/AKfycbzncuSMQeber-W7sWZPATcNNPj3pfLxOlXpMGHnjrstMXWcC3fR17xbWkONS5Vn7qGqJg/exec"

echo "🧪 Testing GAS Payslip Service"
echo "================================"
echo ""

# Test 1: GET request
echo "1️⃣ Test GET (doGet):"
GET_RESPONSE=$(curl -sL "$GAS_URL")
echo "$GET_RESPONSE"
echo ""

if echo "$GET_RESPONSE" | grep -q '"status":"ok"'; then
  echo "✅ GET test PASSED"
else
  echo "❌ GET test FAILED"
  echo "   Response: $GET_RESPONSE"
fi
echo ""
echo "================================"
echo ""

# Test 2: POST request with minimal data
echo "2️⃣ Test POST (doPost) with minimal data:"

TEST_DATA='{
  "recipientEmail": "test@example.com",
  "recipientName": "Test User",
  "month": 1,
  "year": 2026,
  "ma_nhan_vien": "TEST001",
  "ten_nhan_vien": "Test User",
  "thang": 1,
  "nam": 2026,
  "luong_bat_dau": 0,
  "hoan_coc": 0,
  "thuong": 0,
  "tong_thu_nhap": 1000000,
  "truy_thu_dau": 0,
  "truy_thu_ontime": 0,
  "tru_coc": 0,
  "phat_che_tai": 0,
  "truy_thu_vetc": 0,
  "phat_nguoi": 0,
  "tien_lam_the": 0,
  "bhxh": 0,
  "khac": 0,
  "tong_khau_tru": 0,
  "luong_thuc_lanh": 1000000,
  "tong_luong_chuyen": 0,
  "luongChuyen": []
}'

POST_RESPONSE=$(curl -sL -X POST "$GAS_URL" \
  -H "Content-Type: application/json" \
  -d "$TEST_DATA" 2>&1)

echo "$POST_RESPONSE" | head -50
echo ""

if echo "$POST_RESPONSE" | grep -q '"success":true'; then
  echo "✅ POST test PASSED"
  echo "   Email should be sent to test@example.com"
elif echo "$POST_RESPONSE" | grep -q '"success":false'; then
  echo "❌ POST test FAILED with error from GAS"
  echo "   Check error message above"
elif echo "$POST_RESPONSE" | grep -q '<HTML>'; then
  echo "❌ POST test FAILED - GAS returned HTML (authorization/deployment issue)"
  echo "   Possible causes:"
  echo "   - Deployment not authorized"
  echo "   - Script has errors"
  echo "   - Missing doPost function"
else
  echo "❌ POST test FAILED - Unexpected response"
fi

echo ""
echo "================================"
echo ""
echo "📋 Next steps:"
echo "1. If GET works but POST fails → Check GAS deployment authorization"
echo "2. If both fail → Check deployment URL"
echo "3. Check GAS execution logs: https://script.google.com/home/executions"
