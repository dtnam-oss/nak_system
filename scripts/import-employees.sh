#!/bin/bash

# Import employees from Google Sheets to PostgreSQL
# This script calls the import API endpoint

echo "=========================================="
echo "Import Employees to Database"
echo "=========================================="

# Configuration
API_URL="https://nak-system.vercel.app/api/employees/import"
SECRET_KEY="your_secret_key_here"  # Replace with actual secret

echo ""
echo "📍 API Endpoint: $API_URL"
echo "🔑 Using secret key: ${SECRET_KEY:0:10}..."
echo ""

# Call import API
echo "📥 Starting import..."
response=$(curl -s "$API_URL?secret=$SECRET_KEY")

# Check if response is valid JSON
if echo "$response" | jq empty 2>/dev/null; then
  echo "✅ Valid JSON response"
  echo ""
  
  # Parse response
  success=$(echo "$response" | jq -r '.success')
  
  if [ "$success" = "true" ]; then
    echo "✅ Import successful!"
    echo ""
    
    # Show statistics
    total=$(echo "$response" | jq -r '.total')
    imported=$(echo "$response" | jq -r '.imported')
    updated=$(echo "$response" | jq -r '.updated')
    skipped=$(echo "$response" | jq -r '.skipped // 0')
    
    echo "📊 Import Statistics:"
    echo "   Total records: $total"
    echo "   ✅ Imported: $imported"
    echo "   🔄 Updated: $updated"
    echo "   ⏭️  Skipped: $skipped"
    echo ""
    
    # Show sample records
    echo "👥 Sample imported employees:"
    echo "$response" | jq -r '.employees[0:3][] | "   - \(.maNhanVien): \(.hoVaTen) (\(.chucVu))"'
    
  else
    echo "❌ Import failed!"
    error=$(echo "$response" | jq -r '.error // "Unknown error"')
    echo "Error: $error"
    echo ""
    echo "Full response:"
    echo "$response" | jq '.'
  fi
else
  echo "❌ Invalid JSON response"
  echo "Response: $response"
fi

echo ""
echo "=========================================="
echo "Import complete"
echo "=========================================="
