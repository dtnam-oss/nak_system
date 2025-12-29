-- =====================================================
-- NAK Logistics System - Database Migration
-- File: 001_create_reconciliation_orders.sql
-- Description: Create reconciliation_orders table with indexes
-- Author: System Migration
-- Date: 2024-12-29
-- =====================================================

-- Drop table if exists (CAUTION: This will delete all data)
-- Uncomment the line below only if you want to recreate the table
-- DROP TABLE IF EXISTS reconciliation_orders CASCADE;

-- Create reconciliation_orders table
CREATE TABLE IF NOT EXISTS reconciliation_orders (
    -- Primary key
    id SERIAL PRIMARY KEY,

    -- Order information
    order_id VARCHAR(50) UNIQUE NOT NULL,
    date DATE NOT NULL,

    -- Vehicle information
    license_plate VARCHAR(20) NOT NULL,

    -- Route information
    route VARCHAR(255),

    -- Customer information
    customer VARCHAR(100),

    -- Metrics
    weight NUMERIC(10, 2),  -- Weight in tons
    cost NUMERIC(15, 0),    -- Cost in VND

    -- Status
    status VARCHAR(20) CHECK (status IN ('approved', 'pending', 'rejected')) NOT NULL,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- Create Indexes for Performance
-- =====================================================

-- Index for date-based queries (most common)
CREATE INDEX IF NOT EXISTS idx_reconciliation_date
ON reconciliation_orders(date DESC, created_at DESC);

-- Index for customer searches
CREATE INDEX IF NOT EXISTS idx_reconciliation_customer
ON reconciliation_orders(customer);

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_reconciliation_status
ON reconciliation_orders(status);

-- Index for order_id lookups
CREATE INDEX IF NOT EXISTS idx_reconciliation_order_id
ON reconciliation_orders(order_id);

-- Index for license plate searches
CREATE INDEX IF NOT EXISTS idx_reconciliation_license_plate
ON reconciliation_orders(license_plate);

-- Composite index for common filter combinations
CREATE INDEX IF NOT EXISTS idx_reconciliation_date_status
ON reconciliation_orders(date DESC, status);

-- =====================================================
-- Insert Sample Data (Optional - for testing)
-- =====================================================

-- Insert 10 sample records for testing
INSERT INTO reconciliation_orders (order_id, date, license_plate, route, customer, weight, cost, status)
VALUES
  -- Approved orders
  ('NAK-2024-001', '2024-12-25', '51A-12345', 'TP.HCM - Hà Nội', 'Công ty TNHH ABC Logistics', 15.50, 5000000, 'approved'),
  ('NAK-2024-003', '2024-12-27', '51C-11111', 'TP.HCM - Cần Thơ', 'Công ty CP Vận tải DEF', 12.30, 3500000, 'approved'),
  ('NAK-2024-005', '2024-12-28', '51E-33333', 'TP.HCM - Đà Lạt', 'Công ty TNHH JKL Transport', 18.00, 6500000, 'approved'),
  ('NAK-2024-007', '2024-12-29', '51G-55555', 'TP.HCM - Nha Trang', 'Công ty ABC Logistics', 22.50, 8000000, 'approved'),

  -- Pending orders
  ('NAK-2024-002', '2024-12-26', '51B-67890', 'TP.HCM - Đà Nẵng', 'Công ty TNHH XYZ Express', 20.00, 7500000, 'pending'),
  ('NAK-2024-006', '2024-12-28', '51F-44444', 'TP.HCM - Biên Hòa', 'Công ty CP MNO Shipping', 8.50, 2000000, 'pending'),
  ('NAK-2024-008', '2024-12-29', '51H-66666', 'TP.HCM - Phan Thiết', 'Công ty TNHH XYZ Express', 14.20, 4500000, 'pending'),

  -- Rejected orders
  ('NAK-2024-004', '2024-12-27', '51D-22222', 'TP.HCM - Vũng Tàu', 'Công ty CP GHI Cargo', 8.50, 2000000, 'rejected'),
  ('NAK-2024-009', '2024-12-29', '51I-77777', 'TP.HCM - Tây Ninh', 'Công ty CP Vận tải DEF', 10.00, 3000000, 'rejected'),
  ('NAK-2024-010', '2024-12-30', '51J-88888', 'TP.HCM - Long An', 'Công ty TNHH ABC Logistics', 6.50, 1800000, 'rejected')
ON CONFLICT (order_id) DO NOTHING;

-- =====================================================
-- Create Updated_at Trigger Function
-- =====================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function before UPDATE
DROP TRIGGER IF EXISTS update_reconciliation_orders_updated_at ON reconciliation_orders;
CREATE TRIGGER update_reconciliation_orders_updated_at
    BEFORE UPDATE ON reconciliation_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Verify Setup
-- =====================================================

-- Check table structure
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'reconciliation_orders'
ORDER BY ordinal_position;

-- Check indexes
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'reconciliation_orders';

-- Check record count
SELECT
    status,
    COUNT(*) as count
FROM reconciliation_orders
GROUP BY status
ORDER BY status;

-- Display sample records
SELECT
    order_id,
    date,
    customer,
    cost,
    status
FROM reconciliation_orders
ORDER BY date DESC
LIMIT 5;

-- =====================================================
-- Migration Complete
-- =====================================================

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Migration complete: reconciliation_orders table created successfully';
    RAISE NOTICE '📊 Indexes created for optimal query performance';
    RAISE NOTICE '🔄 Auto-update trigger enabled for updated_at column';
    RAISE NOTICE '📝 Sample data inserted (10 records)';
END $$;
