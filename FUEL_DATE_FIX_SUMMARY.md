# Fuel Date Format Fix Summary

**Date:** February 7, 2026
**Issue:** Invalid date format showing in fuel transactions UI

---

## 🔍 Root Cause Analysis

### Problem
The fuel transactions page was displaying "Invalid Date" and "1/1/1970" for many rows.

### Investigation Results
1. **Database Analysis:**
   - Total rows in `xuat_nhien_lieu` table: 491
   - Valid rows (with ID and date): 472
   - **Invalid rows (all NULL values): 19**

2. **Database Schema:**
   - `ngay_tao` column is TIMESTAMP type
   - Returns valid ISO 8601 format: `"2026-02-06T17:00:00.000Z"`

3. **Issue Identified:**
   - API was returning ALL rows, including 19 rows with NULL values
   - Frontend `formatDate()` function received `null` values
   - `new Date(null)` in JavaScript produces "Invalid Date"

---

## ✅ Fixes Applied

### 1. Backend API Filters (4 files)

#### [`app/api/fuel/transactions/route.ts`](app/api/fuel/transactions/route.ts)
```diff
  FROM public.xuat_nhien_lieu
+ WHERE id IS NOT NULL AND ngay_tao IS NOT NULL
  ORDER BY ngay_tao DESC, thoi_gian_tao DESC NULLS LAST
```

#### [`app/api/fuel/stats/route.ts`](app/api/fuel/stats/route.ts)
Added `WHERE id IS NOT NULL` filter to 3 queries:
- Total export (internal) query
- Total export (all) query
- Monthly consumption query

#### [`app/api/fuel/inventory/fifo/route.ts`](app/api/fuel/inventory/fifo/route.ts)
```diff
  FROM xuat_nhien_lieu
+ WHERE id IS NOT NULL
+   AND ngay_tao IS NOT NULL
    AND LOWER(TRIM(loai_hinh)) = 'trụ nội bộ'
```

### 2. Frontend Defensive Handling (2 files)

#### [`components/fuel/fuel-transactions-table.tsx`](components/fuel/fuel-transactions-table.tsx)
```typescript
const formatDate = (dateString: string) => {
  if (!dateString) return '-';

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '-';

  return date.toLocaleDateString('vi-VN');
};
```

#### [`components/fuel/fuel-imports-table.tsx`](components/fuel/fuel-imports-table.tsx)
Applied same defensive null check as above.

---

## 🧪 Testing Results

### Query Validation
```bash
✅ Validation:
  - Has NULL dates: ✅ PASS
  - Has NULL ids: ✅ PASS
```

### Date Formatting Test
```
Input:  2026-02-06T17:00:00.000Z
Output: 7/2/2026
Status: ✅ Working correctly
```

---

## 📊 Data Structure Verification

### Current Schema (Confirmed)

Table: `xuat_nhien_lieu`

| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT | Primary key |
| `ngay_tao` | TIMESTAMP | Transaction date |
| `loai_hinh` | TEXT | Fuel source |
| `doi_tuong` | TEXT | Object (NAK/Vendor) |
| `bien_so_xe` | TEXT | License plate |
| `ten_tai_xe` | TEXT | Driver name |
| `loai_nhien_lieu` | TEXT | Fuel type |
| `so_luong` | DOUBLE PRECISION | Quantity |
| `don_gia` | DOUBLE PRECISION | Unit price |
| `thanh_tien` | DOUBLE PRECISION | Total amount |
| `so_odo` | DOUBLE PRECISION | ODO number |
| `trang_thai` | TEXT | Status |
| `hang_muc` | TEXT | Category |
| `thoi_gian_tao` | TIMESTAMP | Created timestamp |
| `nguoi_tao` | TEXT | Created by |

### Schema Compliance
✅ All columns match the expected schema from [DATABASE_SCHEMA_MAPPING.md](DATABASE_SCHEMA_MAPPING.md)

---

## 🎯 Impact

### Before Fix
- ❌ 19 rows showing "Invalid Date"
- ❌ UI displaying 1/1/1970 for NULL dates
- ❌ Confusing user experience

### After Fix
- ✅ Only 472 valid rows returned
- ✅ All dates formatted correctly (e.g., "7/2/2026")
- ✅ NULL values handled gracefully with "-"
- ✅ Stats calculations exclude invalid data

---

## 🔒 Data Cleanup Recommendation

### Optional: Clean up NULL rows in database

```sql
-- BACKUP FIRST!
-- Create backup of table
CREATE TABLE xuat_nhien_lieu_backup AS
SELECT * FROM xuat_nhien_lieu;

-- Delete rows with NULL id (completely empty rows)
DELETE FROM xuat_nhien_lieu
WHERE id IS NULL;

-- Verify
SELECT COUNT(*) FROM xuat_nhien_lieu;  -- Should be 472
SELECT COUNT(*) FROM xuat_nhien_lieu_backup;  -- Should be 491
```

⚠️ **Important:** Only run this cleanup if you're certain these 19 rows are not needed for historical purposes or auditing.

---

## 📝 Files Modified

1. [`app/api/fuel/transactions/route.ts`](app/api/fuel/transactions/route.ts) - Added WHERE filter
2. [`app/api/fuel/stats/route.ts`](app/api/fuel/stats/route.ts) - Added WHERE filters (3 queries)
3. [`app/api/fuel/inventory/fifo/route.ts`](app/api/fuel/inventory/fifo/route.ts) - Added WHERE filter
4. [`components/fuel/fuel-transactions-table.tsx`](components/fuel/fuel-transactions-table.tsx) - Defensive date handling
5. [`components/fuel/fuel-imports-table.tsx`](components/fuel/fuel-imports-table.tsx) - Defensive date handling

---

## ✨ Next Steps

1. ✅ Test the fuel page in the browser
2. ✅ Verify stats calculations are correct
3. ✅ Check FIFO inventory calculations
4. ⏳ (Optional) Clean up NULL rows from database
5. ⏳ Monitor for any new NULL entries (investigate why they're being created)

---

**Fixed by:** Claude Code
**Date:** February 7, 2026
**Status:** ✅ Complete
