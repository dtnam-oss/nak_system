-- =====================================================
-- NAK Logistics System - Schema Upgrade
-- File: 002_upgrade_reconciliation_schema.sql
-- Description: Upgrade reconciliation_orders to full schema
-- Author: System Migration
-- Date: 2024-12-29
-- =====================================================

-- Start transaction to ensure atomic operation
BEGIN;

-- =====================================================
-- Add New Columns to Existing Table
-- =====================================================

-- Trip and Route Information
ALTER TABLE reconciliation_orders
ADD COLUMN IF NOT EXISTS trip_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS route_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS route_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS driver_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS provider VARCHAR(50);

-- Metrics
ALTER TABLE reconciliation_orders
ADD COLUMN IF NOT EXISTS total_distance NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS weight NUMERIC(10, 2) DEFAULT 0;

-- Complex Data (JSONB for nested route details)
ALTER TABLE reconciliation_orders
ADD COLUMN IF NOT EXISTS details JSONB;

-- =====================================================
-- Update Existing Columns (if needed)
-- =====================================================

-- Rename 'route' to 'route_name' for consistency (optional)
-- Uncomment if you want to rename
-- ALTER TABLE reconciliation_orders RENAME COLUMN route TO route_name;

-- Make sure cost allows NULL (if not already)
ALTER TABLE reconciliation_orders
ALTER COLUMN cost DROP NOT NULL;

-- Make sure weight allows NULL
ALTER TABLE reconciliation_orders
ALTER COLUMN weight DROP NOT NULL;

-- =====================================================
-- Create Additional Indexes for New Columns
-- =====================================================

-- Index for trip_type filtering
CREATE INDEX IF NOT EXISTS idx_reconciliation_trip_type
ON reconciliation_orders(trip_type);

-- Index for route_type filtering
CREATE INDEX IF NOT EXISTS idx_reconciliation_route_type
ON reconciliation_orders(route_type);

-- Index for provider filtering
CREATE INDEX IF NOT EXISTS idx_reconciliation_provider
ON reconciliation_orders(provider);

-- Index for driver_name searching
CREATE INDEX IF NOT EXISTS idx_reconciliation_driver
ON reconciliation_orders(driver_name);

-- GIN index for JSONB queries on details column
CREATE INDEX IF NOT EXISTS idx_reconciliation_details
ON reconciliation_orders USING gin(details);

-- Composite index for common filter combinations
CREATE INDEX IF NOT EXISTS idx_reconciliation_date_provider_status
ON reconciliation_orders(date DESC, provider, status);

-- =====================================================
-- Add Constraints
-- =====================================================

-- Check constraint for provider
ALTER TABLE reconciliation_orders
ADD CONSTRAINT check_provider CHECK (provider IN ('NAK', 'VENDOR', 'OTHER') OR provider IS NULL);

-- Check constraint for trip_type (example values)
ALTER TABLE reconciliation_orders
ADD CONSTRAINT check_trip_type CHECK (
  trip_type IN ('Một chiều', 'Hai chiều', 'Nhiều điểm') OR trip_type IS NULL
);

-- Check constraint for route_type (example values)
ALTER TABLE reconciliation_orders
ADD CONSTRAINT check_route_type CHECK (
  route_type IN ('Nội thành', 'Liên tỉnh', 'Đường dài') OR route_type IS NULL
);

-- =====================================================
-- Update Existing Sample Data (Optional)
-- =====================================================

-- Add sample data to new columns for existing records
UPDATE reconciliation_orders
SET
  trip_type = CASE
    WHEN order_id = 'NAK-2024-001' THEN 'Một chiều'
    WHEN order_id = 'NAK-2024-002' THEN 'Hai chiều'
    WHEN order_id = 'NAK-2024-003' THEN 'Một chiều'
    ELSE 'Một chiều'
  END,
  route_type = CASE
    WHEN route ILIKE '%Hà Nội%' OR route ILIKE '%Đà Nẵng%' THEN 'Liên tỉnh'
    WHEN route ILIKE '%Biên Hòa%' OR route ILIKE '%Vũng Tàu%' THEN 'Nội thành'
    ELSE 'Liên tỉnh'
  END,
  route_name = route,
  driver_name = CASE
    WHEN order_id = 'NAK-2024-001' THEN 'Nguyễn Văn A'
    WHEN order_id = 'NAK-2024-002' THEN 'Trần Văn B'
    WHEN order_id = 'NAK-2024-003' THEN 'Lê Văn C'
    WHEN order_id = 'NAK-2024-004' THEN 'Phạm Văn D'
    WHEN order_id = 'NAK-2024-005' THEN 'Hoàng Văn E'
    ELSE 'Nguyễn Văn X'
  END,
  provider = CASE
    WHEN order_id IN ('NAK-2024-001', 'NAK-2024-003', 'NAK-2024-005', 'NAK-2024-007') THEN 'NAK'
    ELSE 'VENDOR'
  END,
  total_distance = CASE
    WHEN route ILIKE '%Hà Nội%' THEN 1700.0
    WHEN route ILIKE '%Đà Nẵng%' THEN 950.0
    WHEN route ILIKE '%Nha Trang%' THEN 450.0
    WHEN route ILIKE '%Đà Lạt%' THEN 300.0
    WHEN route ILIKE '%Cần Thơ%' THEN 170.0
    WHEN route ILIKE '%Vũng Tàu%' THEN 125.0
    WHEN route ILIKE '%Biên Hòa%' THEN 35.0
    WHEN route ILIKE '%Phan Thiết%' THEN 200.0
    ELSE 100.0
  END,
  details = jsonb_build_object(
    'thongTinChuyenDi', jsonb_build_object(
      'soXe', license_plate,
      'taiXe', CASE
        WHEN order_id = 'NAK-2024-001' THEN 'Nguyễn Văn A'
        WHEN order_id = 'NAK-2024-002' THEN 'Trần Văn B'
        ELSE 'Driver Name'
      END,
      'quangDuong', total_distance,
      'donGia', (cost::numeric / NULLIF(total_distance, 0))::numeric(10, 2)
    ),
    'chiTietLoTrinh', jsonb_build_array(
      jsonb_build_object(
        'thuTu', 1,
        'loTrinh', route,
        'quangDuong', total_distance,
        'taiTrong', weight,
        'thanhTien', cost
      )
    )
  )
WHERE details IS NULL;

-- =====================================================
-- Verify Schema Upgrade
-- =====================================================

-- Check table structure
DO $$
BEGIN
  RAISE NOTICE '=== Verifying Schema Upgrade ===';
END $$;

-- Display column structure
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'reconciliation_orders'
ORDER BY ordinal_position;

-- Display constraints
SELECT
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'reconciliation_orders'::regclass;

-- Display indexes
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'reconciliation_orders'
ORDER BY indexname;

-- Sample data with new columns
SELECT
  order_id,
  date,
  customer,
  trip_type,
  route_type,
  driver_name,
  provider,
  total_distance,
  cost,
  status,
  jsonb_pretty(details) AS details_preview
FROM reconciliation_orders
ORDER BY date DESC
LIMIT 3;

-- =====================================================
-- Migration Complete
-- =====================================================

COMMIT;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Schema upgrade complete!';
  RAISE NOTICE '📊 New columns added: trip_type, route_type, route_name, driver_name, provider, total_distance, details';
  RAISE NOTICE '🔍 New indexes created for optimal query performance';
  RAISE NOTICE '✅ Sample data updated with realistic values';
  RAISE NOTICE '🎯 JSONB details column ready for complex nested data';
END $$;
