-- =====================================================
-- DEBUG SCRIPT - Check Reconciliation Data Quality
-- =====================================================

-- 1. Check total records
SELECT 
  COUNT(*) as total_records,
  COUNT(CASE WHEN total_distance > 0 THEN 1 END) as records_with_distance,
  COUNT(CASE WHEN cost > 0 THEN 1 END) as records_with_cost,
  COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
  COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_count
FROM reconciliation_orders;

-- 2. Check summary values
SELECT
  COUNT(*) as total_orders,
  COALESCE(SUM(cost), 0) as total_amount,
  COALESCE(SUM(total_distance), 0) as total_distance,
  COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_orders,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
  COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_orders
FROM reconciliation_orders;

-- 3. Check status distribution
SELECT 
  status,
  COUNT(*) as count
FROM reconciliation_orders
GROUP BY status
ORDER BY count DESC;

-- 4. Check records with zero values
SELECT
  order_id,
  date,
  customer,
  status,
  cost,
  total_distance,
  created_at
FROM reconciliation_orders
WHERE cost = 0 OR total_distance = 0
ORDER BY created_at DESC
LIMIT 20;

-- 5. Sample data to verify mapping
SELECT
  order_id,
  date,
  customer,
  trip_type,
  route_type,
  route_name,
  driver_name,
  provider,
  status,
  cost,
  total_distance,
  license_plate
FROM reconciliation_orders
ORDER BY created_at DESC
LIMIT 10;

-- 6. Check if details column has data
SELECT
  order_id,
  CASE 
    WHEN details IS NULL THEN 'NULL'
    WHEN details::text = '{}' THEN 'EMPTY'
    ELSE 'HAS DATA'
  END as details_status,
  LENGTH(details::text) as details_size
FROM reconciliation_orders
ORDER BY created_at DESC
LIMIT 10;

-- 7. Verify column data types
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'reconciliation_orders'
ORDER BY ordinal_position;
