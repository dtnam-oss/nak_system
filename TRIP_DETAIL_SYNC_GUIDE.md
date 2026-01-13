# 🚀 Trip Detail Sync - Hướng Dẫn Setup & Sử Dụng

## 📋 Tổng Quan

Hệ thống sync riêng biệt cho chi tiết lộ trình (`chi_tiet_chuyen_di`), tách biệt khỏi Master sync (`chuyen_di`).

### ✅ Vấn Đề Đã Giải Quyết

**TRƯỚC ĐÂY:**
- Xóa 1 dòng detail → Xóa toàn bộ chuyến đi ❌

**BÂY GIỜ:**
- Xóa 1 dòng detail → Chỉ xóa detail đó, chuyến đi vẫn còn ✅
- Thêm/sửa detail → Auto tính lại tổng revenue, cost, distance ✅

---

## 📁 Files Đã Thay Đổi

### 1. Google Apps Script (GAS)

**File:** `backend-gas/Code.gs`

**Thêm mới:**
- ✅ Function `syncTripDetailToBackend(detailId, tripId, eventType)`
- ✅ Test functions: `testDeleteTripDetail()`, `testUpsertTripDetail()`, `testDeleteRealDetail()`

### 2. Backend API

**File:** `app/api/webhook/appsheet/route.ts`

**Thêm mới:**
- ✅ Interface `GASPayload`: Thêm 2 Actions mới
  - `TripDetail_Delete`
  - `TripDetail_Upsert`
- ✅ Handler cho `TripDetail_Delete` (line ~958)
- ✅ Handler cho `TripDetail_Upsert` (line ~1041)

---

## 🔧 Setup trong AppSheet

### Table: `chuyen_di` (Master) - KHÔNG ĐỔI

| Event | Bot Expression |
|-------|----------------|
| Add | `syncTripToBackend([ma_chuyen_di], "Add")` |
| Edit | `syncTripToBackend([ma_chuyen_di], "Edit")` |
| Delete | `syncTripToBackend([_THISROW_BEFORE].[ma_chuyen_di], "Delete")` |

### Table: `chi_tiet_chuyen_di` (Detail) - ⚠️ THAY ĐỔI

| Event | Bot Expression |
|-------|----------------|
| **Add** | `syncTripDetailToBackend([Id], [ma_chuyen_di], "Add")` |
| **Edit** | `syncTripDetailToBackend([Id], [ma_chuyen_di], "Edit")` |
| **Delete** | `syncTripDetailToBackend([_THISROW_BEFORE].[Id], [_THISROW_BEFORE].[ma_chuyen_di], "Delete")` |

### ⚠️ Lưu Ý Quan Trọng

1. **DELETE event**: Phải dùng `[_THISROW_BEFORE]` để lấy giá trị trước khi xóa
2. **Cột `Id` bắt buộc**: Detail phải có cột `Id` để identify (đã có trong config)
3. **3 parameters**: Luôn cần đủ 3 tham số: `detailId`, `tripId`, `eventType`

---

## 🔄 Flow Hoạt Động

### 1️⃣ DELETE Detail

```
AppSheet: Xóa 1 dòng detail
    ↓
GAS: syncTripDetailToBackend(detailId, tripId, "Delete")
    ↓
    Payload: {
      Action: "TripDetail_Delete",
      detailId: "DETAIL-123"
    }
    ↓
Backend API: TripDetail_Delete Handler
    ↓
    - Tìm order chứa detail này (scan JSONB)
    - Remove detail khỏi array chiTietLoTrinh
    - Update lại details field
    - ✅ KHÔNG xóa toàn bộ trip
    ↓
Response: {
  success: true,
  detailId: "DETAIL-123",
  orderId: "NAKabc123",
  remainingDetails: 4
}
```

### 2️⃣ ADD/EDIT Detail

```
AppSheet: Thêm/sửa 1 dòng detail
    ↓
GAS: syncTripDetailToBackend(detailId, tripId, "Add/Edit")
    ↓
    - Đọc lại TOÀN BỘ chuyến đi (Master + All Details)
    - Chạy Auto Pricing (recalculate totals)
    ↓
    Payload: {
      Action: "TripDetail_Upsert",
      triggerDetailId: "DETAIL-123",
      maChuyenDi: "NAKabc123",
      tongDoanhThu: 5000000,  // ← Đã tính lại
      tongChiPhi: 3500000,     // ← Đã tính lại
      data_json: {
        chiTietLoTrinh: [...]  // ← Đầy đủ all details
      }
    }
    ↓
Backend API: TripDetail_Upsert Handler
    ↓
    - Normalize payload
    - UPSERT toàn bộ trip (with updated details)
    - ✅ Revenue, Cost, Distance tự động cập nhật
    ↓
Response: {
  success: true,
  orderId: "NAKabc123",
  triggerDetailId: "DETAIL-123",
  normalized: {
    cost: 3500000,
    revenue: 5000000,
    detailsCount: 5
  }
}
```

---

## 🧪 Testing

### Test trong GAS Editor

#### 1. Test Delete Detail

```javascript
function testDeleteTripDetail() {
  const detailId = 'DETAIL-001';  // ← SỬA ID thực tế
  const tripId = 'NAKabc123';     // ← SỬA Trip ID thực tế

  const result = syncTripDetailToBackend(detailId, tripId, 'Delete');
  Logger.log(JSON.stringify(result, null, 2));
}
```

**Expected Result:**
```json
{
  "success": true,
  "message": "Trip detail synchronized successfully",
  "detailId": "DETAIL-001",
  "tripId": "NAKabc123",
  "eventType": "Delete",
  "response": {
    "success": true,
    "action": "trip_detail_delete",
    "detailId": "DETAIL-001",
    "orderId": "NAKabc123",
    "remainingDetails": 4
  }
}
```

#### 2. Test Add/Edit Detail

```javascript
function testUpsertTripDetail() {
  const detailId = 'DETAIL-001';
  const tripId = 'NAKabc123';

  const result = syncTripDetailToBackend(detailId, tripId, 'Add');
  Logger.log(JSON.stringify(result, null, 2));
}
```

**Expected Result:**
```json
{
  "success": true,
  "message": "Trip detail synchronized successfully",
  "detailId": "DETAIL-001",
  "tripId": "NAKabc123",
  "eventType": "Add",
  "response": {
    "success": true,
    "action": "trip_detail_upsert",
    "orderId": "NAKabc123",
    "triggerDetailId": "DETAIL-001",
    "normalized": {
      "cost": 3500000,
      "revenue": 5000000,
      "totalDistance": 250,
      "detailsCount": 5
    }
  }
}
```

#### 3. Test với Real Data

```javascript
function testDeleteRealDetail() {
  // Function này tự động lấy detail đầu tiên từ sheet
  // Uncomment dòng delete để thực hiện
}
```

---

## 🎯 So Sánh Master vs Detail Sync

| Feature | Master Sync | Detail Sync |
|---------|-------------|-------------|
| **Function** | `syncTripToBackend` | `syncTripDetailToBackend` |
| **Table** | `chuyen_di` | `chi_tiet_chuyen_di` |
| **Delete Behavior** | Xóa toàn bộ trip + details | Xóa chỉ 1 detail |
| **Add/Edit** | Đọc Master + Details | Đọc toàn bộ trip, recalc totals |
| **Actions** | Add, Edit, Delete | TripDetail_Delete, TripDetail_Upsert |
| **Auto Pricing** | ✅ Có | ✅ Có (khi Add/Edit) |

---

## 📊 Backend Database Structure

### `reconciliation_orders` Table

```sql
CREATE TABLE reconciliation_orders (
  order_id TEXT PRIMARY KEY,
  date DATE,
  customer TEXT,
  revenue NUMERIC,      -- tongDoanhThu
  cost NUMERIC,         -- tongChiPhi
  total_distance NUMERIC,
  status TEXT,
  details JSONB,        -- ← JSONB chứa chiTietLoTrinh
  ...
);
```

### JSONB Structure (details column)

```json
{
  "chiTietLoTrinh": [
    {
      "id": "DETAIL-001",          // ← Dùng để identify khi delete
      "thuTu": 1,
      "loTrinh": "SonLa_T_03",
      "loTrinhChiTiet": "Kho A -> Kho B",
      "donGia": 1200000,
      "taiTrong": 10,
      "quangDuong": 50,
      "thanhTien": 12000000
    },
    {
      "id": "DETAIL-002",
      "thuTu": 2,
      ...
    }
  ]
}
```

---

## 🔍 Troubleshooting

### ❌ Lỗi: "Missing detail ID"

**Nguyên nhân:** Không truyền `detailId` hoặc cột `Id` bị null

**Giải pháp:**
1. Kiểm tra cột `Id` có giá trị trong sheet `chi_tiet_chuyen_di`
2. Đảm bảo Bot expression dùng `[Id]` (không phải `[_RowNumber]`)

### ❌ Lỗi: "tripId is required for Add/Edit events"

**Nguyên nhân:** Không truyền `ma_chuyen_di` cho Add/Edit

**Giải pháp:**
```javascript
// ĐÚNG ✅
syncTripDetailToBackend([Id], [ma_chuyen_di], "Add")

// SAI ❌
syncTripDetailToBackend([Id], "", "Add")
```

### ❌ Lỗi: "Detail not found in any order"

**Nguyên nhân:**
- Detail đã bị xóa
- `detailId` không khớp với bất kỳ detail nào trong DB
- JSONB không có field `id`

**Giải pháp:**
1. Kiểm tra detail có tồn tại trong database
2. Verify `id` field có trong payload GAS gửi lên

### ⚠️ Performance Issue: "Query quá chậm"

**Nguyên nhân:** `TripDetail_Delete` scan toàn bộ orders (LIMIT 1000)

**Giải pháp:**
- Tăng index cho JSONB column (nếu Postgres hỗ trợ)
- Hoặc filter by date range:
```typescript
WHERE details IS NOT NULL
  AND date >= CURRENT_DATE - INTERVAL '30 days'
```

---

## 🎉 Summary

### ✅ Đã Implement

1. ✅ Function riêng cho Detail sync (GAS)
2. ✅ 2 Actions mới: `TripDetail_Delete`, `TripDetail_Upsert`
3. ✅ Backend handlers xử lý JSONB operations
4. ✅ Auto recalculation cho Add/Edit
5. ✅ Test functions đầy đủ
6. ✅ Documentation chi tiết

### 🚀 Cách Sử Dụng

1. **Deploy GAS script mới** lên Apps Script
2. **Update AppSheet Bots** cho table `chi_tiet_chuyen_di`
3. **Test với data thật:**
   - Thêm 1 detail → Check revenue/cost update
   - Sửa 1 detail → Check totals recalculated
   - Xóa 1 detail → Verify trip còn nguyên
4. **Monitor logs** trong GAS và Backend

### 📞 Support

Nếu gặp vấn đề:
1. Check GAS logs: View → Logs
2. Check Backend logs: Vercel dashboard
3. Verify payload JSON trong logs
4. Test với `testDeleteRealDetail()` function

---

**Created:** 2026-01-13
**Author:** Senior Backend Developer
**Version:** 1.0.0
