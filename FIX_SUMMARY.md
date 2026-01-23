# 🔧 API ROUTES FIX SUMMARY

## 📊 Tổng Quan

**Ngày tạo:** 2026-01-23  
**Vấn đề:** API routes đang query các bảng CŨ (Neon database) thay vì bảng MỚI (Self-hosted PostgreSQL)

---

## ❌ CÁC BẢNG SAI CẦN THAY THẾ

| Bảng CŨ (SAI) | Bảng MỚI (ĐÚNG) | Ghi chú |
|---------------|------------------|---------|
| `reconciliation_orders` | `chuyen_di` + `chi_tiet_chuyen_di` | JOIN 2 bảng |
| `fuel_imports` | `nhap_nhien_lieu` | Đổi tên |
| `fuel_transactions` | `xuat_nhien_lieu` | Đổi tên |
| `vehicles` | `phuong_tien` | Cần verify |

---

## 🔴 CRITICAL - FILES CẦN SỬA NGAY

### 1. `` (7 queries sai)
**Vấn đề:**
- Query `reconciliation_orders` (x7)
- Query `fuel_imports`
- Query `fuel_transactions` (x2)
- Query `vehicles` (x2)
- Dùng `@neondatabase/serverless` thay vì `@/lib/db`

**Cần sửa:**
```typescript
// ❌ SAI
FROM reconciliation_orders WHERE...
FROM fuel_imports WHERE...
FROM fuel_transactions WHERE...

// ✅ ĐÚNG
FROM chuyen_di WHERE...
FROM nhap_nhien_lieu WHERE...
FROM xuat_nhien_lieu WHERE...
```

---

### 2. `` (10+ queries sai)
**Vấn đề:** Tất cả các query đều dùng `reconciliation_orders`

**Cần sửa:**
- Query 1: Revenue aggregation
- Query 2-4: Trip statistics
- Query 5-7: Date range filters
- Query 8-10: Provider breakdown

---

### 3. `` (Large file - nhiều INSERT/UPDATE)
**Vấn đề:**
- Line 628: `INSERT INTO fuel_imports` → `nhap_nhien_lieu`
- Line 693: `DELETE FROM fuel_imports` → `nhap_nhien_lieu`
- Line 738: `INSERT INTO fuel_transactions` → `xuat_nhien_lieu`
- Line 798: `UPDATE fuel_transactions` → `xuat_nhien_lieu`
- Line 845: `DELETE FROM fuel_transactions` → `xuat_nhien_lieu`
- Line 1118+: Multiple `reconciliation_orders` operations → `chuyen_di`

---

### 4. ``
**Vấn đề:**
- Line 17: `ngay_xuat` → `ngay_tao`
- Line 21: `ten_lai_xe` → `ten_tai_xe`
- Line 28: `phan_loai` → `hang_muc`

---

### 5. ``
**Vấn đề:**
- Line 148: `ct.thanh_tien` → `ct.ket_qua`

---

## 📋 DANH SÁCH COLUMN MAPPING

### Table: `chi_tiet_chuyen_di`

| ❌ Tên SAI | ✅ Tên ĐÚNG | Ghi chú |
|-----------|-------------|---------|
| `thanh_tien` | `ket_qua` | Tổng tiền |
| `diem_lay_hang` | `lo_trinh` | Lộ trình |
| `diem_tra_hang` | `lo_trinh_chi_tiet_theo_diem` | Chi tiết |
| `khoi_luong` | `tai_trong` | Tải trọng |
| `ghi_chu` | Không có | Xóa |

### Table: `xuat_nhien_lieu`

| ❌ Tên SAI | ✅ Tên ĐÚNG |
|-----------|-------------|
| `ngay_xuat` | `ngay_tao` |
| `ten_lai_xe` | `ten_tai_xe` |
| `phan_loai` | `hang_muc` |

---

## 🎯 PLAN FIX

### Phase 1: Fix Critical Dashboard (IN PROGRESS)
- [x] Audit dashboard/stats/route.ts
- [ ] Rewrite all queries với bảng đúng
- [ ] Test dashboard page

### Phase 2: Fix Reports APIs
- [ ] reports/dashboard/route.ts
- [ ] reports/analytics/route.ts
- [ ] reports/trips/route.ts
- [ ] reports/quality-stats/route.ts
- [ ] reports/smart-query/route.ts

### Phase 3: Fix Fuel APIs
- [x] fuel/imports/route.ts - DONE (already correct)
- [x] fuel/transactions/route.ts - FIX column names
- [ ] fuel/stats/route.ts

### Phase 4: Fix Webhook
- [ ] webhook/appsheet/route.ts (Large file)

### Phase 5: Fix Reconciliation
- [x] reconciliation/route.ts - DONE
- [ ] reconciliation/export/route.ts
- [x] reconciliation-v2/route.ts - FIX thanh_tien

### Phase 6: Test Everything
- [ ] Test dashboard loads
- [ ] Test reports load
- [ ] Test fuel transactions
- [ ] Test AppSheet webhooks

---

## ⚠️ LƯU Ý QUAN TRỌNG

1. **Đừng sửa cùng lúc quá nhiều file** - Sửa từng file, commit, test
2. **Case-sensitive columns:** `Id` (chữ I hoa) trong `chi_tiet_chuyen_di` phải có quotes: `ct."Id"`
3. **Database connection:** Đã hardcode trong `lib/db.ts`, không dùng env vars
4. **Type casting:** Nhiều cột trong database là TEXT, cần CAST to NUMERIC

---

## ✅ ĐÃ SỬA XONG

1. ✅ `app/api/reconciliation/route.ts` - Fixed chi_tiet_chuyen_di columns
2. ✅ `lib/db.ts` - Hardcoded self-hosted PostgreSQL connection
3. ✅ `app/api/fuel/imports/route.ts` - Already correct (uses nhap_nhien_lieu)

---

## 🚀 NEXT STEPS

1. Fix `app/api/fuel/transactions/route.ts` column names
2. Fix `app/api/reconciliation-v2/route.ts` thanh_tien → ket_qua
3. Rewrite `app/api/dashboard/stats/route.ts` completely
4. Fix webhook operations one by one
