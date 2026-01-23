/**
 * Quick script to check table names in database
 */

import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: false,
});

async function checkTables() {
  try {
    console.log('🔍 Checking tables in database...\n');

    // Check all tables in all schemas
    const result = await pool.query(`
      SELECT 
        schemaname, 
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
      FROM pg_tables
      WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
      ORDER BY schemaname, tablename
    `);

    console.log(`Found ${result.rows.length} tables:\n`);
    result.rows.forEach(row => {
      console.log(`  ${row.schemaname}.${row.tablename} (${row.size})`);
    });

    // Check if chuyen_di exists
    const checkChuyenDi = await pool.query(`
      SELECT COUNT(*) FROM pg_tables 
      WHERE tablename = 'chuyen_di'
    `);

    console.log(`\n✓ chuyen_di table found: ${checkChuyenDi.rows[0].count > 0}`);

    // Try to query it
    if (checkChuyenDi.rows[0].count > 0) {
      const sampleResult = await pool.query(`SELECT COUNT(*) FROM chuyen_di LIMIT 1`);
      console.log(`✓ Successfully queried chuyen_di: ${sampleResult.rows[0].count} rows`);
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('❌ Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

checkTables();
