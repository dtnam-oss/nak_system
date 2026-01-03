-- =============================================================================
-- WEIGHTED AVERAGE INVENTORY CALCULATION - SQL Implementation
-- Date: 2026-01-03
-- Purpose: Calculate inventory using Weighted Average (Bình quân gia quyền) logic
--          Only deduct transactions that occur AFTER first import timestamp
--          Automatically recalculate weighted average price when new import arrives
-- =============================================================================

-- =============================================================================
-- PART 1: STORED FUNCTION - Calculate Weighted Average Inventory
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
    total_import_qty DECIMAL(10,2);
    total_export_qty DECIMAL(10,2);
    weighted_avg_price DECIMAL(10,2);
    first_import_date TIMESTAMP;
    remaining_inventory DECIMAL(10,2);
    total_import_value DECIMAL(10,2);
BEGIN
    -- Get first import date
    SELECT MIN(import_date) INTO first_import_date
    FROM fuel_imports;

    -- If no imports, return empty
    IF first_import_date IS NULL THEN
        RETURN;
    END IF;

    -- Calculate total imports (all imports)
    SELECT 
        COALESCE(SUM(quantity), 0),
        COALESCE(SUM(quantity * avg_price), 0)
    INTO total_import_qty, total_import_value
    FROM fuel_imports;

    -- Calculate weighted average price (Bình quân gia quyền)
    IF total_import_qty > 0 THEN
        weighted_avg_price := total_import_value / total_import_qty;
    ELSE
        weighted_avg_price := 0;
    END IF;

    -- Calculate total exports (only transactions AFTER first import)
    SELECT COALESCE(SUM(quantity), 0)
    INTO total_export_qty
    FROM fuel_transactions ft
    WHERE LOWER(TRIM(ft.fuel_source)) = 'trụ nội bộ'
        AND ft.transaction_date >= first_import_date;

    -- Calculate remaining inventory
    remaining_inventory := total_import_qty - total_export_qty;

    -- Log summary
    RAISE NOTICE '=== WEIGHTED AVERAGE CALCULATION ===';
    RAISE NOTICE 'Total Imports: % L (Value: % VND)', total_import_qty, total_import_value;
    RAISE NOTICE 'Weighted Avg Price: % VND/L', ROUND(weighted_avg_price, 2);
    RAISE NOTICE 'Total Exports (after first import): % L', total_export_qty;
    RAISE NOTICE 'Remaining Inventory: % L (Value: % VND)', 
        remaining_inventory, ROUND(remaining_inventory * weighted_avg_price, 2);

    -- Return single row with summary (for compatibility with existing queries)
    RETURN QUERY SELECT
        'WEIGHTED_AVG'::TEXT as import_id,
        first_import_date as import_date,
        total_import_qty as original_quantity,
        total_export_qty as consumed_quantity,
        remaining_inventory as remaining_quantity,
        weighted_avg_price as avg_price,
        weighted_avg_price as unit_price;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_fifo_inventory() IS 
'Calculates Weighted Average inventory (Bình quân gia quyền). 
Only deducts transactions that occur AFTER first import timestamp.
Auto-recalculates average price when new imports arrive.';

-- =============================================================================
-- PART 2: VERIFICATION QUERY - Compare Weighted Average vs Simple Method
-- =============================================================================

-- Query to see Weighted Average calculation results
SELECT 
    'SUMMARY' as type,
    TO_CHAR(import_date, 'DD/MM/YYYY HH24:MI') as first_import_time,
    original_quantity || ' L' as total_nhap,
    consumed_quantity || ' L' as total_xuat,
    remaining_quantity || ' L' as ton_kho,
    ROUND(avg_price, 2) || ' VND/L' as gia_binh_quan,
    ROUND(remaining_quantity * avg_price, 2) || ' VND' as gia_tri_ton
FROM calculate_fifo_inventory();

-- Detailed breakdown by import
WITH weighted_calc AS (
    SELECT avg_price as weighted_price
    FROM calculate_fifo_inventory()
)
SELECT 
    fi.id as "Mã PO",
    TO_CHAR(fi.import_date, 'DD/MM/YYYY HH24:MI') as "Thời gian nhập",
    fi.quantity as "Số lượng (L)",
    ROUND(fi.avg_price, 2) as "Giá nhập (VND/L)",
    ROUND(fi.quantity * fi.avg_price, 2) as "Giá trị nhập (VND)",
    ROUND(wc.weighted_price, 2) as "Giá BQ hiện tại (VND/L)",
    ROUND(fi.quantity * wc.weighted_price, 2) as "Giá trị theo BQ (VND)"
FROM fuel_imports fi
CROSS JOIN weighted_calc wc
ORDER BY fi.import_date ASC;

-- Summary comparison
WITH weighted_calc AS (
    SELECT 
        remaining_quantity as weighted_inventory,
        remaining_quantity * avg_price as weighted_value,
        avg_price as weighted_avg_price
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
    '=== SO SÁNH WEIGHTED AVERAGE vs SIMPLE ===' as comparison,
    ROUND(w.weighted_inventory, 2) || ' L' as "Tồn kho (Weighted Avg)",
    ROUND(s.simple_inventory, 2) || ' L' as "Tồn kho (Simple)",
    ROUND(w.weighted_inventory - s.simple_inventory, 2) || ' L' as "Chênh lệch số lượng",
    ROUND(w.weighted_avg_price, 2) || ' VND/L' as "Giá BQ gia quyền",
    ROUND(s.simple_avg_price, 2) || ' VND/L' as "Giá nhập gần nhất",
    ROUND(w.weighted_value, 2) || ' VND' as "Giá trị tồn (Weighted Avg)"
FROM weighted_calc w, simple_calc s;

-- =============================================================================
-- PART 3: MATERIALIZED VIEW - Cache Weighted Average Results
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
'Cached Weighted Average inventory calculation (Bình quân gia quyền).
Refresh after imports or transactions change to recalculate average price.';

-- =============================================================================
-- PART 4: REFRESH FUNCTION - Update Materialized View
-- =============================================================================

CREATE OR REPLACE FUNCTION refresh_fifo_inventory()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_fifo_inventory;
    RAISE NOTICE 'Weighted Average inventory refreshed at %', NOW();
    RAISE NOTICE 'Weighted average price has been recalculated with latest imports';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refresh_fifo_inventory() IS 
'Refresh materialized view with latest Weighted Average calculation.
Call this after new imports to recalculate average price.';

-- =============================================================================
-- PART 5: QUERY TEMPLATES - Common Use Cases
-- =============================================================================

-- 1. Get current Weighted Average inventory summary
SELECT 
    'Tồn kho hiện tại (Bình quân gia quyền)' as "Loại báo cáo",
    ROUND(remaining_quantity, 2) as "Tồn kho (L)",
    ROUND(avg_price, 2) as "Giá bình quân (VND/L)",
    ROUND(remaining_quantity * avg_price, 2) as "Giá trị tồn kho (VND)",
    TO_CHAR(import_date, 'DD/MM/YYYY HH24:MI') as "Lần nhập đầu tiên"
FROM mv_fifo_inventory;

-- 2. List all imports with weighted average price
WITH weighted_price AS (
    SELECT avg_price as price FROM mv_fifo_inventory
)
SELECT 
    fi.id as "Mã PO",
    TO_CHAR(fi.import_date, 'DD/MM/YYYY HH24:MI') as "Thời gian nhập",
    fi.quantity as "Số lượng (L)",
    ROUND(fi.avg_price, 2) as "Giá nhập thực tế (VND/L)",
    ROUND(wp.price, 2) as "Giá BQ hiện tại (VND/L)",
    ROUND(fi.quantity * fi.avg_price, 2) as "Giá trị nhập (VND)",
    ROUND(fi.quantity * wp.price, 2) as "Giá trị theo BQ (VND)"
FROM fuel_imports fi
CROSS JOIN weighted_price wp
ORDER BY fi.import_date DESC;

-- 3. Compare imports vs exports
WITH summary AS (
    SELECT * FROM mv_fifo_inventory
)
SELECT 
    '=== TỔNG HỢP NHẬP - XUẤT ===' as report,
    ROUND(original_quantity, 2) || ' L' as "Tổng nhập",
    ROUND(consumed_quantity, 2) || ' L' as "Tổng xuất",
    ROUND(remaining_quantity, 2) || ' L' as "Tồn kho",
    ROUND((consumed_quantity / NULLIF(original_quantity, 0) * 100), 1) || '%' as "% Đã xuất",
    ROUND(avg_price, 2) || ' VND/L' as "Giá bình quân"
FROM summary;

-- 4. Check for negative inventory warnings
WITH first_import AS (
    SELECT import_date FROM mv_fifo_inventory
),
cumulative_balance AS (
    SELECT 
        ft.id,
        ft.transaction_date,
        ft.quantity,
        ft.fuel_source,
        (SELECT COALESCE(SUM(quantity), 0) 
         FROM fuel_imports 
         WHERE import_date <= ft.transaction_date) as imports_before,
        (SELECT COALESCE(SUM(quantity), 0) 
         FROM fuel_transactions ft2
         WHERE LOWER(TRIM(ft2.fuel_source)) = 'trụ nội bộ'
           AND ft2.transaction_date <= ft.transaction_date
           AND ft2.transaction_date >= (SELECT import_date FROM first_import)) as exports_before
    FROM fuel_transactions ft
    WHERE LOWER(TRIM(ft.fuel_source)) = 'trụ nội bộ'
)
SELECT 
    id as "Transaction ID",
    TO_CHAR(transaction_date, 'DD/MM/YYYY HH24:MI') as "Thời gian",
    quantity as "Xuất (L)",
    ROUND(imports_before, 2) as "Nhập tích lũy (L)",
    ROUND(exports_before, 2) as "Xuất tích lũy (L)",
    ROUND(imports_before - exports_before, 2) as "Tồn sau giao dịch (L)",
    CASE 
        WHEN imports_before - exports_before < 0 
        THEN '⚠️ CẢNH BÁO: Xuất vượt tồn!'
        ELSE '✓ OK'
    END as "Trạng thái"
FROM cumulative_balance
WHERE imports_before - exports_before < 0
ORDER BY transaction_date DESC;

-- 5. Find transactions that occurred BEFORE first import (should not affect inventory)
WITH first_import AS (
    SELECT import_date FROM mv_fifo_inventory
)
SELECT 
    ft.id as "Transaction ID",
    TO_CHAR(ft.transaction_date, 'DD/MM/YYYY HH24:MI') as "Thời gian xuất",
    ft.quantity as "Số lượng (L)",
    ft.fuel_source as "Nguồn",
    TO_CHAR((SELECT import_date FROM first_import), 'DD/MM/YYYY HH24:MI') as "Lần nhập đầu tiên",
    '⚠️ KHÔNG TÍNH VÀO TỒN KHO' as "Ghi chú"
FROM fuel_transactions ft
WHERE LOWER(TRIM(ft.fuel_source)) = 'trụ nội bộ'
    AND ft.transaction_date < (SELECT import_date FROM first_import)
ORDER BY ft.transaction_date DESC;

-- =============================================================================
-- PART 6: TRIGGER - Auto-notify on data change
-- =============================================================================

-- Create trigger function
CREATE OR REPLACE FUNCTION trigger_refresh_fifo()
RETURNS TRIGGER AS $$
BEGIN
    -- Queue refresh notification (non-blocking)
    -- Application should listen for this and refresh the materialized view
    PERFORM pg_notify('fifo_refresh_needed', json_build_object(
        'event', 'data_changed',
        'table', TG_TABLE_NAME,
        'operation', TG_OP,
        'timestamp', NOW()
    )::text);
    
    RAISE NOTICE 'Weighted Average recalculation needed due to % on %', TG_OP, TG_TABLE_NAME;
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
'Notify when Weighted Average inventory needs refresh.
Important: When new import arrives, weighted average price changes for ALL inventory!';

-- =============================================================================
-- USAGE EXAMPLES
-- =============================================================================

/*
-- Example 1: Calculate Weighted Average and show results
SELECT * FROM calculate_fifo_inventory();

-- Example 2: Refresh cached results (call after new import/export)
SELECT refresh_fifo_inventory();

-- Example 3: Get current inventory summary
SELECT 
    remaining_quantity as "Tồn kho (L)",
    avg_price as "Giá bình quân (VND/L)",
    remaining_quantity * avg_price as "Giá trị tồn kho (VND)"
FROM mv_fifo_inventory;

-- Example 4: View all imports with weighted average price
WITH weighted AS (SELECT avg_price FROM mv_fifo_inventory)
SELECT 
    fi.id,
    fi.quantity as import_qty,
    fi.avg_price as import_price,
    w.avg_price as weighted_avg_price,
    fi.quantity * w.avg_price as value_at_weighted_avg
FROM fuel_imports fi
CROSS JOIN weighted w
ORDER BY fi.import_date DESC;

-- Example 5: Simulate new export with weighted average
WITH current_avg AS (
    SELECT avg_price, remaining_quantity FROM mv_fifo_inventory
)
SELECT 
    100 as "Số lượng xuất (L)",
    ca.avg_price as "Giá xuất (VND/L)",
    100 * ca.avg_price as "Giá trị xuất (VND)",
    ca.remaining_quantity as "Tồn trước xuất (L)",
    ca.remaining_quantity - 100 as "Tồn sau xuất (L)"
FROM current_avg ca;
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
    '✅ Weighted Average Inventory System Initialized' as status,
    ROUND(remaining_quantity, 2) || ' L' as "Tồn kho",
    ROUND(avg_price, 2) || ' VND/L' as "Giá bình quân gia quyền",
    ROUND(remaining_quantity * avg_price, 2) || ' VND' as "Giá trị tồn kho",
    ROUND((consumed_quantity / NULLIF(original_quantity, 0) * 100), 1) || '%' as "% Đã xuất"
FROM mv_fifo_inventory;

-- Show flow explanation
SELECT 
    '📊 FLOW HOẠT ĐỘNG - BÌNH QUÂN GIA QUYỀN' as title,
    '' as flow
UNION ALL
SELECT '1️⃣ Khi có PO nhập dầu mới:', 'Tự động tính lại giá bình quân gia quyền cho TOÀN BỘ tồn kho'
UNION ALL
SELECT '2️⃣ Khi có phiếu cấp dầu mới:', 'Giá xuất = Số lượng × Giá bình quân hiện tại'
UNION ALL
SELECT '3️⃣ Tồn kho:', 'Chỉ tính các phiếu xuất SAU thời điểm nhập đầu tiên'
UNION ALL
SELECT '4️⃣ Cập nhật:', 'Gọi SELECT refresh_fifo_inventory() sau mỗi thay đổi';

-- =============================================================================
-- END OF SCRIPT
-- =============================================================================
