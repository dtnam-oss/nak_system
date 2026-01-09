# ⚡ Quick Import Guide - Cheat Sheet

> **Hướng dẫn nhanh import dữ liệu cũ lên Database**

---

## 🎯 Mục Đích

Import dữ liệu từ Google Sheet `chuyen_di` lên bảng `reconciliation_orders` trong Postgres.

---

## ⚙️ Config (Code.gs)

```javascript
const MIGRATION_OPTS = {
  BATCH_SIZE: 25,           // Số dòng mỗi lần chạy
  START_DATE: null,         // '2024-12-01' - filter theo ngày
  MANUAL_START_ROW: null    // 100 - bắt đầu từ dòng cụ thể
};
```

---

## 🚀 Các Trường Hợp Thường Gặp

### ✅ **Case 1: Import TẤT CẢ** (Phổ biến nhất)

```javascript
// Config: Để mặc định
START_DATE: null
MANUAL_START_ROW: null

// Chạy:
manualResetMigration()
manualRunMigrationBatch()  // Chạy nhiều lần đến khi xong
```

---

### 📅 **Case 2: Chỉ import từ ngày X**

```javascript
// Config: Set ngày
START_DATE: '2024-12-01'  // Chỉ import từ 1/12/2024

// Chạy:
manualResetMigration()
manualRunMigrationBatch()
```

---

### 📍 **Case 3: Bắt đầu từ dòng Y**

```javascript
// Config: Set dòng
MANUAL_START_ROW: 100  // Bắt đầu từ dòng 100

// Chạy:
manualResetMigration()
manualRunMigrationBatch()
```

---

### ⚡ **Case 4: Import nhanh hơn**

```javascript
// Config: Tăng batch size
BATCH_SIZE: 50  // Tăng từ 25 lên 50

// Chạy bình thường
manualRunMigrationBatch()
```

---

## 📋 Workflow Cơ Bản

```javascript
// 1. Kiểm tra config
manualCheckStatus()

// 2. Reset bộ đếm
manualResetMigration()

// 3. Import (chạy nhiều lần)
manualRunMigrationBatch()
manualRunMigrationBatch()
manualRunMigrationBatch()
// ... cho đến khi thấy "HOÀN THÀNH"

// 4. Kiểm tra lại
manualCheckStatus()
```

---

## 📊 Kết Quả Mẫu

```
🚀 BẮT ĐẦU BATCH: Xử lý từ dòng 2 đến 26 (Tổng: 500)
✅ OK [NAK001]
✅ OK [NAK002]
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

## ⚠️ Lưu Ý Quan Trọng

### Trước khi chạy:
1. ✅ Chạy migration SQL:
   ```sql
   ALTER TABLE reconciliation_orders ADD COLUMN IF NOT EXISTS note TEXT;
   ```
2. ✅ Kiểm tra Backend API online
3. ✅ Kiểm tra API Key trong Config.gs

### Nếu gặp lỗi:
- Xem log để tìm `tripId` bị lỗi
- Sửa dữ liệu trong Sheet
- Chạy lại `manualRunMigrationBatch()` (tự động tiếp tục)

### Nếu muốn dừng:
- Không chạy nữa, vị trí đã được lưu
- Lần sau chạy lại sẽ tiếp tục từ chỗ cũ

---

## 🎯 Quick Reference Table

| Tác vụ | Hàm |
|--------|-----|
| Kiểm tra tiến độ | `manualCheckStatus()` |
| Reset bộ đếm | `manualResetMigration()` |
| Import batch | `manualRunMigrationBatch()` |
| Validate ngày | `setStartDate('2024-12-01')` |
| Validate dòng | `setStartRow(100)` |

---

## 🔧 Config Mẫu

### Import tất cả (default)
```javascript
BATCH_SIZE: 25
START_DATE: null
MANUAL_START_ROW: null
```

### Import từ 1/12/2024
```javascript
BATCH_SIZE: 25
START_DATE: '2024-12-01'
MANUAL_START_ROW: null
```

### Import từ dòng 500
```javascript
BATCH_SIZE: 25
START_DATE: null
MANUAL_START_ROW: 500
```

### Import nhanh (50 dòng/lần)
```javascript
BATCH_SIZE: 50
START_DATE: null
MANUAL_START_ROW: null
```

---

**📚 Tài liệu đầy đủ:** Xem file `MIGRATION_GUIDE.md`
