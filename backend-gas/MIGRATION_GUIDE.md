# 📦 Hướng Dẫn Import Dữ Liệu Cũ Lên Database

> **Mục đích:** Import toàn bộ dữ liệu từ Google Sheets (`chuyen_di`) lên bảng `reconciliation_orders` trong Postgres Database.

---

## 🎯 Các Tính Năng Mới

### ✅ **Filter theo ngày** (NEW)
Chỉ import các chuyến có `ngay_tao >= START_DATE`

### ✅ **Bắt đầu từ dòng cụ thể** (NEW)
Bắt đầu import từ dòng X thay vì dòng đầu tiên

### ✅ **Batch processing**
Import từng batch 25 dòng (có thể tăng lên 50) để tránh timeout

### ✅ **Auto resume**
Tự động lưu vị trí, chạy lại sẽ tiếp tục từ chỗ cũ

---

## ⚙️ Cấu Hình

Mở file `Code.gs` và tìm phần `MIGRATION_OPTS`:

```javascript
const MIGRATION_OPTS = {
  BATCH_SIZE: 25,  // Số lượng đơn xử lý mỗi lần (tăng lên 50 nếu muốn nhanh hơn)

  // 📅 FILTER THEO NGÀY
  START_DATE: null,  // VD: '2025-01-01' - chỉ import từ 1/1/2025 trở đi

  // 📍 BẮT ĐẦU TỪ DÒNG CỤ THỂ
  MANUAL_START_ROW: null  // VD: 100 - bắt đầu từ dòng 100
};
```

---

## 🚀 Các Trường Hợp Sử Dụng

### **Case 1: Import TẤT CẢ dữ liệu** ⭐ (Phổ biến nhất)

```javascript
// 1. Đảm bảo config
BATCH_SIZE: 25
START_DATE: null       // Import tất cả
MANUAL_START_ROW: null

// 2. Reset bộ đếm
manualResetMigration()

// 3. Chạy import (nhiều lần)
manualRunMigrationBatch()
```

**Kết quả:** Import toàn bộ dữ liệu từ dòng 2 đến hết.

---

### **Case 2: Chỉ import dữ liệu từ ngày X** 📅

**Ví dụ:** Chỉ import các chuyến từ 1/12/2024 trở đi

```javascript
// 1. Sửa config
START_DATE: '2024-12-01'

// 2. Reset
manualResetMigration()

// 3. Import
manualRunMigrationBatch()
```

**Kết quả:**
- Các chuyến có `ngay_tao < 2024-12-01` → Bỏ qua
- Các chuyến có `ngay_tao >= 2024-12-01` → Import

**Log mẫu:**
```
📅 Filter: Chỉ import chuyến từ 2024-12-01 trở đi
🚀 BẮT ĐẦU BATCH: Xử lý từ dòng 2 đến 26 (Tổng: 500)
✅ OK [NAK001]
✅ OK [NAK002]
---
🏁 KẾT THÚC BATCH
- Thành công: 15
- Lỗi: 0
- Bỏ qua (No ID): 2
- Lọc theo ngày: 8 (trước 2024-12-01)
```

---

### **Case 3: Bắt đầu từ dòng cụ thể** 📍

**Ví dụ:** Sheet có 10,000 dòng, bạn muốn import từ dòng 5000

```javascript
// 1. Sửa config
MANUAL_START_ROW: 5000

// 2. Reset (để áp dụng start row)
manualResetMigration()

// 3. Import
manualRunMigrationBatch()
```

**Kết quả:** Import từ dòng 5000 đến 10000

---

### **Case 4: Kết hợp cả 2 filter** 🎯

**Ví dụ:** Import từ dòng 100, chỉ lấy chuyến từ 1/1/2025

```javascript
// 1. Sửa config
START_DATE: '2025-01-01'
MANUAL_START_ROW: 100

// 2. Reset
manualResetMigration()

// 3. Import
manualRunMigrationBatch()
```

---

### **Case 5: Tăng tốc độ import** ⚡

```javascript
// 1. Tăng BATCH_SIZE
BATCH_SIZE: 50  // hoặc 100 nếu muốn rất nhanh

// 2. Import như bình thường
manualRunMigrationBatch()
```

**Lưu ý:** BATCH_SIZE quá lớn có thể gây timeout (>6 phút GAS limit)

---

## 📋 Quy Trình Import Đầy Đủ

### **Bước 1: Kiểm tra config**
```javascript
manualCheckStatus()
```

**Kết quả mẫu:**
```
ℹ️ [STATUS] Hệ thống đang dừng ở dòng: 1
ℹ️ [STATUS] Lần chạy tiếp theo sẽ xử lý từ dòng: 2
📅 [FILTER] Import tất cả (không lọc theo ngày)
```

---

### **Bước 2: Cấu hình filter (nếu cần)**

**Option A: Sửa trực tiếp trong code** (Recommended)
```javascript
const MIGRATION_OPTS = {
  BATCH_SIZE: 25,
  START_DATE: '2024-12-01',  // ← Sửa ở đây
  MANUAL_START_ROW: null
};
```

**Option B: Dùng helper function** (Chỉ để test)
```javascript
setStartDate('2024-12-01')  // Chỉ show hướng dẫn, vẫn phải sửa code
```

---

### **Bước 3: Reset bộ đếm**
```javascript
manualResetMigration()
```

**Kết quả:**
```
✅ [RESET] Đã xóa bộ đếm. Lần chạy tới sẽ bắt đầu từ dòng đầu tiên.
```

---

### **Bước 4: Chạy import lần đầu**
```javascript
manualRunMigrationBatch()
```

**Kết quả mẫu:**
```
🔄 Đang khởi tạo kết nối đến Spreadsheet...
📅 Filter: Chỉ import chuyến từ 2024-12-01 trở đi
🚀 BẮT ĐẦU BATCH: Xử lý từ dòng 2 đến 26 (Tổng: 500)
✅ OK [NAK001]
✅ OK [NAK002]
❌ FAIL [NAK003]: Error message
---
🏁 KẾT THÚC BATCH
- Thành công: 23
- Lỗi: 1
- Bỏ qua (No ID): 1
- Lọc theo ngày: 5 (trước 2024-12-01)
📍 Đã lưu vị trí dòng: 26
👉 HÃY CHẠY LẠI HÀM 'manualRunMigrationBatch' ĐỂ TIẾP TỤC.
```

---

### **Bước 5: Chạy lại nhiều lần**
```javascript
manualRunMigrationBatch()  // Lần 2
manualRunMigrationBatch()  // Lần 3
manualRunMigrationBatch()  // Lần 4
// ... cho đến khi thấy message hoàn thành
```

**Kết quả cuối cùng:**
```
🎉 CHÚC MỪNG! ĐÃ HOÀN THÀNH TOÀN BỘ DỮ LIỆU.
```

---

### **Bước 6: Kiểm tra lại**
```javascript
manualCheckStatus()
```

---

## 🛠️ Các Hàm Helper

### 1️⃣ **manualResetMigration()**
Reset bộ đếm, bắt đầu lại từ đầu

```javascript
manualResetMigration()
```

---

### 2️⃣ **manualCheckStatus()**
Xem đang chạy đến đâu

```javascript
manualCheckStatus()
```

---

### 3️⃣ **manualRunMigrationBatch()**
Chạy import một batch

```javascript
manualRunMigrationBatch()
```

---

### 4️⃣ **setStartDate(dateString)** (Helper - chỉ để test)
Validate format ngày

```javascript
setStartDate('2024-12-01')  // Valid
setStartDate('01-12-2024')  // Invalid
```

**Lưu ý:** Hàm này chỉ show hướng dẫn, vẫn phải sửa `MIGRATION_OPTS.START_DATE` trong code.

---

### 5️⃣ **setStartRow(rowNumber)** (Helper - chỉ để test)
Validate số dòng

```javascript
setStartRow(100)   // Valid
setStartRow(1)     // Invalid (dòng 1 là header)
```

**Lưu ý:** Hàm này chỉ show hướng dẫn, vẫn phải sửa `MIGRATION_OPTS.MANUAL_START_ROW` trong code.

---

## 📊 Ví Dụ Thực Tế

### **Scenario 1: Import toàn bộ 5000 chuyến**

```javascript
// Config
BATCH_SIZE: 50
START_DATE: null
MANUAL_START_ROW: null

// Execution
manualResetMigration()
// Chạy 100 lần (5000 / 50 = 100 batches)
for (let i = 0; i < 100; i++) {
  manualRunMigrationBatch()
}
```

**Thời gian:** ~10-15 phút (tùy tốc độ API)

---

### **Scenario 2: Chỉ import tháng 12/2024**

```javascript
// Config
START_DATE: '2024-12-01'

// Execution
manualResetMigration()
manualRunMigrationBatch()  // Chạy nhiều lần
```

**Kết quả:** Chỉ import các chuyến từ 1/12/2024 đến 31/12/2024

---

### **Scenario 3: Import từ giữa sheet (có lỗi ở batch trước)**

```javascript
// Config
MANUAL_START_ROW: 250  // Bắt đầu lại từ dòng 250

// Execution
manualResetMigration()
manualRunMigrationBatch()
```

---

## ⚠️ Lưu Ý Quan Trọng

### 🔴 **TRƯỚC KHI CHẠY IMPORT**

1. **Chạy migration DB:**
   ```sql
   ALTER TABLE reconciliation_orders ADD COLUMN IF NOT EXISTS note TEXT;
   ```

2. **Kiểm tra Backend API:**
   - API đang online
   - API Key đúng trong config

3. **Kiểm tra Sheet:**
   - Cột `ma_chuyen_di` tồn tại
   - Cột `ngay_tao` tồn tại (nếu dùng START_DATE)
   - Dữ liệu hợp lệ

---

### 🟡 **TRONG QUÁ TRÌNH IMPORT**

1. **Nếu gặp lỗi:**
   - Kiểm tra log để tìm `tripId` bị lỗi
   - Sửa dữ liệu trong Sheet
   - Chạy lại `manualRunMigrationBatch()` (sẽ tự động tiếp tục)

2. **Nếu muốn dừng:**
   - Đơn giản là không chạy hàm nữa
   - Vị trí đã được lưu, lần sau sẽ tiếp tục

3. **Nếu muốn chạy lại từ đầu:**
   ```javascript
   manualResetMigration()
   manualRunMigrationBatch()
   ```

---

### 🟢 **SAU KHI IMPORT XONG**

1. **Kiểm tra database:**
   ```sql
   SELECT COUNT(*) FROM reconciliation_orders;
   SELECT * FROM reconciliation_orders ORDER BY date DESC LIMIT 10;
   ```

2. **Verify dữ liệu:**
   - Số lượng records khớp với Sheet
   - Dữ liệu đầy đủ (revenue, cost, note...)

---

## 🐛 Troubleshooting

### **Problem 1: "Column note does not exist"**
**Solution:** Chạy migration SQL

```sql
ALTER TABLE reconciliation_orders ADD COLUMN IF NOT EXISTS note TEXT;
```

---

### **Problem 2: "API Error 401 Unauthorized"**
**Solution:** Kiểm tra API Key trong `Config.gs`

```javascript
API: {
  KEY: 'nak_logistics_2025_secure_key'  // Phải khớp với Backend
}
```

---

### **Problem 3: Timeout (execution time > 6 minutes)**
**Solution:** Giảm `BATCH_SIZE` xuống 10-15

```javascript
BATCH_SIZE: 15  // Giảm từ 25 xuống 15
```

---

### **Problem 4: Import trùng lặp**
**Solution:** Database có `UPSERT` (ON CONFLICT), không sao cả. Chạy lại sẽ update.

---

### **Problem 5: START_DATE không hoạt động**
**Solution:** Kiểm tra:
1. Cột `ngay_tao` có trong Sheet
2. Format ngày đúng: `YYYY-MM-DD`
3. Dữ liệu `ngay_tao` trong Sheet hợp lệ

---

## 📈 Performance Tips

1. **Tăng BATCH_SIZE nếu API nhanh:**
   ```javascript
   BATCH_SIZE: 50  // Hoặc 100
   ```

2. **Chạy vào giờ thấp điểm:**
   - Tránh giờ cao điểm (8h-12h, 14h-18h)

3. **Kiểm tra log GAS:**
   - View → Logs
   - Theo dõi progress real-time

---

## ✅ Checklist Hoàn Chỉnh

- [ ] Chạy migration DB (`ALTER TABLE ... ADD COLUMN note`)
- [ ] Kiểm tra Backend API online
- [ ] Kiểm tra API Key trong Config.gs
- [ ] Set `START_DATE` (nếu cần filter)
- [ ] Set `MANUAL_START_ROW` (nếu cần)
- [ ] Chạy `manualResetMigration()`
- [ ] Chạy `manualRunMigrationBatch()` nhiều lần
- [ ] Verify database sau khi xong

---

## 🎓 Tóm Tắt

| Mục đích | Config | Hàm chạy |
|----------|--------|----------|
| Import tất cả | `START_DATE: null` | `manualRunMigrationBatch()` |
| Import từ ngày X | `START_DATE: '2024-12-01'` | `manualRunMigrationBatch()` |
| Import từ dòng Y | `MANUAL_START_ROW: 100` | Reset → Run |
| Kiểm tra progress | - | `manualCheckStatus()` |
| Reset bộ đếm | - | `manualResetMigration()` |

---

**🎉 Chúc bạn import thành công!**
