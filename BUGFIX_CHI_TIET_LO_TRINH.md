# 🔧 BUG FIX: Chi Tiết Lộ Trình Hiển Thị 0 Values

## 📋 Problem Description

**Issue**: Trip Details dialog showing all zeros (0 km, 0 tấn, 0 đ) for route details

**Root Cause**: Field name mismatch between GAS payload and frontend component
- GAS was sending snake_case fields: `lo_trinh`, `quang_duong`, `tai_trong`
- Frontend expects camelCase fields: `loTrinh`, `quangDuong`, `taiTrong`

## ✅ Solution Implemented

### 1. Updated Config.gs - DETAIL_COLUMNS Mapping

**Changed from snake_case to camelCase:**

```javascript
DETAIL_COLUMNS: {
  // BEFORE (snake_case)
  'lo_trinh': 'lo_trinh',
  'quang_duong': 'quang_duong',
  'tai_trong': 'tai_trong',
  
  // AFTER (camelCase)
  'lo_trinh': 'loTrinh',
  'quang_duong': 'quangDuong',
  'tai_trong': 'taiTrong',
  'ma_tem': 'maTem',
  'don_gia': 'donGia',
  'thanh_tien': 'thanhTien',
  'so_chieu': 'soChieu',
  'tai_trong_tinh_phi': 'taiTrongTinhPhi',
  'hinh_thuc_tinh_gia': 'hinhThucTinhGia',
  'loai_tuyen_khach_hang': 'loaiTuyenKH',
  'ma_chuyen_di_kh': 'maTuyen',
  'bien_kiem_soat': 'bienKiemSoat',
  'ten_khach_hang_cap_1': 'tenKhachHangCap1'
}
```

### 2. Enhanced Code.gs - Added Calculated Fields

**Added to `getDetailData()` function:**

```javascript
// Add thuTu (sequence number)
mappedRow.thuTu = thuTu++;

// Calculate thanhTien if not present
if (!mappedRow.thanhTien || mappedRow.thanhTien === 0) {
  const donGia = parseNumber(mappedRow.donGia);
  const taiTrong = parseNumber(mappedRow.taiTrongTinhPhi || mappedRow.taiTrong);
  const soChieu = parseNumber(mappedRow.soChieu || 1);
  const quangDuong = parseNumber(mappedRow.quangDuong);
  
  if (donGia > 0 && taiTrong > 0) {
    mappedRow.thanhTien = donGia * taiTrong * soChieu;
  } else if (donGia > 0 && quangDuong > 0) {
    mappedRow.thanhTien = donGia * quangDuong * soChieu;
  }
}
```

## 🔍 Field Mapping Reference

### Expected by Frontend (ChiTietLoTrinh Interface)

```typescript
interface ChiTietLoTrinh {
  thuTu: number           // Sequence number (1, 2, 3...)
  id: string              // Unique ID
  loaiTuyenKH: string     // Route type for customer
  maTuyen: string         // Route code (displayed in "Mã tuyến" column)
  loTrinh: string         // Route description
  quangDuong: number      // Distance (km)
  taiTrong: number        // Weight (tons)
  taiTrongTinhPhi: number // Chargeable weight
  hinhThucTinhGia: string // Pricing method
  soChieu: number         // Number of trips
  donGia: number          // Unit price
  thanhTien: number       // Total amount
}
```

### Sheet Column Names (chi_tiet_chuyen_di)

| Sheet Column               | JSON Key (camelCase)  | Type   | Display Column |
|---------------------------|-----------------------|--------|----------------|
| Id                        | id                    | string | -              |
| loai_tuyen_khach_hang     | loaiTuyenKH           | string | Loại tuyến KH  |
| lo_trinh                  | loTrinh               | string | Lộ trình       |
| ma_chuyen_di_kh           | maTuyen               | string | **Mã tuyến**   |
| bien_kiem_soat            | bienKiemSoat          | string | -              |
| tai_trong                 | taiTrong              | number | Tải trọng      |
| quang_duong               | quangDuong            | number | Quãng đường    |
| so_chieu                  | soChieu               | number | -              |
| don_gia                   | donGia                | number | -              |
| thanh_tien                | thanhTien             | number | Thành tiền     |
| tai_trong_tinh_phi        | taiTrongTinhPhi       | number | -              |
| hinh_thuc_tinh_gia        | hinhThucTinhGia       | string | -              |
| ten_khach_hang_cap_1      | tenKhachHangCap1      | string | -              |

## 📊 Data Flow

```
Google Sheet (chi_tiet_chuyen_di)
    ↓
Config.gs (DETAIL_COLUMNS mapping)
    ↓
Code.gs (getDetailData + mapDetailRow)
    ↓ 
    • Add thuTu counter
    • Calculate thanhTien
    ↓
GAS Payload (JSON with camelCase)
    ↓
Webhook Handler (/api/webhook/appsheet)
    ↓
PostgreSQL (details JSONB column)
    ↓
Reconciliation API (/api/reconciliation)
    ↓
Frontend (TripDetailsDialog.tsx)
    ↓
Display correct values ✅
```

## 🚀 Deployment Steps

### Step 1: Deploy Updated GAS Script

```bash
# Option A: Manual deployment
1. Open Google Apps Script editor
2. Click "Deploy" → "Manage deployments"
3. Click Edit (pencil icon) on current deployment
4. Version: "New version"
5. Description: "Fix field mapping for chiTietLoTrinh"
6. Click "Deploy"

# Option B: Using clasp
cd backend-gas
clasp push
clasp deploy --description "Fix field mapping for chiTietLoTrinh"
```

### Step 2: Test with Sample Data

1. Create or edit a trip in AppSheet
2. Ensure chi_tiet_chuyen_di table has records with:
   - quang_duong > 0
   - tai_trong > 0
   - don_gia > 0

3. Check webhook logs in Vercel:
   ```
   [NORMALIZE] Starting payload normalization...
   ```

4. Open Trip Details dialog in frontend
5. Verify all values display correctly (not zeros)

### Step 3: Verify Database

```sql
-- Check details JSONB structure
SELECT 
  order_id,
  details->'chiTietLoTrinh'->0->>'loTrinh' as lo_trinh,
  details->'chiTietLoTrinh'->0->>'quangDuong' as quang_duong,
  details->'chiTietLoTrinh'->0->>'taiTrong' as tai_trong,
  details->'chiTietLoTrinh'->0->>'thanhTien' as thanh_tien
FROM reconciliation_orders
WHERE details IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;
```

Expected result: All fields should have values, not null

## ⚠️ Important Notes

### Why Field Names Must Match

1. **Type Safety**: TypeScript interfaces enforce camelCase
2. **Frontend Parsing**: `TripDetailsDialog.tsx` uses direct property access:
   ```tsx
   {item.quangDuong || 0}  // NOT item.quang_duong
   ```
3. **No Transformation Layer**: Frontend doesn't convert snake_case to camelCase

### Calculation Logic for thanhTien

The script tries multiple formulas in priority order:

1. `donGia × taiTrongTinhPhi × soChieu` (preferred for weight-based pricing)
2. `donGia × quangDuong × soChieu` (fallback for distance-based pricing)
3. `0` (if no valid data available)

### thuTu Counter

- Automatically assigned in sequence (1, 2, 3...)
- Used for display order in frontend table
- Not stored in sheet, generated dynamically

## 🐛 Common Issues

### Issue 1: Still Showing Zeros After Update

**Symptom**: Trip Details dialog still shows 0 values

**Causes**:
- GAS script not redeployed
- Old data in database with snake_case fields
- Sheet columns have empty/null values

**Solutions**:
1. Redeploy GAS script (see Step 1 above)
2. Re-sync trips from AppSheet to update database
3. Check sheet data for actual values

### Issue 2: thanhTien Always Zero

**Symptom**: Amount column shows 0 đ

**Causes**:
- `don_gia` column is empty
- Both `tai_trong` and `quang_duong` are empty
- Values are stored as text, not numbers

**Solutions**:
1. Verify `don_gia` has numeric values
2. Ensure at least one of: `tai_trong_tinh_phi`, `tai_trong`, or `quang_duong` has values
3. Check NUMBER_COLUMNS in Config.gs includes all required fields

### Issue 3: Missing Fields in Dialog

**Symptom**: Some columns show "-" instead of values

**Causes**:
- Column name mismatch in Config.gs
- Sheet column doesn't exist
- Field not included in DETAIL_COLUMNS mapping

**Solutions**:
1. Check sheet has the column (exact name match)
2. Add mapping to Config.gs DETAIL_COLUMNS
3. If numeric field, add to NUMBER_COLUMNS array

## 📝 Testing Checklist

- [ ] GAS script deployed successfully
- [ ] Create/edit test trip in AppSheet
- [ ] Check Vercel webhook logs (no errors)
- [ ] Open Trip Details dialog
- [ ] Verify quangDuong shows correct km value
- [ ] Verify taiTrong shows correct weight value
- [ ] Verify thanhTien shows calculated amount
- [ ] Check total row sums correctly
- [ ] Test with multiple route detail records
- [ ] Verify thuTu shows sequence (1, 2, 3...)

## 🎯 Expected Results

### Before Fix
```
Chi tiết lộ trình (1 điểm)
Quảng đường: 0 km
Tải trọng: 0 tấn
Thành tiền: 0 đ
```

### After Fix
```
Chi tiết lộ trình (1 điểm)
Quảng đường: 250 km        ✅
Tải trọng: 12.5 tấn        ✅
Thành tiền: 3.250.000 đ    ✅
```

## 🔗 Related Files

- `backend-gas/Config.gs` - Column mapping configuration
- `backend-gas/Code.gs` - Data fetching and transformation logic
- `types/reconciliation.ts` - TypeScript interface definitions
- `components/reconciliation/TripDetailsDialog.tsx` - Frontend display component
- `app/api/webhook/appsheet/route.ts` - Webhook handler
- `app/api/reconciliation/route.ts` - Data API endpoint

## 📚 Documentation

- [TECHNICAL_ARCHITECTURE.md](./TECHNICAL_ARCHITECTURE.md)
- [APPSHEET_SETUP_GUIDE.md](./APPSHEET_SETUP_GUIDE.md)
- [WEBHOOK_REFACTOR_V2.md](./WEBHOOK_REFACTOR_V2.md)

---

**Status**: ✅ Fixed and ready for deployment
**Date**: December 30, 2025
**Version**: 2.1.0
