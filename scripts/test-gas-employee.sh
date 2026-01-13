#!/bin/bash

# Test Google Apps Script getNhanVien endpoint
# Replace {SCRIPT_ID} with your actual Google Apps Script Web App URL

echo "=========================================="
echo "Testing Google Apps Script - getNhanVien"
echo "=========================================="

# IMPORTANT: Replace this URL with your deployed Web App URL
GAS_URL="https://script.google.com/macros/s/{YOUR_SCRIPT_ID}/exec?action=getNhanVien"

echo ""
echo "📍 Testing endpoint: $GAS_URL"
echo ""

# Test the endpoint
response=$(curl -s "$GAS_URL")

# Check if response is valid JSON
if echo "$response" | jq empty 2>/dev/null; then
  echo "✅ Valid JSON response"
  echo ""
  
  # Check if success
  success=$(echo "$response" | jq -r '.success')
  if [ "$success" = "true" ]; then
    echo "✅ Request successful!"
    
    # Count employees
    employee_count=$(echo "$response" | jq '.data | length')
    echo "📊 Total employees: $employee_count"
    echo ""
    
    # Show first employee
    echo "👤 First employee:"
    echo "$response" | jq '.data[0]'
    echo ""
    
    # Show all employee codes
    echo "📋 All employee codes:"
    echo "$response" | jq -r '.data[].maNhanVien'
    
  else
    echo "❌ Request failed"
    echo "$response" | jq '.'
  fi
else
  echo "❌ Invalid JSON response"
  echo "Response: $response"
fi

echo ""
echo "=========================================="
echo "Test complete"
echo "=========================================="
