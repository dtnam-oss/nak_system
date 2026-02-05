# Telegram Bot Schema Compatibility Report

**Date:** February 5, 2026  
**Status:** ⚠️ Needs Updates

## 🔍 Issues Found

### Issue 1: Inconsistent Data Type Handling

**Problem:**
- Database schema declares `doanh_thu` and `so_km_theo_odo` as NUMERIC
- But actual data may contain TEXT values (empty strings, invalid numbers)
- Main API `/api/reconciliation/route.ts` handles this with CASE WHEN
- **Telegram bot handlers do NOT handle this** → potential errors

**Evidence:**
```sql
-- Main API (CORRECT) ✅
SELECT 
  CASE
    WHEN doanh_thu::TEXT IS NULL OR doanh_thu::TEXT = '' THEN 0
    WHEN doanh_thu::TEXT !~ '^-?[0-9]*\.?[0-9]+$' THEN 0
    ELSE doanh_thu::NUMERIC
  END as doanh_thu
FROM chuyen_di

-- Telegram Handlers (INCORRECT) ❌
SELECT 
  CAST(doanh_thu AS NUMERIC) as "tongDoanhThu"  -- Will fail on invalid data
FROM chuyen_di
```

### Issue 2: Timezone Already Fixed ✅

**Status:** Fixed in previous commit (1be891a)
- `getCurrentDate()` now uses Vietnam timezone (UTC+7)
- `getCurrentMonth()` now uses Vietnam timezone (UTC+7)

## 📝 Files Needing Updates

### High Priority

1. **lib/telegram/handlers/dashboard.ts**
   - Line 58-64: `handleDashboardToday` - CAST doanh_thu
   - Line 102-109: `handleDashboardMonth` - CAST doanh_thu  
   - Line 151-158: `handleDashboardTopRoutes` - CAST doanh_thu
   - Line 218-225: `handleDashboardTopDrivers` - CAST doanh_thu
   - Line 289-293: `handleDashboardRevenue` - CAST doanh_thu

2. **lib/telegram/handlers/trips.ts**
   - Line 106-120: `handleSearchCommand` - CAST doanh_thu
   - Line 168-181: `handleTripsToday` - CAST doanh_thu
   - Line 238-242: `handleTripsByCustomer` - CAST doanh_thu
   - Line 290-295: `handleTripsByVehicle` - CAST doanh_thu
   - Line 344-358: `handleTripRefresh` - CAST doanh_thu

3. **lib/telegram/handlers/dashboard.ts**
   - All SUM(so_km_theo_odo) need similar handling

## ✅ Solution Implemented

Created helper file: **lib/telegram/sql-helpers.ts**

```typescript
export const SQL_PARSE_DOANH_THU = `
  CASE
    WHEN doanh_thu::TEXT IS NULL OR doanh_thu::TEXT = '' THEN 0
    WHEN doanh_thu::TEXT !~ '^-?[0-9]*\\.?[0-9]+$' THEN 0
    ELSE doanh_thu::NUMERIC
  END
`;

export const SQL_PARSE_SO_KM = `
  CASE
    WHEN so_km_theo_odo::TEXT IS NULL OR so_km_theo_odo::TEXT = '' THEN 0
    WHEN so_km_theo_odo::TEXT !~ '^-?[0-9]*\\.?[0-9]+$' THEN 0
    ELSE so_km_theo_odo::NUMERIC
  END
`;
```

**Usage Example:**

```typescript
// BEFORE ❌
const result = await sql`
  SELECT 
    CAST(doanh_thu AS NUMERIC) as revenue
  FROM chuyen_di
`;

// AFTER ✅  
import { SQL_PARSE_DOANH_THU } from '../sql-helpers';

const result = await sql`
  SELECT 
    ${sql.unsafe(SQL_PARSE_DOANH_THU)} as revenue
  FROM chuyen_di
`;
```

## 🔄 Migration Steps

### Step 1: Update Dashboard Handlers

Replace all instances of:
```typescript
CAST(doanh_thu AS NUMERIC)
// or
COALESCE(SUM(CAST(doanh_thu AS NUMERIC)), 0)
```

With:
```typescript
COALESCE(SUM(${sql.unsafe(SQL_PARSE_DOANH_THU)}), 0)
```

### Step 2: Update Trips Handlers

Same pattern for all trip queries

### Step 3: Update Distance Queries

Replace:
```typescript
so_km_theo_odo
// or
COALESCE(SUM(so_km_theo_odo), 0)
```

With:
```typescript
COALESCE(SUM(${sql.unsafe(SQL_PARSE_SO_KM)}), 0)
```

### Step 4: Test Each Handler

- [ ] Dashboard Today
- [ ] Dashboard Month
- [ ] Dashboard Top Routes
- [ ] Dashboard Top Drivers
- [ ] Dashboard Revenue
- [ ] Dashboard Distance
- [ ] Trips Search
- [ ] Trips Today
- [ ] Trips By Customer
- [ ] Trips By Vehicle

## 🎯 Expected Results

**Before:**
- Bot may crash on invalid data
- Error: "invalid input syntax for type numeric"
- Inconsistent results

**After:**
- Bot handles invalid data gracefully
- Returns 0 for invalid/empty values
- Consistent with main API behavior
- No crashes

## 📊 Schema Status

### Verified Correct:

✅ **Table Names:**
- `chuyen_di` - Used correctly
- `chi_tiet_chuyen_di` - Used correctly
- `nhan_vien` - Used correctly
- `phuong_tien` - Used correctly
- `nhap_nhien_lieu` - Used correctly
- `xuat_nhien_lieu` - Used correctly

✅ **Field Names:**
- `ma_chuyen_di` - Correct
- `ngay_tao` - Correct (with timezone fix)
- `ten_khach_hang` - Correct
- `ten_tuyen` - Correct
- `ten_tai_xe` - Correct
- `bien_kiem_soat` - Correct
- `doanh_thu` - Correct (needs type handling)
- `so_km_theo_odo` - Correct (needs type handling)

✅ **Timezone:**
- Fixed to use Vietnam timezone (UTC+7)

⚠️ **Data Type Handling:**
- Needs CASE WHEN for NUMERIC fields that may contain TEXT

## 🚀 Recommendation

**Option A: Quick Fix (Recommended)**
- Use the sql-helpers.ts constants
- Update all handlers to use proper CASE WHEN
- Estimated time: 30 minutes
- Risk: Low

**Option B: Database Migration**
- Clean all invalid data in database
- Ensure doanh_thu and so_km_theo_odo are always valid NUMERIC
- Add CHECK constraints
- Estimated time: 2-3 hours
- Risk: Medium (data loss if not careful)

**Recommendation:** Go with **Option A** first, then plan Option B for data cleanup.

---

**Next Steps:**
1. Review this report
2. Decide on fix approach
3. Apply sql-helpers to all handlers
4. Test thoroughly
5. Deploy to production
6. Monitor for errors

**Files to Update:**
- [x] lib/telegram/sql-helpers.ts (created)
- [ ] lib/telegram/handlers/dashboard.ts (20+ lines)
- [ ] lib/telegram/handlers/trips.ts (15+ lines)
- [ ] lib/telegram/handlers/reports.ts (5+ lines)
