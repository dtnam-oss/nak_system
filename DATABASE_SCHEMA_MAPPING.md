# 📊 DATABASE SCHEMA MAPPING - PostgreSQL to Next.js

> Generated: January 22, 2026  
> Database: `postgresql://postgres:***@163.223.12.189:5432/nak_vn`

---

## ✅ TỔNG QUAN TABLES

Database hiện có **12 tables**:

| # | Table Name | Rows | Size | Status | Mapping to Next.js |
|---|------------|------|------|--------|-------------------|
| 1 | `chuyen_di` | 7,650 | 4.2 MB | ✅ Production | → `reconciliation_orders` |
| 2 | `chi_tiet_chuyen_di` | 10,871 | 5.2 MB | ✅ Production | → Nested in `details` |
| 3 | `nhap_nhien_lieu` | 5 | 16 KB | ✅ NEW | → `fuel_imports` |
| 4 | `xuat_nhien_lieu` | 276 | 136 KB | ✅ NEW | → `fuel_transactions` |
| 5 | `nhan_vien` | 102 | 88 KB | ✅ Production | → `employees` API |
| 6 | `phuong_tien` | 153 | 112 KB | ✅ Production | → `vehicles` API |
| 7 | `bang_gia` | 343 | 168 KB | ⚠️ Reference | Pricing lookup |
| 8 | `khach_hang` | 28 | 32 KB | ⚠️ Reference | Customer master |
| 9 | `vendor` | 41 | 64 KB | ⚠️ Reference | Vendor/Partner |
| 10 | `ke_hoach` | 125 | 120 KB | ⚠️ Planning | Trip planning |
| 11 | `theo_ca` | 2,701 | 440 KB | ⚠️ Reference | Shift-based routes |
| 12 | `cai_dat` | 30 | 32 KB | ⚠️ Config | System config |

---

## 🚗 TABLE 1: `chuyen_di` (Trip Master)

### Schema
```sql
chuyen_di (
  ma_chuyen_di VARCHAR(255) PRIMARY KEY,
  ngay_tao DATE,
  ten_khach_hang TEXT,
  ten_khach_hang_cap_1 TEXT,
  loai_chuyen TEXT,
  loai_tuyen TEXT,
  ten_tuyen TEXT,
  don_vi_van_chuyen TEXT,
  ten_tai_xe TEXT,
  ten_vendor TEXT,
  trang_thai_chuyen_di TEXT,
  doanh_thu NUMERIC,
  so_km_theo_odo NUMERIC,
  ghi_chu TEXT,
  thoi_gian_tao TIMESTAMP,
  -- ... 52 columns total
)
```

### Field Mapping to Next.js

| Vietnamese Column | Next.js Field | Data Type | Notes |
|-------------------|---------------|-----------|-------|
| `ma_chuyen_di` | `order_id` | string | Primary key |
| `ngay_tao` | `date` | Date | Trip date |
| `ten_khach_hang` | `customer` | string | Customer name |
| `doanh_thu` | `revenue` | number | Revenue (VND) |
| `so_km_theo_odo` | `total_distance` | number | Distance (km) |
| `trang_thai_chuyen_di` | `status` | 'approved'\|'pending'\|'rejected' | **NEEDS MAPPING** |
| `don_vi_van_chuyen` | `provider` | 'NAK'\|'VENDOR'\|'OTHER' | **NEEDS MAPPING** |
| `ten_tai_xe` | `driver_name` | string | Driver name |
| `loai_chuyen` | `trip_type` | string | Một chiều/Hai chiều |
| `loai_tuyen` | `route_type` | string | Nội thành/Liên tỉnh |
| `ten_tuyen` | `route_name` | string | Route name |
| `ghi_chu` | `note` | string | Notes |

### Status Mapping Logic
```typescript
// trang_thai_chuyen_di → status
'Kết thúc' → 'approved'
'Đang thực hiện' → 'pending'
'Hủy' → 'rejected'
```

---

## 📋 TABLE 2: `chi_tiet_chuyen_di` (Trip Details)

### Schema
```sql
chi_tiet_chuyen_di (
  Id VARCHAR(255),
  ma_chuyen_di TEXT,  -- Foreign key to chuyen_di
  bien_kiem_soat TEXT,
  lo_trinh TEXT,
  lo_trinh_chi_tiet_theo_diem TEXT,
  quang_duong TEXT,
  tai_trong TEXT,
  so_chieu TEXT,
  don_gia TEXT,
  ket_qua TEXT,  -- thanh_tien
  hinh_thuc_tinh_gia TEXT,
  loai_ca TEXT,
  ten_khach_hang_cap_1 TEXT,
  -- ... 32 columns total
)
```

### Field Mapping

| Vietnamese Column | Next.js Field | Data Type | Notes |
|-------------------|---------------|-----------|-------|
| `Id` | `id` | string | Detail ID |
| `ma_chuyen_di` | `maChuyenDi` | string | Parent trip ID |
| `bien_kiem_soat` | `bienKiemSoat` | string | License plate |
| `lo_trinh` | `loTrinh` | string | Route |
| `lo_trinh_chi_tiet_theo_diem` | `loTrinhChiTiet` | string | Detailed route |
| `quang_duong` | `quangDuong` | number | Distance (km) |
| `tai_trong` | `taiTrong` | number | Weight |
| `tai_trong_tinh_phi` | `taiTrongTinhPhi` | number | Billable weight |
| `so_chieu` | `soChieu` | number | Number of trips |
| `don_gia` | `donGia` | number | Unit price |
| `ket_qua` | `thanhTien` | number | Total amount |
| `hinh_thuc_tinh_gia` | `hinhThucTinhGia` | string | Pricing method |
| `loai_ca` | `loaiCa` | string | Shift type |

**⚠️ NOTE:** All numeric fields are stored as TEXT, need to parse!

---

## ⛽ TABLE 3: `nhap_nhien_lieu` (Fuel Imports)

### Schema
```sql
nhap_nhien_lieu (
  id TEXT,
  hang_muc TEXT,
  nha_cung_cap TEXT,
  ten_nhien_lieu TEXT,
  so_luong BIGINT,
  don_vi_tinh TEXT,
  don_gia_nhap BIGINT,
  thanh_tien BIGINT,
  ton_kho DOUBLE PRECISION,
  gia_tri_ton DOUBLE PRECISION,
  nguoi_tao TEXT,
  thoi_gian_tao TIMESTAMP,
  ngay_nhap TIMESTAMP,
  don_gia_xuat_binh_quan DOUBLE PRECISION,
  nam BIGINT,
  thang BIGINT,
  lich_su TEXT
)
```

### Field Mapping to `fuel_imports`

| Vietnamese Column | Next.js Field | Data Type | Notes |
|-------------------|---------------|-----------|-------|
| `id` | `id` | string | Primary key |
| `ngay_nhap` | `import_date` | Date | Import date |
| `nha_cung_cap` | `supplier` | string | Supplier name |
| `ten_nhien_lieu` | `fuel_type` | string | Fuel type (DO005, etc.) |
| `so_luong` | `quantity` | number | Quantity (liters) |
| `don_gia_nhap` | `unit_price` | number | Unit price (VND/L) |
| `thanh_tien` | `total_amount` | number | Total amount (VND) |
| `don_gia_xuat_binh_quan` | `avg_price` | number | Weighted avg price |
| `nguoi_tao` | `created_by` | string | Created by |

### Sample Data
```
ID: cecac666
Date: 2025-12-29
Supplier: Anh Long Petrol
Fuel: DO005
Quantity: 9,110 L
Price: 17,250 VND/L
Total: 157,147,500 VND
```

---

## ⛽ TABLE 4: `xuat_nhien_lieu` (Fuel Transactions)

### Schema
```sql
xuat_nhien_lieu (
  id TEXT,
  loai_hinh TEXT,  -- Fuel source
  doi_tuong TEXT,  -- Object (NAK/Vendor)
  bien_so_xe TEXT,
  ma_tai_xe TEXT,
  ten_tai_xe TEXT,
  loai_nhien_lieu TEXT,
  so_luong DOUBLE PRECISION,
  don_vi_tinh TEXT,
  don_gia DOUBLE PRECISION,
  thanh_tien DOUBLE PRECISION,
  trang_thai TEXT,
  hang_muc TEXT,  -- Category
  so_odo DOUBLE PRECISION,
  ngay_tao TIMESTAMP,
  nguoi_tao TEXT,
  -- ... 32 columns total
)
```

### Field Mapping to `fuel_transactions`

| Vietnamese Column | Next.js Field | Data Type | Notes |
|-------------------|---------------|-----------|-------|
| `id` | `id` | string | Primary key |
| `ngay_tao` | `transaction_date` | Date | Transaction date |
| `loai_hinh` | `fuel_source` | string | "Trụ nội bộ", "Quang Minh", "Vãng Lai" |
| `doi_tuong` | `object` | string | NAK/Vendor |
| `bien_so_xe` | `license_plate` | string | Vehicle plate |
| `ten_tai_xe` | `driver_name` | string | Driver name |
| `loai_nhien_lieu` | `fuel_type` | string | Fuel type |
| `so_luong` | `quantity` | number | Quantity (liters) |
| `don_gia` | `unit_price` | number | **AUTO-CALCULATED** |
| `thanh_tien` | `total_amount` | number | Total amount |
| `so_odo` | `odo_number` | number | ODO reading |
| `trang_thai` | `status` | string | Status |
| `hang_muc` | `category` | string | Chốt đầu/Đổ dặm/Chốt cuối |

### Sample Data
```
ID: f0d008eb
Date: 2025-12-30
Source: Trụ nội bộ (Internal Tank)
Vehicle: 29H81622
Driver: Nguyễn Huy Tâm
Fuel: DO005
Quantity: 660 L
ODO: 1,066,710 km
Status: Đã xử lý
```

---

## 👥 TABLE 5: `nhan_vien` (Employees)

### Key Fields
```sql
ma_nhan_vien VARCHAR(255) PRIMARY KEY,
ho_va_ten TEXT,
phong_ban TEXT,
chuc_vu TEXT,
chat_id TEXT,  -- Telegram Chat ID
phan_quyen TEXT,  -- Permissions
```

### Mapping
- Direct mapping to `/api/employees`
- Used for Telegram bot authentication
- Role-based access control

---

## 🚛 TABLE 6: `phuong_tien` (Vehicles)

### Key Fields
```sql
bien_kiem_soat VARCHAR(255) PRIMARY KEY,
tai_trong NUMERIC,
hieu_xe TEXT,
loai_xe TEXT,
dinh_muc_dau TEXT,
loai_hinh TEXT,  -- NAK/Vendor
```

### Mapping
- Direct mapping to `/api/vehicles`
- Used in fuel transaction lookups

---

## 🎯 MIGRATION STRATEGY

### Phase 1: Create Database Wrapper (lib/db.ts)
```typescript
import { Client } from 'pg';

const DATABASE_URL = process.env.POSTGRES_URL;

export async function queryDatabase(sql: string, params?: any[]) {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    return await client.query(sql, params);
  } finally {
    await client.end();
  }
}
```

### Phase 2: Update Environment Variables
```env
# .env.local & Vercel
POSTGRES_URL=postgresql://postgres:123@163.223.12.189:5432/nak_vn
```

### Phase 3: Create View for Reconciliation
```sql
CREATE OR REPLACE VIEW reconciliation_orders AS
SELECT 
  ROW_NUMBER() OVER (ORDER BY cd.ngay_tao DESC) as id,
  cd.ma_chuyen_di as order_id,
  cd.ngay_tao as date,
  cd.ten_khach_hang as customer,
  cd.ten_tuyen as route_name,
  cd.ten_tai_xe as driver_name,
  CASE 
    WHEN cd.don_vi_van_chuyen = 'NAK' THEN 'NAK'
    WHEN cd.don_vi_van_chuyen LIKE '%Vendor%' THEN 'VENDOR'
    ELSE 'OTHER'
  END as provider,
  cd.loai_chuyen as trip_type,
  cd.loai_tuyen as route_type,
  cd.doanh_thu as revenue,
  cd.tong_chi_phi_khoan as cost,
  cd.so_km_theo_odo as total_distance,
  CASE
    WHEN cd.trang_thai_chuyen_di = 'Kết thúc' THEN 'approved'
    WHEN cd.trang_thai_chuyen_di = 'Đang thực hiện' THEN 'pending'
    ELSE 'rejected'
  END as status,
  cd.ghi_chu as note,
  (
    SELECT json_agg(
      json_build_object(
        'id', ct.Id,
        'bienKiemSoat', ct.bien_kiem_soat,
        'loTrinh', ct.lo_trinh,
        'loTrinhChiTiet', ct.lo_trinh_chi_tiet_theo_diem,
        'quangDuong', CAST(ct.quang_duong AS NUMERIC),
        'taiTrong', CAST(ct.tai_trong AS NUMERIC),
        'soChieu', CAST(ct.so_chieu AS INTEGER),
        'donGia', CAST(ct.don_gia AS NUMERIC),
        'thanhTien', CAST(ct.ket_qua AS NUMERIC),
        'hinhThucTinhGia', ct.hinh_thuc_tinh_gia,
        'loaiCa', ct.loai_ca
      )
    )
    FROM chi_tiet_chuyen_di ct
    WHERE ct.ma_chuyen_di = cd.ma_chuyen_di
  ) as details,
  cd.thoi_gian_tao as created_at
FROM chuyen_di cd;
```

### Phase 4: Update API Routes
Replace Vercel Postgres imports with new connection:
```typescript
// Before
import { sql } from '@vercel/postgres';

// After
import { queryDatabase } from '@/lib/db';
```

---

## ⚠️ CRITICAL NOTES

1. **Data Type Conversion**: Many numeric fields stored as TEXT in `chi_tiet_chuyen_di`
2. **Status Mapping**: Vietnamese status strings need normalization
3. **Auto-Pricing**: `xuat_nhien_lieu.don_gia` should be auto-calculated from FIFO
4. **Foreign Keys**: No explicit FK constraints, need application-level enforcement
5. **Indexes**: Need to create indexes for performance:
   - `chuyen_di(ngay_tao, trang_thai_chuyen_di)`
   - `chi_tiet_chuyen_di(ma_chuyen_di)`
   - `xuat_nhien_lieu(ngay_tao, loai_hinh)`
   - `nhap_nhien_lieu(ngay_nhap)`

---

## 📊 NEXT STEPS

- [ ] 1. Update `.env.local` với connection string mới
- [ ] 2. Create `lib/db.ts` wrapper
- [ ] 3. Create database VIEW `reconciliation_orders`
- [ ] 4. Refactor `/api/reconciliation/route.ts`
- [ ] 5. Refactor `/api/fuel/` endpoints
- [ ] 6. Test all API endpoints
- [ ] 7. Deploy to Vercel
- [ ] 8. Update Vercel environment variables

---

**Generated by:** Database Schema Analysis Tool  
**Last Updated:** January 22, 2026
