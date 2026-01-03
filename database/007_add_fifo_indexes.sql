-- =============================================================================
-- MIGRATION: Add Indexes for FIFO Inventory Performance
-- Date: 2026-01-03
-- Purpose: Optimize FIFO calculation queries by adding indexes on timestamp columns
-- =============================================================================

-- Step 1: Add index on fuel_imports.import_date for FIFO ordering
CREATE INDEX IF NOT EXISTS idx_fuel_imports_import_date 
ON fuel_imports(import_date ASC, created_at ASC);

COMMENT ON INDEX idx_fuel_imports_import_date IS 
'Optimizes FIFO inventory calculation - sorts imports by date ascending';

-- Step 2: Add index on fuel_transactions.transaction_date for FIFO matching
CREATE INDEX IF NOT EXISTS idx_fuel_transactions_transaction_date 
ON fuel_transactions(transaction_date ASC, updated_at ASC);

COMMENT ON INDEX idx_fuel_transactions_transaction_date IS 
'Optimizes FIFO inventory calculation - sorts transactions by date ascending';

-- Step 3: Add composite index on fuel_transactions for filtered queries
CREATE INDEX IF NOT EXISTS idx_fuel_transactions_source_date 
ON fuel_transactions(fuel_source, transaction_date ASC);

COMMENT ON INDEX idx_fuel_transactions_source_date IS 
'Optimizes queries filtering by fuel_source (e.g., "Trụ nội bộ") with date ordering';

-- Step 4: Verify indexes
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
    AND tablename IN ('fuel_imports', 'fuel_transactions')
ORDER BY tablename, indexname;

-- =============================================================================
-- EXPECTED PERFORMANCE IMPROVEMENT:
-- =============================================================================
-- Before: Full table scan on both tables (O(n*m) complexity)
-- After:  Index scan with sorted results (O(n log n) complexity)
-- 
-- Estimated speedup:
-- - 1000 imports + 10000 transactions: 10x faster
-- - 5000 imports + 50000 transactions: 50x faster
--
-- =============================================================================

-- =============================================================================
-- ROLLBACK (if needed):
-- =============================================================================
-- DROP INDEX IF EXISTS idx_fuel_imports_import_date;
-- DROP INDEX IF EXISTS idx_fuel_transactions_transaction_date;
-- DROP INDEX IF EXISTS idx_fuel_transactions_source_date;
