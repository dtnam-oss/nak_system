# 🗄️ DATABASE SCHEMA KEYS & RELATIONSHIPS

## ✅ Primary Keys

| Table | Primary Key | Type | Notes |
|-------|-------------|------|-------|
| `nhan_vien` | `ma_nhan_vien` | VARCHAR | Employee ID |
| `chuyen_di` | `ma_chuyen_di` | VARCHAR | Trip ID |
| `chi_tiet_chuyen_di` | ⚠️ **NO PK** | - | Has `id` (TEXT, unique but not PK) |
| `phuong_tien` | `bien_kiem_soat` | VARCHAR | License plate |
| `khach_hang` | `ma_khach_hang` | VARCHAR | Customer ID |
| `vendor` | `ma_vendor` | VARCHAR | Vendor ID |
| `bang_gia` | `Id` | - | Price list |
| `cai_dat` | `Id` | - | Settings |
| `ke_hoach` | `Id` | - | Plans |
| `theo_ca` | `Id` | - | Shifts |
| `cham_cong` | `id` | - | Attendance |

## 🔗 Foreign Keys

**❌ NO FOREIGN KEY CONSTRAINTS DEFINED**

The database does not have formal foreign key constraints, but logical relationships exist:

### Logical Relationships (enforced by application):

```
chuyen_di (ma_chuyen_di) ←──→ chi_tiet_chuyen_di (ma_chuyen_di)
   ↓
   ├─ ma_khach_hang → khach_hang.ma_khach_hang
   ├─ ma_tai_xe → nhan_vien.ma_nhan_vien
   ├─ bien_kiem_soat → phuong_tien.bien_kiem_soat
   └─ ma_vendor → vendor.ma_vendor

chi_tiet_chuyen_di
   ├─ ma_chuyen_di → chuyen_di.ma_chuyen_di
   ├─ ma_khach_hang → khach_hang.ma_khach_hang
   └─ bien_kiem_soat → phuong_tien.bien_kiem_soat
```

## 📇 Indexes

All tables have default primary key indexes only:
- `nhan_vien_pkey` on `ma_nhan_vien`
- `chuyen_di_pkey` on `ma_chuyen_di`
- `phuong_tien_pkey` on `bien_kiem_soat`
- `khach_hang_pkey` on `ma_khach_hang`
- etc.

**⚠️ NO ADDITIONAL INDEXES** - Consider adding indexes on:
- `chi_tiet_chuyen_di.ma_chuyen_di` (for JOIN performance)
- `chi_tiet_chuyen_di.id` (make it PRIMARY KEY)
- `chuyen_di.ma_khach_hang` (for filtering)
- `chuyen_di.ngay_tao` (for date range queries)

## 🔍 Join Verification

### chuyen_di ←→ chi_tiet_chuyen_di

**Join condition**: `ct.ma_chuyen_di = cd.ma_chuyen_di`

Sample data:
- ✅ JOIN works correctly
- ✅ One-to-many relationship (1 chuyen_di → multiple chi_tiet)
- ✅ All records have valid `ma_chuyen_di`

**Stats**:
- Total `chi_tiet_chuyen_di` rows: 145
- Unique `id` values: 145 (100% unique ✓)
- Sample trip has 1-2 detail rows each

## 📊 Table Statistics

| Table | Rows | Unique IDs | Status |
|-------|------|------------|--------|
| `chi_tiet_chuyen_di` | 145 | 145 | ✅ No duplicates |

## ⚠️ Issues & Recommendations

### Critical:
1. **`chi_tiet_chuyen_di` has no PRIMARY KEY**
   - Column `id` is unique but not constrained
   - **Recommendation**: Add PK constraint
   ```sql
   ALTER TABLE chi_tiet_chuyen_di ADD PRIMARY KEY (id);
   ```

2. **No FOREIGN KEY constraints**
   - Data integrity relies on application logic
   - **Recommendation**: Add FK constraints (optional, may impact AppSheet)

### Performance:
3. **Missing indexes on JOIN columns**
   ```sql
   CREATE INDEX idx_chi_tiet_ma_chuyen_di ON chi_tiet_chuyen_di(ma_chuyen_di);
   CREATE INDEX idx_chuyen_di_ngay_tao ON chuyen_di(ngay_tao);
   CREATE INDEX idx_chuyen_di_ma_khach_hang ON chuyen_di(ma_khach_hang);
   ```

## 🎯 Correct JOIN Patterns

### ✅ Correct - Using ma_chuyen_di
```sql
SELECT cd.*, ct.*
FROM chuyen_di cd
LEFT JOIN chi_tiet_chuyen_di ct ON ct.ma_chuyen_di = cd.ma_chuyen_di
```

### ❌ Wrong - Using non-existent column
```sql
-- DO NOT USE - ct.ld does not exist
SELECT ct.ld FROM chi_tiet_chuyen_di ct
```

## 📝 Column Reference for JOINs

### chuyen_di
- ✓ `ma_chuyen_di` (PK)
- ✓ `ma_khach_hang`
- ✓ `ten_khach_hang`
- ✓ `ten_tai_xe`
- ✓ `bien_kiem_soat`
- ✓ `ngay_tao`
- ✓ `trang_thai`

### chi_tiet_chuyen_di
- ✓ `id` (unique, not PK)
- ✓ `ma_chuyen_di` (join key)
- ✓ `ma_khach_hang`
- ✓ `loai_tuyen_khach_hang`
- ✓ `lo_trinh`
- ✓ `lo_trinh_chi_tiet_theo_diem`
- ✓ `bien_kiem_soat`
- ✓ `quang_duong`
- ✓ `don_gia`
- ✓ `ket_qua`
- ❌ `thu_tu` - DOES NOT EXIST
- ❌ `ma_tuyen` - DOES NOT EXIST
- ❌ `ld` - DOES NOT EXIST

## 🔧 API Route JOIN Examples

### Reconciliation v2
```typescript
FROM chuyen_di cd
LEFT JOIN chi_tiet_chuyen_di ct ON ct.ma_chuyen_di = cd.ma_chuyen_di
```

### Analytics
```typescript
FROM chuyen_di cd
WHERE cd.ngay_tao >= $1 AND cd.ngay_tao <= $2
```

### Vehicle History
```typescript
FROM chuyen_di cd
WHERE cd.bien_kiem_soat = $1
ORDER BY cd.ngay_tao DESC
```
