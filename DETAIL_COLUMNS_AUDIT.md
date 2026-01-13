# 🔍 Detail Columns Mapping Audit

## 📊 Current Status: FIXED

### ✅ Issue Resolved
- **Problem:** `ngay_tren_tem` was mapped in `DETAIL_COLUMNS` but NOT in `DATE_COLUMNS`
- **Impact:** Date field was treated as string instead of proper date format
- **Fix:** Added `'ngay_tren_tem'` to `DATE_COLUMNS` array in Config.gs

---

## 📋 Complete Detail Columns Mapping

### All 17 Fields in `chi_tiet_chuyen_di` table:

| # | Sheet Column | JSON Key | Type | Status |
|---|--------------|----------|------|--------|
| 1 | `Id` | `id` | String | ✅ Mapped |
| 2 | `ma_chuyen_di` | `maChuyenDi` | String | ✅ Mapped |
| 3 | `loai_tuyen_khach_hang` | `loaiTuyenKH` | String | ✅ Mapped |
| 4 | `lo_trinh` | `loTrinh` | String | ✅ Mapped |
| 5 | `lo_trinh_chi_tiet_theo_diem` | `loTrinhChiTiet` | String | ✅ Mapped |
| 6 | `ma_chuyen_di_kh` | `maTuyen` | String | ✅ Mapped |
| 7 | `bien_kiem_soat` | `bienKiemSoat` | String | ✅ Mapped |
| 8 | `tai_trong` | `taiTrong` | Number | ✅ Mapped + Type ✅ |
| 9 | `quang_duong` | `quangDuong` | Number | ✅ Mapped + Type ✅ |
| 10 | `so_chieu` | `soChieu` | Number | ✅ Mapped + Type ✅ |
| 11 | `don_gia` | `donGia` | Number | ✅ Mapped + Type ✅ |
| 12 | `thanh_tien` | `thanhTien` | Number | ✅ Mapped + Type ✅ |
| 13 | `loai_ca` | `loaiCa` | String | ✅ Mapped |
| 14 | `tai_trong_tinh_phi` | `taiTrongTinhPhi` | Number | ✅ Mapped + Type ✅ |
| 15 | `hinh_thuc_tinh_gia` | `hinhThucTinhGia` | String | ✅ Mapped |
| 16 | `ten_khach_hang_cap_1` | `tenKhachHangCap1` | String | ✅ Mapped |
| 17 | `ngay_tren_tem` | `ngayTrenTem` | Date | ✅ Mapped + Type ✅ FIXED |

---

## 🎯 Type Configuration

### Number Columns (6 fields)
✅ All detail number fields are properly configured:
```javascript
NUMBER_COLUMNS: [
  'tai_trong',           // ✅
  'quang_duong',         // ✅
  'so_chieu',            // ✅
  'don_gia',             // ✅
  'thanh_tien',          // ✅
  'tai_trong_tinh_phi'   // ✅
]
```

### Date Columns (1 field)
✅ Fixed - now includes ngay_tren_tem:
```javascript
DATE_COLUMNS: [
  'ngay_tao',      // Master
  'ngay_nhap',     // Fuel
  'ngay_tren_tem'  // ✅ FIXED - Detail
]
```

### String Columns (10 fields)
✅ All handled by default string processing:
- `Id`, `ma_chuyen_di`, `loai_tuyen_khach_hang`, `lo_trinh`
- `lo_trinh_chi_tiet_theo_diem`, `ma_chuyen_di_kh`, `bien_kiem_soat`
- `loai_ca`, `hinh_thuc_tinh_gia`, `ten_khach_hang_cap_1`

---

## 🔄 Data Flow Verification

### 1. AppSheet → GAS
```
User adds/edits detail in chi_tiet_chuyen_di
    ↓
Bot triggers: syncTripDetailToBackend([Id], [ma_chuyen_di], "Add/Edit")
    ↓
GAS reads row from sheet
```

### 2. GAS Processing
```javascript
mapDetailRow(row, headers) {
  for each DETAIL_COLUMNS entry:
    - Get column index from header
    - Get value from row
    - Check type:
      ✅ NUMBER_COLUMNS? → parseNumber()
      ✅ DATE_COLUMNS? → formatDate() (now includes ngay_tren_tem)
      ✅ Else → String trim
    - mappedData[jsonKey] = value
}
```

### 3. GAS → Backend
```
Payload sent:
{
  "Action": "TripDetail_Upsert",
  "maChuyenDi": "NAKabc123",
  "data_json": {
    "chiTietLoTrinh": [
      {
        "id": "DETAIL-001",
        "loTrinh": "SonLa_T_03",
        "taiTrong": 10,           // ✅ Number
        "donGia": 1200000,        // ✅ Number
        "ngayTrenTem": "2026-01-15"  // ✅ Date (YYYY-MM-DD)
        ...
      }
    ]
  }
}
```

### 4. Backend Storage
```
reconciliation_orders.details (JSONB):
{
  "chiTietLoTrinh": [
    {
      "id": "DETAIL-001",
      "taiTrong": 10,
      "donGia": 1200000,
      "ngayTrenTem": "2026-01-15"  // ✅ Properly formatted
    }
  ]
}
```

---

## 🧪 Testing Checklist

### Test Case 1: Date Field
- [ ] Add detail với `ngay_tren_tem` = "15/01/2026"
- [ ] Verify payload: `"ngayTrenTem": "2026-01-15"`
- [ ] Check DB: Date stored in YYYY-MM-DD format

### Test Case 2: Number Fields
- [ ] Add detail với `tai_trong` = "10,5"
- [ ] Verify payload: `"taiTrong": 10.5` (number, not string)
- [ ] Add detail với `don_gia` = "1.200.000"
- [ ] Verify payload: `"donGia": 1200000` (parsed correctly)

### Test Case 3: All Fields Together
- [ ] Add complete detail row with all 17 fields
- [ ] Verify all fields present in payload
- [ ] Check DB: All values stored correctly

---

## ⚠️ Potential Issues to Watch

### 1. Virtual Columns in AppSheet
Some columns might be **virtual** (calculated in AppSheet, not stored in sheet):
- Check if any detail calculations are virtual
- Virtual columns won't be in sheet → won't be synced
- If needed, add to sync logic separately

### 2. Missing Columns Not Yet Discovered
Common fields that MIGHT exist but not mapped:
- `ghi_chu` / `note` (detail-level notes)
- `nguoi_tao` / `created_by`
- `ngay_tao` / `created_at` (detail creation date)
- `trang_thai` / `status` (detail status)

**Action:** Check actual AppSheet table to verify.

### 3. Data Type Mismatches
- Ensure AppSheet column types match GAS config:
  - Number columns → Type: Number
  - Date columns → Type: Date/DateTime
  - Text columns → Type: Text

---

## 🚀 Recommendations

### Immediate Actions:
1. ✅ **DONE:** Add `ngay_tren_tem` to `DATE_COLUMNS`
2. ⏳ **TODO:** Test with real data to verify date formatting
3. ⏳ **TODO:** Check AppSheet for any additional unlisted columns

### Future Improvements:
1. Add validation for required fields in GAS
2. Add type checking before sync
3. Consider adding audit trail fields:
   - `synced_at` (timestamp when synced)
   - `sync_status` (success/failed)
   - `sync_error` (error message if failed)

---

## 📝 Change Log

### 2026-01-13: Fixed Date Column
- **Issue:** `ngay_tren_tem` treated as string
- **Fix:** Added to `DATE_COLUMNS` in Config.gs line 223
- **Impact:** All detail dates now properly formatted

---

**Status:** ✅ All known fields properly mapped and typed
**Next Review:** After first real-world sync test
**Owner:** Backend Team
