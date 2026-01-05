-- =====================================================
-- NAK Logistics System - Database Migration
-- File: 010_add_note_column.sql
-- Description: Add note column to reconciliation_orders table
-- Author: System Migration
-- Date: 2026-01-05
-- =====================================================

-- Start transaction to ensure atomic operation
BEGIN;

-- =====================================================
-- Add Note Column
-- =====================================================

-- Add note column to store ghiChu data from AppSheet
ALTER TABLE reconciliation_orders
ADD COLUMN IF NOT EXISTS note TEXT;

-- Add comment to column for documentation
COMMENT ON COLUMN reconciliation_orders.note IS 'Ghi chú từ AppSheet (ghiChu field)';

-- =====================================================
-- Create Index for Note Column (Optional - for search)
-- =====================================================

-- GIN index for full-text search on notes (if needed)
-- Uncomment if you plan to search within notes
-- CREATE INDEX IF NOT EXISTS idx_reconciliation_note_search
-- ON reconciliation_orders USING gin(to_tsvector('vietnamese', COALESCE(note, '')));

-- =====================================================
-- Verify Migration
-- =====================================================

-- Check table structure
DO $$
BEGIN
  RAISE NOTICE '=== Verifying Note Column Migration ===';
END $$;

-- Display column structure
SELECT
  column_name,
  data_type,
  is_nullable,
  character_maximum_length,
  column_default
FROM information_schema.columns
WHERE table_name = 'reconciliation_orders'
  AND column_name = 'note';

-- Display sample records
SELECT
  order_id,
  date,
  customer,
  note,
  created_at
FROM reconciliation_orders
ORDER BY date DESC
LIMIT 5;

-- =====================================================
-- Migration Complete
-- =====================================================

COMMIT;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Migration complete: note column added successfully';
  RAISE NOTICE '📝 Column: note (TEXT) - allows NULL';
  RAISE NOTICE '🔄 Ready to receive ghiChu data from AppSheet';
END $$;
