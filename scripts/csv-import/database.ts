/**
 * Database Operations
 * PostgreSQL connection and bulk insert
 */

import postgres from 'postgres';
import type { DatabaseRecord, ImportResult } from './types';

/**
 * Create database connection
 */
export function createDatabaseConnection(databaseUrl: string) {
  return postgres(databaseUrl, {
    max: 10, // Connection pool size
    idle_timeout: 20,
    connect_timeout: 10,
  });
}

/**
 * Bulk insert records with UPSERT
 */
export async function bulkInsertRecords(
  sql: postgres.Sql,
  records: DatabaseRecord[]
): Promise<{ inserted: number; errors: string[] }> {
  const errors: string[] = [];
  let inserted = 0;

  try {
    // Use transaction for atomicity
    await sql.begin(async (tx) => {
      // Process in batches of 50 to avoid hitting query size limits
      const BATCH_SIZE = 50;

      for (let i = 0; i < records.length; i += BATCH_SIZE) {
        const batch = records.slice(i, i + BATCH_SIZE);

        console.log(
          `  Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(records.length / BATCH_SIZE)}: ${i + 1}-${Math.min(i + BATCH_SIZE, records.length)}/${records.length}`
        );

        // Convert to format for postgres.js
        const values = batch.map((record) => ({
          order_id: record.order_id,
          date: record.date,
          customer: record.customer,
          trip_type: record.trip_type,
          route_type: record.route_type,
          route_name: record.route_name,
          driver_name: record.driver_name,
          provider: record.provider,
          total_distance: record.total_distance,
          cost: record.cost,
          revenue: record.revenue,
          status: record.status,
          weight: record.weight,
          note: record.note,
          details: JSON.stringify(record.details), // Convert JSONB to string
        }));

        // Insert with ON CONFLICT DO UPDATE
        await tx`
          INSERT INTO reconciliation_orders ${tx(values, 'order_id', 'date', 'customer', 'trip_type', 'route_type', 'route_name', 'driver_name', 'provider', 'total_distance', 'cost', 'revenue', 'status', 'weight', 'note', 'details')}
          ON CONFLICT (order_id) DO UPDATE SET
            date = EXCLUDED.date,
            customer = EXCLUDED.customer,
            trip_type = EXCLUDED.trip_type,
            route_type = EXCLUDED.route_type,
            route_name = EXCLUDED.route_name,
            driver_name = EXCLUDED.driver_name,
            provider = EXCLUDED.provider,
            total_distance = EXCLUDED.total_distance,
            cost = EXCLUDED.cost,
            revenue = EXCLUDED.revenue,
            status = EXCLUDED.status,
            weight = EXCLUDED.weight,
            note = EXCLUDED.note,
            details = EXCLUDED.details,
            updated_at = CURRENT_TIMESTAMP
        `;

        inserted += batch.length;
      }
    });

    return { inserted, errors };
  } catch (error: any) {
    console.error('❌ Database error:', error.message);
    errors.push(error.message);
    return { inserted, errors };
  }
}

/**
 * Generate SQL file for manual import
 */
export function generateSQLFile(records: DatabaseRecord[]): string {
  const lines: string[] = [];

  lines.push('-- CSV Import SQL Script');
  lines.push(`-- Generated: ${new Date().toISOString()}`);
  lines.push(`-- Total records: ${records.length}`);
  lines.push('');
  lines.push('BEGIN;');
  lines.push('');

  // Generate INSERT statements
  for (let i = 0; i < records.length; i++) {
    const record = records[i];

    // Escape single quotes in strings
    const escape = (str: string | null | undefined): string => {
      if (!str) return '';
      return str.replace(/'/g, "''");
    };

    const detailsJson = JSON.stringify(record.details).replace(/'/g, "''");

    const values = [
      `'${escape(record.order_id)}'`,
      `'${record.date}'`,
      `'${escape(record.customer)}'`,
      `'${escape(record.trip_type)}'`,
      `'${escape(record.route_type)}'`,
      `'${escape(record.route_name)}'`,
      `'${escape(record.driver_name)}'`,
      `'${escape(record.provider)}'`,
      record.total_distance,
      record.cost,
      record.revenue,
      `'${escape(record.status)}'`,
      record.weight,
      `'${escape(record.note)}'`,
      `'${detailsJson}'::jsonb`,
    ].join(', ');

    if (i === 0) {
      lines.push(
        `INSERT INTO reconciliation_orders (order_id, date, customer, trip_type, route_type, route_name, driver_name, provider, total_distance, cost, revenue, status, weight, note, details) VALUES`
      );
      lines.push(`  (${values})`);
    } else {
      lines.push(`,  (${values})`);
    }
  }

  lines.push('ON CONFLICT (order_id) DO UPDATE SET');
  lines.push('  date = EXCLUDED.date,');
  lines.push('  customer = EXCLUDED.customer,');
  lines.push('  trip_type = EXCLUDED.trip_type,');
  lines.push('  route_type = EXCLUDED.route_type,');
  lines.push('  route_name = EXCLUDED.route_name,');
  lines.push('  driver_name = EXCLUDED.driver_name,');
  lines.push('  provider = EXCLUDED.provider,');
  lines.push('  total_distance = EXCLUDED.total_distance,');
  lines.push('  cost = EXCLUDED.cost,');
  lines.push('  revenue = EXCLUDED.revenue,');
  lines.push('  status = EXCLUDED.status,');
  lines.push('  weight = EXCLUDED.weight,');
  lines.push('  note = EXCLUDED.note,');
  lines.push('  details = EXCLUDED.details,');
  lines.push('  updated_at = CURRENT_TIMESTAMP;');
  lines.push('');
  lines.push('COMMIT;');
  lines.push('');
  lines.push(`-- ✅ Ready to import ${records.length} records`);

  return lines.join('\n');
}

/**
 * Verify imported data
 */
export async function verifyImport(
  sql: postgres.Sql,
  expectedOrderIds: string[]
): Promise<{
  success: boolean;
  found: number;
  missing: string[];
}> {
  try {
    // Query database for expected order IDs
    const result = await sql`
      SELECT order_id
      FROM reconciliation_orders
      WHERE order_id = ANY(${expectedOrderIds})
    `;

    const foundIds = new Set(result.map((row) => row.order_id));
    const missing = expectedOrderIds.filter((id) => !foundIds.has(id));

    return {
      success: missing.length === 0,
      found: foundIds.size,
      missing,
    };
  } catch (error: any) {
    console.error('❌ Verification error:', error.message);
    return {
      success: false,
      found: 0,
      missing: expectedOrderIds,
    };
  }
}
