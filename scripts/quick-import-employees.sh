#!/bin/bash

# Quick Import Employees - One Command
# Run this after deploying Google Apps Script

echo "🚀 NAK Logistics - Quick Employee Import"
echo "========================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_ENDPOINT="https://nak-system.vercel.app/api/employees/import"

# Check if secret is provided
if [ -z "$1" ]; then
  echo -e "${RED}❌ Error: Secret key required${NC}"
  echo ""
  echo "Usage:"
  echo "  ./scripts/quick-import-employees.sh YOUR_SECRET_KEY"
  echo ""
  echo "Example:"
  echo "  ./scripts/quick-import-employees.sh nak_secret_2025"
  echo ""
  exit 1
fi

SECRET_KEY="$1"

echo -e "${YELLOW}Step 1:${NC} Testing API connection..."
ping_response=$(curl -s -o /dev/null -w "%{http_code}" "$API_ENDPOINT?secret=$SECRET_KEY")

if [ "$ping_response" != "200" ]; then
  echo -e "${RED}❌ Cannot connect to API (HTTP $ping_response)${NC}"
  exit 1
fi

echo -e "${GREEN}✅ API connection OK${NC}"
echo ""

echo -e "${YELLOW}Step 2:${NC} Importing employees from Google Sheets..."
response=$(curl -s "$API_ENDPOINT?secret=$SECRET_KEY")

# Parse response
if echo "$response" | jq empty 2>/dev/null; then
  success=$(echo "$response" | jq -r '.success')
  
  if [ "$success" = "true" ]; then
    echo -e "${GREEN}✅ Import successful!${NC}"
    echo ""
    
    # Show stats
    total=$(echo "$response" | jq -r '.total // 0')
    imported=$(echo "$response" | jq -r '.imported // 0')
    updated=$(echo "$response" | jq -r '.updated // 0')
    
    echo "📊 Results:"
    echo "   Total: $total"
    echo "   New: $imported"
    echo "   Updated: $updated"
    echo ""
    
    # Show sample employees
    echo "👥 Sample employees:"
    echo "$response" | jq -r '.employees[0:3][] | "   • \(.maNhanVien): \(.hoVaTen)"' 2>/dev/null || echo "   (No details available)"
    
  else
    echo -e "${RED}❌ Import failed${NC}"
    error=$(echo "$response" | jq -r '.error // "Unknown error"')
    echo "Error: $error"
    exit 1
  fi
else
  echo -e "${RED}❌ Invalid API response${NC}"
  echo "Response: $response"
  exit 1
fi

echo ""
echo -e "${YELLOW}Step 3:${NC} Verifying data in database..."

# Quick verify
verify_response=$(curl -s "https://nak-system.vercel.app/api/employees")
if echo "$verify_response" | jq empty 2>/dev/null; then
  count=$(echo "$verify_response" | jq '.employees | length')
  echo -e "${GREEN}✅ Verified: $count employees in database${NC}"
else
  echo -e "${YELLOW}⚠️  Could not verify (check manually)${NC}"
fi

echo ""
echo "========================================"
echo -e "${GREEN}🎉 Import complete!${NC}"
echo ""
echo "Next steps:"
echo "1. View employees: https://nak-system.vercel.app/api/employees"
echo "2. Run full tests: ./scripts/test-employee-import.sh"
echo "3. Setup AppSheet bots for auto-sync"
echo ""
