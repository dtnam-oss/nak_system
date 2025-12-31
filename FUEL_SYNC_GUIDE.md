# HƯỚNG DẪN CẤU HÌNH APPSHEET BOT - ĐỒNG BỘ NHIÊN LIỆU REAL-TIME

## 📋 Tổng Quan

Hướng dẫn này giúp bạn cấu hình **AppSheet Bot** để đồng bộ dữ liệu Real-time (Add/Edit/Delete) từ AppSheet sang Database thông qua Google Apps Script cho module **Quản lý Nhiên liệu**.

---

## 🏗️ Kiến Trúc Đồng Bộ

```
AppSheet Table (nhap_nhien_lieu / xuat_nhien_lieu)
    ↓ (Trigger: Add/Edit/Delete)
AppSheet Bot
    ↓ (Call GAS Function)
Google Apps Script (Code.gs)
    ↓ (HTTP POST với JSON)
Next.js API (/api/webhook/appsheet)
    ↓ (Execute SQL)
Vercel Postgres Database
```

---

## 🔧 PHẦN 1: CẤU HÌNH BOT CHO BẢNG NHẬP NHIÊN LIỆU

### 📌 Table: `nhap_nhien_lieu`

#### **1.1. Tạo Bot cho Event ADD**

1. Vào **Automation** → **Bots** → **Create a new bot**
2. **Configure the bot:**
   - **Name:** `Sync Fuel Import - Add`
   - **Event:** `Adds only`
   - **Table:** `nhap_nhien_lieu`
   - **Condition:** (để trống hoặc `TRUE`)

3. **Add a task - Call a script:**
   - **Task Type:** `Call a script`
   - **Script Name:** `syncFuelImportToBackend`
   - **Parameters:**
     ```
     [Id], "Add"
     ```

4. **Save** và **Enable Bot**

---

#### **1.2. Tạo Bot cho Event EDIT**

1. **Create a new bot**
2. **Configure:**
   - **Name:** `Sync Fuel Import - Edit`
   - **Event:** `Updates only`
   - **Table:** `nhap_nhien_lieu`
   - **Condition:** (để trống)

3. **Add a task:**
   - **Script Name:** `syncFuelImportToBackend`
   - **Parameters:**
     ```
     [Id], "Edit"
     ```

4. **Save & Enable**

---

#### **1.3. Tạo Bot cho Event DELETE**

1. **Create a new bot**
2. **Configure:**
   - **Name:** `Sync Fuel Import - Delete`
   - **Event:** `Deletes only`
   - **Table:** `nhap_nhien_lieu`
   - **Condition:** (để trống)

3. **Add a task:**
   - **Script Name:** `syncFuelImportToBackend`
   - **Parameters:** ⚠️ **LƯU Ý: Dùng `_THISROW_BEFORE`**
     ```
     [_THISROW_BEFORE].[Id], "Delete"
     ```

4. **Save & Enable**

---

## 🔧 PHẦN 2: CẤU HÌNH BOT CHO BẢNG XUẤT NHIÊN LIỆU

### 📌 Table: `xuat_nhien_lieu`

#### **2.1. Tạo Bot cho Event ADD**

1. **Create a new bot**
2. **Configure:**
   - **Name:** `Sync Fuel Transaction - Add`
   - **Event:** `Adds only`
   - **Table:** `xuat_nhien_lieu`
   - **Condition:** (để trống)

3. **Add a task:**
   - **Script Name:** `syncFuelTransactionToBackend`
   - **Parameters:**
     ```
     [Id], "Add"
     ```

4. **Save & Enable**

---

#### **2.2. Tạo Bot cho Event EDIT**

1. **Create a new bot**
2. **Configure:**
   - **Name:** `Sync Fuel Transaction - Edit`
   - **Event:** `Updates only`
   - **Table:** `xuat_nhien_lieu`
   - **Condition:** (để trống)

3. **Add a task:**
   - **Script Name:** `syncFuelTransactionToBackend`
   - **Parameters:**
     ```
     [Id], "Edit"
     ```

4. **Save & Enable**

---

#### **2.3. Tạo Bot cho Event DELETE**

1. **Create a new bot**
2. **Configure:**
   - **Name:** `Sync Fuel Transaction - Delete`
   - **Event:** `Deletes only`
   - **Table:** `xuat_nhien_lieu`
   - **Condition:** (để trống)

3. **Add a task:**
   - **Script Name:** `syncFuelTransactionToBackend`
   - **Parameters:** ⚠️ **LƯU Ý: Dùng `_THISROW_BEFORE`**
     ```
     [_THISROW_BEFORE].[Id], "Delete"
     ```

4. **Save & Enable**

---

## 🎯 PHẦN 3: QUAN TRỌNG - LƯU Ý KHI CẤU HÌNH

### ⚠️ **Lưu Ý về Event DELETE**

Khi tạo Bot cho **Delete event**, bạn **PHẢI** sử dụng `[_THISROW_BEFORE].[Id]` thay vì `[Id]` vì:

- `[Id]`: Lấy giá trị của row **SAU KHI** xóa → Trả về `NULL`
- `[_THISROW_BEFORE].[Id]`: Lấy giá trị của row **TRƯỚC KHI** xóa → Trả về giá trị đúng

**Ví dụ:**
```
✅ ĐÚNG:  [_THISROW_BEFORE].[Id], "Delete"
❌ SAI:   [Id], "Delete"
```

---

### 📝 **Kiểm Tra Script Name**

Đảm bảo Script Name trong AppSheet khớp với tên hàm trong Google Apps Script:

| Table              | Script Name                      | File Location |
|--------------------|----------------------------------|---------------|
| nhap_nhien_lieu    | `syncFuelImportToBackend`       | Code.gs       |
| xuat_nhien_lieu    | `syncFuelTransactionToBackend`  | Code.gs       |

---

### 🔍 **Cách Test Bot**

#### **Test ADD:**
1. Vào AppSheet → Thêm mới 1 record trong bảng `nhap_nhien_lieu`
2. Kiểm tra log trong Google Apps Script:
   - **Executions** → Xem log của `syncFuelImportToBackend`
3. Kiểm tra Vercel logs:
   - Dashboard Vercel → Logs → Tìm `FuelImport_Upsert`
4. Verify trong Database:
   - Query: `SELECT * FROM fuel_imports ORDER BY updated_at DESC LIMIT 1;`

#### **Test EDIT:**
1. Sửa 1 record đã có trong bảng `nhap_nhien_lieu`
2. Kiểm tra log tương tự

#### **Test DELETE:**
1. Xóa 1 record trong bảng `nhap_nhien_lieu`
2. Kiểm tra log:
   - GAS log phải thấy `DELETE event - Sending ID only`
   - Vercel log phải thấy `FuelImport_Delete`
3. Verify trong Database:
   - Record phải bị xóa khỏi table `fuel_imports`

---

## 🛠️ PHẦN 4: TROUBLESHOOTING

### ❌ Lỗi: "Script not found"

**Nguyên nhân:** AppSheet không tìm thấy hàm trong Google Apps Script

**Giải pháp:**
1. Kiểm tra tên hàm trong Code.gs
2. Deploy lại Apps Script:
   - **Deploy** → **New deployment**
   - Chọn **Type:** Web app
   - **Execute as:** Me
   - **Who has access:** Anyone
3. Copy **Deployment ID** và cập nhật trong AppSheet

---

### ❌ Lỗi: "Authentication failed"

**Nguyên nhân:** API Key không khớp

**Giải pháp:**
1. Kiểm tra `Config.gs`:
   ```javascript
   API: {
     KEY: 'nak_logistics_2025_secure_key'
   }
   ```
2. Kiểm tra Vercel Environment Variables:
   - `APPSHEET_SECRET_KEY` = `nak_logistics_2025_secure_key`
3. Redeploy Vercel nếu cần

---

### ❌ Lỗi: "Record not found" khi Delete

**Nguyên nhân:** Bot gửi `NULL` thay vì ID thực

**Giải pháp:**
- Đảm bảo dùng `[_THISROW_BEFORE].[Id]` trong Bot Delete
- Không dùng `[Id]`

---

### ❌ Lỗi: "Column not found in sheet"

**Nguyên nhân:** Tên cột trong Sheet không khớp với Config

**Giải pháp:**
1. Kiểm tra `Config.gs` → `FUEL_IMPORT_COLUMNS` / `FUEL_EXPORT_COLUMNS`
2. Kiểm tra tên cột trong Google Sheets (phải chính xác, không dư khoảng trắng)
3. Lưu ý: Column name **case-insensitive** nhưng phải match chính tả

---

## 📊 PHẦN 5: MONITORING

### **1. Google Apps Script Logs**

Xem execution history:
1. Vào **Apps Script Editor**
2. Click **Executions** (icon đồng hồ)
3. Filter theo function name:
   - `syncFuelImportToBackend`
   - `syncFuelTransactionToBackend`

### **2. Vercel Logs**

1. Vào **Vercel Dashboard**
2. Chọn project `nak-logistic-system`
3. Click **Logs** tab
4. Filter theo keyword:
   - `FuelImport_Upsert`
   - `FuelImport_Delete`
   - `FuelTransaction_Upsert`
   - `FuelTransaction_Delete`

### **3. Database Verification**

Kiểm tra timestamp cập nhật:

```sql
-- Check latest fuel imports
SELECT id, import_date, supplier, quantity, updated_at
FROM fuel_imports
ORDER BY updated_at DESC
LIMIT 10;

-- Check latest fuel transactions
SELECT id, transaction_date, license_plate, quantity, odo_number, category, updated_at
FROM fuel_transactions
ORDER BY updated_at DESC
LIMIT 10;
```

---

## ✅ CHECKLIST HOÀN THÀNH

### **Google Apps Script:**
- [ ] File `Config.gs` đã cập nhật:
  - [ ] `SHEET_NAMES` có `FUEL_IMPORT` và `FUEL_EXPORT`
  - [ ] `FUEL_IMPORT_COLUMNS` đã khai báo đầy đủ
  - [ ] `FUEL_EXPORT_COLUMNS` đã khai báo đầy đủ
  - [ ] `NUMBER_COLUMNS` có các cột fuel
  - [ ] `DATE_COLUMNS` có `ngay_nhap` và `ngay_xuat`

- [ ] File `Code.gs` đã có 2 hàm:
  - [ ] `syncFuelImportToBackend(importId, eventType)`
  - [ ] `syncFuelTransactionToBackend(transId, eventType)`

- [ ] Deploy Apps Script thành công

### **Next.js API:**
- [ ] File `route.ts` đã xử lý 4 Actions:
  - [ ] `FuelImport_Upsert`
  - [ ] `FuelImport_Delete`
  - [ ] `FuelTransaction_Upsert`
  - [ ] `FuelTransaction_Delete`

- [ ] Deploy Vercel thành công

### **AppSheet:**
- [ ] Bảng `nhap_nhien_lieu`:
  - [ ] Bot Add đã tạo và enable
  - [ ] Bot Edit đã tạo và enable
  - [ ] Bot Delete đã tạo và enable (dùng `_THISROW_BEFORE`)

- [ ] Bảng `xuat_nhien_lieu`:
  - [ ] Bot Add đã tạo và enable
  - [ ] Bot Edit đã tạo và enable
  - [ ] Bot Delete đã tạo và enable (dùng `_THISROW_BEFORE`)

### **Testing:**
- [ ] Test Add record → Verify trong Database
- [ ] Test Edit record → Verify cập nhật
- [ ] Test Delete record → Verify xóa thành công
- [ ] Kiểm tra logs không có error

---

## 🎉 KẾT LUẬN

Sau khi hoàn thành hướng dẫn này, hệ thống sẽ tự động đồng bộ Real-time:

- ✅ **Thêm mới** record → Tự động insert vào Database
- ✅ **Chỉnh sửa** record → Tự động update Database
- ✅ **Xóa** record → Tự động xóa khỏi Database

Mọi thay đổi trên AppSheet sẽ được phản ánh ngay lập tức trên Dashboard và Reports.

---

## 📞 HỖ TRỢ

Nếu gặp vấn đề, kiểm tra theo thứ tự:

1. **GAS Logs** → Xem lỗi từ Script
2. **Vercel Logs** → Xem lỗi từ API
3. **Database** → Verify data có được insert/update/delete không
4. **AppSheet Bot Status** → Đảm bảo Bot đang Enable

Good luck! 🚀
