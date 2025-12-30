# Test Webhook Script - Quick Start Guide

## Tổng Quan

Script này giúp test AppSheet webhook API endpoint với nhiều test cases khác nhau để đảm bảo API hoạt động đúng.

## Files

- `test-webhook.sh` - Bash script chạy 6 test cases
- `test-webhook-payload.json` - JSON payload mẫu giống AppSheet
- `WEBHOOK_DEBUG_GUIDE.md` - Hướng dẫn debug chi tiết

## Yêu Cầu

### 1. Dependencies

```bash
# jq (JSON processor)
brew install jq  # macOS
# hoặc
sudo apt-get install jq  # Linux
```

### 2. Environment Variables

File `.env.local` phải có:
```bash
APPSHEET_SECRET_KEY=your-secret-key-here
```

### 3. Permissions

```bash
chmod +x test-webhook.sh
```

## Cách Sử Dụng

### Test Local Development

```bash
# Chạy dev server trước
npm run dev

# Chạy test script
./test-webhook.sh local
```

### Test Production

```bash
# Sửa URL trong script trước:
# Dòng 14: API_URL="https://your-app.vercel.app/api/webhook/appsheet"

# Chạy test
./test-webhook.sh production
```

## Test Cases

Script chạy 6 test cases tự động:

### ✅ Test 1: Valid Add Request
- **Payload:** test-webhook-payload.json
- **Expected:** HTTP 200, success: true
- **Tests:** UPSERT operation với đầy đủ field

### ❌ Test 2: Invalid API Key
- **Payload:** Valid JSON + Invalid API key
- **Expected:** HTTP 401, error: "Unauthorized"
- **Tests:** Authentication middleware

### ❌ Test 3: Invalid JSON
- **Payload:** Malformed JSON
- **Expected:** HTTP 400, error: "Invalid JSON format"
- **Tests:** JSON parsing error handling

### ❌ Test 4: Missing Required Field
- **Payload:** Missing `maChuyenDi`
- **Expected:** HTTP 400, error: "Missing required field"
- **Tests:** Validation logic

### ✅ Test 5: Valid Update Request
- **Payload:** Update existing record
- **Expected:** HTTP 200, success: true
- **Tests:** UPSERT conflict resolution

### ✅ Test 6: Valid Delete Request
- **Payload:** Delete by `maChuyenDi`
- **Expected:** HTTP 200, action: "delete"
- **Tests:** DELETE operation

## Expected Output

```bash
$ ./test-webhook.sh local

Testing LOCAL endpoint: http://localhost:3000/api/webhook/appsheet
API Key found (first 10 chars): abc123xyz...

========== TEST 1: Valid Add Request ==========
{
  "success": true,
  "action": "upsert",
  "orderId": "TEST_20241230_001",
  "message": "Record synchronized successfully",
  "normalized": {
    "provider": "NAK",
    "tripType": "Một chiều",
    "routeType": "Liên tỉnh",
    "status": "approved",
    "totalDistance": 35,
    "cost": 5000000,
    "weight": 25.5
  }
}

HTTP Status: 200

========== TEST 2: Invalid API Key ==========
{
  "error": "Unauthorized"
}

HTTP Status: 401

... (4 test cases khác)

========== ALL TESTS COMPLETED ==========

Next steps:
1. Check Vercel logs for [APPSHEET_DEBUG] messages
2. Compare the logs from this test vs AppSheet webhook
3. Look for differences in:
   - Headers (Content-Type, x-api-key)
   - Raw body format
   - JSON structure
   - Field values and types
```

## Customization

### Thay Đổi Test Payload

Edit `test-webhook-payload.json`:

```json
{
  "Action": "Add",
  "maChuyenDi": "YOUR_CUSTOM_ID",
  "ngayTao": "31/12/2024",
  "tenKhachHang": "Your Company Name",
  ...
}
```

### Thêm Test Case Mới

Edit `test-webhook.sh`, thêm vào cuối:

```bash
# Test 7: Custom Test
echo -e "${GREEN}========== TEST 7: Custom Test ==========${NC}"
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $APPSHEET_SECRET_KEY" \
  -d '{
    "Action": "Add",
    "maChuyenDi": "CUSTOM_001",
    "ngayTao": "31/12/2024"
  }' \
  --silent --show-error --write-out "\n\nHTTP Status: %{http_code}\n" \
  | jq '.'
```

## Troubleshooting

### Lỗi: `jq: command not found`

```bash
# macOS
brew install jq

# Ubuntu/Debian
sudo apt-get install jq

# CentOS/RHEL
sudo yum install jq
```

### Lỗi: `APPSHEET_SECRET_KEY not found`

```bash
# Kiểm tra file .env.local tồn tại
ls -la .env.local

# Kiểm tra nội dung
cat .env.local | grep APPSHEET_SECRET_KEY

# Nếu chưa có, tạo mới
echo "APPSHEET_SECRET_KEY=your-key-here" >> .env.local
```

### Lỗi: `Permission denied`

```bash
chmod +x test-webhook.sh
```

### Lỗi: `Connection refused` (Local)

```bash
# Chắc chắn dev server đang chạy
npm run dev

# Kiểm tra port 3000
lsof -i :3000
```

### Lỗi: `404 Not Found` (Production)

```bash
# Kiểm tra URL trong script (dòng 14)
# Phải là: https://your-actual-app.vercel.app/api/webhook/appsheet

# Hoặc lấy URL từ Vercel dashboard
vercel ls
```

## Integration với CI/CD

### GitHub Actions

Tạo file `.github/workflows/test-webhook.yml`:

```yaml
name: Test Webhook API

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install jq
        run: sudo apt-get install jq

      - name: Create .env.local
        run: echo "APPSHEET_SECRET_KEY=${{ secrets.APPSHEET_SECRET_KEY }}" > .env.local

      - name: Run Tests
        run: ./test-webhook.sh production
```

### Vercel Deploy Hook

Thêm vào `vercel.json`:

```json
{
  "buildCommand": "npm run build && ./test-webhook.sh local",
  "ignoreCommand": "git diff HEAD^ HEAD --quiet . ':(exclude)*.md'"
}
```

## Advanced Usage

### Test với nhiều payloads

```bash
# Tạo folder test-payloads/
mkdir test-payloads

# Tạo nhiều file JSON
cat > test-payloads/add-nak.json <<EOF
{
  "Action": "Add",
  "maChuyenDi": "NAK_001",
  "donViVanChuyen": "NAK"
}
EOF

cat > test-payloads/add-vendor.json <<EOF
{
  "Action": "Add",
  "maChuyenDi": "VENDOR_001",
  "donViVanChuyen": "VENDOR"
}
EOF

# Loop test
for file in test-payloads/*.json; do
  echo "Testing $file"
  curl -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    -H "x-api-key: $APPSHEET_SECRET_KEY" \
    -d @$file
done
```

### Load Testing

```bash
# Sử dụng Apache Bench
ab -n 100 -c 10 \
  -H "Content-Type: application/json" \
  -H "x-api-key: $APPSHEET_SECRET_KEY" \
  -p test-webhook-payload.json \
  http://localhost:3000/api/webhook/appsheet

# Sử dụng wrk
wrk -t4 -c10 -d30s \
  -H "Content-Type: application/json" \
  -H "x-api-key: $APPSHEET_SECRET_KEY" \
  --body @test-webhook-payload.json \
  http://localhost:3000/api/webhook/appsheet
```

## Best Practices

### 1. Test Before Deploy

```bash
# Luôn test local trước
npm run dev
./test-webhook.sh local

# Nếu pass hết, mới deploy
git push origin main
```

### 2. Monitor Production

```bash
# Chạy test sau mỗi deploy
vercel deploy --prod
sleep 10  # Đợi deploy xong
./test-webhook.sh production
```

### 3. Backup Test Results

```bash
# Save output vào file
./test-webhook.sh local > test-results-$(date +%Y%m%d-%H%M%S).log
```

### 4. Compare Results

```bash
# So sánh 2 lần test
diff test-results-old.log test-results-new.log
```

## FAQs

### Q: Test script có thể chạy trên Windows không?

A: Có, dùng Git Bash hoặc WSL:
```bash
# Git Bash
bash test-webhook.sh local

# WSL
wsl bash test-webhook.sh local
```

### Q: Làm sao test với production API key khác?

A:
```bash
# Override env var
APPSHEET_SECRET_KEY=prod-key-here ./test-webhook.sh production
```

### Q: Có thể test nhiều endpoints cùng lúc không?

A:
```bash
# Parallel testing
./test-webhook.sh local &
./test-webhook.sh production &
wait
```

### Q: Debug test case cụ thể?

A:
```bash
# Chạy manual curl với verbose
curl -v -X POST "http://localhost:3000/api/webhook/appsheet" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $APPSHEET_SECRET_KEY" \
  -d @test-webhook-payload.json
```

---

**Last Updated:** 2024-12-30
**Author:** NAK Logistics Development Team
