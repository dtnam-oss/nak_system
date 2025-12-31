# FUEL REAL-TIME SYNC - IMPLEMENTATION SUMMARY

## 📋 Tổng Quan

Triển khai thành công hệ thống đồng bộ Real-time cho module **Quản lý Nhiên liệu** với kiến trúc tương tự module `chuyen_di`.

**Ngày hoàn thành:** 31/12/2025

---

## ✅ CÁC FILES ĐÃ CẬP NHẬT

### 1. **Google Apps Script**

#### **`backend-gas/Config.gs`**
- ✅ Thêm `FUEL_IMPORT: 'nhap_nhien_lieu'` và `FUEL_EXPORT: 'xuat_nhien_lieu'` vào `SHEET_NAMES`
- ✅ Thêm `FUEL_IMPORT_COLUMNS` với 9 mappings
- ✅ Thêm `FUEL_EXPORT_COLUMNS` với 12 mappings
- ✅ Cập nhật `NUMBER_COLUMNS`: thêm `so_luong`, `don_gia_nhap`, `don_gia_xuat_binh_quan`
- ✅ Cập nhật `DATE_COLUMNS`: thêm `ngay_nhap`, `ngay_xuat`

#### **`backend-gas/Code.gs`**
- ✅ **Module mới:** FUEL REAL-TIME SYNC MODULE
- ✅ Hàm: `syncFuelImportToBackend(importId, eventType)`
  - Xử lý Add/Edit: Đọc sheet → Build JSON → Send API
  - Xử lý Delete: Gửi ID only
- ✅ Hàm: `syncFuelTransactionToBackend(transId, eventType)`
  - Xử lý Add/Edit: Đọc sheet → Build JSON → Send API
  - Xử lý Delete: Gửi ID only
- ✅ Helper functions:
  - `getFuelImportData(importId)`
  - `getFuelTransactionData(transId)`

### 2. **Next.js API**

#### **`app/api/webhook/appsheet/route.ts`**
- ✅ Cập nhật TypeScript interfaces:
  - `FuelImportPayload`
  - `FuelTransactionPayload`
  - Mở rộng `GASPayload.Action` type
- ✅ Xử lý 4 Actions mới:
  1. **`FuelImport_Upsert`**: INSERT ON CONFLICT UPDATE vào `fuel_imports`
  2. **`FuelImport_Delete`**: DELETE FROM `fuel_imports`
  3. **`FuelTransaction_Upsert`**: INSERT ON CONFLICT UPDATE vào `fuel_transactions`
  4. **`FuelTransaction_Delete`**: DELETE FROM `fuel_transactions`

### 3. **Documentation**

#### **`FUEL_SYNC_GUIDE.md`** (NEW)
- ✅ Hướng dẫn chi tiết cấu hình AppSheet Bot cho 2 bảng
- ✅ Cách tạo Bot cho Add/Edit/Delete events
- ✅ Lưu ý quan trọng về `_THISROW_BEFORE` cho Delete
- ✅ Troubleshooting guide
- ✅ Monitoring checklist

---

## 🔑 TÍNH NĂNG CHÍNH

### **Real-time Sync Architecture**

```
AppSheet Table Change
    ↓
Bot Trigger (Add/Edit/Delete)
    ↓
Google Apps Script Function
    ↓
HTTP POST to Next.js API
    ↓
Database Upsert/Delete
    ↓
Dashboard Auto-refresh
```

### **Data Flow - Fuel Import**

1. **Add/Edit Record:**
   - Bot calls: `syncFuelImportToBackend([Id], "Add"|"Edit")`
   - GAS reads row from `nhap_nhien_lieu`
   - Transform data: date format, number parsing
   - POST to API: `Action: FuelImport_Upsert`
   - API executes: `INSERT ... ON CONFLICT UPDATE`

2. **Delete Record:**
   - Bot calls: `syncFuelImportToBackend([_THISROW_BEFORE].[Id], "Delete")`
   - GAS sends ID only
   - POST to API: `Action: FuelImport_Delete`
   - API executes: `DELETE FROM fuel_imports`

### **Data Flow - Fuel Transaction**

Tương tự như Fuel Import nhưng với:
- Sheet: `xuat_nhien_lieu`
- Function: `syncFuelTransactionToBackend()`
- Actions: `FuelTransaction_Upsert`, `FuelTransaction_Delete`
- Table: `fuel_transactions`

---

## 📊 COLUMN MAPPINGS

### **Fuel Import (nhap_nhien_lieu)**

| Header Name (Sheet)        | JSON Key      | Type   | Transform         |
|---------------------------|---------------|--------|-------------------|
| Id                        | id            | string | -                 |
| ngay_nhap                 | importDate    | date   | YYYY-MM-DD        |
| nha_cung_cap              | supplier      | string | trim              |
| ten_nhien_lieu            | fuelType      | string | trim              |
| so_luong                  | quantity      | number | parseVietnamese   |
| don_gia_nhap              | unitPrice     | number | parseVietnamese   |
| thanh_tien                | totalAmount   | number | parseVietnamese   |
| don_gia_xuat_binh_quan    | avgPrice      | number | parseVietnamese   |
| nguoi_tao                 | createdBy     | string | trim              |

### **Fuel Transaction (xuat_nhien_lieu)**

| Header Name (Sheet)               | JSON Key         | Type   | Transform         |
|----------------------------------|------------------|--------|-------------------|
| Id                               | id               | string | -                 |
| ngay_xuat                        | transactionDate  | date   | YYYY-MM-DD        |
| loai_hinh                        | fuelSource       | string | trim              |
| bien_so_xe                       | licensePlate     | string | trim              |
| ma_tai_xe                        | driverCode       | string | trim              |
| ten_tai_xe                       | driverName       | string | trim              |
| loai_nhien_lieu                  | fuelType         | string | trim              |
| so_luong                         | quantity         | number | parseVietnamese   |
| don_gia                          | unitPrice        | number | parseVietnamese   |
| thanh_tien                       | totalAmount      | number | parseVietnamese   |
| hinh_anh_tru_da_so_luong_ai      | imageUrl         | string | trim              |
| trang_thai                       | status           | string | trim              |

---

## 🎯 APPSHEET BOT CONFIGURATION

### **Bảng: nhap_nhien_lieu**

| Event   | Bot Name                     | Script Call                                      |
|---------|------------------------------|--------------------------------------------------|
| Add     | Sync Fuel Import - Add       | `syncFuelImportToBackend([Id], "Add")`          |
| Edit    | Sync Fuel Import - Edit      | `syncFuelImportToBackend([Id], "Edit")`         |
| Delete  | Sync Fuel Import - Delete    | `syncFuelImportToBackend([_THISROW_BEFORE].[Id], "Delete")` |

### **Bảng: xuat_nhien_lieu**

| Event   | Bot Name                          | Script Call                                           |
|---------|-----------------------------------|-------------------------------------------------------|
| Add     | Sync Fuel Transaction - Add       | `syncFuelTransactionToBackend([Id], "Add")`          |
| Edit    | Sync Fuel Transaction - Edit      | `syncFuelTransactionToBackend([Id], "Edit")`         |
| Delete  | Sync Fuel Transaction - Delete    | `syncFuelTransactionToBackend([_THISROW_BEFORE].[Id], "Delete")` |

---

## 🛠️ TESTING CHECKLIST

### **Test Fuel Import**

- [ ] **Add Test:**
  1. Thêm record mới trong AppSheet bảng `nhap_nhien_lieu`
  2. Verify GAS log: `syncFuelImportToBackend` executed
  3. Verify Vercel log: `FuelImport_Upsert` received
  4. Verify Database: Record inserted into `fuel_imports`

- [ ] **Edit Test:**
  1. Sửa record trong AppSheet
  2. Verify Database: Record updated

- [ ] **Delete Test:**
  1. Xóa record trong AppSheet
  2. Verify GAS log: `DELETE event - Sending ID only`
  3. Verify Vercel log: `FuelImport_Delete` received
  4. Verify Database: Record deleted from `fuel_imports`

### **Test Fuel Transaction**

- [ ] **Add Test:**
  1. Thêm record mới trong bảng `xuat_nhien_lieu`
  2. Verify insertion into `fuel_transactions`

- [ ] **Edit Test:**
  1. Sửa record
  2. Verify update in database

- [ ] **Delete Test:**
  1. Xóa record
  2. Verify deletion from database

---

## 📝 LƯU Ý QUAN TRỌNG

### ⚠️ **Delete Event - Sử dụng `_THISROW_BEFORE`**

**SAI:**
```
syncFuelImportToBackend([Id], "Delete")  ❌
// [Id] trả về NULL vì row đã bị xóa
```

**ĐÚNG:**
```
syncFuelImportToBackend([_THISROW_BEFORE].[Id], "Delete")  ✅
// Lấy giá trị TRƯỚC KHI xóa
```

### 🔐 **Authentication**

Đảm bảo API Key khớp:
- **Config.gs:** `API.KEY = 'nak_logistics_2025_secure_key'`
- **Vercel Env:** `APPSHEET_SECRET_KEY = 'nak_logistics_2025_secure_key'`

### 📊 **Database Tables**

Verify table schemas tồn tại:
```sql
-- Fuel Imports
CREATE TABLE IF NOT EXISTS fuel_imports (
  id TEXT PRIMARY KEY,
  import_date DATE,
  supplier TEXT,
  fuel_type TEXT,
  quantity DECIMAL(10, 2),
  unit_price DECIMAL(10, 2),
  total_amount DECIMAL(12, 2),
  avg_price DECIMAL(10, 2),
  created_by TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fuel Transactions
CREATE TABLE IF NOT EXISTS fuel_transactions (
  id TEXT PRIMARY KEY,
  transaction_date DATE,
  fuel_source TEXT,
  license_plate TEXT,
  driver_code TEXT,
  driver_name TEXT,
  fuel_type TEXT,
  quantity DECIMAL(10, 2),
  unit_price DECIMAL(10, 2),
  total_amount DECIMAL(12, 2),
  image_url TEXT,
  status TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🚀 DEPLOYMENT STEPS

### **1. Deploy Google Apps Script**

1. Mở Apps Script Editor
2. Copy code từ `Config.gs` và `Code.gs`
3. **Deploy** → **New deployment**
4. Type: **Web app**
5. Execute as: **Me**
6. Who has access: **Anyone**
7. Copy **Deployment ID**

### **2. Deploy Next.js API**

```bash
cd /Users/mac/Desktop/nak-logistic-system
git add .
git commit -m "feat: implement fuel real-time sync"
git push origin main
```

Vercel auto-deploy sau vài phút.

### **3. Configure AppSheet Bots**

Làm theo hướng dẫn trong [FUEL_SYNC_GUIDE.md](./FUEL_SYNC_GUIDE.md)

---

## 📈 MONITORING

### **GAS Execution Logs**
- Apps Script Editor → **Executions** tab
- Filter: `syncFuelImportToBackend`, `syncFuelTransactionToBackend`

### **Vercel Logs**
- Vercel Dashboard → **Logs**
- Search: `FuelImport`, `FuelTransaction`

### **Database Queries**
```sql
-- Latest imports
SELECT * FROM fuel_imports ORDER BY updated_at DESC LIMIT 10;

-- Latest transactions
SELECT * FROM fuel_transactions ORDER BY updated_at DESC LIMIT 10;

-- Check sync timestamp
SELECT 
  COUNT(*) as total,
  MAX(updated_at) as last_sync
FROM fuel_imports;
```

---

## 🎉 KẾT QUẢ MONG ĐỢI

Sau khi triển khai xong:

✅ Mọi thay đổi trên AppSheet (Add/Edit/Delete) tự động sync sang Database trong **< 5 giây**

✅ Dashboard và Reports hiển thị dữ liệu Real-time

✅ Không cần manual import/export

✅ Full audit trail với `updated_at` timestamp

---

## 📚 RELATED FILES

- [FUEL_SYNC_GUIDE.md](./FUEL_SYNC_GUIDE.md) - Hướng dẫn cấu hình AppSheet Bot
- [backend-gas/Config.gs](./backend-gas/Config.gs) - Configuration file
- [backend-gas/Code.gs](./backend-gas/Code.gs) - Sync functions
- [app/api/webhook/appsheet/route.ts](./app/api/webhook/appsheet/route.ts) - API handler

---

**Implementation by:** Senior Fullstack Developer (GAS + Next.js)  
**Date:** December 31, 2025  
**Status:** ✅ Complete & Ready for Testing
