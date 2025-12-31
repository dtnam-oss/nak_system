# ✅ FUEL SCHEMA UPDATE - COMPLETED

## 📋 Tổng Quan

Đã cập nhật thành công schema và column mappings cho module **Fuel Transactions** theo cấu trúc mới.

**Commit:** `f7ce7f4`  
**Date:** December 31, 2025  
**Status:** ✅ **PUSHED TO GITHUB - READY FOR MIGRATION**

---

## 🔄 THAY ĐỔI CHI TIẾT

### **FUEL_EXPORT_COLUMNS - Before vs After:**

#### **❌ CŨ (12 columns):**
```javascript
FUEL_EXPORT_COLUMNS: {
  'Id': 'id',
  'ngay_xuat': 'transactionDate',           // ❌ Đổi thành ngay_tao
  'loai_hinh': 'fuelSource',
  'bien_so_xe': 'licensePlate',
  'ma_tai_xe': 'driverCode',                // ❌ Xóa
  'ten_tai_xe': 'driverName',
  'loai_nhien_lieu': 'fuelType',
  'so_luong': 'quantity',
  'don_gia': 'unitPrice',
  'thanh_tien': 'totalAmount',
  'hinh_anh_tru_da_so_luong_ai': 'imageUrl', // ❌ Xóa
  'trang_thai': 'status'
}
```

#### **✅ MỚI (13 columns):**
```javascript
FUEL_EXPORT_COLUMNS: {
  'Id': 'id',
  'ngay_tao': 'transactionDate',            // ✅ Thay đổi
  'loai_hinh': 'fuelSource',
  'doi_tuong': 'object',                    // ✅ Mới
  'bien_so_xe': 'licensePlate',
  'ten_tai_xe': 'driverName',
  'loai_nhien_lieu': 'fuelType',
  'so_luong': 'quantity',
  'don_gia': 'unitPrice',
  'thanh_tien': 'totalAmount',
  'so_odo': 'odoNumber',                    // ✅ Mới
  'trang_thai': 'status',
  'hang_muc': 'category'                     // ✅ Mới
}
```

---

## 📦 FILES ĐÃ CẬP NHẬT (8 files)

### **1. Backend Code:**
- ✅ [backend-gas/Config.gs](backend-gas/Config.gs)
  - Cập nhật FUEL_EXPORT_COLUMNS
  - Cập nhật DATE_COLUMNS (bỏ ngay_xuat)

- ✅ [backend-gas/Code.gs](backend-gas/Code.gs)
  - Cập nhật transformFuelExportRow() để xử lý 3 columns mới

### **2. API:**
- ✅ [app/api/webhook/appsheet/route.ts](app/api/webhook/appsheet/route.ts)
  - Cập nhật FuelTransactionPayload interface
  - Cập nhật SQL INSERT/UPDATE với columns mới

### **3. Database:**
- ✅ [database/006_update_fuel_transactions_schema.sql](database/006_update_fuel_transactions_schema.sql) ⭐ **MỚI**
  - Migration script hoàn chỉnh
  - Includes indexes và comments

### **4. Documentation:**
- ✅ [FUEL_TRANSACTIONS_MIGRATION_GUIDE.md](FUEL_TRANSACTIONS_MIGRATION_GUIDE.md) ⭐ **MỚI**
  - Hướng dẫn migration chi tiết
  - 3 options: Dashboard, CLI, Node.js
  - Verification steps & Rollback

- ✅ [FUEL_REALTIME_SYNC_IMPLEMENTATION.md](FUEL_REALTIME_SYNC_IMPLEMENTATION.md)
  - Cập nhật column mapping table
  - Cập nhật database schema

- ✅ [FUEL_SYNC_GUIDE.md](FUEL_SYNC_GUIDE.md)
  - Cập nhật SQL queries với columns mới

- ✅ [FUEL_SYNC_QUICK_TEST.md](FUEL_SYNC_QUICK_TEST.md)
  - Cập nhật test queries

---

## 🗃️ DATABASE SCHEMA CHANGES

### **Columns REMOVED:**
- ❌ `driver_code` (TEXT)
- ❌ `image_url` (TEXT)

### **Columns ADDED:**
- ✅ `object` (TEXT) - Đối tượng
- ✅ `odo_number` (DECIMAL(10,2)) - Số ODO
- ✅ `category` (TEXT) - Hạng mục: "Chốt đầu", "Đổ dặm", "Chốt cuối"

### **New Schema:**
```sql
fuel_transactions (
  id TEXT PRIMARY KEY,
  transaction_date DATE,
  fuel_source TEXT,
  object TEXT,              -- ✅ NEW
  license_plate TEXT,
  driver_name TEXT,
  fuel_type TEXT,
  quantity DECIMAL(10, 2),
  unit_price DECIMAL(10, 2),
  total_amount DECIMAL(12, 2),
  odo_number DECIMAL(10, 2), -- ✅ NEW
  status TEXT,
  category TEXT,             -- ✅ NEW
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

---

## 🚀 NEXT STEPS - DATABASE MIGRATION

### **⚠️ QUAN TRỌNG:**
Code đã được push lên GitHub và Vercel sẽ auto-deploy, nhưng **BẠN PHẢI CHẠY DATABASE MIGRATION THỦ CÔNG**.

### **Option 1: Vercel Dashboard (Khuyến nghị)**

1. Vào https://vercel.com/dashboard
2. Project `nak-logistic-system` → **Storage** → **Postgres**
3. Click tab **Query**
4. Copy SQL từ [database/006_update_fuel_transactions_schema.sql](database/006_update_fuel_transactions_schema.sql)
5. Click **Run Query**
6. Verify với:
   ```sql
   \d fuel_transactions
   ```

### **Option 2: Terminal với psql**

```bash
# Export connection string từ Vercel
vercel env pull .env.local

# Load environment variables
source .env.local

# Run migration
psql $POSTGRES_URL < database/006_update_fuel_transactions_schema.sql
```

### **Option 3: Node.js Script**

Xem chi tiết trong [FUEL_TRANSACTIONS_MIGRATION_GUIDE.md](FUEL_TRANSACTIONS_MIGRATION_GUIDE.md)

---

## ✅ VERIFICATION CHECKLIST

Sau khi chạy migration, verify:

- [ ] **Check Schema:**
  ```sql
  SELECT column_name, data_type 
  FROM information_schema.columns 
  WHERE table_name = 'fuel_transactions'
  ORDER BY ordinal_position;
  ```
  → Phải thấy: `object`, `odo_number`, `category`
  → KHÔNG thấy: `driver_code`, `image_url`

- [ ] **Test Insert:**
  ```sql
  INSERT INTO fuel_transactions (
    id, transaction_date, object, odo_number, category
  ) VALUES (
    'TEST001', '2025-12-31', 'Tài xế', 12345.6, 'Đổ dặm'
  );
  
  SELECT * FROM fuel_transactions WHERE id = 'TEST001';
  DELETE FROM fuel_transactions WHERE id = 'TEST001';
  ```

- [ ] **Test AppSheet Sync:**
  - Thêm record mới trong AppSheet
  - Nhập đầy đủ: `doi_tuong`, `so_odo`, `hang_muc`
  - Check database có data đầy đủ

- [ ] **Check Logs:**
  - Vercel Logs → Search "FuelTransaction_Upsert"
  - GAS Logs → Check `syncFuelTransactionToBackend`
  - Không có error 500 hoặc column not found

---

## 📊 SUMMARY

| Metric              | Value                    |
|---------------------|--------------------------|
| Files Changed       | 8                        |
| Insertions          | +446 lines               |
| Deletions           | -26 lines                |
| New Columns         | 3 (object, odo, category)|
| Removed Columns     | 2 (driver_code, image_url)|
| Breaking Changes    | YES ⚠️                   |
| Migration Required  | YES ⚠️                   |

---

## ⚠️ LƯU Ý QUAN TRỌNG

1. **Code đã deploy nhưng Database chưa migrate:**
   - API sẽ error nếu bạn sync data trước khi migrate
   - Error message: "column does not exist"

2. **Data Loss Warning:**
   - Columns `driver_code` và `image_url` sẽ bị xóa
   - Backup trước nếu cần: `CREATE TABLE fuel_transactions_backup AS SELECT * FROM fuel_transactions;`

3. **AppSheet Config:**
   - Sheet phải có columns mới: `doi_tuong`, `so_odo`, `hang_muc`
   - Column `ngay_xuat` phải đổi thành `ngay_tao` (hoặc update mapping)

4. **Testing:**
   - Test trên dev/staging trước
   - Monitor logs kỹ trong 24h đầu
   - Có rollback plan sẵn

---

## 🔙 ROLLBACK (Nếu Cần)

```sql
-- Remove new columns
ALTER TABLE fuel_transactions 
DROP COLUMN IF EXISTS object,
DROP COLUMN IF EXISTS odo_number,
DROP COLUMN IF EXISTS category;

-- Add back old columns
ALTER TABLE fuel_transactions 
ADD COLUMN IF NOT EXISTS driver_code TEXT,
ADD COLUMN IF NOT EXISTS image_url TEXT;
```

Sau đó revert code:
```bash
git revert f7ce7f4
git push origin main
```

---

## 📞 SUPPORT

**Migration Guide:** [FUEL_TRANSACTIONS_MIGRATION_GUIDE.md](FUEL_TRANSACTIONS_MIGRATION_GUIDE.md)

**Questions:**
1. Schema issues → Check migration guide
2. AppSheet sync error → Check GAS logs
3. API 500 error → Check Vercel logs
4. Column not found → Verify migration ran successfully

---

## 🎉 KẾT LUẬN

✅ Code updates: **COMPLETED & PUSHED**  
⏳ Database migration: **PENDING - RUN MANUALLY**  
📚 Documentation: **UPDATED & COMPLETE**

**Next Action:** Chạy database migration theo hướng dẫn trên! 🚀

---

**Updated by:** Senior Fullstack Developer  
**Timestamp:** 2025-12-31 (UTC+7)  
**Git Hash:** f7ce7f4
