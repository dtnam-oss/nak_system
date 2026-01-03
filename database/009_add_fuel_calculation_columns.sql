-- =============================================================================
-- MIGRATION: Add Calculation Columns to fuel_transactions
-- Date: 2026-01-03
-- Purpose: Add columns for auto-calculation logic (km_traveled, efficiency, is_full_tank)
-- =============================================================================

-- Add calculation columns
ALTER TABLE fuel_transactions 
ADD COLUMN IF NOT EXISTS is_full_tank BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS km_traveled DECIMAL(10, 2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS total_fuel_period DECIMAL(10, 2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS efficiency DECIMAL(10, 4) DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN fuel_transactions.is_full_tank IS 'Cờ đánh dấu đổ đầy (TRUE = Chốt tháng/Bàn giao/Khởi tạo, FALSE = Đổ dặm)';
COMMENT ON COLUMN fuel_transactions.km_traveled IS 'Quãng đường đi được từ lần đổ đầy trước (km)';
COMMENT ON COLUMN fuel_transactions.total_fuel_period IS 'Tổng nhiên liệu tiêu thụ trong khoảng (lít)';
COMMENT ON COLUMN fuel_transactions.efficiency IS 'Hiệu suất tiêu thụ (lít/100km)';

-- Create indexes for query performance
CREATE INDEX IF NOT EXISTS idx_fuel_trans_full_tank ON fuel_transactions(is_full_tank) WHERE is_full_tank = TRUE;
CREATE INDEX IF NOT EXISTS idx_fuel_trans_plate_date ON fuel_transactions(license_plate, transaction_date);
CREATE INDEX IF NOT EXISTS idx_fuel_trans_efficiency ON fuel_transactions(efficiency) WHERE efficiency IS NOT NULL;

-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- Check schema
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'fuel_transactions'
  AND column_name IN ('is_full_tank', 'km_traveled', 'total_fuel_period', 'efficiency')
ORDER BY ordinal_position;

-- =============================================================================
-- ROLLBACK (if needed)
-- =============================================================================
/*
ALTER TABLE fuel_transactions 
DROP COLUMN IF EXISTS is_full_tank,
DROP COLUMN IF EXISTS km_traveled,
DROP COLUMN IF EXISTS total_fuel_period,
DROP COLUMN IF EXISTS efficiency;

DROP INDEX IF EXISTS idx_fuel_trans_full_tank;
DROP INDEX IF EXISTS idx_fuel_trans_plate_date;
DROP INDEX IF EXISTS idx_fuel_trans_efficiency;
*/
