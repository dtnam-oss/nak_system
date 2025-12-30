# 🔄 WEBHOOK API REFACTOR V2.0

> **Refactor hoàn toàn logic xử lý dữ liệu đầu vào để khớp với cấu trúc JSON mới từ Google Apps Script**

---

## 📋 TỔNG QUAN THAY ĐỔI

### Vấn đề cần giải quyết:
1. ❌ Cột "Doanh thu" và "Quãng đường" hiển thị 0 hoặc null
2. ❌ Trạng thái "completed" không được tính vào KPI "Đã duyệt"
3. ❌ Dữ liệu JSONB đã có nhưng các cột top-level (sort/filter) bị trống

### Giải pháp:
✅ Viết lại hàm `normalizePayload()` để mapping chính xác từ GAS payload sang DB schema  
✅ Chuẩn hóa status theo logic Dashboard (approved/pending/rejected)  
✅ Đảm bảo cost và total_distance luôn được lưu đúng  
✅ Auto-generate route name nếu không có  

---

## 🔑 MAPPING CHÍNH XÁC

### JSON từ Google Apps Script → Database Columns

| GAS Field | Type | → | DB Column | Type | Notes |
|-----------|------|---|-----------|------|-------|
| `maChuyenDi` | string | → | `order_id` | VARCHAR(50) | Primary Key |
| `tongDoanhThu` | number/string | → | `cost` | NUMERIC(15,0) | **CRITICAL** |
| `tongQuangDuong` | number/string | → | `total_distance` | NUMERIC(10,2) | **CRITICAL** |
| `tenKhachHang` | string | → | `customer` | VARCHAR(100) | |
| `tenTaiXe` | string | → | `driver_name` | VARCHAR(100) | |
| `donViVanChuyen` | string | → | `provider` | VARCHAR(50) | Normalize: NAK/VENDOR/OTHER |
| `ngayTao` | string | → | `date` | DATE | Format YYYY-MM-DD |
| `trangThai` | string | → | `status` | VARCHAR(20) | **CRITICAL** Normalize |
| `loaiChuyen` | string | → | `trip_type` | VARCHAR(50) | |
| `loaiTuyen` | string | → | `route_type` | VARCHAR(50) | |
| `data_json` | object | → | `details` | JSONB | Full backup |

---

## 🎯 STATUS NORMALIZATION (QUAN TRỌNG!)

### Logic chuẩn hóa trạng thái:

```typescript
// Input từ AppSheet → Output sang DB
"Kết thúc", "Hoàn tất", "completed", "finish" → "approved"
"Mới", "New", "khởi tạo" → "pending"
"Hủy", "Cancel" → "rejected"
```

### Code Implementation:

```typescript
function normalizeStatus(val: any): 'approved' | 'pending' | 'rejected' {
  const s = String(val).toLowerCase().trim();

  // Map to "approved" - Đã duyệt
  if (
    s === 'kết thúc' ||
    s === 'hoàn tất' ||
    s === 'completed' ||
    s === 'finish' ||
    s === 'approved'
  ) {
    return 'approved';
  }

  // Map to "rejected" - Hủy
  if (s === 'hủy' || s === 'cancel' || s === 'rejected') {
    return 'rejected';
  }

  // Default to "pending"
  return 'pending';
}
```

### Dashboard Display Mapping:

```typescript
// In reconciliation API
function mapStatus(status: string): string {
  const statusMap = {
    approved: 'Đã duyệt',
    pending: 'Chờ duyệt',
    rejected: 'Từ chối',
  };
  return statusMap[status] || status;
}
```

---

## 🔧 CORE FUNCTIONS

### 1. `normalizePayload()`

**Nhiệm vụ:** Map toàn bộ GAS payload sang cấu trúc DB schema

**Input:**
```json
{
  "Action": "Add",
  "maChuyenDi": "NAK_123",
  "ngayTao": "2025-01-12",
  "tenKhachHang": "ABC Corp",
  "tongDoanhThu": 5000000,
  "tongQuangDuong": 150,
  "trangThai": "Kết thúc",
  "data_json": { "chiTietLoTrinh": [...] }
}
```

**Output:**
```typescript
{
  orderId: "NAK_123",
  date: "2025-01-12",
  customer: "ABC Corp",
  cost: 5000000,
  totalDistance: 150,
  status: "approved", // Normalized!
  routeName: "Đường dài - ABC Corp", // Auto-generated
  // ... other fields
}
```

### 2. `parseNumber()`

**Nhiệm vụ:** Parse số an toàn, trả về 0 nếu invalid

```typescript
parseNumber(5000000) → 5000000
parseNumber("5000000") → 5000000
parseNumber("5,000,000") → 5000000
parseNumber("") → 0
parseNumber(null) → 0
parseNumber(undefined) → 0
```

### 3. `generateRouteName()`

**Nhiệm vụ:** Tự động tạo tên tuyến nếu không có

**Logic:**
```typescript
// Format: "{loaiTuyen} - {tenKhachHang}"
generateRouteName("Đường dài", "ABC Corp") → "Đường dài - ABC Corp"
generateRouteName(null, "ABC Corp") → "ABC Corp"
generateRouteName(null, null) → "Chưa xác định"
```

---

## 📊 DATABASE UPSERT

### SQL Query:

```sql
INSERT INTO reconciliation_orders (
  order_id, 
  date, 
  customer,
  trip_type, 
  route_type, 
  route_name,
  driver_name, 
  provider,
  total_distance,  -- Từ tongQuangDuong
  cost,            -- Từ tongDoanhThu
  status,          -- Normalized
  license_plate, 
  weight, 
  details
) VALUES (...)
ON CONFLICT (order_id) DO UPDATE SET
  date = EXCLUDED.date,
  customer = EXCLUDED.customer,
  trip_type = EXCLUDED.trip_type,
  route_type = EXCLUDED.route_type,
  route_name = EXCLUDED.route_name,
  driver_name = EXCLUDED.driver_name,
  provider = EXCLUDED.provider,
  total_distance = EXCLUDED.total_distance,
  cost = EXCLUDED.cost,
  status = EXCLUDED.status,
  license_plate = EXCLUDED.license_plate,
  weight = EXCLUDED.weight,
  details = EXCLUDED.details,
  updated_at = CURRENT_TIMESTAMP
```

---

## 🧪 TESTING SCENARIOS

### Test Case 1: Add với trạng thái "Kết thúc"

**Input:**
```json
{
  "Action": "Add",
  "maChuyenDi": "TEST_001",
  "tongDoanhThu": 5000000,
  "tongQuangDuong": 150,
  "trangThai": "Kết thúc",
  "tenKhachHang": "Test Corp"
}
```

**Expected DB Values:**
- `cost` = 5000000 (NOT 0!)
- `total_distance` = 150 (NOT 0!)
- `status` = "approved" (NOT "pending"!)

**Expected Dashboard:**
- Hiển thị: "Doanh thu: 5,000,000 VND"
- Hiển thị: "Quãng đường: 150 km"
- Trạng thái: "Đã duyệt" (counted in KPI)

### Test Case 2: Edit với status = "completed"

**Input:**
```json
{
  "Action": "Edit",
  "maChuyenDi": "TEST_002",
  "trangThai": "completed"
}
```

**Expected:**
- `status` = "approved"
- Dashboard counts in "Đã duyệt" KPI

### Test Case 3: Delete

**Input:**
```json
{
  "Action": "Delete",
  "maChuyenDi": "TEST_003"
}
```

**Expected:**
- Record removed from DB
- No normalization needed (data already gone)

---

## 📝 LOGGING

### Console Output Format:

```
========================================
📥 NEW WEBHOOK REQUEST
🕐 Timestamp: 2025-12-30T10:30:00.000Z
========================================
✅ JSON parsed successfully
🔓 Authentication successful
🎬 Action: Add
🆔 Order ID: NAK_123
🔄 Processing ADD/EDIT action...
📊 Starting payload normalization...

[NORMALIZE] tongDoanhThu: 5000000 -> cost: 5000000
[NORMALIZE] tongQuangDuong: 150 -> totalDistance: 150
[NORMALIZE] trangThai: "Kết thúc" -> status: "approved"
[NORMALIZE] Generated routeName: "Đường dài - ABC Corp"

📋 Normalized Data:
   - Order ID: NAK_123
   - Cost: 5000000 (from tongDoanhThu: 5000000)
   - Distance: 150 (from tongQuangDuong: 150)
   - Status: approved (from trangThai: "Kết thúc")
   - Route Name: Đường dài - ABC Corp

💾 Executing database UPSERT...
✅ Database UPSERT successful
========================================
```

---

## ✅ VERIFICATION CHECKLIST

### After Deployment:

- [ ] Test Add new trip với `tongDoanhThu` và `tongQuangDuong`
- [ ] Verify `cost` và `total_distance` columns NOT null in DB
- [ ] Test Edit trip với `trangThai = "Kết thúc"`
- [ ] Verify status = "approved" in DB
- [ ] Check Dashboard KPI "Đã duyệt" includes approved orders
- [ ] Test Delete trip
- [ ] Check Frontend displays correct values:
  - [ ] Doanh thu column shows numbers
  - [ ] Quãng đường column shows numbers
  - [ ] Status shows "Đã duyệt" for approved
- [ ] Verify sorting works on cost and total_distance
- [ ] Verify filtering works on status

---

## 🚨 CRITICAL POINTS

### 1. KHÔNG BAO GIỜ dùng trực tiếp payload values cho DB

❌ **WRONG:**
```typescript
const cost = body.tongDoanhThu; // Might be string, might be null
```

✅ **CORRECT:**
```typescript
const normalized = normalizePayload(body);
const cost = normalized.cost; // Always number, never null
```

### 2. Status PHẢI được normalize

❌ **WRONG:**
```typescript
status = body.trangThai; // "Kết thúc" not recognized by Dashboard
```

✅ **CORRECT:**
```typescript
status = normalizeStatus(body.trangThai); // "approved"
```

### 3. Route Name PHẢI có giá trị

❌ **WRONG:**
```typescript
routeName = body.tenTuyen || null; // NULL causes display issues
```

✅ **CORRECT:**
```typescript
routeName = generateRouteName(routeType, customer, body.tenTuyen);
```

---

## 📚 FILES MODIFIED

### 1. `/app/api/webhook/appsheet/route.ts` (FULLY REWRITTEN)
- ✅ Added TypeScript interfaces
- ✅ Implemented `normalizePayload()` function
- ✅ Fixed status normalization logic
- ✅ Added `generateRouteName()` helper
- ✅ Improved logging for debugging
- ✅ Type-safe throughout

### 2. No changes needed to:
- `/app/api/reconciliation/route.ts` - Already uses correct status mapping
- Frontend components - Already expect correct data types

---

## 🎯 EXPECTED RESULTS

### Before Refactor:
```
Dashboard KPI:
- Tổng số chuyến: 100
- Đã duyệt: 0        ❌ WRONG!
- Doanh thu: 0 VND   ❌ WRONG!
- Quãng đường: 0 km  ❌ WRONG!
```

### After Refactor:
```
Dashboard KPI:
- Tổng số chuyến: 100
- Đã duyệt: 75       ✅ CORRECT!
- Doanh thu: 500M VND ✅ CORRECT!
- Quãng đường: 15K km ✅ CORRECT!
```

---

## 🚀 DEPLOYMENT STEPS

1. **Commit changes:**
   ```bash
   git add app/api/webhook/appsheet/route.ts
   git commit -m "refactor: Fix webhook payload normalization for correct data display"
   ```

2. **Push to GitHub:**
   ```bash
   git push origin main
   ```

3. **Vercel auto-deploys:**
   - Wait for deployment to complete
   - Check deployment logs

4. **Test with real webhook:**
   - Trigger Add from AppSheet
   - Check Vercel logs
   - Verify DB values
   - Check Dashboard display

5. **Monitor:**
   - Watch for errors in Vercel logs
   - Verify all KPIs update correctly

---

## 📞 SUPPORT

Nếu gặp vấn đề:
1. Check Vercel Function Logs
2. Verify database schema matches code
3. Test with curl/Postman before AppSheet
4. Check console logs for normalization output

---

**Last Updated:** December 30, 2025  
**Version:** 2.0  
**Author:** Senior Fullstack Developer
