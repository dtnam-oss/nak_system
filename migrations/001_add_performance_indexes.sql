-- Migration: Add Performance Indexes for Reconciliation Module
-- Created: 2026-02-04
-- Purpose: Optimize query performance for main list and filters

-- Enable pg_trgm extension for ILIKE optimization
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Index 1: Date filter (most used filter)
-- Covers queries with ORDER BY ngay_tao DESC
CREATE INDEX IF NOT EXISTS idx_chuyen_di_ngay_tao
ON chuyen_di(ngay_tao DESC)
WHERE ngay_tao >= CURRENT_DATE - INTERVAL '1 year';

-- Index 2: Customer + Date composite (second most used combo)
-- Covers queries filtering by customer and sorting by date
CREATE INDEX IF NOT EXISTS idx_chuyen_di_customer_date
ON chuyen_di(ten_khach_hang, ngay_tao DESC);

-- Index 3: JOIN optimization between chuyen_di and chi_tiet_chuyen_di
-- Critical for detail queries
CREATE INDEX IF NOT EXISTS idx_chi_tiet_ma_chuyen_di
ON chi_tiet_chuyen_di(ma_chuyen_di);

-- Index 4: Search by ma_chuyen_di with ILIKE
-- Enables fast partial matching with trigram similarity
CREATE INDEX IF NOT EXISTS idx_chuyen_di_ma_trgm
ON chuyen_di USING gin(ma_chuyen_di gin_trgm_ops);

-- Index 5: Search by ma_chuyen_di_kh in chi_tiet table
-- For customer order code search
CREATE INDEX IF NOT EXISTS idx_chi_tiet_ma_kh_trgm
ON chi_tiet_chuyen_di USING gin(ma_chuyen_di_kh gin_trgm_ops);

-- Index 6: Summary calculation optimization
-- Covers COUNT and SUM aggregations by status
CREATE INDEX IF NOT EXISTS idx_chuyen_di_summary
ON chuyen_di(trang_thai_chuyen_di)
INCLUDE (doanh_thu, so_km_theo_odo)
WHERE ngay_tao >= CURRENT_DATE - INTERVAL '1 year';

-- Index 7: Multi-column filter optimization
-- Covers common filter combinations
CREATE INDEX IF NOT EXISTS idx_chuyen_di_filters
ON chuyen_di(don_vi_van_chuyen, loai_chuyen, ngay_tao DESC);

-- Analyze tables to update statistics
ANALYZE chuyen_di;
ANALYZE chi_tiet_chuyen_di;

-- Display index sizes for monitoring
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND tablename IN ('chuyen_di', 'chi_tiet_chuyen_di')
ORDER BY pg_relation_size(indexrelid) DESC;
