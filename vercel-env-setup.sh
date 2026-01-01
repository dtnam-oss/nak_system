#!/bin/bash
# Script to add environment variables to Vercel

echo "📋 Environment Variables cần thêm vào Vercel Dashboard:"
echo ""
echo "🔗 Truy cập: https://vercel.com/dashboard"
echo "   → Chọn project 'nak-logistic-system'"
echo "   → Settings → Environment Variables"
echo ""
echo "================================"
echo "COPY & PASTE CÁC BIẾN SAU:"
echo "================================"
echo ""

# Read and display all env vars (except sensitive ones should be added manually)
cat .env.local | grep -v "^#" | grep -v "^$" | while IFS='=' read -r key value; do
    echo "$key=$value"
done

echo ""
echo "================================"
echo "LƯU Ý:"
echo "================================"
echo "1. Apply to: Production, Preview, Development"
echo "2. Sau khi thêm xong, redeploy project"
echo "3. Dashboard sẽ hoạt động sau khi deploy xong"
echo ""
