# 🚀 Field Mapping Quick Reference

## ✅ **All 17 Detail Fields Covered**

### 📋 Quick Check

```javascript
// Run in GAS Editor to verify:
verifyDetailColumnMapping()

// Expected output:
✅ 17 mapped columns
❌ 0 unmapped columns
```

---

## 🔢 Number Fields (6)

| Sheet Column | JSON Key | Example |
|--------------|----------|---------|
| `tai_trong` | `taiTrong` | 10.5 |
| `quang_duong` | `quangDuong` | 250 |
| `so_chieu` | `soChieu` | 2 |
| `don_gia` | `donGia` | 1200000 |
| `thanh_tien` | `thanhTien` | 2400000 |
| `tai_trong_tinh_phi` | `taiTrongTinhPhi` | 10 |

---

## 📅 Date Fields (1)

| Sheet Column | JSON Key | Format |
|--------------|----------|--------|
| `ngay_tren_tem` | `ngayTrenTem` | YYYY-MM-DD |

**Example:** `15/01/2026` → `"2026-01-15"`

---

## 📝 String Fields (10)

- `Id` → `id`
- `ma_chuyen_di` → `maChuyenDi`
- `loai_tuyen_khach_hang` → `loaiTuyenKH`
- `lo_trinh` → `loTrinh`
- `lo_trinh_chi_tiet_theo_diem` → `loTrinhChiTiet`
- `ma_chuyen_di_kh` → `maTuyen`
- `bien_kiem_soat` → `bienKiemSoat`
- `loai_ca` → `loaiCa`
- `hinh_thuc_tinh_gia` → `hinhThucTinhGia`
- `ten_khach_hang_cap_1` → `tenKhachHangCap1`

---

## 🔧 Recent Fix

**Issue:** `ngay_tren_tem` was treated as string
**Fix:** Added to `DATE_COLUMNS` in Config.gs
**Impact:** Date now properly formatted as YYYY-MM-DD

---

## 🧪 Test Commands

```javascript
// Verify all columns mapped:
verifyDetailColumnMapping()

// Test row transformation:
testDetailRowMapping()
```

---

**Status:** ✅ Complete | **Updated:** 2026-01-13
