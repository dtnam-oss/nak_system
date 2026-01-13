# 📋 Sample CSV Data for Testing

## Sample Master File (chuyen_di.csv)

```csv
ma_chuyen_di,ngay_tao,khach_hang,loai_chuyen_di,loai_tuyen,tuyen,tai_xe,nha_cung_cap,tong_quang_duong,tong_chi_phi,tong_doanh_thu,trang_thai,tai_trong,ghi_chu
NAK001,01/12/2025,Customer A,Type 1,Route Type 1,Route Name 1,Driver 1,Provider 1,250,3500000,5000000,Completed,10.5,Test note 1
NAK002,01/12/2025,Customer B,Type 2,Route Type 2,Route Name 2,Driver 2,Provider 2,180,2800000,4200000,Completed,8.0,Test note 2
NAK003,02/12/2025,Customer C,Type 1,Route Type 1,Route Name 3,Driver 1,Provider 1,300,4200000,6000000,Completed,12.0,
```

## Sample Detail File (chi_tiet_chuyen_di.csv)

```csv
Id,ma_chuyen_di,loai_tuyen_khach_hang,lo_trinh,lo_trinh_chi_tiet_theo_diem,ma_chuyen_di_kh,bien_kiem_soat,tai_trong,tai_trong_tinh_phi,quang_duong,so_chieu,don_gia,thanh_tien,loai_ca,hinh_thuc_tinh_gia,ngay_tren_tem,ten_khach_hang_cap_1
DETAIL001,NAK001,Type A,Route A,Point 1 - Point 2,CUST001,51A-12345,10.5,10.0,250,1,20000,5000000,Ca 1,Theo tuyến,01/12/2025,Customer A
DETAIL002,NAK002,Type B,Route B,Point 3 - Point 4,CUST002,51B-67890,8.0,8.0,180,1,23000,4140000,Ca 2,Theo tuyến,01/12/2025,Customer B
DETAIL003,NAK003,Type A,Route C,Point 5 - Point 6,CUST003,51C-11111,12.0,12.0,300,1,20000,6000000,Ca 1,Theo tuyến,02/12/2025,Customer C
```

## How to Test

### 1. Create Sample Files

```bash
cd scripts/csv-import/data/input

# Create chuyen_di.csv
cat > chuyen_di.csv << 'EOF'
ma_chuyen_di,ngay_tao,khach_hang,loai_chuyen_di,loai_tuyen,tuyen,tai_xe,nha_cung_cap,tong_quang_duong,tong_chi_phi,tong_doanh_thu,trang_thai,tai_trong,ghi_chu
NAK001,01/12/2025,Customer A,Type 1,Route Type 1,Route Name 1,Driver 1,Provider 1,250,3500000,5000000,Completed,10.5,Test note 1
NAK002,01/12/2025,Customer B,Type 2,Route Type 2,Route Name 2,Driver 2,Provider 2,180,2800000,4200000,Completed,8.0,Test note 2
NAK003,02/12/2025,Customer C,Type 1,Route Type 1,Route Name 3,Driver 1,Provider 1,300,4200000,6000000,Completed,12.0,
EOF

# Create chi_tiet_chuyen_di.csv
cat > chi_tiet_chuyen_di.csv << 'EOF'
Id,ma_chuyen_di,loai_tuyen_khach_hang,lo_trinh,lo_trinh_chi_tiet_theo_diem,ma_chuyen_di_kh,bien_kiem_soat,tai_trong,tai_trong_tinh_phi,quang_duong,so_chieu,don_gia,thanh_tien,loai_ca,hinh_thuc_tinh_gia,ngay_tren_tem,ten_khach_hang_cap_1
DETAIL001,NAK001,Type A,Route A,Point 1 - Point 2,CUST001,51A-12345,10.5,10.0,250,1,20000,5000000,Ca 1,Theo tuyến,01/12/2025,Customer A
DETAIL002,NAK002,Type B,Route B,Point 3 - Point 4,CUST002,51B-67890,8.0,8.0,180,1,23000,4140000,Ca 2,Theo tuyến,01/12/2025,Customer B
DETAIL003,NAK003,Type A,Route C,Point 5 - Point 6,CUST003,51C-11111,12.0,12.0,300,1,20000,6000000,Ca 1,Theo tuyến,02/12/2025,Customer C
EOF
```

### 2. Run Validation

```bash
cd scripts/csv-import
npm install
npm run validate
```

**Expected Output:**
```
📖 READING CSV FILES
✅ Found 3 master records
✅ Found 3 detail records

✅ VALIDATING DATA
✅ All validations passed!

📊 Statistics:
  Total details: 3
  Avg details per trip: 1.00
```

### 3. Generate SQL

```bash
npm run transform
```

**Check Output:**
```bash
cat data/output/import.sql
```

**Expected:** SQL file with 3 INSERT statements

### 4. Test Direct Import (Optional)

```bash
# Set database URL (test database recommended)
export DATABASE_URL="postgres://..."

# Run import
npm run import
```

**Expected Output:**
```
💾 IMPORTING TO DATABASE
  Processing batch 1/1: 1-3/3
✅ Import complete in 0.5s
   Inserted: 3/3

🔍 Verifying import...
✅ Verification passed: 3/3 records found
```

## Test Cases

### Test 1: Valid Data ✅

Use sample data above.

**Expected:** All pass

### Test 2: Missing Required Field ❌

Edit `chuyen_di.csv`:
```csv
ma_chuyen_di,ngay_tao,khach_hang,...
,01/12/2025,Customer A,...  ← Empty order ID
```

**Expected:**
```
❌ Found 1 errors:
  Row 2: [UNKNOWN] Missing order ID (ma_chuyen_di)
```

### Test 3: Invalid Date Format ⚠️

Edit `chuyen_di.csv`:
```csv
ma_chuyen_di,ngay_tao,...
NAK001,invalid-date,...
```

**Expected:** Date formatted as empty string, validation warning

### Test 4: Orphaned Detail ⚠️

Edit `chi_tiet_chuyen_di.csv`:
```csv
Id,ma_chuyen_di,...
DETAIL999,NAK999,...  ← References non-existent trip
```

**Expected:**
```
❌ Found 1 errors:
  Row 2: [NAK999] Detail references non-existent trip: NAK999
```

### Test 5: Duplicate Order ID ❌

Edit `chuyen_di.csv`:
```csv
ma_chuyen_di,...
NAK001,...
NAK001,...  ← Duplicate
```

**Expected:**
```
❌ Found 1 errors:
  Row 3: [NAK001] Duplicate order ID. First occurrence at row 2
```

### Test 6: Vietnamese Number Format ✅

Edit `chuyen_di.csv`:
```csv
tong_chi_phi,tong_doanh_thu
3.500.000,5.000.000  ← Vietnamese format with dots
```

**Expected:** Correctly parsed as 3500000, 5000000

### Test 7: DateTime String ✅

Edit `chi_tiet_chuyen_di.csv`:
```csv
ngay_tren_tem
01/12/2025 01:30:00  ← DateTime with time
```

**Expected:** Formatted as 2025-12-01 (time stripped)

## Verification Queries

After import, verify data:

```sql
-- Check records imported
SELECT COUNT(*) FROM reconciliation_orders;
-- Expected: 3

-- Check specific record
SELECT
  order_id,
  date,
  customer,
  revenue,
  details->'chiTietLoTrinh'->0->>'id' as first_detail_id
FROM reconciliation_orders
WHERE order_id = 'NAK001';

-- Expected:
-- order_id: NAK001
-- date: 2025-12-01
-- customer: Customer A
-- revenue: 5000000
-- first_detail_id: DETAIL001

-- Check JSONB details
SELECT
  order_id,
  jsonb_array_length(details->'chiTietLoTrinh') as detail_count
FROM reconciliation_orders;

-- Expected:
-- NAK001: 1
-- NAK002: 1
-- NAK003: 1
```

## Performance Test

For larger datasets:

```bash
# Generate 1000 sample records
node generate-sample.js 1000

# Run import
time npm run import

# Expected: < 10 seconds
```

---

**Created:** 2026-01-13
**Purpose:** Testing & validation
**Status:** ✅ Ready for testing
