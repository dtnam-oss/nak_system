/**
 * =============================================================================
 * MIGRATION: Update vehicles table with additional columns
 * =============================================================================
 * 
 * Purpose: Thêm các cột mới cho bảng vehicles theo yêu cầu người dùng
 * File: 011_update_vehicles_table.sql
 * Date: January 18, 2026
 * 
 * =============================================================================
 */

ALTER TABLE vehicles 
ADD COLUMN IF NOT EXISTS purchase_date DATE,
ADD COLUMN IF NOT EXISTS depreciation_period VARCHAR(100),
ADD COLUMN IF NOT EXISTS first_registration_date DATE,
ADD COLUMN IF NOT EXISTS next_registration_deadline DATE,
ADD COLUMN IF NOT EXISTS label VARCHAR(255),
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS icon_url TEXT,
ADD COLUMN IF NOT EXISTS cargo_box_dimension VARCHAR(255),
ADD COLUMN IF NOT EXISTS volume DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS area VARCHAR(100),
ADD COLUMN IF NOT EXISTS lat_lng VARCHAR(100),
ADD COLUMN IF NOT EXISTS created_at_original TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS created_by VARCHAR(100),
ADD COLUMN IF NOT EXISTS creation_time VARCHAR(50),
ADD COLUMN IF NOT EXISTS history JSONB,
ADD COLUMN IF NOT EXISTS year INTEGER,
ADD COLUMN IF NOT EXISTS month INTEGER,
ADD COLUMN IF NOT EXISTS manager VARCHAR(100),
ADD COLUMN IF NOT EXISTS partner_vehicle BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS status VARCHAR(50);

-- Add comments for documentation
COMMENT ON COLUMN vehicles.purchase_date IS 'Ngày mua xe';
COMMENT ON COLUMN vehicles.depreciation_period IS 'Thời gian khấu hao';
COMMENT ON COLUMN vehicles.first_registration_date IS 'Thời gian đăng kiểm lần đầu';
COMMENT ON COLUMN vehicles.next_registration_deadline IS 'Hạn đăng kiểm tiếp theo';
COMMENT ON COLUMN vehicles.label IS 'Nhãn xe';
COMMENT ON COLUMN vehicles.image_url IS 'Hình ảnh xe (URL)';
COMMENT ON COLUMN vehicles.icon_url IS 'Icon xe (URL)';
COMMENT ON COLUMN vehicles.cargo_box_dimension IS 'Kích thước thùng';
COMMENT ON COLUMN vehicles.volume IS 'Thể tích';
COMMENT ON COLUMN vehicles.area IS 'Khu vực';
COMMENT ON COLUMN vehicles.lat_lng IS 'Tọa độ Lat/Long';
COMMENT ON COLUMN vehicles.created_at_original IS 'Ngày tạo (từ hệ thống cũ)';
COMMENT ON COLUMN vehicles.created_by IS 'Người tạo';
COMMENT ON COLUMN vehicles.creation_time IS 'Thời gian tạo';
COMMENT ON COLUMN vehicles.history IS 'Lịch sử thay đổi (JSON)';
COMMENT ON COLUMN vehicles.year IS 'Năm';
COMMENT ON COLUMN vehicles.month IS 'Tháng';
COMMENT ON COLUMN vehicles.manager IS 'Quản lý xe';
COMMENT ON COLUMN vehicles.partner_vehicle IS 'Xe đối tác (True/False)';
COMMENT ON COLUMN vehicles.status IS 'Trạng thái tổng quát';
