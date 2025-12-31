/**
 * =============================================================================
 * MIGRATION: Create vehicles table
 * =============================================================================
 * 
 * Purpose: Tạo bảng vehicles để lưu thông tin phương tiện
 * File: 005_create_vehicles_table.sql
 * Date: December 31, 2025
 * 
 * Usage:
 *   Chạy script này trên Vercel Postgres Dashboard hoặc qua psql client
 *   để tạo bảng vehicles với đầy đủ constraints và indexes
 * 
 * =============================================================================
 */

-- Drop table if exists (careful in production!)
-- DROP TABLE IF EXISTS vehicles CASCADE;

-- Create vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
  -- Primary Key
  id SERIAL PRIMARY KEY,
  
  -- Unique identifier
  license_plate VARCHAR(20) NOT NULL UNIQUE,
  
  -- Vehicle specifications
  weight_capacity DECIMAL(10, 2) DEFAULT 0,        -- Tải trọng (số)
  weight_unit VARCHAR(20),                         -- Đơn vị (kg, tấn, ...)
  weight_text TEXT,                                -- Tải trọng bằng chữ
  brand VARCHAR(100),                              -- Hiệu xe (Hino, Isuzu, ...)
  body_type VARCHAR(100),                          -- Loại xe (Thùng kín, Mui bạt, ...)
  
  -- Status and operational info
  current_status VARCHAR(50),                      -- Tình trạng (Đang hoạt động, Bảo dưỡng, ...)
  fuel_norm DECIMAL(10, 2) DEFAULT 0,             -- Định mức dầu (lít/100km)
  
  -- Assignment
  assigned_driver_codes TEXT,                      -- Mã tài xế được phân công (comma-separated)
  provider VARCHAR(50),                            -- Loại hình (Xe thuê, Xe tự có, ...)
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_vehicles_license_plate ON vehicles(license_plate);
CREATE INDEX IF NOT EXISTS idx_vehicles_current_status ON vehicles(current_status);
CREATE INDEX IF NOT EXISTS idx_vehicles_provider ON vehicles(provider);
CREATE INDEX IF NOT EXISTS idx_vehicles_brand ON vehicles(brand);

-- Add comments for documentation
COMMENT ON TABLE vehicles IS 'Bảng lưu trữ thông tin phương tiện (xe)';
COMMENT ON COLUMN vehicles.license_plate IS 'Biển kiểm soát (unique identifier)';
COMMENT ON COLUMN vehicles.weight_capacity IS 'Tải trọng xe (số, đơn vị: theo weight_unit)';
COMMENT ON COLUMN vehicles.weight_unit IS 'Đơn vị tải trọng (kg, tấn, ...)';
COMMENT ON COLUMN vehicles.weight_text IS 'Tải trọng bằng chữ (VD: "Một chấm chín tấn")';
COMMENT ON COLUMN vehicles.brand IS 'Hiệu xe (Hino, Isuzu, Thaco, ...)';
COMMENT ON COLUMN vehicles.body_type IS 'Loại thùng xe (Thùng kín, Mui bạt, Đông lạnh, ...)';
COMMENT ON COLUMN vehicles.current_status IS 'Tình trạng hiện tại (Đang hoạt động, Bảo dưỡng, Hỏng, ...)';
COMMENT ON COLUMN vehicles.fuel_norm IS 'Định mức tiêu hao nhiên liệu (lít/100km)';
COMMENT ON COLUMN vehicles.assigned_driver_codes IS 'Danh sách mã tài xế được phân công (comma-separated)';
COMMENT ON COLUMN vehicles.provider IS 'Loại hình sở hữu (Xe thuê, Xe tự có, Xe đối tác, ...)';

-- Grant permissions (adjust as needed)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON vehicles TO your_app_user;
-- GRANT USAGE, SELECT ON SEQUENCE vehicles_id_seq TO your_app_user;

-- Verify table creation
SELECT 
  table_name, 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'vehicles'
ORDER BY ordinal_position;
