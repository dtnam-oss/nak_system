# Database Migration: Add Revenue Column

## Overview
This migration adds a new `revenue` column to separate revenue (doanh thu) from costs (chi phí).

**Changes:**
- Added `revenue` column for storing doanh thu (revenue from customers)
- Migrated existing data from `cost` to `revenue` 
- Reset `cost` column to 0 (will be used for actual expenses going forward)
- Updated all API endpoints to use correct columns

## Migration File
`database/005_add_revenue_column.sql`

## How to Run Migration

### Option 1: Using Vercel Postgres Dashboard
1. Go to Vercel Dashboard → Storage → Your Postgres Database
2. Click on "Query" tab
3. Copy and paste the contents of `database/005_add_revenue_column.sql`
4. Click "Execute"

### Option 2: Using Vercel CLI
```bash
# Connect to your Vercel Postgres database
vercel env pull .env.local

# Run the migration SQL file
psql "YOUR_DATABASE_CONNECTION_STRING" -f database/005_add_revenue_column.sql
```

### Option 3: Using psql directly
```bash
psql "postgres://YOUR_CONNECTION_STRING" -f database/005_add_revenue_column.sql
```

## Verification

After running the migration, verify with this query:

```sql
-- Check column exists and data migrated
SELECT 
  order_id, 
  revenue,  -- Should have values (old cost data)
  cost      -- Should be 0
FROM reconciliation_orders 
LIMIT 10;

-- Check table structure
\d reconciliation_orders
```

## Code Changes

### Files Updated:
1. **`app/api/webhook/appsheet/route.ts`** - Main webhook handler
   - Updated `NormalizedPayload` interface
   - Changed `tongDoanhThu` mapping from `cost` → `revenue`
   - Updated SQL INSERT/UPDATE queries

2. **`app/api/reconciliation/route.ts`** - Reconciliation listing API
   - Updated SELECT query to include `revenue`
   - Changed mapping: `tongDoanhThu` now uses `revenue` column
   - Updated summary statistics to use `revenue`

3. **`app/api/seed/import/route.ts`** - Data import API
   - Updated to insert into both `revenue` and `cost` columns

## Data Model

### Before Migration:
```
cost = tongDoanhThu (doanh thu/revenue) ❌ Wrong!
```

### After Migration:
```
revenue = tongDoanhThu (doanh thu/revenue) ✅ Correct!
cost = chi phí (expenses) ✅ Correct!
```

## Rollback

If you need to rollback:

```sql
-- Move data back from revenue to cost
UPDATE reconciliation_orders
SET cost = revenue, revenue = 0;

-- Drop revenue column
ALTER TABLE reconciliation_orders DROP COLUMN revenue;
```

## Next Steps

After migration:
1. Deploy the updated code to Vercel
2. Test with a new webhook from AppSheet
3. Verify dashboard displays correct revenue values
4. Future work: Add logic to calculate and populate `cost` column with actual expenses

## Notes

- The `cost` column is currently set to 0 after migration
- Future updates will populate `cost` with actual expense calculations
- All existing revenue data is preserved in the new `revenue` column
