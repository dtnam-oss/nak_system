-- ============================================================================
-- MIGRATION: Normalize JSONB to Separate Tables
-- Date: 2026-01-22
-- Purpose: Convert reconciliation_orders.details (JSONB) to normalized tables
-- ============================================================================

-- STEP 1: Create new normalized tables
-- ============================================================================

-- Drop existing tables if they exist
DROP TABLE IF EXISTS chi_tiet_chuyen_di CASCADE;
DROP TABLE IF EXISTS chuyen_di CASCADE;

-- Create master table (chuyen_di)
CREATE TABLE chuyen_di (
    id SERIAL PRIMARY KEY,
    ma_chuyen_di VARCHAR(50) UNIQUE NOT NULL,
    ngay_tao DATE NOT NULL,
    ten_khach_hang VARCHAR(100),
    ten_tuyen VARCHAR(255),
    ten_tai_xe VARCHAR(100),
    don_vi_van_chuyen VARCHAR(50),
    loai_chuyen VARCHAR(50),
    loai_tuyen VARCHAR(50),
    trang_thai VARCHAR(20) CHECK (trang_thai IN ('approved', 'pending', 'rejected')),
    tong_quang_duong NUMERIC(10,2),
    tong_doanh_thu NUMERIC(15,0),
    tong_chi_phi NUMERIC(15,0),
    ghi_chu TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create detail table (chi_tiet_chuyen_di)
CREATE TABLE chi_tiet_chuyen_di (
    id SERIAL PRIMARY KEY,
    ma_chuyen_di VARCHAR(50) NOT NULL,
    thu_tu INTEGER,
    
    -- Route info
    loai_tuyen_kh VARCHAR(100),
    ma_tuyen VARCHAR(100),
    lo_trinh VARCHAR(255),
    lo_trinh_chi_tiet TEXT,
    
    -- Vehicle info
    bien_kiem_soat VARCHAR(20),
    
    -- Pricing info
    tai_trong NUMERIC(10,2),
    tai_trong_tinh_phi NUMERIC(10,2),
    quang_duong NUMERIC(10,2),
    so_chieu INTEGER,
    don_gia NUMERIC(15,0),
    thanh_tien NUMERIC(15,0),
    hinh_thuc_tinh_gia VARCHAR(50),
    loai_ca VARCHAR(50),
    
    -- Customer info
    ten_khach_hang_cap_1 VARCHAR(100),
    ngay_tren_tem DATE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (ma_chuyen_di) REFERENCES chuyen_di(ma_chuyen_di) ON DELETE CASCADE
);

-- STEP 2: Create indexes for performance
-- ============================================================================

-- Indexes on chuyen_di
CREATE INDEX idx_chuyen_di_ma ON chuyen_di(ma_chuyen_di);
CREATE INDEX idx_chuyen_di_ngay_tao ON chuyen_di(ngay_tao DESC);
CREATE INDEX idx_chuyen_di_khach_hang ON chuyen_di(ten_khach_hang);
CREATE INDEX idx_chuyen_di_trang_thai ON chuyen_di(trang_thai);
CREATE INDEX idx_chuyen_di_don_vi ON chuyen_di(don_vi_van_chuyen);
CREATE INDEX idx_chuyen_di_created_at ON chuyen_di(created_at DESC);

-- Indexes on chi_tiet_chuyen_di
CREATE INDEX idx_chi_tiet_ma_chuyen_di ON chi_tiet_chuyen_di(ma_chuyen_di);
CREATE INDEX idx_chi_tiet_bien_kiem_soat ON chi_tiet_chuyen_di(bien_kiem_soat);
CREATE INDEX idx_chi_tiet_ma_tuyen ON chi_tiet_chuyen_di(ma_tuyen);
CREATE INDEX idx_chi_tiet_thu_tu ON chi_tiet_chuyen_di(ma_chuyen_di, thu_tu);

-- STEP 3: Migrate data from reconciliation_orders to chuyen_di
-- ============================================================================

INSERT INTO chuyen_di (
    ma_chuyen_di,
    ngay_tao,
    ten_khach_hang,
    ten_tuyen,
    ten_tai_xe,
    don_vi_van_chuyen,
    loai_chuyen,
    loai_tuyen,
    trang_thai,
    tong_quang_duong,
    tong_doanh_thu,
    tong_chi_phi,
    ghi_chu,
    created_at,
    updated_at
)
SELECT 
    order_id as ma_chuyen_di,
    date as ngay_tao,
    customer as ten_khach_hang,
    route_name as ten_tuyen,
    driver_name as ten_tai_xe,
    provider as don_vi_van_chuyen,
    trip_type as loai_chuyen,
    route_type as loai_tuyen,
    status as trang_thai,
    total_distance as tong_quang_duong,
    revenue as tong_doanh_thu,
    cost as tong_chi_phi,
    note as ghi_chu,
    created_at,
    updated_at
FROM reconciliation_orders
ON CONFLICT (ma_chuyen_di) DO UPDATE SET
    ngay_tao = EXCLUDED.ngay_tao,
    ten_khach_hang = EXCLUDED.ten_khach_hang,
    updated_at = CURRENT_TIMESTAMP;

-- STEP 4: Migrate details from JSONB to chi_tiet_chuyen_di
-- ============================================================================

INSERT INTO chi_tiet_chuyen_di (
    ma_chuyen_di,
    thu_tu,
    loai_tuyen_kh,
    ma_tuyen,
    lo_trinh,
    lo_trinh_chi_tiet,
    bien_kiem_soat,
    tai_trong,
    tai_trong_tinh_phi,
    quang_duong,
    so_chieu,
    don_gia,
    thanh_tien,
    hinh_thuc_tinh_gia,
    loai_ca,
    ten_khach_hang_cap_1,
    ngay_tren_tem
)
SELECT 
    ro.order_id as ma_chuyen_di,
    (detail->>'thuTu')::INTEGER as thu_tu,
    detail->>'loaiTuyenKH' as loai_tuyen_kh,
    detail->>'maTuyen' as ma_tuyen,
    detail->>'loTrinh' as lo_trinh,
    detail->>'loTrinhChiTiet' as lo_trinh_chi_tiet,
    detail->>'bienKiemSoat' as bien_kiem_soat,
    (detail->>'taiTrong')::NUMERIC as tai_trong,
    (detail->>'taiTrongTinhPhi')::NUMERIC as tai_trong_tinh_phi,
    (detail->>'quangDuong')::NUMERIC as quang_duong,
    (detail->>'soChieu')::INTEGER as so_chieu,
    (detail->>'donGia')::NUMERIC as don_gia,
    (detail->>'thanhTien')::NUMERIC as thanh_tien,
    detail->>'hinhThucTinhGia' as hinh_thuc_tinh_gia,
    detail->>'loaiCa' as loai_ca,
    detail->>'tenKhachHangCap1' as ten_khach_hang_cap_1,
    (detail->>'ngayTrenTem')::DATE as ngay_tren_tem
FROM reconciliation_orders ro,
     jsonb_array_elements(ro.details->'chiTietLoTrinh') as detail
WHERE ro.details IS NOT NULL 
  AND ro.details->'chiTietLoTrinh' IS NOT NULL;

-- STEP 5: Create views for backward compatibility
-- ============================================================================

-- View: reconciliation_orders_view (for legacy queries)
CREATE OR REPLACE VIEW reconciliation_orders_view AS
SELECT 
    cd.id,
    cd.ma_chuyen_di as order_id,
    cd.ngay_tao as date,
    cd.ten_tuyen as route_name,
    cd.ten_khach_hang as customer,
    NULL as weight, -- Will calculate from details
    cd.tong_doanh_thu as revenue,
    cd.tong_chi_phi as cost,
    cd.trang_thai as status,
    cd.loai_chuyen as trip_type,
    cd.loai_tuyen as route_type,
    cd.ten_tai_xe as driver_name,
    cd.don_vi_van_chuyen as provider,
    cd.tong_quang_duong as total_distance,
    cd.ghi_chu as note,
    
    -- Rebuild JSONB details from chi_tiet_chuyen_di
    jsonb_build_object(
        'chiTietLoTrinh', 
        (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'thuTu', ct.thu_tu,
                    'id', ct.id,
                    'loaiTuyenKH', ct.loai_tuyen_kh,
                    'maTuyen', ct.ma_tuyen,
                    'loTrinh', ct.lo_trinh,
                    'loTrinhChiTiet', ct.lo_trinh_chi_tiet,
                    'bienKiemSoat', ct.bien_kiem_soat,
                    'taiTrong', ct.tai_trong,
                    'taiTrongTinhPhi', ct.tai_trong_tinh_phi,
                    'quangDuong', ct.quang_duong,
                    'soChieu', ct.so_chieu,
                    'donGia', ct.don_gia,
                    'thanhTien', ct.thanh_tien,
                    'hinhThucTinhGia', ct.hinh_thuc_tinh_gia,
                    'loaiCa', ct.loai_ca,
                    'tenKhachHangCap1', ct.ten_khach_hang_cap_1,
                    'ngayTrenTem', ct.ngay_tren_tem
                ) ORDER BY ct.thu_tu
            )
            FROM chi_tiet_chuyen_di ct
            WHERE ct.ma_chuyen_di = cd.ma_chuyen_di
        )
    ) as details,
    
    cd.created_at,
    cd.updated_at
FROM chuyen_di cd;

-- STEP 6: Create triggers for updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_chuyen_di_updated_at ON chuyen_di;
CREATE TRIGGER update_chuyen_di_updated_at
    BEFORE UPDATE ON chuyen_di
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- STEP 7: Verification queries
-- ============================================================================

-- Check record counts
SELECT 'chuyen_di' as table_name, COUNT(*) as count FROM chuyen_di
UNION ALL
SELECT 'chi_tiet_chuyen_di', COUNT(*) FROM chi_tiet_chuyen_di
UNION ALL
SELECT 'reconciliation_orders', COUNT(*) FROM reconciliation_orders;

-- Check sample data
SELECT 
    ma_chuyen_di,
    ngay_tao,
    ten_khach_hang,
    tong_doanh_thu,
    (SELECT COUNT(*) FROM chi_tiet_chuyen_di ct WHERE ct.ma_chuyen_di = cd.ma_chuyen_di) as so_chi_tiet
FROM chuyen_di cd
LIMIT 5;

-- STEP 8: Grant permissions for AppSheet user
-- ============================================================================

-- Create AppSheet user if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'appsheet_user') THEN
        CREATE USER appsheet_user WITH PASSWORD 'secure_password_here';
    END IF;
END
$$;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON chuyen_di TO appsheet_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON chi_tiet_chuyen_di TO appsheet_user;
GRANT USAGE, SELECT ON SEQUENCE chuyen_di_id_seq TO appsheet_user;
GRANT USAGE, SELECT ON SEQUENCE chi_tiet_chuyen_di_id_seq TO appsheet_user;

-- ============================================================================
-- ROLLBACK SCRIPT (if needed)
-- ============================================================================

/*
-- To rollback, run:

DROP VIEW IF EXISTS reconciliation_orders_view;
DROP TABLE IF EXISTS chi_tiet_chuyen_di CASCADE;
DROP TABLE IF EXISTS chuyen_di CASCADE;

-- Keep reconciliation_orders as primary table
*/

-- ============================================================================
-- NOTES FOR PHASE TRANSITION
-- ============================================================================

/*
IMPORTANT: 
1. Run this migration on PostgreSQL server (163.223.12.189:5432)
2. Keep reconciliation_orders table for now (don't drop)
3. Use reconciliation_orders_view for backward compatibility
4. Update Next.js API to query from chuyen_di + chi_tiet_chuyen_di
5. Configure AppSheet to connect to chuyen_di table
6. After 2-4 weeks of stable operation, consider dropping old table

APPSHEET CONFIG:
- Primary Table: chuyen_di
- Detail Table: chi_tiet_chuyen_di (with REF to chuyen_di)
- Connection: Direct PostgreSQL connection
*/
