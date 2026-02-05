/**
 * =============================================================================
 * TELEGRAM CHATBOT - SQL HELPERS
 * =============================================================================
 *
 * Helper functions for SQL queries with proper type handling
 */

/**
 * SQL fragment for safely parsing doanh_thu field
 * Handles both TEXT and NUMERIC types in database
 */
export const SQL_PARSE_DOANH_THU = `
  CASE
    WHEN doanh_thu::TEXT IS NULL OR doanh_thu::TEXT = '' THEN 0
    WHEN doanh_thu::TEXT !~ '^-?[0-9]*\\.?[0-9]+$' THEN 0
    ELSE doanh_thu::NUMERIC
  END
`;

/**
 * SQL fragment for safely parsing so_km_theo_odo field
 * Handles both TEXT and NUMERIC types in database
 */
export const SQL_PARSE_SO_KM = `
  CASE
    WHEN so_km_theo_odo::TEXT IS NULL OR so_km_theo_odo::TEXT = '' THEN 0
    WHEN so_km_theo_odo::TEXT !~ '^-?[0-9]*\\.?[0-9]+$' THEN 0
    ELSE so_km_theo_odo::NUMERIC
  END
`;

/**
 * Parse numeric value from database result
 * Handles string or number types
 */
export function parseNumeric(value: any): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  
  const num = parseFloat(String(value));
  return isNaN(num) ? 0 : num;
}
