# 📋 Hướng Dẫn Import Dữ Liệu Từ 2026-01-01

> **Config hiện tại:** Chỉ import các chuyến có `ngay_tao >= 2026-01-01`

---

## ⚙️ Config Hiện Tại

```javascript
const MIGRATION_OPTS = {
  BATCH_SIZE: 25,
  START_DATE: '2026-01-01',  // ✅ Đã set
  MANUAL_START_ROW: null
};
```

---

## 🚀 Quy Trình Import (3 Bước)

### **Bước 1: Mở Google Apps Script**
1. Mở Google Sheet chứa dữ liệu
2. **Extensions** → **Apps Script**
3. Tìm file `Code.gs`

---

### **Bước 2: Reset Bộ Đếm**
Chạy function này trong Apps Script Editor:

```javascript
manualResetMigration()
```

**Kết quả:**
```
✅ [RESET] Đã xóa bộ đếm. Lần chạy tới sẽ bắt đầu từ dòng đầu tiên.
```

---

### **Bước 3: Chạy Import (Nhiều Lần)**
Chạy function này **NHIỀU LẦN** cho đến khi hoàn thành:

```javascript
manualRunMigrationBatch()
```

**Kết quả mẫu (Lần đầu):**
```
🔄 Đang khởi tạo kết nối đến Spreadsheet...
📅 Filter: Chỉ import chuyến từ 2026-01-01 trở đi
🚀 BẮT ĐẦU BATCH: Xử lý từ dòng 2 đến 26 (Tổng: 500)

✅ OK [NAK001]
✅ OK [NAK002]
✅ OK [NAK003]
...

---------------------------------------------------
🏁 KẾT THÚC BATCH.
- Thành công: 20
- Lỗi: 0
- Bỏ qua (No ID): 2
- Lọc theo ngày: 3 (trước 2026-01-01)
📍 Đã lưu vị trí dòng: 26
👉 HÃY CHẠY LẠI HÀM 'manualRunMigrationBatch' ĐỂ TIẾP TỤC.
```

**Tiếp tục chạy lại `manualRunMigrationBatch()` cho đến khi thấy:**

```
🎉 CHÚC MỪNG! ĐÃ HOÀN THÀNH TOÀN BỘ DỮ LIỆU.
```

---

## 📊 Ví Dụ Thực Tế

### **Scenario: Import 200 chuyến từ 1/1/2026**

```javascript
// Sheet có 500 dòng, nhưng chỉ 200 dòng có ngay_tao >= 2026-01-01

// Bước 1: Reset
manualResetMigration()

// Bước 2: Chạy lần 1 (import 20 chuyến, bỏ qua 5 chuyến cũ)
manualRunMigrationBatch()
// → Thành công: 20, Lọc theo ngày: 5

// Bước 3: Chạy lần 2 (import 25 chuyến)
manualRunMigrationBatch()
// → Thành công: 25, Lọc theo ngày: 0

// Bước 4: Chạy tiếp...
manualRunMigrationBatch()
manualRunMigrationBatch()
...

// Kết quả cuối: 200 chuyến được import, 300 chuyến bị lọc
```

---

## 🔍 Kiểm Tra Tiến Độ

Để xem đã import đến đâu, chạy:

```javascript
manualCheckStatus()
```

**Kết quả:**
```
ℹ️ [STATUS] Hệ thống đang dừng ở dòng: 150
ℹ️ [STATUS] Lần chạy tiếp theo sẽ xử lý từ dòng: 151
📅 [FILTER] Chỉ import từ ngày: 2026-01-01
```

---

## ⚠️ Lưu Ý Quan Trọng

### ✅ **Trước Khi Import:**
1. **Chạy migration SQL trên Database:**
   ```sql
   ALTER TABLE reconciliation_orders ADD COLUMN IF NOT EXISTS note TEXT;
   ```

2. **Kiểm tra Backend API:**
   - API đang online: https://nak-system.vercel.app
   - API Key đúng trong Config.gs

3. **Kiểm tra Sheet:**
   - Cột `ma_chuyen_di` có dữ liệu
   - Cột `ngay_tao` có dữ liệu
   - Dữ liệu hợp lệ

---

### 🔄 **Trong Quá Trình Import:**

**Nếu muốn dừng:**
- Đơn giản là không chạy `manualRunMigrationBatch()` nữa
- Vị trí đã được lưu, lần sau sẽ tiếp tục

**Nếu gặp lỗi:**
- Xem log để tìm `tripId` bị lỗi
- Sửa dữ liệu trong Sheet
- Chạy lại `manualRunMigrationBatch()` (tự động tiếp tục)

**Nếu muốn chạy lại từ đầu:**
```javascript
manualResetMigration()
manualRunMigrationBatch()
```

---

## 📈 Tăng Tốc Độ (Optional)

Nếu muốn import nhanh hơn, sửa `BATCH_SIZE`:

```javascript
const MIGRATION_OPTS = {
  BATCH_SIZE: 50,  // Tăng từ 25 lên 50
  START_DATE: '2026-01-01',
  MANUAL_START_ROW: null
};
```

**Lưu ý:** Batch size quá lớn có thể gây timeout (>6 phút)

---

## 🎯 Thống Kê Dự Kiến

| Tổng dòng | Chuyến >= 2026-01-01 | Chuyến < 2026-01-01 | Kết quả |
|-----------|---------------------|---------------------|---------|
| 500 | 200 | 300 | Import 200, bỏ qua 300 |
| 1000 | 800 | 200 | Import 800, bỏ qua 200 |
| 100 | 50 | 50 | Import 50, bỏ qua 50 |

**Thời gian ước tính:**
- 200 chuyến với BATCH_SIZE=25: ~8 lần chạy (~5-10 phút)
- 800 chuyến với BATCH_SIZE=50: ~16 lần chạy (~10-20 phút)

---

## ✅ Checklist

- [ ] Đã chạy migration SQL (ADD COLUMN note)
- [ ] Backend API đang online
- [ ] API Key đúng trong Config.gs
- [ ] Cột `ngay_tao` có trong Sheet
- [ ] Đã chạy `manualResetMigration()`
- [ ] Chạy `manualRunMigrationBatch()` nhiều lần
- [ ] Thấy message "HOÀN THÀNH TOÀN BỘ DỮ LIỆU"
- [ ] Verify dữ liệu trên Database

---

## 🐛 Troubleshooting

### **Problem: "Column note does not exist"**
```sql
-- Chạy trên Vercel Postgres
ALTER TABLE reconciliation_orders ADD COLUMN IF NOT EXISTS note TEXT;
```

### **Problem: "Không tìm thấy cột ngay_tao"**
- Kiểm tra sheet `chuyen_di` có cột `ngay_tao`
- Đảm bảo tên cột chính xác (không có khoảng trắng thừa)

### **Problem: Timeout khi chạy**
- Giảm `BATCH_SIZE` xuống 15-20
- Hoặc chạy vào giờ thấp điểm

---

## 📞 Support

Nếu gặp vấn đề, kiểm tra:
1. **Logs trong GAS:** View → Logs
2. **Logs trong Vercel:** https://vercel.com/dam-thanh-nams-projects/nak-system/logs
3. **Database:** Vercel → Storage → Postgres → Query

---

**🎉 Chúc bạn import thành công!**
