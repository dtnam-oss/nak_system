# FUEL TRANSACTIONS SCHEMA UPDATE - MIGRATION GUIDE

## 📋 Tổng Quan

Migration này cập nhật schema của bảng `fuel_transactions` để phù hợp với cấu trúc dữ liệu mới từ AppSheet.

**Ngày:** 31/12/2025  
**Phiên bản:** v2.0

---

## 🔄 THAY ĐỔI CHI TIẾT

### **Columns BỊ XÓA:**
- ❌ `driver_code` (ma_tai_xe) - Không còn sử dụng
- ❌ `image_url` (hinh_anh_tru_da_so_luong_ai) - Không còn sử dụng

### **Columns MỚI THÊM:**
- ✅ `object` (doi_tuong) - Đối tượng
- ✅ `odo_number` (so_odo) - Số ODO
- ✅ `category` (hang_muc) - Hạng mục: "Chốt đầu", "Đổ dặm", "Chốt cuối"

### **Column THAY ĐỔI:**
- 🔄 Date column: `ngay_xuat` → `ngay_tao` (trong Sheet)

---

## 🗂️ SCHEMA CŨ vs MỚI

### **Schema CŨ (v1.0):**
```sql
CREATE TABLE fuel_transactions (
  id TEXT PRIMARY KEY,
  transaction_date DATE,
  fuel_source TEXT,
  license_plate TEXT,
  driver_code TEXT,              -- ❌ Xóa
  driver_name TEXT,
  fuel_type TEXT,
  quantity DECIMAL(10, 2),
  unit_price DECIMAL(10, 2),
  total_amount DECIMAL(12, 2),
  image_url TEXT,                -- ❌ Xóa
  status TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### **Schema MỚI (v2.0):**
```sql
CREATE TABLE fuel_transactions (
  id TEXT PRIMARY KEY,
  transaction_date DATE,
  fuel_source TEXT,
  object TEXT,                   -- ✅ Mới
  license_plate TEXT,
  driver_name TEXT,
  fuel_type TEXT,
  quantity DECIMAL(10, 2),
  unit_price DECIMAL(10, 2),
  total_amount DECIMAL(12, 2),
  odo_number DECIMAL(10, 2),     -- ✅ Mới
  status TEXT,
  category TEXT,                  -- ✅ Mới
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🚀 HƯỚNG DẪN MIGRATION

### **Option 1: Vercel Postgres Dashboard (Recommended)**

1. Truy cập Vercel Dashboard
2. Vào Project `nak-logistic-system` → Storage → Postgres
3. Click **Query** tab
4. Copy và chạy SQL từ file `database/006_update_fuel_transactions_schema.sql`

```sql
-- Step 1: Drop old columns
ALTER TABLE fuel_transactions 
DROP COLUMN IF EXISTS driver_code,
DROP COLUMN IF EXISTS image_url;

-- Step 2: Add new columns
ALTER TABLE fuel_transactions 
ADD COLUMN IF NOT EXISTS object TEXT,
ADD COLUMN IF NOT EXISTS odo_number DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS category TEXT;

-- Step 3: Create indexes
CREATE INDEX IF NOT EXISTS idx_fuel_transactions_category ON fuel_transactions(category);
CREATE INDEX IF NOT EXISTS idx_fuel_transactions_object ON fuel_transactions(object);
CREATE INDEX IF NOT EXISTS idx_fuel_transactions_odo ON fuel_transactions(odo_number);
```

5. Verify schema:
```sql
\d fuel_transactions
```

---

### **Option 2: Sử dụng Vercel CLI**

```bash
# 1. Install Vercel CLI (nếu chưa có)
npm i -g vercel

# 2. Login
vercel login

# 3. Link project
cd /Users/mac/Desktop/nak-logistic-system
vercel link

# 4. Run migration
vercel env pull .env.local
psql $POSTGRES_URL < database/006_update_fuel_transactions_schema.sql
```

---

### **Option 3: Node.js Script**

Tạo file `scripts/migrate-fuel-transactions.ts`:

```typescript
import { sql } from '@vercel/postgres';

async function migrate() {
  try {
    console.log('Starting migration...');
    
    // Drop old columns
    await sql`
      ALTER TABLE fuel_transactions 
      DROP COLUMN IF EXISTS driver_code,
      DROP COLUMN IF EXISTS image_url
    `;
    console.log('✓ Dropped old columns');
    
    // Add new columns
    await sql`
      ALTER TABLE fuel_transactions 
      ADD COLUMN IF NOT EXISTS object TEXT,
      ADD COLUMN IF NOT EXISTS odo_number DECIMAL(10, 2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS category TEXT
    `;
    console.log('✓ Added new columns');
    
    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_fuel_transactions_category ON fuel_transactions(category)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_fuel_transactions_object ON fuel_transactions(object)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_fuel_transactions_odo ON fuel_transactions(odo_number)`;
    console.log('✓ Created indexes');
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

migrate();
```

Run:
```bash
npx tsx scripts/migrate-fuel-transactions.ts
```

---

## ✅ VERIFICATION

### **1. Kiểm tra Schema:**
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'fuel_transactions'
ORDER BY ordinal_position;
```

Expected output:
```
column_name      | data_type     | is_nullable
-----------------|---------------|-------------
id               | text          | NO
transaction_date | date          | YES
fuel_source      | text          | YES
object           | text          | YES  ← Mới
license_plate    | text          | YES
driver_name      | text          | YES
fuel_type        | text          | YES
quantity         | numeric       | YES
unit_price       | numeric       | YES
total_amount     | numeric       | YES
odo_number       | numeric       | YES  ← Mới
status           | text          | YES
category         | text          | YES  ← Mới
updated_at       | timestamp     | YES
```

### **2. Test Insert:**
```sql
INSERT INTO fuel_transactions (
  id, transaction_date, fuel_source, object,
  license_plate, driver_name, fuel_type,
  quantity, unit_price, total_amount,
  odo_number, status, category
) VALUES (
  'TEST001',
  '2025-12-31',
  'Xe tự có',
  'Tài xế',
  '51H-12345',
  'Nguyễn Văn A',
  'Dầu Diesel',
  100.5,
  22000,
  2211000,
  12345.6,
  'Đã duyệt',
  'Đổ dặm'
);

-- Verify
SELECT * FROM fuel_transactions WHERE id = 'TEST001';

-- Cleanup
DELETE FROM fuel_transactions WHERE id = 'TEST001';
```

### **3. Test AppSheet Sync:**
1. Thêm record mới trong AppSheet bảng `xuat_nhien_lieu`
2. Nhập đầy đủ: `doi_tuong`, `so_odo`, `hang_muc`
3. Check database:
```sql
SELECT id, object, odo_number, category, updated_at
FROM fuel_transactions
ORDER BY updated_at DESC
LIMIT 1;
```

---

## 🔧 COLUMN MAPPING CHI TIẾT

| AppSheet Column (Sheet) | Database Column | GAS JSON Key    | Data Type      | Description              |
|-------------------------|-----------------|-----------------|----------------|--------------------------|
| Id                      | id              | id              | TEXT           | Primary key              |
| ngay_tao                | transaction_date| transactionDate | DATE           | Ngày giao dịch          |
| loai_hinh               | fuel_source     | fuelSource      | TEXT           | Xe tự có / Xe thuê      |
| doi_tuong               | object          | object          | TEXT           | Đối tượng ✨            |
| bien_so_xe              | license_plate   | licensePlate    | TEXT           | Biển số xe              |
| ten_tai_xe              | driver_name     | driverName      | TEXT           | Tên tài xế              |
| loai_nhien_lieu         | fuel_type       | fuelType        | TEXT           | Xăng / Dầu              |
| so_luong                | quantity        | quantity        | DECIMAL(10,2)  | Số lượng (lít)          |
| don_gia                 | unit_price      | unitPrice       | DECIMAL(10,2)  | Đơn giá                 |
| thanh_tien              | total_amount    | totalAmount     | DECIMAL(12,2)  | Thành tiền              |
| so_odo                  | odo_number      | odoNumber       | DECIMAL(10,2)  | Số ODO ✨               |
| trang_thai              | status          | status          | TEXT           | Trạng thái              |
| hang_muc                | category        | category        | TEXT           | Chốt đầu/Đổ dặm/Chốt cuối ✨ |

✨ = Columns mới thêm

---

## 🔙 ROLLBACK (Nếu Cần)

Nếu cần rollback về schema cũ:

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

-- Drop new indexes
DROP INDEX IF EXISTS idx_fuel_transactions_category;
DROP INDEX IF EXISTS idx_fuel_transactions_object;
DROP INDEX IF EXISTS idx_fuel_transactions_odo;
```

---

## ⚠️ LƯU Ý QUAN TRỌNG

### **1. Data Loss Warning:**
- Khi xóa `driver_code` và `image_url`, dữ liệu trong các cột này sẽ bị mất
- Nếu cần backup, chạy trước:
```sql
CREATE TABLE fuel_transactions_backup AS 
SELECT * FROM fuel_transactions;
```

### **2. Existing Data:**
- Records hiện tại sẽ có `object`, `odo_number`, `category` = `NULL`
- Chỉ records mới từ AppSheet sau migration mới có data đầy đủ

### **3. AppSheet Configuration:**
- Phải cập nhật Config.gs và Code.gs TRƯỚC KHI chạy migration
- Phải deploy Next.js API mới TRƯỚC KHI test sync

---

## 📊 TIMELINE

1. ✅ **Cập nhật Code** (Hoàn thành)
   - Config.gs
   - Code.gs
   - route.ts

2. ⏳ **Run Migration** (Chờ thực hiện)
   - Backup data (optional)
   - Execute SQL migration
   - Verify schema

3. ⏳ **Test Sync** (Sau migration)
   - Test Add record
   - Test Edit record
   - Verify data in database

4. ⏳ **Deploy to Production**
   - Push code to GitHub
   - Vercel auto-deploy
   - Monitor logs

---

## 📞 HỖ TRỢ

Nếu gặp vấn đề trong quá trình migration:

1. Kiểm tra Vercel logs
2. Verify connection string: `$POSTGRES_URL`
3. Check quyền ALTER TABLE
4. Liên hệ Database Admin

---

**Migration prepared by:** Senior Fullstack Developer  
**Date:** December 31, 2025  
**Status:** ✅ Ready to Execute
