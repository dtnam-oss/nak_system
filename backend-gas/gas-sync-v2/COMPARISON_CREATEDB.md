# So Sánh: Code.gs vs CreateDataBase.js

## Tổng Quan

Document này so sánh cấu trúc dữ liệu giữa:
- **CreateDataBase.js**: Logic gốc đọc từ VEHICLE_SPREADSHEET và tạo JSON database
- **Code-Updated.gs**: Sync service mới được cập nhật để match chính xác cấu trúc

---

## Thay Đổi Quan Trọng

### 1. Spreadsheet Configuration

| Aspect | Code.gs (Old) | Code-Updated.gs (New) | CreateDataBase.js (Reference) |
|--------|--------------|----------------------|-------------------------------|
| **Spreadsheet ID** | User-defined | `1fzepYrS-...` | `1fzepYrS-...` ✅ |
| **Sheet chuyen_di** | `chuyen_di` | `chuyen_di` | `chuyen_di` ✅ |
| **Sheet chi_tiet** | `chi_tiet_lo_trinh` | `chi_tiet_chuyen_di` | `chi_tiet_chuyen_di` ✅ |

**ACTION REQUIRED:** Sửa tên sheet từ `chi_tiet_lo_trinh` → `chi_tiet_chuyen_di`

---

### 2. Column Names & Mapping

#### ChuyenDi Sheet

| Field | CreateDataBase.js | Code.gs (Old) | Code-Updated.gs (New) |
|-------|-------------------|---------------|----------------------|
| ID | `ma_chuyen_di` | `MA_CHUYEN_DI` | `MA_CHUYEN_DI` ✅ |
| Date | `ngay_tao` | `NGAY_TAO` | `NGAY_TAO` ✅ |
| License Plate | `bien_kiem_soat` | `BIEN_SO_XE` ❌ | `BIEN_KIEM_SOAT` ✅ |
| Customer | `ten_khach_hang` | `TEN_KHACH_HANG` | `TEN_KHACH_HANG` ✅ |
| Distance | `so_km_theo_odo` | `TONG_QUANG_DUONG` ❌ | `SO_KM_THEO_ODO` ✅ |
| Revenue | `doanh_thu` | `TONG_DOANH_THU` ❌ | `DOANH_THU` ✅ |
| Status | `trang_thai_chuyen_di` | `TRANG_THAI` | `TRANG_THAI` ✅ |
| Customer Lv1 | `ten_khach_hang_cap_1` | ❌ Missing | `TEN_KHACH_HANG_CAP_1` ✅ |

**Key Differences:**

❌ **Old Code.gs Issues:**
1. `BIEN_SO_XE` → Should be `BIEN_KIEM_SOAT`
2. `TONG_QUANG_DUONG` → Should read from `SO_KM_THEO_ODO`
3. `TONG_DOANH_THU` → Should read from `DOANH_THU`
4. Missing `TEN_KHACH_HANG_CAP_1` field

✅ **Code-Updated.gs Fixes:**
- All column names match CreateDataBase.js
- Reads from correct source columns
- Includes `khCap1` field

---

#### ChiTiet Sheet

| Field | CreateDataBase.js | Code.gs (Old) | Code-Updated.gs (New) |
|-------|-------------------|---------------|----------------------|
| Foreign Key | `ma_chuyen_di` (ref) | `MA_CHUYEN_DI_REF` | `MA_CHUYEN_DI_REF` ✅ |
| ID | `id` | ❌ Missing | `ID` ✅ |
| Route Type | `loai_tuyen_khach_hang` | ❌ Missing | `LOAI_TUYEN_KHACH_HANG` ✅ |
| Route Code | `lo_trinh` | ❌ Missing | `LO_TRINH` ✅ |
| Route Detail | `lo_trinh_chi_tiet_theo_diem` | ❌ Missing | `LO_TRINH_CHI_TIET` ✅ |
| Trip Code | `ma_chuyen_di_kh` | ❌ Missing | `MA_CHUYEN_DI_KH` ✅ |
| Distance | `quang_duong` | `KHOANG_CACH` ❌ | `QUANG_DUONG` ✅ |
| Weight | `tai_trong` | `TAI_TRONG` ✅ | `TAI_TRONG` ✅ |
| Billable Weight | `tai_trong_tinh_phi` | ❌ Missing | `TAI_TRONG_TINH_PHI` ✅ |
| Pricing Type | `hinh_thuc_tinh_gia` | ❌ Missing | `HINH_THUC_TINH_GIA` ✅ |
| Direction Count | `so_chieu` | ❌ Missing | `SO_CHIEU` ✅ |
| Unit Price | `don_gia` | ❌ Missing | `DON_GIA` ✅ |
| Total | `ket_qua` (thanhTien) | `DOANH_THU` ❌ | `KET_QUA` ✅ |
| Shift Type | `loai_ca` | ❌ Missing | `LOAI_CA` ✅ |

**Key Differences:**

❌ **Old Code.gs - Missing Many Fields:**
- Only had 5 fields: `diemDi`, `diemDen`, `khoangCach`, `taiTrong`, `doanhThu`
- Missing 8+ critical fields for business logic

✅ **Code-Updated.gs - Complete Structure:**
- All 13 fields matching CreateDataBase.js
- Proper field names (`quangDuong` not `khoangCach`, `thanhTien` not `doanhThu`)

---

### 3. Data Structure Comparison

#### Flat Fields (Top Level)

```javascript
// CreateDataBase.js (lines 220-232)
{
  maChuyenDi: "NAK_001",
  ngayTao: "2024-12-30",
  tenKhachHang: "ABC Company",
  loaiChuyen: "Một chiều",
  loaiTuyen: "Liên tỉnh",
  tenTuyen: "TP.HCM - Bình Dương",
  tenTaiXe: "Driver Name",
  donViVanChuyen: "NAK",
  trangThai: "Hoàn tất",
  tongQuangDuong: 1700,
  tongDoanhThu: 5000000
}

// Code.gs (Old) ❌
{
  maChuyenDi: "NAK_001",
  ngayTao: "2024-12-30",
  bienSoXe: "51A-12345",  // ← Extra field not in CreateDB
  tenTaiXe: "...",
  tenKhachHang: "...",
  donViVanChuyen: "...",
  loaiChuyen: "...",
  loaiTuyen: "...",
  tenTuyen: "...",
  tongQuangDuong: ...,    // ← Read from wrong column
  tongDoanhThu: ...,      // ← Read from wrong column
  trongLuong: ...,        // ← Extra field not in CreateDB
  trangThai: "..."
}

// Code-Updated.gs (New) ✅
{
  maChuyenDi: "NAK_001",
  ngayTao: "2024-12-30",
  tenKhachHang: "ABC Company",
  loaiChuyen: "Một chiều",
  loaiTuyen: "Liên tỉnh",
  tenTuyen: "TP.HCM - Bình Dương",
  tenTaiXe: "Driver Name",
  donViVanChuyen: "NAK",
  trangThai: "approved",  // ← Normalized
  tongQuangDuong: 1700,   // ← From so_km_theo_odo
  tongDoanhThu: 5000000   // ← From doanh_thu
}
```

---

#### Nested Structure: data_json.thongTinChuyenDi

```javascript
// CreateDataBase.js (lines 235-247)
thongTinChuyenDi: {
  soXe: "51A-12345",             // From bien_kiem_soat
  khCap1: "Parent Customer",     // From ten_khach_hang_cap_1
  bienKiemSoat: "51A-12345",     // From bien_kiem_soat
  taiTrong: 25.5,                // Aggregated from chiTiet
  quangDuong: 1700,              // Aggregated from chiTiet
  soChieu: 2,                    // Aggregated from chiTiet
  donGia: 100000,                // From first chiTiet record
  loaiCa: "Ca ngày",             // From first chiTiet record
  taiTrongTinhPhi: 25.5,         // Aggregated from chiTiet
  hinhThucTinhGia: "Theo tấn"    // From first chiTiet record
}

// Code.gs (Old) ❌
thongTinChuyenDi: {
  bienSoXe: "51A-12345",
  tenTaiXe: "Driver",
  loaiXe: "Standard",
  taiTrong: 25.5  // ← Only this field, missing all others!
}

// Code-Updated.gs (New) ✅
thongTinChuyenDi: {
  soXe: "51A-12345",             // ✅ Matches CreateDB
  khCap1: "Parent Customer",     // ✅ New field added
  bienKiemSoat: "51A-12345",     // ✅ Matches CreateDB
  taiTrong: 25.5,                // ✅ Aggregated
  quangDuong: 1700,              // ✅ Aggregated
  soChieu: 2,                    // ✅ Aggregated
  donGia: 100000,                // ✅ From first record
  loaiCa: "Ca ngày",             // ✅ From first record
  taiTrongTinhPhi: 25.5,         // ✅ Aggregated
  hinhThucTinhGia: "Theo tấn"    // ✅ From first record
}
```

**Aggregation Logic (matching CreateDataBase.js lines 256-282):**

```javascript
// Code-Updated.gs implements EXACT same logic:
let tongTaiTrong = 0;
let tongQuangDuong = 0;
let tongSoChieu = 0;
let tongTaiTrongTinhPhi = 0;

for (let i = 0; i < chiTietArray.length; i++) {
  const item = chiTietArray[i];
  tongTaiTrong += item.taiTrong;
  tongQuangDuong += item.quangDuong;
  tongSoChieu += item.soChieu;
  tongTaiTrongTinhPhi += item.taiTrongTinhPhi;

  // First record values
  if (i === 0) {
    thongTin.donGia = item.donGia;
    thongTin.loaiCa = item.loaiCa;
    thongTin.hinhThucTinhGia = item.hinhThucTinhGia;
  }
}
```

---

#### Nested Structure: data_json.chiTietLoTrinh

```javascript
// CreateDataBase.js (lines 296-316)
chiTietLoTrinh: [
  {
    thuTu: 1,
    id: "CHI_TIET_001",
    loaiTuyenKH: "Liên tỉnh",
    maTuyen: "ROUTE_001",
    loTrinh: "TP.HCM - Bình Dương - Đồng Nai",
    maTem: "TEM_001",
    quangDuong: 35,
    taiTrong: 25.5,
    taiTrongTinhPhi: 25.5,
    hinhThucTinhGia: "Theo tấn",
    soChieu: 2,
    donGia: 100000,
    thanhTien: 5000000
  }
]

// Code.gs (Old) ❌
chiTietLoTrinh: [
  {
    diemDi: "TP.HCM",       // ← Wrong structure!
    diemDen: "Bình Dương",
    khoangCach: 35,         // ← Should be quangDuong
    taiTrong: 25.5,
    doanhThu: 5000000       // ← Should be thanhTien
  }
]

// Code-Updated.gs (New) ✅
chiTietLoTrinh: [
  {
    thuTu: 1,                          // ✅ Sequence number
    id: "CHI_TIET_001",                // ✅ Unique ID
    loaiTuyenKH: "Liên tỉnh",         // ✅ Customer route type
    maTuyen: "ROUTE_001",              // ✅ Route code
    loTrinh: "TP.HCM - Bình Dương",    // ✅ Full route detail
    maTem: "TEM_001",                  // ✅ Trip stamp code
    quangDuong: 35,                    // ✅ Distance (not khoangCach!)
    taiTrong: 25.5,                    // ✅ Weight
    taiTrongTinhPhi: 25.5,             // ✅ Billable weight
    hinhThucTinhGia: "Theo tấn",       // ✅ Pricing type
    soChieu: 2,                        // ✅ Direction count
    donGia: 100000,                    // ✅ Unit price
    thanhTien: 5000000,                // ✅ Total (not doanhThu!)
    loaiCa: "Ca ngày"                  // ✅ Shift type
  }
]
```

---

## Migration Checklist

### ⚠️ CRITICAL Changes Required

- [ ] **1. Update Spreadsheet ID**
  ```javascript
  // Old
  MAIN_SPREADSHEET_ID: 'user-defined'

  // New (match CreateDataBase.js)
  MAIN_SPREADSHEET_ID: '1fzepYrS-o5zc01h7nQFzJSOwagoTvOgoiDQHrTLB12E'
  ```

- [ ] **2. Update Sheet Name**
  ```javascript
  // Old
  SHEET_CHI_TIET: 'chi_tiet_lo_trinh'

  // New (match CreateDataBase.js)
  SHEET_CHI_TIET: 'chi_tiet_chuyen_di'
  ```

- [ ] **3. Update Column Indexes**

  Open spreadsheet `1fzepYrS-...` and verify column positions:

  **ChuyenDi Sheet:**
  ```
  A (0) = ma_chuyen_di
  B (1) = ngay_tao
  C (2) = ten_khach_hang
  D (3) = loai_chuyen
  E (4) = loai_tuyen
  F (5) = ten_tuyen
  G (6) = ten_tai_xe
  H (7) = don_vi_van_chuyen
  I (8) = trang_thai_chuyen_di
  J (9) = bien_kiem_soat
  K (10) = so_km_theo_odo
  L (11) = doanh_thu
  M (12) = ten_khach_hang_cap_1
  ```

  **ChiTiet Sheet:**
  ```
  A (0) = ma_chuyen_di (foreign key)
  B (1) = id
  C (2) = loai_tuyen_khach_hang
  D (3) = lo_trinh
  E (4) = lo_trinh_chi_tiet_theo_diem
  F (5) = ma_chuyen_di_kh
  G (6) = quang_duong
  H (7) = tai_trong
  I (8) = tai_trong_tinh_phi
  J (9) = hinh_thuc_tinh_gia
  K (10) = so_chieu
  L (11) = don_gia
  M (12) = ket_qua
  N (13) = loai_ca
  ```

- [ ] **4. Replace Code.gs with Code-Updated.gs**
  ```bash
  # Backup old version
  cp Code.gs Code-OLD-BACKUP.gs

  # Use updated version
  cp Code-Updated.gs Code.gs
  ```

- [ ] **5. Update Backend API to Handle New Structure**

  Backend must now expect:
  ```javascript
  {
    data_json: {
      thongTinChuyenDi: {
        // 10 fields (not 4!)
      },
      chiTietLoTrinh: [
        {
          // 14 fields (not 5!)
        }
      ]
    }
  }
  ```

---

## Testing Plan

### Step 1: Verify Sheet Structure

```javascript
// In GAS editor, run this function:
function verifySheetStructure() {
  const ss = SpreadsheetApp.openById(CONFIG.MAIN_SPREADSHEET_ID);

  // Check chuyen_di sheet
  const sheetChuyenDi = ss.getSheetByName(CONFIG.SHEET_CHUYEN_DI);
  const headersCD = sheetChuyenDi.getRange(1, 1, 1, 13).getValues()[0];
  Logger.log('ChuyenDi Headers: ' + JSON.stringify(headersCD));

  // Check chi_tiet sheet
  const sheetChiTiet = ss.getSheetByName(CONFIG.SHEET_CHI_TIET);
  const headersCT = sheetChiTiet.getRange(1, 1, 1, 14).getValues()[0];
  Logger.log('ChiTiet Headers: ' + JSON.stringify(headersCT));

  // Verify column positions match COLUMNS const
  Logger.log('Verify MA_CHUYEN_DI at index 0: ' + headersCD[0]);
  Logger.log('Verify BIEN_KIEM_SOAT at index 9: ' + headersCD[9]);
  Logger.log('Verify SO_KM_THEO_ODO at index 10: ' + headersCD[10]);
}
```

Expected output:
```
ChuyenDi Headers: ["ma_chuyen_di", "ngay_tao", ..., "bien_kiem_soat", "so_km_theo_odo", "doanh_thu", "ten_khach_hang_cap_1"]
ChiTiet Headers: ["ma_chuyen_di", "id", ..., "quang_duong", "tai_trong", ..., "loai_ca"]
```

### Step 2: Test Data Reading

```javascript
function testReadData() {
  const tripId = 'REAL_TRIP_ID_FROM_SHEET'; // Replace with actual ID

  const tripData = readTripData(tripId);
  Logger.log('Trip Data: ' + JSON.stringify(tripData, null, 2));

  const chiTietData = readChiTietData(tripId);
  Logger.log('ChiTiet Data: ' + JSON.stringify(chiTietData, null, 2));

  // Verify structure matches CreateDataBase.js
}
```

### Step 3: Test Full Sync

```javascript
function testFullSync() {
  const tripId = 'REAL_TRIP_ID';
  const result = syncTripToBackend(tripId, 'Add');

  Logger.log('Sync Result: ' + JSON.stringify(result, null, 2));

  // Check logs for:
  // 1. Correct field names
  // 2. Aggregated values in thongTinChuyenDi
  // 3. Complete chiTietLoTrinh structure
}
```

### Step 4: Compare with CreateDataBase.js Output

```javascript
// In CreateDataBase.js project:
function testCreateDatabase() {
  // ... (existing function)
  // Compare JSON output structure
}

// Both should produce IDENTICAL structure
```

---

## Backward Compatibility

### Breaking Changes

❌ **These will BREAK if backend expects old structure:**

1. **Field name changes:**
   - `bienSoXe` → Removed from top level
   - `trongLuong` → Removed from top level
   - `khoangCach` → Changed to `quangDuong`
   - `doanhThu` → Changed to `thanhTien` (in chiTiet)

2. **New fields added:**
   - `khCap1`
   - `id`, `loaiTuyenKH`, `maTuyen`, `loTrinh`, `maTem`
   - `taiTrongTinhPhi`, `hinhThucTinhGia`, `soChieu`, `donGia`, `loaiCa`

3. **Structure changes:**
   - `thongTinChuyenDi` now has 10 fields (was 4)
   - `chiTietLoTrinh` now has 14 fields (was 5)

### Migration Strategy

**Option 1: Update Backend First (Recommended)**

1. Update backend to handle BOTH old and new structures
2. Deploy Code-Updated.gs
3. Test with new structure
4. Remove old structure support from backend

**Option 2: Parallel Running**

1. Keep old Code.gs running
2. Deploy Code-Updated.gs as separate bot
3. Compare outputs for 1 week
4. Switch fully to new version

---

## Summary

| Aspect | Code.gs (Old) | Code-Updated.gs (New) | Match CreateDB? |
|--------|--------------|----------------------|-----------------|
| **Spreadsheet** | User-defined | `1fzepYrS-...` | ✅ YES |
| **Sheet Names** | Partial match | Full match | ✅ YES |
| **Flat Fields** | 12 fields | 11 fields | ✅ YES |
| **thongTinChuyenDi** | 4 fields ❌ | 10 fields | ✅ YES |
| **chiTietLoTrinh** | 5 fields ❌ | 14 fields | ✅ YES |
| **Aggregation Logic** | None ❌ | Full | ✅ YES |
| **Column Names** | Partial match ❌ | Full match | ✅ YES |
| **Data Types** | Guaranteed | Guaranteed | ✅ YES |

**Recommendation:** Use **Code-Updated.gs** as it matches 100% with CreateDataBase.js structure.

---

**Last Updated:** 2024-12-30
**Version:** 2.0.1
