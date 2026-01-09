# 🛢️ Hướng Dẫn Import Dữ Liệu Nhiên Liệu (Fuel)

> **Mục đích:** Import toàn bộ dữ liệu nhiên liệu từ Google Sheets lên Database

---

## 📊 Tổng Quan

Hệ thống nhiên liệu có **2 loại dữ liệu:**

| Loại | Sheet | Function | Thứ tự |
|------|-------|----------|--------|
| **Nhập kho** | `nhap_nhien_lieu` | `importHistoricalFuelImports()` | 1️⃣ **CHẠY TRƯỚC** |
| **Xuất kho** | `xuat_nhien_lieu` | `importHistoricalFuelTransactions()` | 2️⃣ **CHẠY SAU** |

⚠️ **LƯU Ý:** Phải chạy theo thứ tự 1 → 2 để tính toán đúng!

---

## 🚀 Quy Trình Import (2 Bước)

### **Bước 1: Import Nhập Kho** (Fuel Imports)

#### 📝 **Mục đích:**
- Import lịch sử nhập nhiên liệu
- Tính giá bình quân gia quyền (WAC - Weighted Average Cost)
- Tạo tồn kho ban đầu

#### 🎯 **Function:**
```javascript
importHistoricalFuelImports()
```

#### 📋 **Dữ liệu xử lý:**
- **Sheet:** `nhap_nhien_lieu`
- **Columns:**
  - `Id` - Mã nhập kho
  - `ngay_nhap` - Ngày nhập
  - `nha_cung_cap` - Nhà cung cấp
  - `ten_nhien_lieu` - Loại nhiên liệu (Xăng/Dầu)
  - `so_luong` - Số lượng (lít)
  - `don_gia_nhap` - Đơn giá nhập
  - `thanh_tien` - Thành tiền
  - `don_gia_xuat_binh_quan` - **Giá BQ (tự động tính)**

#### 📊 **Công thức WAC:**
```
P_mới = (Q_tồn × P_cũ + Q_nhập × P_nhập) / (Q_tồn + Q_nhập)

Trong đó:
- Q_tồn: Số lượng tồn kho hiện tại
- P_cũ: Giá bình quân cũ
- Q_nhập: Số lượng nhập mới
- P_nhập: Đơn giá nhập mới
- P_mới: Giá bình quân sau khi nhập
```

#### 🖥️ **Cách chạy:**
1. Mở Google Apps Script Editor
2. Chạy function:
   ```javascript
   importHistoricalFuelImports()
   ```

#### 📝 **Log mẫu:**
```
========== START HISTORICAL FUEL IMPORTS IMPORT ==========
Sheet: nhap_nhien_lieu
Total records to import: 150

--- Processing Row 2 ---
  ID: IMPORT-001
  Date: 2025-12-01
  Quantity: 500L
  Unit Price: 22000 VND/L
  WAC: Stock(0L @ 0) + Import(500L @ 22000) = 22000 VND/L
  ✓ Row 2 imported successfully

--- Processing Row 3 ---
  ID: IMPORT-002
  Date: 2025-12-05
  Quantity: 300L
  Unit Price: 23000 VND/L
  WAC: Stock(500L @ 22000) + Import(300L @ 23000) = 22375 VND/L
  ✓ Row 3 imported successfully

...

========== IMPORT SUMMARY ==========
Total: 150
✓ Imported: 148
✗ Failed: 2

========== IMPORT COMPLETE ==========
```

#### ⏱️ **Thời gian:**
- ~100ms/record
- 150 records ≈ 15-20 giây

---

### **Bước 2: Import Xuất Kho** (Fuel Transactions)

#### 📝 **Mục đích:**
- Import lịch sử xuất nhiên liệu (đổ dầu cho xe)
- Tự động tính toán hiệu suất nhiên liệu
- Tính quãng đường đã chạy

#### 🎯 **Function:**
```javascript
importHistoricalFuelTransactions()
```

#### 📋 **Dữ liệu xử lý:**
- **Sheet:** `xuat_nhien_lieu`
- **Columns:**
  - `Id` - Mã giao dịch
  - `ngay_tao` - Ngày xuất
  - `loai_hinh` - Loại hình (Xe/Máy móc)
  - `doi_tuong` - Đối tượng (Xe/Thiết bị)
  - `bien_so_xe` - Biển số xe
  - `ten_tai_xe` - Tên tài xế
  - `loai_nhien_lieu` - Loại nhiên liệu
  - `so_luong` - Số lượng (lít)
  - `don_gia` - **Đơn giá (tự động = giá BQ)**
  - `thanh_tien` - **Thành tiền (tự động tính)**
  - `so_odo` - Số ODO (km)
  - `trang_thai` - Trạng thái
  - `hang_muc` - Hạng mục (Chốt đầu/Đổ dặm/Chốt cuối)

#### 🔢 **Auto Calculation:**
Backend sẽ tự động tính:

1. **`is_full_tank`** (Đổ đầy bình)
   - `true` nếu `hang_muc` = "Chốt tháng", "Bàn giao", "Khởi tạo"
   - `false` nếu `hang_muc` = "Đổ dặm"

2. **`km_traveled`** (Quãng đường)
   - Tính từ lần đổ đầy trước đến lần hiện tại
   - Formula: `ODO_hiện_tại - ODO_lần_đổ_đầy_trước`

3. **`total_fuel_period`** (Tổng dầu trong kỳ)
   - Tổng dầu từ lần đổ đầy trước đến nay

4. **`efficiency`** (Hiệu suất)
   - Formula: `total_fuel / km_traveled × 100`
   - Đơn vị: L/100km

#### 🖥️ **Cách chạy:**
1. Mở Google Apps Script Editor
2. Chạy function:
   ```javascript
   importHistoricalFuelTransactions()
   ```

#### 📝 **Log mẫu:**
```
========== START HISTORICAL FUEL TRANSACTIONS IMPORT ==========
Sheet: xuat_nhien_lieu
Total records to import: 500
Starting batch import with auto-calculation...

--- Processing Row 2 ---
  ID: TRANS-001
  Date: 2025-12-01
  License Plate: 29C-12345
  Category: CHỐT ĐẦU
  Quantity: 50L
  Odo: 10000 km
  🔔 Full-tank record detected! Auto-calculation will be triggered.
  ✓ Row 2 imported successfully

--- Processing Row 3 ---
  ID: TRANS-002
  Date: 2025-12-05
  License Plate: 29C-12345
  Category: ĐỔ DẶM
  Quantity: 30L
  Odo: 10250 km
  ✓ Row 3 imported successfully

--- Processing Row 4 ---
  ID: TRANS-003
  Date: 2025-12-10
  License Plate: 29C-12345
  Category: CHỐT CUỐI
  Quantity: 40L
  Odo: 10600 km
  🔔 Full-tank record detected! Auto-calculation will be triggered.
  ✓ Row 4 imported successfully
  📊 Calculation Results:
     km_traveled: 600 km
     total_fuel: 120L
     efficiency: 20 L/100km

...

========== IMPORT SUMMARY ==========
Total: 500
✓ Imported: 495
📊 Auto-calculated: 85 (full-tank records)
✗ Failed: 5

========== IMPORT COMPLETE ==========
💡 TIP: Check database for calculated values (km_traveled, efficiency)
💡 Expected calculations for records with category: Chốt tháng, Bàn giao
```

#### ⏱️ **Thời gian:**
- ~150ms/record (chậm hơn vì có tính toán)
- 500 records ≈ 75-90 giây

---

## 📋 Workflow Đầy Đủ

```javascript
// ✅ BƯỚC 1: Import Nhập Kho (TRƯỚC)
importHistoricalFuelImports()
// → Import 150 records
// → Tính giá bình quân
// → Tạo tồn kho: 10,000L @ 22,500 VND/L

// ⏸️  CHỜ HOÀN THÀNH

// ✅ BƯỚC 2: Import Xuất Kho (SAU)
importHistoricalFuelTransactions()
// → Import 500 records
// → Tính hiệu suất nhiên liệu
// → Auto-calculate 85 records có "Chốt tháng"
```

---

## ⚠️ Lưu Ý Quan Trọng

### 🔴 **Trước Khi Import**

1. **Chạy migration Database:**
   ```sql
   -- Fuel Imports table
   CREATE TABLE IF NOT EXISTS fuel_imports (...);

   -- Fuel Transactions table
   CREATE TABLE IF NOT EXISTS fuel_transactions (...);
   ```

2. **Kiểm tra Backend API:**
   - Endpoint: `https://nak-system.vercel.app/api/webhook/appsheet`
   - API Key: `nak_logistics_2025_secure_key`

3. **Kiểm tra Sheets:**
   - Sheet `nhap_nhien_lieu` có dữ liệu
   - Sheet `xuat_nhien_lieu` có dữ liệu
   - Cột `Id` không trống

---

### 🟡 **Trong Quá Trình Import**

1. **Không tắt browser** khi function đang chạy
2. **Xem log** trong Apps Script: View → Logs
3. **Nếu có lỗi:**
   - Kiểm tra row bị lỗi trong log
   - Sửa dữ liệu trong Sheet
   - Chạy lại function (sẽ skip các row đã import thành công)

---

### 🟢 **Sau Khi Import**

1. **Verify Database:**
   ```sql
   -- Check Fuel Imports
   SELECT COUNT(*) FROM fuel_imports;
   SELECT * FROM fuel_imports ORDER BY import_date DESC LIMIT 10;

   -- Check Fuel Transactions
   SELECT COUNT(*) FROM fuel_transactions;
   SELECT * FROM fuel_transactions
   WHERE is_full_tank = true
   ORDER BY transaction_date DESC LIMIT 10;

   -- Check Calculated Values
   SELECT
     license_plate,
     transaction_date,
     odo_number,
     km_traveled,
     total_fuel_period,
     efficiency
   FROM fuel_transactions
   WHERE is_full_tank = true
   ORDER BY transaction_date DESC;
   ```

2. **Check Fuel Stats:**
   ```sql
   SELECT
     current_inventory,
     current_avg_price,
     total_imports,
     total_transactions
   FROM fuel_stats;
   ```

---

## 🔧 Troubleshooting

### **Problem 1: "Sheet not found: nhap_nhien_lieu"**
**Solution:** Kiểm tra tên sheet trong Config.gs

```javascript
SHEET_NAMES: {
  FUEL_IMPORT: 'nhap_nhien_lieu',  // Phải khớp
  FUEL_EXPORT: 'xuat_nhien_lieu'   // Phải khớp
}
```

---

### **Problem 2: Import thành công nhưng không có tính toán**
**Solution:** Kiểm tra `hang_muc` trong sheet

```
✅ Trigger auto-calc: "Chốt tháng", "Bàn giao", "Khởi tạo"
❌ No auto-calc: "Đổ dặm", "Đổ thường"
```

---

### **Problem 3: WAC không đúng**
**Solution:** Chạy lại từ đầu theo đúng thứ tự

```javascript
// 1. Xóa dữ liệu cũ trong DB
DELETE FROM fuel_transactions;
DELETE FROM fuel_imports;
UPDATE fuel_stats SET
  current_inventory = 0,
  current_avg_price = 0;

// 2. Import lại
importHistoricalFuelImports()    // TRƯỚC
importHistoricalFuelTransactions()  // SAU
```

---

### **Problem 4: Timeout (>6 minutes)**
**Solution:** Chia nhỏ data

**Option A: Filter theo ngày**
```javascript
// Chỉnh sửa function để filter
if (importData.importDate < '2025-01-01') {
  continue; // Skip records cũ
}
```

**Option B: Import theo batch thủ công**
```javascript
// Import từng phần
// Xóa tạm các row cũ trong Sheet
// Import batch 100-200 records mỗi lần
```

---

## 📊 Ví Dụ Thực Tế

### **Scenario: Import 150 Imports + 500 Transactions**

```javascript
// === PHASE 1: IMPORTS ===
importHistoricalFuelImports()

// Log:
// ========== IMPORT SUMMARY ==========
// Total: 150
// ✓ Imported: 150
// ✗ Failed: 0
// Time: ~15 seconds

// Database state after:
// - fuel_imports: 150 records
// - current_inventory: 12,500L
// - current_avg_price: 22,750 VND/L

// === PHASE 2: TRANSACTIONS ===
importHistoricalFuelTransactions()

// Log:
// ========== IMPORT SUMMARY ==========
// Total: 500
// ✓ Imported: 500
// 📊 Auto-calculated: 95 (full-tank records)
// ✗ Failed: 0
// Time: ~75 seconds

// Database state after:
// - fuel_transactions: 500 records
// - current_inventory: 2,300L (12,500L - 10,200L used)
// - 95 records có efficiency calculation
```

---

## ✅ Checklist Import Fuel

### **Pre-Import:**
- [ ] Database tables created (fuel_imports, fuel_transactions, fuel_stats)
- [ ] Backend API online
- [ ] API Key correct in Config.gs
- [ ] Sheet `nhap_nhien_lieu` has data
- [ ] Sheet `xuat_nhien_lieu` has data
- [ ] Column `Id` not empty
- [ ] Column `hang_muc` has values (for auto-calc)

### **Import Process:**
- [ ] Run `importHistoricalFuelImports()` first
- [ ] Wait for completion
- [ ] Check logs for errors
- [ ] Run `importHistoricalFuelTransactions()` second
- [ ] Wait for completion
- [ ] Check logs for auto-calculation results

### **Post-Import:**
- [ ] Verify `fuel_imports` count
- [ ] Verify `fuel_transactions` count
- [ ] Check `fuel_stats` (inventory, avg_price)
- [ ] Spot-check calculated values (efficiency)
- [ ] Test new imports via AppSheet Bot

---

## 🎓 Tóm Tắt

| Step | Function | Purpose | Time |
|------|----------|---------|------|
| 1️⃣ | `importHistoricalFuelImports()` | Import nhập kho + tính WAC | ~15s (150 records) |
| 2️⃣ | `importHistoricalFuelTransactions()` | Import xuất kho + tính efficiency | ~75s (500 records) |

**Total:** ~90 seconds for full import

---

## 📚 Related Files

- **Code:** [Code.gs](Code.gs) (dòng 2179-2410)
- **Config:** [Config.gs](Config.gs)
- **Backend API:** [/app/api/webhook/appsheet/route.ts](../app/api/webhook/appsheet/route.ts)

---

**🎉 Chúc bạn import thành công!**
