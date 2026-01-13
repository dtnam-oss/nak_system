# ⚡ Quick Start - Trip Detail Sync

## 🎯 Mục Đích

Xử lý riêng các thao tác trên table `chi_tiet_chuyen_di` để tránh xóa nhầm toàn bộ chuyến đi.

---

## 📝 Setup AppSheet Bot (3 Steps)

### Table: `chi_tiet_chuyen_di`

#### 1. DELETE Event
```javascript
syncTripDetailToBackend([_THISROW_BEFORE].[Id], [_THISROW_BEFORE].[ma_chuyen_di], "Delete")
```

#### 2. ADD Event
```javascript
syncTripDetailToBackend([Id], [ma_chuyen_di], "Add")
```

#### 3. EDIT Event
```javascript
syncTripDetailToBackend([Id], [ma_chuyen_di], "Edit")
```

---

## ✅ Test Nhanh

### Trong GAS Editor:

```javascript
// 1. SỬA ID NÀY
const detailId = 'YOUR-DETAIL-ID';
const tripId = 'YOUR-TRIP-ID';

// 2. CHẠY
function testDeleteTripDetail() {
  const result = syncTripDetailToBackend(detailId, tripId, 'Delete');
  Logger.log(JSON.stringify(result, null, 2));
}
```

### Expected Output:

```json
{
  "success": true,
  "message": "Trip detail synchronized successfully",
  "response": {
    "action": "trip_detail_delete",
    "remainingDetails": 4
  }
}
```

---

## 🔍 Kiểm Tra

- [ ] Xóa 1 detail → Trip vẫn còn ✅
- [ ] Thêm 1 detail → Tổng revenue/cost tự update ✅
- [ ] Sửa 1 detail → Totals recalculated ✅

---

## 🆘 Lỗi Thường Gặp

| Lỗi | Nguyên nhân | Fix |
|-----|-------------|-----|
| "Missing detail ID" | Cột `Id` null | Kiểm tra sheet có cột `Id` |
| "tripId is required" | Thiếu param thứ 2 | Thêm `[ma_chuyen_di]` |
| "Detail not found" | ID không tồn tại | Check ID có trong DB |

---

📖 **Chi tiết:** Xem file `TRIP_DETAIL_SYNC_GUIDE.md`
