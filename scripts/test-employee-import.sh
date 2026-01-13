#!/bin/bash

# Test script for employee import system
# Usage: ./test-employee-import.sh

echo "🧪 Testing Employee Import System"
echo "=================================="

# Configuration
API_URL="http://localhost:3000"
SECRET="migration-2025-secure"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo "${YELLOW}1. Testing Import Endpoint${NC}"
echo "-----------------------------------"
curl -s "${API_URL}/api/employees/import?secret=${SECRET}" | jq '.'

echo ""
echo "${YELLOW}2. Get All Employees${NC}"
echo "-----------------------------------"
curl -s "${API_URL}/api/employees" | jq '.total'

echo ""
echo "${YELLOW}3. Get Active Employees${NC}"
echo "-----------------------------------"
curl -s "${API_URL}/api/employees?active=true" | jq '.total'

echo ""
echo "${YELLOW}4. Get Admins${NC}"
echo "-----------------------------------"
curl -s "${API_URL}/api/employees?phan_quyen=admin" | jq '.employees[] | {ma_nhan_vien, ho_va_ten, phan_quyen}'

echo ""
echo "${YELLOW}5. Get Specific Employee (NAK001)${NC}"
echo "-----------------------------------"
curl -s "${API_URL}/api/employees?ma_nhan_vien=NAK001" | jq '{ma_nhan_vien, ho_va_ten, phong_ban, phan_quyen}'

echo ""
echo "${YELLOW}6. Update Employee Chat ID${NC}"
echo "-----------------------------------"
curl -s -X PUT "${API_URL}/api/employees" \
  -H "Content-Type: application/json" \
  -d '{"ma_nhan_vien":"NAK001","chat_id":"123456789"}' | jq '.'

echo ""
echo "${GREEN}✅ All tests completed!${NC}"
