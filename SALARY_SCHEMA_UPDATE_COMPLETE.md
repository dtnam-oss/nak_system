# ✅ Salary Schema Update Complete

## Summary
Updated all salary endpoints and components to use the final database schema with calculated fields.

## Schema Changes

### Old Schema (13 fields)
- `phong_ban` (removed)
- `tra_tai_xe` (removed - replaced by calculated field)

### New Schema (18 fields)
**Employee Info:**
- ma_nhan_vien
- ten_nhan_vien
- chuc_vu
- **email** (new - replaces phong_ban)
- thang
- nam

**Thu nhập (5 income fields):**
1. luong_bat_dau
2. tong_chi_phi_sua_chua
3. hoan_coc
4. chi_phi_do_dau_ngoai
5. chi_phi_phat_sinh_new

**Khấu trừ (10 deduction fields):**
1. truy_thu_dau
2. truy_thu_ontime
3. tru_coc
4. tam_ung
5. phat_che_tai
6. truy_thu_vetc
7. phat_nguoi
8. tien_lam_the
9. bhxh
10. khac

**Calculated Fields (3 - stored in database):**
- **tong_thu_nhap** = sum of 5 income fields
- **tong_khau_tru** = sum of 10 deduction fields
- **luong_thuc_lanh** = tong_thu_nhap - tong_khau_tru

## Files Updated

### 1. API Endpoints

#### CREATE Endpoint
**File:** `app/api/salary/luong-tong-hop/create/route.ts`

**Changes:**
- Updated SELECT to fetch `email` instead of `phong_ban`
- Updated INSERT to include all 18 fields
- All input fields initialized to 0 for new records
- All calculated fields initialized to 0 for new records

**SQL:**
```sql
INSERT INTO luong_tong_hop (
  id, ma_nhan_vien, ten_nhan_vien, chuc_vu, email, thang, nam,
  luong_bat_dau, tong_chi_phi_sua_chua, hoan_coc, chi_phi_do_dau_ngoai, chi_phi_phat_sinh_new,
  truy_thu_dau, truy_thu_ontime, tru_coc, tam_ung, phat_che_tai, 
  truy_thu_vetc, phat_nguoi, tien_lam_the, bhxh, khac,
  tong_thu_nhap, tong_khau_tru, luong_thuc_lanh
) VALUES (...)
```

#### GET Endpoint
**File:** `app/api/salary/luong-tong-hop/route.ts`

**Changes:**
- Updated SELECT to return all 18 fields
- Added COALESCE for backwards compatibility: `COALESCE(luong_thuc_lanh, tra_tai_xe, 0)`
- Updated data processing to parse calculated fields

**SQL:**
```sql
SELECT 
  id, ma_nhan_vien, ten_nhan_vien, chuc_vu, email, thang, nam,
  luong_bat_dau, tong_chi_phi_sua_chua, hoan_coc, chi_phi_do_dau_ngoai, chi_phi_phat_sinh_new,
  truy_thu_dau, truy_thu_ontime, tru_coc, tam_ung, phat_che_tai,
  truy_thu_vetc, phat_nguoi, tien_lam_the, bhxh, khac,
  COALESCE(tong_thu_nhap, 0) as tong_thu_nhap,
  COALESCE(tong_khau_tru, 0) as tong_khau_tru,
  COALESCE(luong_thuc_lanh, tra_tai_xe, 0) as luong_thuc_lanh
FROM luong_tong_hop
WHERE thang = $1 AND nam = $2
ORDER BY ma_nhan_vien
```

#### PATCH Endpoint
**File:** `app/api/salary/luong-tong-hop/[id]/route.ts`

**Changes:**
- Updated to calculate and store all 3 calculated fields
- Server-side calculation ensures data consistency
- Calculations done in SQL UPDATE statement

**Calculation Logic:**
```javascript
// Calculate server-side
tong_thu_nhap = 
  (luong_bat_dau || 0) +
  (tong_chi_phi_sua_chua || 0) +
  (hoan_coc || 0) +
  (chi_phi_do_dau_ngoai || 0) +
  (chi_phi_phat_sinh_new || 0)

tong_khau_tru = 
  (truy_thu_dau || 0) +
  (truy_thu_ontime || 0) +
  (tru_coc || 0) +
  (tam_ung || 0) +
  (phat_che_tai || 0) +
  (truy_thu_vetc || 0) +
  (phat_nguoi || 0) +
  (tien_lam_the || 0) +
  (bhxh || 0) +
  (khac || 0)

luong_thuc_lanh = tong_thu_nhap - tong_khau_tru
```

### 2. UI Components

#### Table Component
**File:** `components/salary/luong-tong-hop-table.tsx`

**Changes:**
- Updated interface: `phong_ban` → `email`, `tra_tai_xe` → calculated fields
- Removed client-side calculation logic
- Now uses `luong_thuc_lanh` from database directly
- Updated summary footer to use `tong_thu_nhap` and `luong_thuc_lanh` from database

**Before:**
```typescript
const thucLanh = record.tra_tai_xe || (tongThuNhap - tongKhauTru);
```

**After:**
```typescript
const thucLanh = record.luong_thuc_lanh || 0;
```

#### Edit Dialog Component
**File:** `components/salary/edit-salary-dialog.tsx`

**Changes:**
- Updated interface to match new schema
- Removed client-side calculation logic
- Display calculated fields from database (read-only)
- Server calculates on save via PATCH endpoint

**Before:**
```typescript
// Client-side calculation
const tongThuNhap = (formData.luong_bat_dau || 0) + ...;
const thucLanh = tongThuNhap - tongKhauTru;
```

**After:**
```typescript
// Display from database
const tongThuNhap = formData.tong_thu_nhap || 0;
const thucLanh = formData.luong_thuc_lanh || 0;
```

#### Page Interface
**File:** `app/salary/page.tsx`

**Changes:**
- Updated LuongTongHopRecord interface
- Added calculated fields: `tong_thu_nhap`, `tong_khau_tru`, `luong_thuc_lanh`
- Replaced `phong_ban` with `email`

## Benefits of Server-Side Calculation

1. **Data Consistency**: All calculations are done server-side ensuring consistent results
2. **Database Integrity**: Calculated fields are stored in database, enabling:
   - Sorting by calculated values
   - Filtering by calculated values
   - Historical data accuracy
3. **Performance**: No need to recalculate on every render
4. **Single Source of Truth**: Database is the authoritative source for all values

## Testing Checklist

- [x] No TypeScript compilation errors
- [ ] Create new salary slips (all fields initialize to 0)
- [ ] Edit salary record (calculated fields update automatically)
- [ ] View salary table (all 18 fields display correctly)
- [ ] Summary footer calculations (use database values)
- [ ] GET API returns all 18 fields
- [ ] PATCH API calculates and stores correctly

## API Test Examples

### Create Salary Slips
```bash
POST http://localhost:3000/api/salary/luong-tong-hop/create
Content-Type: application/json

{
  "thang": 3,
  "nam": 2026
}
```

### Get Salary Records
```bash
GET http://localhost:3000/api/salary/luong-tong-hop?thang=3&nam=2026
```

### Update Salary Record
```bash
PATCH http://localhost:3000/api/salary/luong-tong-hop/[id]
Content-Type: application/json

{
  "luong_bat_dau": 5000000,
  "tong_chi_phi_sua_chua": 500000,
  "truy_thu_dau": 200000,
  "tam_ung": 1000000
}

// Server will auto-calculate:
// tong_thu_nhap = 5,500,000
// tong_khau_tru = 1,200,000
// luong_thuc_lanh = 4,300,000
```

## Migration Notes

- Existing records with old `tra_tai_xe` field are supported via COALESCE
- New records use the calculated fields exclusively
- No manual data migration required
- Backwards compatible with old data structure

## Next Steps

1. Test create functionality in browser
2. Test edit functionality and verify calculations
3. Verify table display with real data
4. Commit and push changes to GitHub
5. Deploy to Vercel

---

**Date:** February 2026  
**Status:** ✅ Complete - Ready for Testing
