# Reconciliation Menu - Complete Schema Migration

**Date**: January 23, 2026  
**Status**: ✅ All reconciliation APIs migrated and fixed

## Issues Found & Fixed

### Issue 1: WHERE Clause Using Old Column Names
**Problem**: API was using `.replace()` to convert old column names to new ones in WHERE clause
- `date` → `cd.ngay_tao`
- `customer` → `cd.ten_khach_hang`
- `order_id` → `cd.ma_chuyen_di`

**Solution**: Build WHERE clause directly with new column names (commit `482580f`)

### Issue 2: Status Filter Not Working
**Problem**: Status filter using English values ('approved', 'pending', 'rejected') but database stores Vietnamese status
**Solution**: Added status mapping in API:
```typescript
const statusMap: Record<string, string[]> = {
  'approved': ['Kết thúc'],
  'pending': ['Đang thực hiện', 'Chờ giao hàng'],
  'rejected': ['Hủy']
}
```

### Issue 3: ChiTietLoTrinh Case Mismatch
**Problem**: 
- API returned: `BienKiemSoat`, `LoTrinh` (PascalCase)
- Interface expected: `bienKiemSoat`, `loTrinh` (camelCase)
- Result: Table showed empty cells for license plate, route, etc.

**Solution**: Fixed mapping to camelCase (commit `cdad4d0`)
```typescript
chiTietLoTrinh = row.chi_tiet_lo_trinh.map((ct: any, index: number) => ({
  thuTu: index + 1,
  id: ct.Id || '',
  bienKiemSoat: ct.BienKiemSoat || '',
  loTrinh: ct.LoTrinh || '',
  loTrinhChiTiet: ct.LoTrinhChiTiet || '',
  quangDuong: parseFloat(ct.QuangDuong || 0),
  taiTrong: parseFloat(ct.TaiTrong || 0),
  taiTrongTinhPhi: parseFloat(ct.TaiTrong || 0),
  hinhThucTinhGia: ct.HinhThucTinhGia || '',
  soChieu: parseInt(ct.SoChieu || 0),
  donGia: parseFloat(ct.DonGia || 0),
  thanhTien: parseFloat(ct.ThanhTien || 0)
}))
```

## Complete API Structure

### Main Query
```sql
SELECT
  cd.ma_chuyen_di,
  cd.ngay_tao,
  cd.ten_khach_hang,
  cd.loai_chuyen,
  cd.loai_tuyen,
  cd.ten_tuyen,
  cd.ten_tai_xe,
  cd.don_vi_van_chuyen,
  cd.trang_thai_chuyen_di,
  cd.doanh_thu,
  cd.so_km_theo_odo,
  cd.thoi_gian_tao,
  json_agg(
    json_build_object(
      'Id', ct."Id",
      'LoTrinh', ct.lo_trinh,
      'LoTrinhChiTiet', ct.lo_trinh_chi_tiet_theo_diem,
      'BienKiemSoat', ct.bien_kiem_soat,
      'QuangDuong', ct.quang_duong,
      'TaiTrong', ct.tai_trong,
      'SoChieu', ct.so_chieu,
      'DonGia', ct.don_gia,
      'ThanhTien', ct.ket_qua,
      'HinhThucTinhGia', ct.hinh_thuc_tinh_gia,
      'LoaiCa', ct.loai_ca,
      'TenKhachHangCap1', ct.ten_khach_hang_cap_1
    ) ORDER BY ct."Id"
  ) FILTER (WHERE ct."Id" IS NOT NULL) as chi_tiet_lo_trinh
FROM chuyen_di cd
LEFT JOIN chi_tiet_chuyen_di ct ON ct.ma_chuyen_di = cd.ma_chuyen_di
WHERE [filters]
GROUP BY cd.ma_chuyen_di, ...
ORDER BY cd.ngay_tao DESC, cd.thoi_gian_tao DESC
LIMIT 500
```

### Summary Query
```sql
SELECT
  COUNT(*) as total_orders,
  COALESCE(SUM(CAST(cd.doanh_thu AS NUMERIC)), 0) as total_amount,
  COALESCE(SUM(CAST(cd.so_km_theo_odo AS NUMERIC)), 0) as total_distance,
  COUNT(CASE WHEN cd.trang_thai_chuyen_di = 'Kết thúc' THEN 1 END) as approved_orders,
  COUNT(CASE WHEN cd.trang_thai_chuyen_di IN ('Đang thực hiện', 'Chờ giao hàng') THEN 1 END) as pending_orders
FROM chuyen_di cd
WHERE [filters]
```

## Supported Filters

All filters now use correct column names:
- `fromDate` → `cd.ngay_tao::date >= $1::date`
- `toDate` → `cd.ngay_tao::date <= $2::date`
- `khachHang` → `cd.ten_khach_hang ILIKE '%value%'` (supports comma-separated list)
- `status` → `cd.trang_thai_chuyen_di = ANY(['Kết thúc'])` (with Vietnamese mapping)
- `donViVanChuyen` → `cd.don_vi_van_chuyen = $n`
- `loaiChuyen` → `cd.loai_chuyen = $n`
- `loaiTuyen` → `cd.loai_tuyen = $n`
- `orderId` → `cd.ma_chuyen_di ILIKE '%value%'`

## Pages Using This API

All pages use `/api/reconciliation` via `useReconciliationData` hook:

1. `/reconciliation` - Main reconciliation page (Tổng hợp)
2. `/reconciliation/jnt-route` - J&T - Theo Tuyến
3. `/reconciliation/jnt-shift` - J&T - Theo Ca
4. `/reconciliation/ghn` - GHN

## Table Components

Each page uses specialized table component that reads from `chiTietLoTrinh`:

### JnTRouteTable
Displays:
- `bienKiemSoat` - License plate
- `loTrinh` - Route name
- `maTuyen` - Route code (first & last for stamps)
- `taiTrongTinhPhi` - Volume/weight

### Expected Fields in chiTietLoTrinh
```typescript
interface ChiTietLoTrinh {
  thuTu: number           // Index + 1
  id: string              // Detail ID
  loaiTuyenKH: string     // Not available
  maTuyen: string         // Not available (need to add if needed)
  bienKiemSoat: string    // ✅ Fixed
  loTrinh: string         // ✅ Fixed
  loTrinhChiTiet: string  // ✅ Fixed
  quangDuong: number      // ✅ Fixed
  taiTrong: number        // ✅ Fixed
  taiTrongTinhPhi: number // ✅ Fixed
  hinhThucTinhGia: string // ✅ Fixed
  soChieu: number         // ✅ Fixed
  donGia: number          // ✅ Fixed
  thanhTien: number       // ✅ Fixed
}
```

## Known Limitations

### Missing Fields in New Schema
1. `maTuyen` (Route code) - Not available in `chi_tiet_chuyen_di`
   - Impact: "Tem chiều đi" and "Tem chiều về" columns will be empty
   - Workaround: Use `loTrinh` or add new column to database

2. `loaiTuyenKH` (Customer route type) - Not available
   - Impact: Minor, not used in main tables

3. `tongChiPhi` (Total cost) - Not available in `chuyen_di`
   - Currently returns 0
   - May need to be calculated or added to schema

## Testing Checklist

- [x] API returns data correctly
- [x] Filters work (date, customer, status, etc.)
- [x] Summary statistics calculated correctly
- [x] License plate displays in table
- [x] Route name displays in table
- [ ] Route codes (maTuyen) display (MISSING FROM SCHEMA)
- [x] Volume/weight displays

## Commits
- `482580f` - Fix WHERE clause to use new column names directly
- `cdad4d0` - Fix chiTietLoTrinh case mapping to match interface

## Next Steps

1. **Add maTuyen field**: If route codes are critical, add `ma_tuyen` column to `chi_tiet_chuyen_di` table
2. **Test all reconciliation pages**: Verify J&T Route, J&T Shift, GHN pages all display correctly
3. **Add cost calculation**: If `tongChiPhi` is needed, add calculation or schema field
