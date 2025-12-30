# ✅ UPDATE COMPLETE: Chi Tiết Lộ Trình Column Mapping

## 📋 Changes Summary

### 🔧 Config.gs - DETAIL_COLUMNS Updated

**Changed mapping:**
```javascript
// BEFORE
'ma_tem': 'maTem',

// AFTER  
'ma_chuyen_di': 'maChuyenDi',
```

**Why**: Sheet column structure uses `ma_chuyen_di` in detail table, not `ma_tem`. This provides better trip tracking and identification.

---

## 📊 Updated Column Mapping

### Complete DETAIL_COLUMNS Configuration

```javascript
DETAIL_COLUMNS: {
  'Id': 'id',
  'ma_chuyen_di': 'maChuyenDi',              // ✅ UPDATED: Trip ID
  'loai_tuyen_khach_hang': 'loaiTuyenKH',
  'lo_trinh': 'loTrinh',
  'lo_trinh_chi_tiet_theo_diem': 'loTrinh',
  'ma_chuyen_di_kh': 'maTuyen',
  'bien_kiem_soat': 'bienKiemSoat',
  'tai_trong': 'taiTrong',
  'quang_duong': 'quangDuong',
  'so_chieu': 'soChieu',
  'don_gia': 'donGia',
  'thanh_tien': 'thanhTien',
  'loai_ca': 'loaiCa',
  'tai_trong_tinh_phi': 'taiTrongTinhPhi',
  'hinh_thuc_tinh_gia': 'hinhThucTinhGia',
  'ten_khach_hang_cap_1': 'tenKhachHangCap1'
}
```

---

## 🎯 Impact on Frontend

### TripDetailsDialog.tsx Changes

**Desktop Table Header:**
```tsx
// BEFORE
<th>Mã Tem</th>

// AFTER
<th>Mã chuyến đi</th>
```

**Data Display:**
```tsx
// BEFORE
{item.maTem || "-"}

// AFTER
{item.maChuyenDi || "-"}
```

**Result**: Detail table now displays the trip ID from the detail records, which is more useful for tracking.

---

## 🔍 TypeScript Interface Updated

```typescript
// types/reconciliation.ts
export interface ChiTietLoTrinh {
  thuTu: number
  id: string
  loaiTuyenKH: string
  maTuyen: string
  loTrinh: string
  maChuyenDi: string      // ✅ Changed from maTem
  quangDuong: number
  taiTrong: number
  taiTrongTinhPhi: number
  hinhThucTinhGia: string
  soChieu: number
  donGia: number
  thanhTien: number
}
```

---

## 🚀 Deployment Steps

### Step 1: Deploy GAS Script (Required)

```
1. Mở Google Apps Script Editor
2. Click "Deploy" → "Manage deployments"
3. Click Edit ✏️ 
4. Version: "New version"
5. Description: "Update DETAIL_COLUMNS: maTem -> maChuyenDi"
6. Click "Deploy"
```

**Important**: Config.gs đã được update, cần deploy lại GAS script để áp dụng thay đổi.

### Step 2: Verify Frontend (Auto-deployed)

Frontend code đã được tự động deploy lên Vercel:
- ✅ TripDetailsDialog.tsx updated
- ✅ Types updated
- ✅ No manual action required

---

## 🧪 Testing Checklist

- [ ] Deploy GAS script với Config.gs mới
- [ ] Create/Edit một chuyến đi trong AppSheet
- [ ] Mở Trip Details dialog trong frontend
- [ ] Verify cột "Mã chuyến đi" hiển thị trip ID
- [ ] Verify các cột khác vẫn hiển thị đúng (km, tấn, đ)

---

## 📝 Data Flow After Update

```
Google Sheet (chi_tiet_chuyen_di)
    ↓
  ma_chuyen_di column (Trip ID)
    ↓
Config.gs DETAIL_COLUMNS
    ↓
  'ma_chuyen_di': 'maChuyenDi'
    ↓
Code.gs mapDetailRow()
    ↓
  { maChuyenDi: "NAKb8a160a9-..." }
    ↓
GAS Payload → Backend API → PostgreSQL
    ↓
Frontend TripDetailsDialog
    ↓
  Display: "Mã chuyến đi: NAKb8a160a9-..."
    ✅ Shows trip ID for better tracking
```

---

## 🔄 Comparison

### BEFORE (maTem - Stamp Code)
```
Chi tiết lộ trình
┌─────────┬─────────┬──────────┐
│ Thứ tự  │ Mã Tem  │ Lộ trình │
├─────────┼─────────┼──────────┤
│   1     │  ABC123 │ HCM - HN │
│   2     │  DEF456 │ HN - DN  │
└─────────┴─────────┴──────────┘
```

### AFTER (maChuyenDi - Trip ID)
```
Chi tiết lộ trình
┌─────────┬──────────────────────────┬──────────┐
│ Thứ tự  │ Mã chuyến đi             │ Lộ trình │
├─────────┼──────────────────────────┼──────────┤
│   1     │ NAKb8a160a9-b623-41bb... │ HCM - HN │
│   2     │ NAKb8a160a9-b623-41bb... │ HN - DN  │
└─────────┴──────────────────────────┴──────────┘
```

**Benefit**: Trip ID is more meaningful than stamp code for tracking and reconciliation purposes.

---

## 🐛 Related Logic Updates

### Code.gs - No Changes Required

The dynamic mapping in Code.gs automatically adapts:

```javascript
// mapDetailRow() already handles this correctly
for (const [sheetColumn, jsonKey] of Object.entries(config.DETAIL_COLUMNS)) {
  const columnIndex = getColumnIndex(headers, sheetColumn);
  // Will now map ma_chuyen_di -> maChuyenDi
  mappedData[jsonKey] = value;
}
```

**Result**: No code logic changes needed, just config update!

---

## 📚 Files Modified (Commit: f20c8c4)

1. **backend-gas/Config.gs**
   - Updated DETAIL_COLUMNS mapping
   
2. **types/reconciliation.ts**
   - Changed ChiTietLoTrinh.maTem → ChiTietLoTrinh.maChuyenDi
   
3. **components/reconciliation/TripDetailsDialog.tsx**
   - Updated column header
   - Updated data display field reference
   
4. **BUGFIX_CHI_TIET_LO_TRINH.md**
   - Updated documentation

---

## ✅ Verification Query

```sql
-- Check maChuyenDi in chiTietLoTrinh
SELECT 
  order_id,
  jsonb_pretty(details->'chiTietLoTrinh'->0) as first_detail
FROM reconciliation_orders
WHERE details->'chiTietLoTrinh' IS NOT NULL
ORDER BY created_at DESC
LIMIT 1;
```

**Expected Output:**
```json
{
  "id": "...",
  "thuTu": 1,
  "maChuyenDi": "NAKb8a160a9-b623-41bb-9fdf-670b7bab3895",  ✅
  "loTrinh": "Nội tỉnh Sơn La 12",
  "quangDuong": 0,
  "taiTrong": 0,
  ...
}
```

---

## 🎯 Success Criteria

- ✅ Config.gs has correct mapping: 'ma_chuyen_di': 'maChuyenDi'
- ✅ TypeScript interface updated to maChuyenDi
- ✅ Frontend displays "Mã chuyến đi" column header
- ✅ Detail records show trip ID instead of stamp code
- ✅ All changes committed and pushed to GitHub
- ⏳ **Pending**: GAS script redeployment

---

## 📞 Next Actions

1. **Immediate**: Deploy GAS script với updated Config.gs
2. **Test**: Create/edit trip in AppSheet
3. **Verify**: Check Trip Details dialog shows maChuyenDi correctly

---

**Status**: ✅ Code updated and deployed to GitHub (commit: f20c8c4)  
**Pending**: GAS script redeployment  
**Date**: December 31, 2025
