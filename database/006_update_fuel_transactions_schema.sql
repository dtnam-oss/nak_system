-- =============================================================================
-- MIGRATION: Update fuel_transactions Schema
-- Date: 2025-12-31
-- Purpose: Update fuel_transactions table structure to match new column mapping
-- =============================================================================

-- Step 1: Backup existing data (if needed)
-- CREATE TABLE fuel_transactions_backup AS SELECT * FROM fuel_transactions;

-- Step 2: Drop old columns that are no longer used
ALTER TABLE fuel_transactions 
DROP COLUMN IF EXISTS driver_code,
DROP COLUMN IF EXISTS image_url;

-- Step 3: Add new columns
ALTER TABLE fuel_transactions 
ADD COLUMN IF NOT EXISTS object TEXT,
ADD COLUMN IF NOT EXISTS odo_number DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS category TEXT;

-- Step 4: Add comments for documentation
COMMENT ON COLUMN fuel_transactions.object IS 'Đối tượng (từ cột doi_tuong)';
COMMENT ON COLUMN fuel_transactions.odo_number IS 'Số ODO (từ cột so_odo)';
COMMENT ON COLUMN fuel_transactions.category IS 'Hạng mục: Chốt đầu, Đổ dặm, Chốt cuối (từ cột hang_muc)';

-- Step 5: Create index for commonly queried fields
CREATE INDEX IF NOT EXISTS idx_fuel_transactions_category ON fuel_transactions(category);
CREATE INDEX IF NOT EXISTS idx_fuel_transactions_object ON fuel_transactions(object);
CREATE INDEX IF NOT EXISTS idx_fuel_transactions_odo ON fuel_transactions(odo_number);

-- Step 6: Verify the schema
-- \d fuel_transactions

-- =============================================================================
-- EXPECTED SCHEMA AFTER MIGRATION:
-- =============================================================================
-- fuel_transactions (
--   id TEXT PRIMARY KEY,
--   transaction_date DATE,
--   fuel_source TEXT,
--   object TEXT,                    -- NEW
--   license_plate TEXT,
--   driver_name TEXT,
--   fuel_type TEXT,
--   quantity DECIMAL(10, 2),
--   unit_price DECIMAL(10, 2),
--   total_amount DECIMAL(12, 2),
--   odo_number DECIMAL(10, 2),      -- NEW
--   status TEXT,
--   category TEXT,                   -- NEW
--   updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- )

-- =============================================================================
-- ROLLBACK (if needed):
-- =============================================================================
-- ALTER TABLE fuel_transactions 
-- DROP COLUMN IF EXISTS object,
-- DROP COLUMN IF EXISTS odo_number,
-- DROP COLUMN IF EXISTS category,
-- ADD COLUMN IF NOT EXISTS driver_code TEXT,
-- ADD COLUMN IF NOT EXISTS image_url TEXT;
