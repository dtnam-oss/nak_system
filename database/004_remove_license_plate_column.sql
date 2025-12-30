-- =====================================================
-- NAK Logistics System - Remove License Plate Column
-- File: 004_remove_license_plate_column.sql
-- Description: Remove redundant license_plate column
-- Reason: license_plate was storing maChuyenDi (duplicate of order_id)
-- Date: 2024-12-31
-- =====================================================

-- Start transaction
BEGIN;

-- =====================================================
-- Step 1: Verify Data (Optional - for safety)
-- =====================================================

-- Check if license_plate contains same data as order_id
-- Uncomment to verify before dropping:
-- SELECT 
--   order_id,
--   license_plate,
--   CASE 
--     WHEN order_id = license_plate THEN 'Same'
--     ELSE 'Different'
--   END as comparison
-- FROM reconciliation_orders
-- WHERE license_plate IS NOT NULL
-- LIMIT 10;

-- =====================================================
-- Step 2: Drop Indexes (if any exist)
-- =====================================================

-- Drop index on license_plate if it exists
DROP INDEX IF EXISTS idx_reconciliation_license_plate;

-- =====================================================
-- Step 3: Drop Column
-- =====================================================

-- Remove license_plate column from reconciliation_orders
ALTER TABLE reconciliation_orders
DROP COLUMN IF EXISTS license_plate;

-- =====================================================
-- Step 4: Verify Schema
-- =====================================================

-- Check table structure after dropping column
-- Uncomment to verify:
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'reconciliation_orders'
-- ORDER BY ordinal_position;

-- =====================================================
-- Commit Transaction
-- =====================================================

COMMIT;

-- =====================================================
-- Rollback Instructions (if needed)
-- =====================================================

-- If you need to rollback, run this in a new transaction:
-- BEGIN;
-- ALTER TABLE reconciliation_orders
-- ADD COLUMN license_plate VARCHAR(50);
-- COMMIT;

-- =====================================================
-- Migration Complete
-- =====================================================

-- Summary:
-- ✅ Removed redundant license_plate column
-- ✅ order_id already stores unique trip identifier
-- ✅ Reduced database storage and query overhead
