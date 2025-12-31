-- =====================================================
-- NAK Logistics System - Database Migration
-- File: 005_add_revenue_column.sql
-- Description: Add revenue column and migrate data from cost column
-- Author: System Migration
-- Date: 2024-12-31
-- =====================================================

-- Step 1: Add revenue column
ALTER TABLE reconciliation_orders
ADD COLUMN IF NOT EXISTS revenue NUMERIC(15, 0) DEFAULT 0;

-- Step 2: Migrate existing data from cost to revenue
-- (Cost column was previously storing revenue/doanh thu)
UPDATE reconciliation_orders
SET revenue = cost
WHERE revenue = 0 OR revenue IS NULL;

-- Step 3: Reset cost column to 0 (will be used for actual costs/chi phí going forward)
UPDATE reconciliation_orders
SET cost = 0;

-- Step 4: Add comment to columns for clarity
COMMENT ON COLUMN reconciliation_orders.revenue IS 'Doanh thu (Revenue) - Incoming money from customer';
COMMENT ON COLUMN reconciliation_orders.cost IS 'Chi phí (Cost) - Outgoing expenses';

-- Step 5: Create index on revenue column for performance
CREATE INDEX IF NOT EXISTS idx_reconciliation_revenue
ON reconciliation_orders(revenue);

-- =====================================================
-- Verification Query
-- =====================================================
-- Run this to verify the migration:
-- SELECT order_id, revenue, cost FROM reconciliation_orders LIMIT 10;
