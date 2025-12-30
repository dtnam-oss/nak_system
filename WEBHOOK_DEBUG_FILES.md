# 📋 Webhook Debug Files - Quick Reference

Tổng hợp tất cả files liên quan đến debug AppSheet webhook.

## 📁 Files Overview

| File | Mô Tả | Mục Đích |
|------|-------|----------|
| [app/api/webhook/appsheet/route.ts](app/api/webhook/appsheet/route.ts) | ⭐ **Main webhook API** | Code chính đã được refactor với debug logging |
| [WEBHOOK_DEBUG_GUIDE.md](WEBHOOK_DEBUG_GUIDE.md) | 📖 **Hướng dẫn debug** | Hướng dẫn chi tiết cách debug và troubleshoot |
| [TEST_WEBHOOK_README.md](TEST_WEBHOOK_README.md) | 📖 **Test script guide** | Hướng dẫn sử dụng test script |
| [test-webhook.sh](test-webhook.sh) | 🧪 **Test script** | Bash script chạy 6 test cases tự động |
| [test-webhook-payload.json](test-webhook-payload.json) | 📝 **Sample payload** | JSON payload mẫu để test |

---

## 🚀 Quick Start (3 Bước)

### Bước 1: Cài đặt dependencies

```bash
# macOS
brew install jq

# Ubuntu/Debian
sudo apt-get install jq
```

### Bước 2: Cho phép chạy script

```bash
chmod +x test-webhook.sh
```

### Bước 3: Chạy test

```bash
# Test local (chạy npm run dev trước)
./test-webhook.sh local

# Test production
./test-webhook.sh production
```

---

## 🔍 Các Thay Đổi Chính

### 1. Enhanced Debug Logging

**File:** [app/api/webhook/appsheet/route.ts](app/api/webhook/appsheet/route.ts)

#### ✅ Đã thêm:
- ✅ Log toàn bộ request headers
- ✅ Log raw body (text) trước khi parse JSON
- ✅ Separate try/catch cho JSON parsing
- ✅ Log chi tiết mỗi bước normalization
- ✅ Log database operation + error handling
- ✅ Tất cả logs có prefix `[APPSHEET_DEBUG]`

#### ⚠️ Lưu ý:
- Sử dụng `await request.text()` trước để tránh lỗi "Body is unusable"
- Parse JSON từ raw text thay vì `request.json()`
- Có thể tắt debug bằng environment variable sau khi fix xong

---

## 📊 Debug Workflow

```
┌─────────────────────────────────────────┐
│  1. Trigger Webhook từ AppSheet         │
│     (Tạo/sửa chuyến đi)                 │
└──────────────┬──────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────┐
│  2. Kiểm tra Vercel Logs                │
│     Filter: [APPSHEET_DEBUG]            │
└──────────────┬──────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────┐
│  3. Chạy Test Script với Postman        │
│     ./test-webhook.sh local             │
└──────────────┬──────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────┐
│  4. So Sánh Logs: AppSheet vs Postman   │
│     - Headers khác gì?                  │
│     - Raw body khác gì?                 │
│     - Normalization khác gì?            │
└──────────────┬──────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────┐
│  5. Fix Issue                           │
│     - Sửa AppSheet config               │
│     - Hoặc sửa API code                 │
└──────────────┬──────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────┐
│  6. Verify Fix                          │
│     Test lại từ AppSheet                │
└─────────────────────────────────────────┘
```

---

## 📝 Checklist Debug

### Phase 1: Initial Check
- [ ] Test với Postman thành công?
  - ✅ Yes → Vấn đề ở AppSheet
  - ❌ No → Vấn đề ở API code

### Phase 2: Log Analysis
- [ ] Kiểm tra `[APPSHEET_DEBUG] Headers`
  - [ ] Có `x-api-key` header?
  - [ ] `Content-Type` là `application/json`?

- [ ] Kiểm tra `[APPSHEET_DEBUG] Raw Body`
  - [ ] Valid JSON format?
  - [ ] Có ký tự lạ?
  - [ ] Length hợp lý?

- [ ] Kiểm tra `[APPSHEET_DEBUG] Authentication`
  - [ ] API key khớp?

- [ ] Kiểm tra `[APPSHEET_DEBUG] Normalization`
  - [ ] Field nào bị null?
  - [ ] Data types đúng?

- [ ] Kiểm tra `[APPSHEET_DEBUG] Database`
  - [ ] SQL parameters OK?
  - [ ] Có constraint violation?

### Phase 3: Fix & Verify
- [ ] Fix issue dựa trên logs
- [ ] Test lại với script
- [ ] Test lại từ AppSheet
- [ ] Monitor production logs

---

## 🛠️ Common Issues & Fixes

### Issue 1: JSON Parse Error

**Symptoms:**
```
[APPSHEET_DEBUG] ERROR parsing JSON: Unexpected token...
```

**Fix:**
1. Copy raw body từ logs
2. Paste vào jsonlint.com
3. Fix JSON format trong AppSheet template

---

### Issue 2: Authentication Failed

**Symptoms:**
```
[APPSHEET_DEBUG] Authentication failed - Invalid API key
```

**Fix:**
1. Check Vercel env vars: `vercel env ls`
2. Check AppSheet webhook config
3. So sánh key prefix trong logs

---

### Issue 3: Missing Required Field

**Symptoms:**
```
[APPSHEET_DEBUG] ERROR: Missing maChuyenDi field
```

**Fix:**
1. Check parsed body trong logs
2. Verify field name trong AppSheet (case-sensitive)
3. Ensure field is included in webhook template

---

### Issue 4: Database Error

**Symptoms:**
```
[APPSHEET_DEBUG] Database operation failed: null value...
```

**Fix:**
1. Check normalization logs
2. Identify which field is null
3. Add default value hoặc fix AppSheet data

---

## 📚 Documentation Links

- **Main Guide:** [WEBHOOK_DEBUG_GUIDE.md](WEBHOOK_DEBUG_GUIDE.md) - Hướng dẫn debug chi tiết với ví dụ
- **Test Guide:** [TEST_WEBHOOK_README.md](TEST_WEBHOOK_README.md) - Hướng dẫn test script
- **Workflow Docs:** [WORKFLOW_DOCUMENTATION.md](WORKFLOW_DOCUMENTATION.md) - Tổng quan hệ thống

---

## 🎯 Next Steps

### Ngay bây giờ:
1. **Deploy code mới:**
   ```bash
   git add .
   git commit -m "feat: add comprehensive webhook debug logging"
   git push origin main
   ```

2. **Chạy test local:**
   ```bash
   npm run dev
   ./test-webhook.sh local
   ```

3. **Trigger webhook từ AppSheet:**
   - Tạo/sửa một chuyến đi
   - Vào Vercel Logs ngay lập tức
   - Filter: `[APPSHEET_DEBUG]`

### Sau khi tìm được lỗi:
1. So sánh logs Postman vs AppSheet
2. Fix issue (AppSheet config hoặc API code)
3. Verify fix hoạt động
4. (Optional) Tắt debug logging nếu muốn

---

## 💡 Tips & Tricks

### 1. Quick Log Filter

**Vercel Dashboard:**
```
[APPSHEET_DEBUG]
```

**CLI:**
```bash
vercel logs [deployment-url] | grep "APPSHEET_DEBUG"
```

### 2. Compare Logs Script

```bash
# Export logs
./test-webhook.sh local > postman.log
# Trigger AppSheet webhook
vercel logs > appsheet.log

# Compare
diff postman.log appsheet.log
```

### 3. Monitor Real-Time

```bash
# Terminal 1: Run dev server
npm run dev

# Terminal 2: Watch logs
tail -f .next/server/*.log | grep APPSHEET_DEBUG

# Terminal 3: Run tests
./test-webhook.sh local
```

### 4. Save Test Results

```bash
mkdir -p test-results
./test-webhook.sh local > "test-results/$(date +%Y%m%d-%H%M%S).log"
```

---

## 📞 Need Help?

### Debug không ra vấn đề?

1. **Export đầy đủ logs:**
   ```bash
   vercel logs [deployment-url] > full-debug.log
   ```

2. **Export AppSheet logs:**
   - AppSheet Editor → Monitor → Webhook Logs
   - Screenshot hoặc copy text

3. **Tạo issue report:**
   - File: `ISSUE_REPORT.md`
   - Include: Logs, screenshots, expected vs actual behavior

### Contact

- **Email:** dev@nak-logistics.com
- **GitHub Issues:** [Create Issue](https://github.com/your-org/nak-logistic-system/issues)

---

## ✅ Success Criteria

Webhook debug thành công khi:

- [ ] Test script pass 6/6 test cases
- [ ] AppSheet webhook ghi được vào DB
- [ ] Logs không có error
- [ ] Data hiển thị đúng trên frontend
- [ ] Normalization chính xác
- [ ] Response time < 2 seconds

---

**Last Updated:** 2024-12-30
**Version:** 2.0.0
**Author:** NAK Logistics Development Team
