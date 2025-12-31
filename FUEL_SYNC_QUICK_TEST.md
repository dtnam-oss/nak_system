# FUEL SYNC - QUICK TEST GUIDE

## 🚀 Kiểm Tra Nhanh Real-time Sync

### ⚡ TEST 1: Fuel Import - ADD

**Bước 1:** Thêm record mới trong AppSheet
- Table: `nhap_nhien_lieu`
- Nhập đầy đủ các trường (ngay_nhap, nha_cung_cap, ten_nhien_lieu, so_luong...)

**Bước 2:** Kiểm tra GAS Log
```
Apps Script Editor → Executions
- Function: syncFuelImportToBackend
- Status: Completed ✅
- Logs contain: "FUEL IMPORT SYNC SUCCESS"
```

**Bước 3:** Kiểm tra Vercel Log
```
Vercel Dashboard → Logs
- Search: "FuelImport_Upsert"
- Status: 200
- Response: "success": true
```

**Bước 4:** Verify Database
```sql
SELECT * FROM fuel_imports 
WHERE id = 'YOUR_ID' 
ORDER BY updated_at DESC 
LIMIT 1;
```

---

### ⚡ TEST 2: Fuel Import - EDIT

**Bước 1:** Sửa record đã có
- Thay đổi `so_luong` hoặc `don_gia_nhap`

**Bước 2:** Verify Database
```sql
SELECT so_luong, don_gia_nhap, updated_at
FROM fuel_imports
WHERE id = 'YOUR_ID';
```
→ `updated_at` phải mới hơn lần test trước

---

### ⚡ TEST 3: Fuel Import - DELETE

**Bước 1:** Xóa record
- Chọn row → Delete

**Bước 2:** Kiểm tra GAS Log
```
Log contains: "DELETE event - Sending ID only"
```

**Bước 3:** Verify Database
```sql
SELECT * FROM fuel_imports WHERE id = 'YOUR_ID';
```
→ Kết quả: **0 rows** (đã xóa thành công)

---

### ⚡ TEST 4: Fuel Transaction - ADD

**Bước 1:** Thêm record mới
- Table: `xuat_nhien_lieu`
- Nhập: ngay_xuat, bien_so_xe, loai_nhien_lieu, so_luong...

**Bước 2:** Verify Database
```sql
SELECT * FROM fuel_transactions
WHERE id = 'YOUR_ID'
ORDER BY updated_at DESC;
```

---

### ⚡ TEST 5: Fuel Transaction - EDIT

**Bước 1:** Sửa `so_luong` hoặc `trang_thai`

**Bước 2:** Verify Database
```sql
SELECT so_luong, trang_thai, updated_at
FROM fuel_transactions
WHERE id = 'YOUR_ID';
```

---

### ⚡ TEST 6: Fuel Transaction - DELETE

**Bước 1:** Xóa record

**Bước 2:** Verify Database
```sql
SELECT * FROM fuel_transactions WHERE id = 'YOUR_ID';
```
→ **0 rows**

---

## 🔍 TROUBLESHOOTING NHANH

### ❌ Bot không chạy

**Check:**
1. Bot có Enable không?
2. Script name đúng chưa?
3. AppSheet có quyền execute script không?

**Fix:**
- Vào Bot → Enable
- Re-deploy Apps Script

---

### ❌ GAS Error: "Record not found"

**Nguyên nhân:** ID không tìm thấy trong Sheet

**Fix:**
- Kiểm tra cột `Id` có giá trị không
- Kiểm tra Sheet name đúng không (`nhap_nhien_lieu` / `xuat_nhien_lieu`)

---

### ❌ API Error: "Unauthorized"

**Fix:**
```javascript
// Config.gs
API: {
  KEY: 'nak_logistics_2025_secure_key'
}
```

```bash
# Vercel Environment Variable
APPSHEET_SECRET_KEY=nak_logistics_2025_secure_key
```

---

### ❌ Delete không hoạt động (ID = NULL)

**Nguyên nhân:** Bot dùng `[Id]` thay vì `[_THISROW_BEFORE].[Id]`

**Fix:**
```
❌ SAI:  [Id], "Delete"
✅ ĐÚNG: [_THISROW_BEFORE].[Id], "Delete"
```

---

## 📊 SQL Queries Hữu Ích

### Xem tất cả imports gần đây
```sql
SELECT 
  id,
  import_date,
  supplier,
  fuel_type,
  quantity,
  total_amount,
  updated_at
FROM fuel_imports
ORDER BY updated_at DESC
LIMIT 20;
```

### Xem tất cả transactions gần đây
```sql
SELECT 
  id,
  transaction_date,
  license_plate,
  driver_name,
  fuel_type,
  quantity,
  status,
  updated_at
FROM fuel_transactions
ORDER BY updated_at DESC
LIMIT 20;
```

### Kiểm tra sync status
```sql
-- Count records updated trong 5 phút gần đây
SELECT 
  COUNT(*) as recent_syncs,
  MAX(updated_at) as last_sync
FROM fuel_imports
WHERE updated_at > NOW() - INTERVAL '5 minutes';
```

---

## ✅ SUCCESS CRITERIA

Hệ thống hoạt động tốt khi:

- ✅ Add record → Database có record mới trong < 5s
- ✅ Edit record → Database cập nhật `updated_at` mới
- ✅ Delete record → Database xóa record thành công
- ✅ GAS logs không có error
- ✅ Vercel logs trả về status 200
- ✅ Dashboard hiển thị dữ liệu Real-time

---

## 🎯 NEXT STEPS

Sau khi test thành công:

1. ✅ Enable tất cả Bots (6 bots total)
2. ✅ Thông báo cho team sử dụng
3. ✅ Monitor logs trong 24h đầu
4. ✅ Tắt verbose logging sau khi stable:
   ```javascript
   // Config.gs
   LOGGING: {
     VERBOSE: false  // Giảm log để tối ưu performance
   }
   ```

Good luck! 🚀
