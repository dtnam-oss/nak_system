# ✅ UPDATE COMPLETE: Remove license_plate & Display maTuyen

## 📋 Summary of Changes (Commit: bb3b740)

### 🗑️ Part 1: Remove Redundant license_plate Column

**Problem**: 
- `license_plate` column was storing `maChuyenDi` (trip ID)
- This is duplicate data already stored in `order_id` column
- Wastes database storage and adds complexity

**Solution**:
- Created migration SQL to drop `license_plate` column
- Removed all references from code
- Cleaned up related functions

---

### 🔄 Part 2: Update Detail Display to maTuyen

**Problem**:
- Detail table was showing trip ID (`maChuyenDi`) which is repetitive
- User wants to see route code (`maTuyen`) for better identification

**Solution**:
- Updated TripDetailsDialog to display `maTuyen` instead
- Changed column header from "Mã chuyến đi" to "Mã tuyến"
- More meaningful for users tracking routes

---

## 📊 Changes by File

### 1. Database Migration

**File**: [database/004_remove_license_plate_column.sql](database/004_remove_license_plate_column.sql)

```sql
-- Drop license_plate column
ALTER TABLE reconciliation_orders
DROP COLUMN IF EXISTS license_plate;
```

**Action Required**: Run this migration on Vercel Postgres

---

### 2. Backend API - Webhook Handler

**File**: [app/api/webhook/appsheet/route.ts](app/api/webhook/appsheet/route.ts)

**Removed**:
```typescript
// ❌ Removed interface field
interface NormalizedPayload {
  licensePlate: string;  // DELETED
}

// ❌ Removed function
function extractLicensePlate(payload, details): string {
  // ... DELETED
}

// ❌ Removed from SQL
INSERT INTO reconciliation_orders (
  license_plate,  // DELETED
  ...
)
```

**Result**: Cleaner code, no unnecessary license plate extraction

---

### 3. Backend API - Reconciliation

**File**: [app/api/reconciliation/route.ts](app/api/reconciliation/route.ts)

**Changed**:
```typescript
// BEFORE
SELECT
  license_plate,  // ❌ Removed
  ...
FROM reconciliation_orders

// Map to frontend
soXe: row.license_plate || '',  // ❌ Removed

// AFTER
SELECT
  // license_plate removed
  ...
FROM reconciliation_orders

// Map to frontend
soXe: '',  // ✅ Empty (no data source)
```

**Result**: No longer queries non-existent column

---

### 4. Frontend - TripDetailsDialog

**File**: [components/reconciliation/TripDetailsDialog.tsx](components/reconciliation/TripDetailsDialog.tsx)

**Desktop Table**:
```tsx
// BEFORE
<th>Mã chuyến đi</th>
<td>{item.maChuyenDi || "-"}</td>

// AFTER
<th>Mã tuyến</th>
<td>{item.maTuyen || "-"}</td>
```

**Mobile Cards**:
```tsx
// BEFORE
<Badge>{item.maChuyenDi || "-"}</Badge>

// AFTER
<Badge>{item.maTuyen || "-"}</Badge>
```

**Result**: Users see route code instead of trip ID

---

### 5. TypeScript Interfaces

**File**: [types/reconciliation.ts](types/reconciliation.ts)

**ReconciliationDatabaseRow**:
```typescript
// BEFORE
interface ReconciliationDatabaseRow {
  license_plate: string  // ❌ Removed
  ...
}

// AFTER
interface ReconciliationDatabaseRow {
  // license_plate removed
  ...
}
```

**ChiTietLoTrinh**:
```typescript
// BEFORE
interface ChiTietLoTrinh {
  maChuyenDi: string  // ❌ Removed
  maTuyen: string
  ...
}

// AFTER
interface ChiTietLoTrinh {
  maTuyen: string  // ✅ Only route code
  ...
}
```

---

### 6. GAS Configuration

**File**: [backend-gas/Config.gs](backend-gas/Config.gs)

```javascript
// BEFORE
DETAIL_COLUMNS: {
  'ma_chuyen_di': 'maChuyenDi',  // ❌ Removed
  'ma_chuyen_di_kh': 'maTuyen',
  ...
}

// AFTER
DETAIL_COLUMNS: {
  'ma_chuyen_di_kh': 'maTuyen',  // ✅ Only route code
  ...
}
```

**Result**: No longer sends unused maChuyenDi in detail records

---

## 🎯 Visual Comparison

### BEFORE (Old Display)
```
┌─────────┬───────────────────────────┬──────────┐
│ Thứ tự  │ Mã chuyến đi              │ Lộ trình │
├─────────┼───────────────────────────┼──────────┤
│   1     │ NAKfff79d8e-7528-42f1... │ HCM - HN │
│   2     │ NAKfff79d8e-7528-42f1... │ HN - DN  │
└─────────┴───────────────────────────┴──────────┘
```
❌ Shows same trip ID for all details (repetitive)

### AFTER (New Display)
```
┌─────────┬──────────────┬────────────────────────────┐
│ Thứ tự  │ Mã tuyến     │ Lộ trình                   │
├─────────┼──────────────┼────────────────────────────┤
│   1     │ Ca 12h 5T    │ HCM -> Bưu Cục TDP 1 -> HCM│
│   2     │ Ca 14h 3T    │ HN -> Warehouse A -> HN    │
└─────────┴──────────────┴────────────────────────────┘
```
✅ Shows unique route code for each detail (more meaningful)

---

## 🚀 Deployment Steps

### Step 1: Run Database Migration

```bash
# Connect to Vercel Postgres
psql "postgres://user:pass@host/db"

# Run migration
\i database/004_remove_license_plate_column.sql

# Verify column is gone
\d reconciliation_orders
```

**Or using Vercel Dashboard**:
1. Go to Vercel Dashboard → Storage → Postgres
2. Click "Query" tab
3. Copy content of `004_remove_license_plate_column.sql`
4. Click "Run"

---

### Step 2: Verify Frontend (Auto-deployed)

Frontend code already deployed to Vercel automatically:
- ✅ API routes updated
- ✅ Components updated
- ✅ Types updated

---

### Step 3: Deploy GAS Script

```
1. Open Google Apps Script Editor
2. Click "Deploy" → "Manage deployments"
3. Click Edit ✏️
4. Version: "New version"
5. Description: "Remove maChuyenDi from DETAIL_COLUMNS"
6. Click "Deploy"
```

---

### Step 4: Test End-to-End

```
1. Create/edit a trip in AppSheet
2. Wait for webhook sync (5-10 seconds)
3. Open Reconciliation page
4. Click "Xem chi tiết" on any trip
5. Verify "Chi tiết lộ trình" table shows:
   - Column header: "Mã tuyến" ✅
   - Data: Route code (e.g., "Ca 12h 5T") ✅
   - NOT trip ID ✅
```

---

## 🔍 Verification Queries

### Check license_plate column is gone

```sql
-- Should return NO rows with license_plate
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'reconciliation_orders' 
  AND column_name = 'license_plate';
```

### Check detail data has maTuyen

```sql
-- Should show maTuyen field in chiTietLoTrinh
SELECT 
  order_id,
  details->'chiTietLoTrinh'->0->>'maTuyen' as ma_tuyen,
  details->'chiTietLoTrinh'->0->>'loTrinh' as lo_trinh
FROM reconciliation_orders
WHERE details IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;
```

**Expected Output**:
```
order_id           | ma_tuyen    | lo_trinh
-------------------+-------------+---------------------------
NAKfff79d8e...     | Ca 12h 5T   | HCM -> Bưu Cục TDP 1 -> HCM
```

---

## 📝 Rollback Instructions (If Needed)

### To restore license_plate column:

```sql
BEGIN;

-- Re-add column
ALTER TABLE reconciliation_orders
ADD COLUMN license_plate VARCHAR(50);

-- Populate with order_id (same as before)
UPDATE reconciliation_orders
SET license_plate = order_id;

COMMIT;
```

**Note**: Not recommended unless critical issue found.

---

## ✅ Benefits

1. **Database**:
   - Reduced storage (removed redundant column)
   - Faster queries (one less column to scan)
   - Simpler schema

2. **Code**:
   - Removed unnecessary `extractLicensePlate()` function
   - Cleaner `NormalizedPayload` interface
   - Less code to maintain

3. **User Experience**:
   - More meaningful data in detail table
   - Route codes easier to identify than long trip IDs
   - Better visual clarity

---

## 🐛 Common Issues

### Issue 1: "column license_plate does not exist" error

**Symptom**: API throwing SQL errors

**Cause**: Frontend deployed before database migration

**Solution**: Run database migration immediately

---

### Issue 2: Detail table shows "-" in Mã tuyến column

**Symptom**: Empty values in route code column

**Causes**:
- GAS script not redeployed
- Sheet doesn't have `ma_chuyen_di_kh` column
- Old data without maTuyen field

**Solutions**:
1. Redeploy GAS script
2. Verify sheet has `ma_chuyen_di_kh` column
3. Re-sync trips from AppSheet

---

### Issue 3: soXe shows empty in Thông tin chung

**Symptom**: Vehicle number shows empty string

**This is expected**: 
- We removed license_plate data source
- soXe now returns empty string
- If vehicle info needed, must add new field/column

---

## 📚 Related Files

- [database/004_remove_license_plate_column.sql](database/004_remove_license_plate_column.sql)
- [app/api/webhook/appsheet/route.ts](app/api/webhook/appsheet/route.ts)
- [app/api/reconciliation/route.ts](app/api/reconciliation/route.ts)
- [components/reconciliation/TripDetailsDialog.tsx](components/reconciliation/TripDetailsDialog.tsx)
- [types/reconciliation.ts](types/reconciliation.ts)
- [backend-gas/Config.gs](backend-gas/Config.gs)

---

## 📞 Summary

| Item | Status |
|------|--------|
| Code changes | ✅ Committed (bb3b740) |
| Frontend deploy | ✅ Auto-deployed by Vercel |
| Database migration | ⏳ **Action required** |
| GAS deployment | ⏳ **Action required** |
| Documentation | ✅ Updated |

---

**Status**: ✅ Code ready, migration pending  
**Date**: December 31, 2025  
**Commit**: bb3b740
