# SQL FIFO Inventory - Quick Guide

## 🎯 Tổng Quan

File SQL này cung cấp **công cụ hoàn chỉnh** để tính tồn kho theo FIFO trực tiếp trong PostgreSQL.

**File**: [database/008_fifo_inventory_calculation.sql](database/008_fifo_inventory_calculation.sql)

---

## 📦 Các Components

### 1. **Stored Function** - Tính toán FIFO
```sql
calculate_fifo_inventory()
```
- Implement thuật toán FIFO trong database
- Trả về chi tiết từng PO: Nhập, Xuất, Tồn
- Match theo timestamp chính xác

### 2. **Materialized View** - Cache kết quả
```sql
mv_fifo_inventory
```
- Lưu kết quả FIFO để query nhanh
- Có index tối ưu
- Refresh khi cần

### 3. **Refresh Function** - Cập nhật cache
```sql
refresh_fifo_inventory()
```
- Cập nhật materialized view
- Gọi khi có thay đổi data

### 4. **Triggers** - Auto-refresh
- Tự động notify khi có import/transaction mới
- Background refresh không block operations

---

## 🚀 Cách Sử Dụng

### Bước 1: Chạy Migration Script

```bash
# Connect to PostgreSQL
psql -U your_user -d your_database -f database/008_fifo_inventory_calculation.sql
```

Hoặc trong SQL client:
```sql
-- Copy paste toàn bộ file 008_fifo_inventory_calculation.sql và execute
```

### Bước 2: Kiểm Tra Cài Đặt

```sql
-- Verify function exists
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name LIKE '%fifo%';

-- Verify materialized view exists
SELECT matviewname 
FROM pg_matviews 
WHERE matviewname = 'mv_fifo_inventory';
```

### Bước 3: Chạy Tính Toán FIFO

```sql
-- Option A: Direct calculation (real-time, slower)
SELECT * FROM calculate_fifo_inventory();

-- Option B: Use cached view (fast)
SELECT * FROM mv_fifo_inventory;
```

---

## 📊 Queries Thường Dùng

### 1. Xem Tổng Tồn Kho

```sql
SELECT 
    COUNT(*) as "Số PO còn tồn",
    SUM(remaining_quantity) as "Tổng tồn (L)",
    SUM(remaining_quantity * avg_price) as "Giá trị (VND)",
    ROUND(SUM(remaining_quantity * avg_price) / SUM(remaining_quantity), 2) as "Giá TB (VND/L)"
FROM mv_fifo_inventory
WHERE remaining_quantity > 0;
```

**Kết quả mẫu**:
```
Số PO còn tồn | Tổng tồn (L) | Giá trị (VND)  | Giá TB (VND/L)
--------------+--------------+----------------+---------------
      8       |   5420.5     | 121,961,250    |   22500.23
```

### 2. Danh Sách PO Còn Tồn

```sql
SELECT 
    import_id as "Mã PO",
    TO_CHAR(import_date, 'DD/MM/YYYY HH24:MI') as "Thời gian nhập",
    original_quantity as "Nhập (L)",
    consumed_quantity as "Xuất (L)",
    remaining_quantity as "Tồn (L)",
    ROUND((consumed_quantity / original_quantity * 100), 1) || '%' as "% Xuất",
    ROUND(avg_price, 2) as "Giá TB"
FROM mv_fifo_inventory
WHERE remaining_quantity > 0
ORDER BY import_date ASC;
```

**Kết quả mẫu**:
```
Mã PO    | Thời gian nhập    | Nhập | Xuất | Tồn  | % Xuất | Giá TB
---------+-------------------+------+------+------+--------+--------
PO-001   | 01/01/2026 00:00  | 1000 | 300  | 700  | 30.0%  | 22500
PO-002   | 02/01/2026 08:00  | 2000 | 500  | 1500 | 25.0%  | 23000
```

### 3. So Sánh FIFO vs Simple Method

```sql
WITH fifo_calc AS (
    SELECT SUM(remaining_quantity) as fifo_inventory
    FROM mv_fifo_inventory
),
simple_calc AS (
    SELECT 
        (SELECT SUM(quantity) FROM fuel_imports) - 
        (SELECT SUM(quantity) FROM fuel_transactions WHERE fuel_source = 'Trụ nội bộ') 
        as simple_inventory
)
SELECT 
    ROUND(f.fifo_inventory, 2) as "FIFO Inventory",
    ROUND(s.simple_inventory, 2) as "Simple Inventory",
    ROUND(f.fifo_inventory - s.simple_inventory, 2) as "Chênh lệch"
FROM fifo_calc f, simple_calc s;
```

**Kết quả mẫu**:
```
FIFO Inventory | Simple Inventory | Chênh lệch
---------------+------------------+-----------
   5420.50     |     5000.00      |  +420.50
```
*(FIFO chính xác hơn vì không tính transactions trước import)*

### 4. Tìm PO Đã Hết (Fully Consumed)

```sql
SELECT 
    import_id as "Mã PO",
    TO_CHAR(import_date, 'DD/MM/YYYY') as "Ngày nhập",
    original_quantity as "Số lượng (L)",
    'Đã xuất hết' as "Trạng thái"
FROM mv_fifo_inventory
WHERE remaining_quantity = 0
ORDER BY import_date DESC
LIMIT 10;
```

### 5. Cảnh Báo Negative Inventory

```sql
WITH transaction_totals AS (
    SELECT 
        ft.id,
        ft.transaction_date,
        ft.quantity,
        (SELECT COALESCE(SUM(quantity), 0) 
         FROM fuel_imports 
         WHERE import_date <= ft.transaction_date) as available
    FROM fuel_transactions ft
    WHERE LOWER(TRIM(ft.fuel_source)) = 'trụ nội bộ'
)
SELECT 
    id as "Transaction",
    TO_CHAR(transaction_date, 'DD/MM/YYYY') as "Ngày",
    quantity as "Xuất (L)",
    available as "Tồn kho",
    available - quantity as "Còn lại",
    CASE 
        WHEN available - quantity < 0 
        THEN '⚠️ XUẤT QUÁ TồN!'
        ELSE '✓ OK'
    END as "Trạng thái"
FROM transaction_totals
WHERE available - quantity < 0;
```

### 6. Transactions Trước Import (Không Ảnh Hưởng Tồn)

```sql
SELECT 
    ft.id as "ID",
    TO_CHAR(ft.transaction_date, 'DD/MM/YYYY HH24:MI') as "Thời gian xuất",
    ft.quantity as "Số lượng (L)",
    (SELECT TO_CHAR(MIN(import_date), 'DD/MM/YYYY HH24:MI') 
     FROM fuel_imports) as "Lần nhập đầu",
    '⚠️ KHÔNG ảnh hưởng tồn kho' as "Ghi chú"
FROM fuel_transactions ft
WHERE LOWER(TRIM(ft.fuel_source)) = 'trụ nội bộ'
    AND ft.transaction_date < (SELECT MIN(import_date) FROM fuel_imports);
```

---

## 🔄 Refresh Tồn Kho

### Khi Nào Cần Refresh?
- Sau khi nhập kho mới (INSERT vào fuel_imports)
- Sau khi có giao dịch xuất mới (INSERT vào fuel_transactions)
- Khi sửa/xóa data (UPDATE/DELETE)

### Cách Refresh

**Manual Refresh**:
```sql
-- Refresh materialized view
SELECT refresh_fifo_inventory();

-- Or direct refresh command
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_fifo_inventory;
```

**Check Last Refresh Time**:
```sql
SELECT 
    matviewname as "View Name",
    last_refresh_time as "Last Refresh",
    NOW() - last_refresh_time as "Age"
FROM pg_stat_user_tables
WHERE relname = 'mv_fifo_inventory';
```

**Auto Refresh (đã setup via triggers)**:
- Triggers tự động notify khi có thay đổi
- Background job có thể lắng nghe notification và refresh
- Non-blocking, không ảnh hưởng operations

---

## 🐛 Troubleshooting

### Issue 1: Function không tồn tại
**Error**: `function calculate_fifo_inventory() does not exist`

**Fix**:
```sql
-- Re-run the migration script
\i database/008_fifo_inventory_calculation.sql
```

### Issue 2: Materialized view cũ
**Error**: Kết quả không khớp với data mới

**Fix**:
```sql
-- Force refresh
REFRESH MATERIALIZED VIEW mv_fifo_inventory;
```

### Issue 3: Performance chậm
**Problem**: Query lâu khi data lớn

**Fix**:
```sql
-- Check if indexes exist
\d mv_fifo_inventory

-- Recreate indexes if needed
CREATE INDEX IF NOT EXISTS idx_mv_fifo_inventory_import_id 
ON mv_fifo_inventory(import_id);

CREATE INDEX IF NOT EXISTS idx_mv_fifo_inventory_remaining 
ON mv_fifo_inventory(remaining_quantity) 
WHERE remaining_quantity > 0;
```

### Issue 4: Chênh lệch lớn giữa FIFO và Simple
**Problem**: FIFO inventory khác Simple method nhiều

**Analysis**:
```sql
-- Tìm transactions trước import đầu tiên
SELECT COUNT(*), SUM(quantity)
FROM fuel_transactions ft
WHERE LOWER(TRIM(ft.fuel_source)) = 'trụ nội bộ'
    AND ft.transaction_date < (SELECT MIN(import_date) FROM fuel_imports);
```

**Interpretation**: Nếu có nhiều transactions trước import đầu → FIFO sẽ KHÔNG trừ chúng → Inventory cao hơn

---

## 📈 Performance Tips

### 1. Use Materialized View cho Production
```sql
-- Fast (cached)
SELECT * FROM mv_fifo_inventory;

-- Slow (real-time calculation)
SELECT * FROM calculate_fifo_inventory();
```

### 2. Schedule Refresh
```sql
-- Using cron job or pg_cron
SELECT cron.schedule(
    'refresh-fifo-inventory',
    '*/10 * * * *',  -- Every 10 minutes
    'SELECT refresh_fifo_inventory()'
);
```

### 3. Concurrent Refresh
```sql
-- Non-blocking refresh (allows reads during refresh)
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_fifo_inventory;
```

### 4. Monitor View Size
```sql
SELECT 
    pg_size_pretty(pg_total_relation_size('mv_fifo_inventory')) as size,
    n_tup_ins as rows
FROM pg_stat_user_tables
WHERE relname = 'mv_fifo_inventory';
```

---

## 🔗 Integration với API

### Sync API với Database Calculation

**Option 1**: API calls SQL function
```typescript
// In /api/fuel/stats/route.ts
const result = await sql`
  SELECT 
    SUM(remaining_quantity) as current_inventory,
    SUM(remaining_quantity * avg_price) / SUM(remaining_quantity) as avg_price
  FROM mv_fifo_inventory
`;
```

**Option 2**: Database stores, API reads
```typescript
// Fast read from materialized view
const inventory = await sql`SELECT * FROM mv_fifo_inventory`;
```

**Benefit**: Consistent calculation giữa API và direct SQL queries

---

## 📋 Maintenance Checklist

### Daily
- [ ] Check last refresh time
- [ ] Verify no negative inventory warnings

### Weekly
- [ ] Compare FIFO vs Simple để spot anomalies
- [ ] Review depleted imports (fully consumed POs)
- [ ] Check materialized view size

### Monthly
- [ ] Vacuum materialized view
- [ ] Reindex if needed
- [ ] Archive old depleted imports data

```sql
-- Vacuum
VACUUM ANALYZE mv_fifo_inventory;

-- Reindex
REINDEX TABLE mv_fifo_inventory;
```

---

## 🎓 Advanced Usage

### Custom FIFO Calculation Period

```sql
-- FIFO calculation for specific date range
SELECT 
    import_id,
    remaining_quantity
FROM calculate_fifo_inventory()
WHERE import_date BETWEEN '2026-01-01' AND '2026-01-31';
```

### Export FIFO Report to CSV

```sql
\copy (SELECT * FROM mv_fifo_inventory WHERE remaining_quantity > 0) 
TO '/tmp/fifo_inventory_report.csv' CSV HEADER;
```

### Create Alert for Low Inventory

```sql
-- Find imports with < 10% remaining
SELECT 
    import_id,
    original_quantity,
    remaining_quantity,
    ROUND((remaining_quantity / original_quantity * 100), 1) as pct_remaining
FROM mv_fifo_inventory
WHERE remaining_quantity > 0
    AND (remaining_quantity / original_quantity) < 0.1
ORDER BY pct_remaining ASC;
```

---

## 🆘 Emergency Commands

### Rebuild từ đầu

```sql
-- Drop everything
DROP MATERIALIZED VIEW IF EXISTS mv_fifo_inventory CASCADE;
DROP FUNCTION IF EXISTS calculate_fifo_inventory() CASCADE;
DROP FUNCTION IF EXISTS refresh_fifo_inventory() CASCADE;

-- Re-run migration
\i database/008_fifo_inventory_calculation.sql
```

### Force Recalculate

```sql
-- Drop and recreate view
DROP MATERIALIZED VIEW mv_fifo_inventory;
CREATE MATERIALIZED VIEW mv_fifo_inventory AS
SELECT * FROM calculate_fifo_inventory();
REFRESH MATERIALIZED VIEW mv_fifo_inventory;
```

---

## 📞 Support

**Documentation**:
- [FIFO_INVENTORY_IMPLEMENTATION.md](FIFO_INVENTORY_IMPLEMENTATION.md) - Technical details
- [database/008_fifo_inventory_calculation.sql](database/008_fifo_inventory_calculation.sql) - SQL source

**Common Issues**: See Troubleshooting section above

**Performance**: Materialized view with indexes = Fast queries

---

**Version**: 2.0.0  
**Last Updated**: January 3, 2026  
**Status**: ✅ Production Ready
