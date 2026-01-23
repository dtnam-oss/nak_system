# API Migration Complete ✅

**Date**: January 23, 2026  
**Status**: All APIs migrated to new database schema

## Overview

Successfully migrated all API routes from old Neon database (reconciliation_orders with JSONB) to new self-hosted PostgreSQL database (normalized tables: chuyen_di, chi_tiet_chuyen_di, nhap_nhien_lieu, xuat_nhien_lieu).

## Database Connection

**Fixed in**: `lib/db.ts`
- Hardcoded connection to self-hosted PostgreSQL: `163.223.12.189:5432/nak_vn`
- Bypasses Vercel environment variables (which point to old Neon DB)

## APIs Fixed

### ✅ Dashboard APIs
- [x] `/api/dashboard/telegram-stats` - All 4 queries (analytics, status, partner, customer)
- [x] `/api/dashboard/stats` - Rewritten but not used by frontend

### ✅ Reconciliation APIs
- [x] `/api/reconciliation/route.ts` - Main data endpoint with 13 chi_tiet fields
- [x] `/api/reconciliation-v2/route.ts` - Fixed ct.thanh_tien → ct.ket_qua
- [x] `/api/reconciliation/export/route.ts` - Query + all filters (date, customer, provider)

### ✅ Fuel APIs
- [x] `/api/fuel/transactions/route.ts` - Column mappings (ngay_tao, ten_tai_xe, hang_muc)
- [x] `/api/fuel/inventory/fifo/route.ts` - FIFO calculation with nhap/xuat tables

### ✅ Reports APIs
- [x] `/api/reports/quality-stats/route.ts` - CTE with JOIN
- [x] `/api/reports/analytics/route.ts` - 6 queries + data integrity
- [x] `/api/reports/trips/route.ts` - Detailed trip list
- [x] `/api/reports/smart-query/route.ts` - Advanced filtering with pagination

### ✅ Other APIs
- [x] `/api/vehicles/route-history/route.ts` - License plate search in chi_tiet
- [x] `/api/telegram/cron/send-reports/route.ts` - 7 analytics queries

### ⏭️ Skipped APIs
- `/api/webhook/appsheet/route.ts` - Not needed (AppSheet connects directly to DB)

## Schema Mappings Applied

### Table Names
```
reconciliation_orders → chuyen_di + chi_tiet_chuyen_di
fuel_imports → nhap_nhien_lieu
fuel_transactions → xuat_nhien_lieu
vehicles → phuong_tien
```

### Column Names (chuyen_di)
```
date → ngay_tao
customer → ten_khach_hang
order_id → ma_chuyen_di
route_name → ten_tuyen
status → trang_thai_chuyen_di
provider → don_vi_van_chuyen
trip_type → loai_chuyen
driver_name → ten_tai_xe
cost → chi_phi
revenue → doanh_thu
total_distance → so_km_theo_odo
created_at → thoi_gian_tao
```

### Column Names (chi_tiet_chuyen_di)
```
id → "Id" (quoted, capital I)
thanh_tien → ket_qua
diem_lay_hang → lo_trinh
diem_tra_hang → lo_trinh_chi_tiet_theo_diem
bienKiemSoat → bien_kiem_soat
```

### Column Names (xuat_nhien_lieu)
```
transaction_date → ngay_tao
quantity → so_luong
fuel_source → nguon_nhien_lieu
driver_name → ten_tai_xe
category → hang_muc
created_at → thoi_gian_tao
```

### Column Names (nhap_nhien_lieu)
```
import_date → ngay_tao
quantity → so_luong
unit_price → don_gia
avg_price → don_gia_binh_quan
created_at → thoi_gian_tao
```

## Key Technical Changes

### 1. JSONB to Normalized JOIN
**Before** (Old Schema):
```sql
SELECT 
  order_id,
  details->'chiTietLoTrinh' as chi_tiet
FROM reconciliation_orders
```

**After** (New Schema):
```sql
SELECT 
  cd.ma_chuyen_di,
  json_agg(json_build_object(
    'Id', ct."Id",
    'bienKiemSoat', ct.bien_kiem_soat,
    'ketQua', ct.ket_qua
  )) as chi_tiet
FROM chuyen_di cd
LEFT JOIN chi_tiet_chuyen_di ct ON cd.ma_chuyen_di = ct.ma_chuyen_di
GROUP BY cd.ma_chuyen_di
```

### 2. Date Filtering
**Before**: `WHERE date >= $1`  
**After**: `WHERE ngay_tao::date >= $1::date`

### 3. Search Filters
**Before**: `WHERE customer ILIKE '%value%'`  
**After**: `WHERE ten_khach_hang ILIKE '%value%'`

### 4. Status Columns
**Before**: `WHERE status = 'Hoàn thành'`  
**After**: `WHERE trang_thai_chuyen_di = 'Hoàn thành'`

### 5. License Plate Lookup
**Before**: JSONB array search in details column  
**After**: Direct JOIN on chi_tiet_chuyen_di table

## Testing Checklist

- [x] Dashboard loads data correctly
- [ ] Reconciliation page shows trip list
- [ ] Reports menu (Quality Stats, Analytics, Trips, Smart Query)
- [ ] Export function works with filters
- [ ] Fuel inventory shows correct FIFO calculation
- [ ] Vehicle route history displays trips
- [ ] Telegram cron sends reports

## Deployment Status

- **Repository**: https://github.com/dtnam-oss/nak_system
- **Commits**: 
  - `bda69e1` - Fix remaining APIs (vehicles, telegram, export, fifo)
  - `9f3e3ce` - Fix smart-query license_plate mapping
  - Previous commits for dashboard, reconciliation, fuel, reports

## Next Steps

1. **Test all pages in production** - Verify data loads correctly
2. **Monitor Vercel logs** - Check for any database errors
3. **Update documentation** - Mark old schema docs as deprecated
4. **Remove old table references** - Clean up webhook/appsheet if not needed

## Notes

- ⚠️ AppSheet now connects directly to database - webhook APIs no longer needed
- ⚠️ All environment variables bypassed in lib/db.ts (hardcoded connection)
- ⚠️ Old Neon database tables still exist but are not used by application
- ✅ All API routes now query self-hosted PostgreSQL at 163.223.12.189

## Support

If you encounter any issues:
1. Check Vercel deployment logs
2. Verify database connection at 163.223.12.189:5432
3. Confirm table schema matches mappings above
4. Review API response in browser DevTools Network tab
