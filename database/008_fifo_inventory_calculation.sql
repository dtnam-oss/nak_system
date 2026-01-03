-- =============================================================================
-- FIFO INVENTORY CALCULATION - SQL Implementation
-- Date: 2026-01-03
-- Purpose: Calculate inventory using FIFO (First In First Out) logic
--          Only deduct transactions that occur AFTER import timestamp
-- =============================================================================

-- =============================================================================
-- PART 1: STORED FUNCTION - Calculate FIFO Inventory
-- =============================================================================

CREATE OR REPLACE FUNCTION calculate_fifo_inventory()
RETURNS TABLE (
    import_id TEXT,
    import_date TIMESTAMP,
    original_quantity DECIMAL(10,2),
    consumed_quantity DECIMAL(10,2),
    remaining_quantity DECIMAL(10,2),
    avg_price DECIMAL(10,2),
    unit_price DECIMAL(10,2)
) AS $$
DECLARE
    import_record RECORD;
    transaction_record RECORD;
    remaining_in_import DECIMAL(10,2);
    transaction_remaining DECIMAL(10,2);
    consumed_amount DECIMAL(10,2);
BEGIN
    -- Create temporary table to store results
    CREATE TEMP TABLE IF NOT EXISTS temp_fifo_inventory (
        import_id TEXT,
        import_date TIMESTAMP,
        original_quantity DECIMAL(10,2),
        consumed_quantity DECIMAL(10,2),
        remaining_quantity DECIMAL(10,2),
        avg_price DECIMAL(10,2),
        unit_price DECIMAL(10,2)
    ) ON COMMIT DROP;

    -- Loop through each import (FIFO order: oldest first)
    FOR import_record IN 
        SELECT 
            fi.id,
            fi.import_date,
            fi.quantity,
            fi.avg_price,
            fi.unit_price
        FROM fuel_imports fi
        ORDER BY fi.import_date ASC, fi.created_at ASC
    LOOP
        remaining_in_import := import_record.quantity;

        -- Find all transactions that occurred AFTER this import
        FOR transaction_record IN
            SELECT 
                ft.id,
                ft.transaction_date,
                ft.quantity
            FROM fuel_transactions ft
            WHERE LOWER(TRIM(ft.fuel_source)) = 'trụ nội bộ'
                AND ft.transaction_date >= import_record.import_date
            ORDER BY ft.transaction_date ASC, ft.updated_at ASC
        LOOP
            -- Skip if this import is already depleted
            EXIT WHEN remaining_in_import <= 0;

            -- Calculate how much to deduct from this import
            consumed_amount := LEAST(remaining_in_import, transaction_record.quantity);
            remaining_in_import := remaining_in_import - consumed_amount;

            -- Log for debugging
            RAISE NOTICE 'Import %: Deducted % L (Transaction %, Remaining %)',
                import_record.id, consumed_amount, transaction_record.id, remaining_in_import;
        END LOOP;

        -- Insert result for this import
        INSERT INTO temp_fifo_inventory VALUES (
            import_record.id,
            import_record.import_date,
            import_record.quantity,
            import_record.quantity - remaining_in_import,
            remaining_in_import,
            import_record.avg_price,
            import_record.unit_price
        );
    END LOOP;

    -- Return results
    RETURN QUERY SELECT * FROM temp_fifo_inventory;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_fifo_inventory() IS 
'Calculates FIFO inventory by deducting transactions from imports based on timestamps';

-- =============================================================================
-- PART 2: VERIFICATION QUERY - Compare FIFO vs Simple Method
-- =============================================================================

-- Query to see FIFO calculation results
SELECT 
    import_id,
    TO_CHAR(import_date, 'DD/MM/YYYY HH24:MI') as import_time,
    original_quantity || ' L' as nhap,
    consumed_quantity || ' L' as xuat,
    remaining_quantity || ' L' as ton,
    ROUND(avg_price, 2) || ' VND/L' as gia_tb,
    ROUND(remaining_quantity * avg_price, 2) || ' VND' as gia_tri
FROM calculate_fifo_inventory()
WHERE remaining_quantity > 0
ORDER BY import_date DESC;

-- Summary comparison
WITH fifo_calc AS (
    SELECT 
        SUM(remaining_quantity) as fifo_inventory,
        SUM(remaining_quantity * avg_price) as fifo_value,
        SUM(remaining_quantity * avg_price) / NULLIF(SUM(remaining_quantity), 0) as fifo_avg_price
    FROM calculate_fifo_inventory()
),
simple_calc AS (
    SELECT 
        (SELECT COALESCE(SUM(quantity), 0) FROM fuel_imports) - 
        (SELECT COALESCE(SUM(quantity), 0) FROM fuel_transactions WHERE LOWER(TRIM(fuel_source)) = 'trụ nội bộ') 
        as simple_inventory,
        (SELECT COALESCE(avg_price, 0) FROM fuel_imports ORDER BY import_date DESC LIMIT 1) 
        as simple_avg_price
    FROM (SELECT 1) t
)
SELECT 
    '=== SO SÁNH FIFO vs SIMPLE ===' as comparison,
    ROUND(f.fifo_inventory, 2) || ' L' as "Tồn kho FIFO",
    ROUND(s.simple_inventory, 2) || ' L' as "Tồn kho Simple",
    ROUND(f.fifo_inventory - s.simple_inventory, 2) || ' L' as "Chênh lệch",
    ROUND(f.fifo_avg_price, 2) || ' VND/L' as "Giá TB FIFO",
    ROUND(s.simple_avg_price, 2) || ' VND/L' as "Giá TB Simple",
    ROUND(f.fifo_value, 2) || ' VND' as "Giá trị FIFO"
FROM fifo_calc f, simple_calc s;

-- =============================================================================
-- PART 3: MATERIALIZED VIEW (Optional) - Cache FIFO Results
-- =============================================================================

-- Drop existing view if exists
DROP MATERIALIZED VIEW IF EXISTS mv_fifo_inventory CASCADE;

-- Create materialized view for performance
CREATE MATERIALIZED VIEW mv_fifo_inventory AS
SELECT * FROM calculate_fifo_inventory();

-- Add index for fast lookup
CREATE INDEX idx_mv_fifo_inventory_import_id ON mv_fifo_inventory(import_id);
CREATE INDEX idx_mv_fifo_inventory_remaining ON mv_fifo_inventory(remaining_quantity) 
WHERE remaining_quantity > 0;

COMMENT ON MATERIALIZED VIEW mv_fifo_inventory IS 
'Cached FIFO inventory calculation. Refresh after imports or transactions change.';

-- =============================================================================
-- PART 4: REFRESH FUNCTION - Update Materialized View
-- =============================================================================

CREATE OR REPLACE FUNCTION refresh_fifo_inventory()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_fifo_inventory;
    RAISE NOTICE 'FIFO inventory refreshed at %', NOW();
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refresh_fifo_inventory() IS 
'Refresh materialized view with latest FIFO calculation';

-- =============================================================================
-- PART 5: QUERY TEMPLATES - Common Use Cases
-- =============================================================================

-- 1. Get current FIFO inventory summary
SELECT 
    COUNT(*) as "Số PO còn tồn",
    SUM(remaining_quantity) as "Tổng tồn (L)",
    SUM(remaining_quantity * avg_price) as "Giá trị tồn (VND)",
    ROUND(SUM(remaining_quantity * avg_price) / SUM(remaining_quantity), 2) as "Giá TB (VND/L)"
FROM mv_fifo_inventory
WHERE remaining_quantity > 0;

-- 2. List all imports with remaining stock
SELECT 
    import_id as "Mã PO",
    TO_CHAR(import_date, 'DD/MM/YYYY HH24:MI') as "Thời gian nhập",
    original_quantity as "Số lượng nhập (L)",
    consumed_quantity as "Đã xuất (L)",
    remaining_quantity as "Còn lại (L)",
    ROUND((consumed_quantity / NULLIF(original_quantity, 0) * 100), 1) || '%' as "% Đã xuất",
    ROUND(avg_price, 2) as "Giá TB (VND/L)",
    ROUND(remaining_quantity * avg_price, 2) as "Giá trị còn (VND)"
FROM mv_fifo_inventory
WHERE remaining_quantity > 0
ORDER BY import_date ASC;

-- 3. Find depleted imports (fully consumed)
SELECT 
    import_id as "Mã PO",
    TO_CHAR(import_date, 'DD/MM/YYYY') as "Ngày nhập",
    original_quantity as "Số lượng nhập (L)",
    consumed_quantity as "Đã xuất (L)"
FROM mv_fifo_inventory
WHERE remaining_quantity = 0
ORDER BY import_date DESC
LIMIT 10;

-- 4. Check for negative inventory warnings
WITH transaction_totals AS (
    SELECT 
        ft.id,
        ft.transaction_date,
        ft.quantity,
        (SELECT COALESCE(SUM(quantity), 0) 
         FROM fuel_imports 
         WHERE import_date <= ft.transaction_date) as available_at_transaction
    FROM fuel_transactions ft
    WHERE LOWER(TRIM(ft.fuel_source)) = 'trụ nội bộ'
)
SELECT 
    id as "Transaction ID",
    TO_CHAR(transaction_date, 'DD/MM/YYYY HH24:MI') as "Thời gian",
    quantity as "Xuất (L)",
    available_at_transaction as "Tồn kho lúc đó (L)",
    available_at_transaction - quantity as "Tồn sau xuất (L)",
    CASE 
        WHEN available_at_transaction - quantity < 0 
        THEN '⚠️ CẢNH BÁO: Xuất quá tồn!'
        ELSE '✓ OK'
    END as "Trạng thái"
FROM transaction_totals
WHERE available_at_transaction - quantity < 0
ORDER BY transaction_date DESC;

-- 5. Find transactions that occurred BEFORE any import (should not affect inventory)
SELECT 
    ft.id as "Transaction ID",
    TO_CHAR(ft.transaction_date, 'DD/MM/YYYY HH24:MI') as "Thời gian xuất",
    ft.quantity as "Số lượng (L)",
    ft.fuel_source as "Nguồn",
    (SELECT TO_CHAR(MIN(import_date), 'DD/MM/YYYY HH24:MI') 
     FROM fuel_imports) as "Lần nhập đầu tiên",
    '⚠️ Không ảnh hưởng tồn kho' as "Ghi chú"
FROM fuel_transactions ft
WHERE LOWER(TRIM(ft.fuel_source)) = 'trụ nội bộ'
    AND ft.transaction_date < (SELECT MIN(import_date) FROM fuel_imports)
ORDER BY ft.transaction_date DESC;

-- =============================================================================
-- PART 6: TRIGGER (Optional) - Auto-refresh on data change
-- =============================================================================

-- Create trigger function
CREATE OR REPLACE FUNCTION trigger_refresh_fifo()
RETURNS TRIGGER AS $$
BEGIN
    -- Queue refresh in background (non-blocking)
    PERFORM pg_notify('fifo_refresh_needed', 'Data changed');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach triggers
DROP TRIGGER IF EXISTS trg_fuel_imports_changed ON fuel_imports;
CREATE TRIGGER trg_fuel_imports_changed
    AFTER INSERT OR UPDATE OR DELETE ON fuel_imports
    FOR EACH STATEMENT
    EXECUTE FUNCTION trigger_refresh_fifo();

DROP TRIGGER IF EXISTS trg_fuel_transactions_changed ON fuel_transactions;
CREATE TRIGGER trg_fuel_transactions_changed
    AFTER INSERT OR UPDATE OR DELETE ON fuel_transactions
    FOR EACH STATEMENT
    EXECUTE FUNCTION trigger_refresh_fifo();

COMMENT ON FUNCTION trigger_refresh_fifo() IS 
'Notify when FIFO inventory needs refresh due to data changes';

-- =============================================================================
-- USAGE EXAMPLES
-- =============================================================================

/*
-- Example 1: Calculate FIFO and show results
SELECT * FROM calculate_fifo_inventory();

-- Example 2: Refresh cached results
SELECT refresh_fifo_inventory();

-- Example 3: Get current inventory summary
SELECT 
    SUM(remaining_quantity) as total_inventory,
    SUM(remaining_quantity * avg_price) as total_value
FROM mv_fifo_inventory;

-- Example 4: Compare with simple method
SELECT 
    (SELECT COALESCE(SUM(quantity), 0) FROM fuel_imports) as total_import,
    (SELECT COALESCE(SUM(quantity), 0) FROM fuel_transactions WHERE fuel_source = 'Trụ nội bộ') as total_export,
    (SELECT COALESCE(SUM(quantity), 0) FROM fuel_imports) - 
    (SELECT COALESCE(SUM(quantity), 0) FROM fuel_transactions WHERE fuel_source = 'Trụ nội bộ') as simple_inventory,
    (SELECT SUM(remaining_quantity) FROM mv_fifo_inventory) as fifo_inventory;
*/

-- =============================================================================
-- MAINTENANCE COMMANDS
-- =============================================================================

/*
-- Refresh materialized view manually
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_fifo_inventory;

-- Drop all FIFO components if needed
DROP MATERIALIZED VIEW IF EXISTS mv_fifo_inventory CASCADE;
DROP FUNCTION IF EXISTS calculate_fifo_inventory() CASCADE;
DROP FUNCTION IF EXISTS refresh_fifo_inventory() CASCADE;
DROP FUNCTION IF EXISTS trigger_refresh_fifo() CASCADE;

-- Check view size and performance
SELECT 
    schemaname,
    matviewname,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||matviewname)) as size,
    n_tup_ins as rows
FROM pg_stat_user_tables
WHERE relname = 'mv_fifo_inventory';
*/

-- =============================================================================
-- INITIAL RUN - Execute this to populate the materialized view
-- =============================================================================

-- Refresh the materialized view for first time
REFRESH MATERIALIZED VIEW mv_fifo_inventory;

-- Show summary
SELECT 
    '✅ FIFO Inventory System Initialized' as status,
    COUNT(*) as total_imports,
    COUNT(*) FILTER (WHERE remaining_quantity > 0) as imports_with_stock,
    ROUND(SUM(remaining_quantity), 2) || ' L' as total_inventory,
    ROUND(SUM(remaining_quantity * avg_price), 2) || ' VND' as total_value
FROM mv_fifo_inventory;

-- =============================================================================
-- END OF SCRIPT
-- =============================================================================
