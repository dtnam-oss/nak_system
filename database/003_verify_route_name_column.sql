-- =====================================================
-- NAK Logistics System - Verify Route Name Column
-- File: 003_verify_route_name_column.sql
-- Description: Ensure route_name column exists and is properly configured
-- Author: Senior Backend Developer
-- Date: 2024-12-30
-- =====================================================

-- =====================================================
-- Step 1: Verify Column Exists
-- =====================================================

-- Check if route_name column exists
SELECT 
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'reconciliation_orders' 
  AND column_name = 'route_name';

-- Expected output:
-- column_name | data_type      | character_maximum_length | is_nullable | column_default
-- route_name  | character varying | 255                    | YES         | NULL


-- =====================================================
-- Step 2: Add Column if Not Exists (Safe Migration)
-- =====================================================

-- This is idempotent - safe to run multiple times
ALTER TABLE reconciliation_orders
ADD COLUMN IF NOT EXISTS route_name VARCHAR(255);

-- =====================================================
-- Step 3: Create Index for Performance (if not exists)
-- =====================================================

-- Index for route_name searching and filtering
CREATE INDEX IF NOT EXISTS idx_reconciliation_route_name
ON reconciliation_orders(route_name);

-- =====================================================
-- Step 4: Backfill Existing Records (Optional)
-- =====================================================

-- If you have existing records with NULL route_name, 
-- you can backfill them using this query:

-- Update records where route_name is NULL
-- Generate from: route_type - customer
UPDATE reconciliation_orders
SET route_name = CASE
  -- If both route_type and customer exist
  WHEN route_type IS NOT NULL AND customer IS NOT NULL 
    THEN CONCAT(route_type, ' - ', customer)
  -- If only route_type exists
  WHEN route_type IS NOT NULL AND customer IS NULL 
    THEN route_type
  -- If only customer exists
  WHEN route_type IS NULL AND customer IS NOT NULL 
    THEN customer
  -- Fallback
  ELSE 'Chưa xác định'
END
WHERE route_name IS NULL OR route_name = '';

-- =====================================================
-- Step 5: Verify Data Quality
-- =====================================================

-- Check route_name distribution
SELECT 
  CASE 
    WHEN route_name IS NULL THEN 'NULL'
    WHEN route_name = '' THEN 'EMPTY'
    ELSE 'HAS_VALUE'
  END as route_name_status,
  COUNT(*) as count
FROM reconciliation_orders
GROUP BY route_name_status
ORDER BY count DESC;

-- Sample routes to verify
SELECT 
  order_id,
  route_name,
  route_type,
  customer,
  created_at
FROM reconciliation_orders
ORDER BY created_at DESC
LIMIT 20;

-- =====================================================
-- Step 6: Add NOT NULL Constraint (Optional - Use with Caution)
-- =====================================================

-- ONLY run this if you want to enforce route_name as required
-- Make sure ALL existing records have route_name first!

-- Uncomment to enforce NOT NULL:
-- ALTER TABLE reconciliation_orders
-- ALTER COLUMN route_name SET NOT NULL;

-- =====================================================
-- Verification Complete
-- =====================================================

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Route name column verification complete';
    RAISE NOTICE '📊 Column: route_name (VARCHAR 255)';
    RAISE NOTICE '🔍 Index: idx_reconciliation_route_name created';
    RAISE NOTICE '📝 Check verification results above';
END $$;
