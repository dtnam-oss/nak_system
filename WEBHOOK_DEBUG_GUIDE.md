# Hướng Dẫn Debug AppSheet Webhook

## Tổng Quan

File này hướng dẫn cách sử dụng debug logging mới được thêm vào webhook API để tìm nguyên nhân webhook từ AppSheet không ghi được vào database.

## Thay Đổi Đã Thực Hiện

### 1. Enhanced Logging trong `app/api/webhook/appsheet/route.ts`

**Các điểm logging chính:**

#### A. Request Headers
```typescript
// Log toàn bộ headers
const headers: Record<string, string> = {};
request.headers.forEach((value, key) => {
  headers[key] = value;
});
console.log('[APPSHEET_DEBUG] Headers:', JSON.stringify(headers, null, 2));
```

**Mục đích:** Kiểm tra `Content-Type` và `x-api-key` từ AppSheet có đúng không.

---

#### B. Raw Body
```typescript
// Lấy raw body trước khi parse JSON
rawBody = await request.text();
console.log('[APPSHEET_DEBUG] Raw Body (text):', rawBody);
console.log('[APPSHEET_DEBUG] Raw Body Length:', rawBody.length);
```

**Mục đích:** Xem chính xác payload mà AppSheet gửi (có thể có ký tự lạ, encoding sai, etc.)

---

#### C. JSON Parsing
```typescript
// Parse JSON với error handling riêng
try {
  body = JSON.parse(rawBody);
  console.log('[APPSHEET_DEBUG] Parsed JSON successfully');
  console.log('[APPSHEET_DEBUG] Parsed Body:', JSON.stringify(body, null, 2));
} catch (parseError: any) {
  console.error('[APPSHEET_DEBUG] ERROR parsing JSON:', parseError.message);
  return NextResponse.json({
    error: 'Invalid JSON format',
    message: parseError.message,
    receivedBody: rawBody.substring(0, 500)
  }, { status: 400 });
}
```

**Mục đích:** Bắt lỗi JSON parse ngay lập tức, trả về raw body để inspect.

---

#### D. Authentication
```typescript
if (apiKey !== expectedKey) {
  console.error('[APPSHEET_DEBUG] Authentication failed - Invalid API key');
  console.error('[APPSHEET_DEBUG] Expected key prefix:', expectedKey?.substring(0, 10) + '...');
  console.error('[APPSHEET_DEBUG] Received key prefix:', apiKey?.substring(0, 10) + '...');
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

**Mục đích:** Xác định có phải lỗi authentication không.

---

#### E. Data Normalization
```typescript
console.log('[APPSHEET_DEBUG] - date (raw):', body.ngayTao, '→ (normalized):', date);
console.log('[APPSHEET_DEBUG] - provider (raw):', body.donViVanChuyen, '→ (normalized):', provider);
console.log('[APPSHEET_DEBUG] - status (raw):', body.trangThai, '→ (normalized):', status);
// ... tất cả các field khác
```

**Mục đích:** Xem quá trình normalize có chính xác không, có field nào bị null/undefined không.

---

#### F. Database Operation
```typescript
try {
  const result = await sql`INSERT INTO reconciliation_orders ...`;
  console.log('[APPSHEET_DEBUG] Database UPSERT successful');
  console.log('[APPSHEET_DEBUG] SQL Result:', result);
} catch (dbError: any) {
  console.error('[APPSHEET_DEBUG] ========== DATABASE ERROR ==========');
  console.error('[APPSHEET_DEBUG] Database operation failed:', dbError.message);
  console.error('[APPSHEET_DEBUG] Error code:', dbError.code);
  console.error('[APPSHEET_DEBUG] Error stack:', dbError.stack);
  return NextResponse.json({ error: 'Database error', ... }, { status: 500 });
}
```

**Mục đích:** Bắt lỗi database cụ thể (constraint violation, type mismatch, etc.)

---

## Cách Sử Dụng

### Bước 1: Deploy Code Mới

```bash
# Commit và push lên GitHub (Vercel sẽ auto-deploy)
git add .
git commit -m "feat: add comprehensive webhook debug logging"
git push origin main
```

Hoặc test local:
```bash
npm run dev
```

---

### Bước 2: Chạy Test Script

**Test Local:**
```bash
chmod +x test-webhook.sh
./test-webhook.sh local
```

**Test Production:**
```bash
./test-webhook.sh production
```

Script sẽ chạy 6 test cases:
1. ✅ Valid Add Request
2. ❌ Invalid API Key
3. ❌ Invalid JSON
4. ❌ Missing Required Field
5. ✅ Valid Update Request
6. ✅ Valid Delete Request

---

### Bước 3: Kiểm Tra Logs

#### Local Development:
- Xem trực tiếp terminal output
- Tất cả logs sẽ hiển thị với prefix `[APPSHEET_DEBUG]`

#### Production (Vercel):
1. Vào Vercel Dashboard
2. Chọn project `nak-logistic-system`
3. Vào tab **Logs** hoặc **Functions**
4. Filter logs với keyword: `APPSHEET_DEBUG`

---

### Bước 4: Trigger Webhook Từ AppSheet

1. Mở AppSheet app
2. Tạo/cập nhật một chuyến đi
3. AppSheet sẽ tự động fire webhook
4. Ngay lập tức vào Vercel Logs để xem

---

## So Sánh Logs: Postman vs AppSheet

### Ví Dụ Log Thành Công (Postman):

```
[APPSHEET_DEBUG] ========== NEW WEBHOOK REQUEST ==========
[APPSHEET_DEBUG] Timestamp: 2024-12-30T10:30:45.123Z
[APPSHEET_DEBUG] Headers: {
  "content-type": "application/json",
  "x-api-key": "your-secret-key-here",
  "user-agent": "PostmanRuntime/7.32.1"
}
[APPSHEET_DEBUG] Raw Body (text): {"Action":"Add","maChuyenDi":"TEST_001",...}
[APPSHEET_DEBUG] Raw Body Length: 523
[APPSHEET_DEBUG] Parsed JSON successfully
[APPSHEET_DEBUG] Parsed Body: {
  "Action": "Add",
  "maChuyenDi": "TEST_20241230_001",
  "ngayTao": "30/12/2024",
  ...
}
[APPSHEET_DEBUG] Authentication successful
[APPSHEET_DEBUG] Webhook Action: Add
[APPSHEET_DEBUG] Order ID (maChuyenDi): TEST_20241230_001
[APPSHEET_DEBUG] Starting UPSERT process...
[APPSHEET_DEBUG] - date (raw): 30/12/2024 → (normalized): 2024-12-30
[APPSHEET_DEBUG] - provider (raw): NAK → (normalized): NAK
[APPSHEET_DEBUG] - status (raw): Hoàn tất → (normalized): approved
[APPSHEET_DEBUG] Executing database UPSERT...
[APPSHEET_DEBUG] Database UPSERT successful
```

### Những Điểm Cần So Sánh:

| Checkpoint | Postman | AppSheet | Ghi chú |
|-----------|---------|----------|---------|
| **Content-Type Header** | `application/json` | `?` | Phải là `application/json` |
| **x-api-key Header** | `your-key...` | `?` | Phải khớp chính xác |
| **Raw Body Format** | Valid JSON | `?` | Có ký tự lạ không? |
| **JSON Parse** | ✅ Success | `?` | Có lỗi parse không? |
| **Authentication** | ✅ Success | `?` | API key đúng chưa? |
| **maChuyenDi** | `TEST_001` | `?` | Field này có null không? |
| **Date Format** | `30/12/2024` | `?` | Format có khác không? |
| **Data Normalization** | ✅ All fields | `?` | Field nào bị null/undefined? |
| **Database UPSERT** | ✅ Success | `?` | Lỗi database cụ thể gì? |

---

## Các Lỗi Thường Gặp và Cách Fix

### 1. Lỗi: `Invalid JSON format`

**Nguyên nhân:**
- AppSheet gửi JSON sai cú pháp
- Có ký tự đặc biệt chưa escape
- Encoding không đúng (UTF-8)

**Cách fix:**
```typescript
// Kiểm tra raw body trong logs
[APPSHEET_DEBUG] Raw Body (text): {"Action":"Add","maChuyenDi":"NAK_001",...

// Tìm vị trí lỗi parse
[APPSHEET_DEBUG] JSON Parse Error at position: 145

// Copy raw body, paste vào jsonlint.com để validate
```

---

### 2. Lỗi: `Unauthorized`

**Nguyên nhân:**
- API key trong AppSheet webhook config sai
- API key trong Vercel environment variables sai
- Header name sai (phải là `x-api-key`)

**Cách fix:**
```bash
# Check Vercel env vars
vercel env ls

# Check AppSheet webhook config
# Settings → Integrations → Webhooks → Edit

# So sánh trong logs:
[APPSHEET_DEBUG] Expected key prefix: abc123xyz...
[APPSHEET_DEBUG] Received key prefix: def456uvw...
```

---

### 3. Lỗi: `Missing required field: maChuyenDi`

**Nguyên nhân:**
- Field `maChuyenDi` không có trong payload
- Field name sai (case-sensitive)
- Field có giá trị null/undefined

**Cách fix:**
```typescript
// Kiểm tra parsed body
[APPSHEET_DEBUG] Parsed Body: {
  "Action": "Add",
  "MaChuyenDi": "NAK_001"  // ❌ Sai! Phải là "maChuyenDi"
}

// Sửa trong AppSheet:
// Data → Tables → Column Name → Change to "maChuyenDi"
```

---

### 4. Lỗi Database: `null value in column "date" violates not-null constraint`

**Nguyên nhân:**
- Field `ngayTao` không có trong payload
- Format date không parse được
- Function `formatDate()` trả về null

**Cách fix:**
```typescript
// Kiểm tra normalization logs
[APPSHEET_DEBUG] - date (raw): undefined → (normalized): null  // ❌ Lỗi!

// Fix: Đảm bảo AppSheet gửi field "ngayTao"
// Hoặc sửa default value:
const date = formatDate(body.ngayTao) || new Date().toISOString().split('T')[0];
```

---

### 5. Lỗi Database: `value too long for type character varying(50)`

**Nguyên nhân:**
- Field vượt quá max length trong database schema
- VD: `order_id VARCHAR(50)` nhưng AppSheet gửi 60 ký tự

**Cách fix:**
```sql
-- Option 1: Tăng max length
ALTER TABLE reconciliation_orders
ALTER COLUMN order_id TYPE VARCHAR(100);

-- Option 2: Trim value trong code
const orderId = String(body.maChuyenDi).substring(0, 50);
```

---

### 6. Lỗi: `Body is unusable`

**Nguyên nhân:**
- Đọc `request.body` stream 2 lần
- Gọi `request.json()` sau khi đã gọi `request.text()`

**Đã fix:**
```typescript
// ❌ Cách cũ (lỗi)
const body1 = await request.json();
const body2 = await request.json(); // Error: Body is unusable

// ✅ Cách mới (đúng)
const rawBody = await request.text();
const body = JSON.parse(rawBody);
```

---

## Checklist Debug Workflow

### Phase 1: Xác Định Vấn Đề

- [ ] Test với Postman → Thành công?
  - ✅ Yes: Vấn đề nằm ở AppSheet webhook config
  - ❌ No: Vấn đề nằm ở API code

- [ ] Kiểm tra Vercel Logs
  - [ ] Có request nào đến không?
  - [ ] HTTP status code là gì? (401/400/500)
  - [ ] Lỗi ở bước nào? (parse JSON/auth/database)

---

### Phase 2: Debug Theo Log Prefix

#### `[APPSHEET_DEBUG] Headers:`
- [ ] Có header `x-api-key` không?
- [ ] `Content-Type` là `application/json`?
- [ ] `User-Agent` là gì? (để biết từ đâu)

#### `[APPSHEET_DEBUG] Raw Body:`
- [ ] Body có phải valid JSON không? → Paste vào jsonlint.com
- [ ] Có ký tự lạ không? (BOM, zero-width space, etc.)
- [ ] Length có hợp lý không? (quá ngắn = thiếu data)

#### `[APPSHEET_DEBUG] Parsed Body:`
- [ ] Tất cả field cần thiết có đủ không?
- [ ] Field names đúng case chưa? (`maChuyenDi` not `MaChuyenDi`)
- [ ] Data types đúng chưa? (string/number/object)

#### `[APPSHEET_DEBUG] Authentication:`
- [ ] API key có khớp không?
- [ ] Environment variable đúng chưa?

#### `[APPSHEET_DEBUG] - field (raw) → (normalized):`
- [ ] Field nào bị null/undefined?
- [ ] Normalization có chính xác không?
- [ ] Data types sau normalize đúng chưa?

#### `[APPSHEET_DEBUG] Database UPSERT:`
- [ ] SQL parameters có null không?
- [ ] JSONB details có valid không?
- [ ] Có constraint violation không?

---

### Phase 3: So Sánh Chi Tiết

| Trường Hợp | Postman | AppSheet | Action |
|-----------|---------|----------|--------|
| Same headers, same body | ✅ Success | ❌ Fail | Không thể xảy ra - check lại |
| Same headers, diff body | ✅ Success | ❌ Fail | Sửa AppSheet webhook template |
| Diff headers, same body | ✅ Success | ❌ Fail | Sửa AppSheet webhook headers |
| Diff everything | ✅ Success | ❌ Fail | Rebuild AppSheet webhook config |

---

## Test Payload Mẫu

File `test-webhook-payload.json` chứa payload mẫu giống AppSheet:

```json
{
  "Action": "Add",
  "maChuyenDi": "TEST_20241230_001",
  "ngayTao": "30/12/2024",
  "bienSoXe": "51A-12345",
  "tenTaiXe": "Nguyen Van Test",
  "tenKhachHang": "ABC Test Company",
  "donViVanChuyen": "NAK",
  "loaiChuyen": "Một chiều",
  "loaiTuyen": "Liên tỉnh",
  "tenTuyen": "TP.HCM - Bình Dương",
  "tongQuangDuong": 35,
  "tongDoanhThu": 5000000,
  "trongLuong": 25.5,
  "trangThai": "Hoàn tất",
  "data_json": {
    "thongTinChuyenDi": {
      "bienSoXe": "51A-12345",
      "tenTaiXe": "Nguyen Van Test",
      "loaiXe": "Tải thùng",
      "taiTrong": 25.5
    },
    "chiTietLoTrinh": [
      {
        "diemDi": "TP.HCM",
        "diemDen": "Bình Dương",
        "khoangCach": 35,
        "trongLuong": 25.5,
        "doanhThu": 5000000
      }
    ]
  }
}
```

---

## Tắt Debug Logging (Production)

Khi đã fix xong, để giảm log noise trong production:

### Option 1: Environment Variable
```typescript
const DEBUG = process.env.WEBHOOK_DEBUG === 'true';

if (DEBUG) {
  console.log('[APPSHEET_DEBUG] Headers:', headers);
}
```

### Option 2: Conditional Logging
```typescript
const log = (message: string, ...args: any[]) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(message, ...args);
  }
};

log('[APPSHEET_DEBUG] Headers:', headers);
```

### Option 3: Xóa Hoàn Toàn
```bash
# Sau khi debug xong, tạo branch riêng
git checkout -b debug/webhook-logging
git add .
git commit -m "debug: comprehensive webhook logging"

# Revert về main
git checkout main

# Khi cần debug lại, merge branch debug vào
git merge debug/webhook-logging
```

---

## Liên Hệ & Hỗ Trợ

Nếu vẫn gặp vấn đề sau khi debug:

1. **Export Vercel Logs:**
   ```bash
   vercel logs [deployment-url] > webhook-debug.log
   ```

2. **Export AppSheet Webhook Logs:**
   - AppSheet Editor → Monitor → Webhook Logs
   - Screenshot hoặc copy text

3. **So sánh 2 logs** để tìm điểm khác biệt

---

## Changelog

### 2024-12-30
- ✅ Added comprehensive debug logging
- ✅ Fixed "Body is unusable" error with `request.text()` first
- ✅ Added separate try/catch for JSON parsing
- ✅ Added database error handling
- ✅ Created test scripts and documentation

---

**Last Updated:** 2024-12-30
**Author:** NAK Logistics Development Team
