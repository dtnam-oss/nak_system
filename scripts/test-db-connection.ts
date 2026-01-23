#!/usr/bin/env tsx
/**
 * Test database connection and basic queries
 * Usage: npx tsx scripts/test-db-connection.ts
 */

import { sql, query, checkHealth, transaction, batchInsert, closePool } from '../lib/db';

async function testConnection() {
  console.log('🧪 Testing Database Connection...\n');

  try {
    // Test 1: Health check
    console.log('1️⃣ Health Check:');
    console.log('='.repeat(80));
    const health = await checkHealth();
    console.log('Connected:', health.connected);
    console.log('Server Time:', health.serverTime);
    console.log('Version:', health.version);
    console.log('Pool Stats:', health.poolStats);
    console.log('');

    // Test 2: SQL template literal
    console.log('2️⃣ SQL Template Literal Query:');
    console.log('='.repeat(80));
    const tables = await sql`
      SELECT tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
      LIMIT 5
    `;
    console.log(`Found ${tables.rowCount} tables:`);
    console.table(tables.rows);
    console.log('');

    // Test 3: Direct query with params
    console.log('3️⃣ Parameterized Query:');
    console.log('='.repeat(80));
    const trips = await query(
      `SELECT ma_chuyen_di, ngay_tao, ten_khach_hang, trang_thai_chuyen_di 
       FROM chuyen_di 
       WHERE ngay_tao >= $1 
       ORDER BY ngay_tao DESC 
       LIMIT 5`,
      ['2026-01-01']
    );
    console.log(`Found ${trips.rowCount} trips:`);
    console.table(trips.rows);
    console.log('');

    // Test 4: Count queries
    console.log('4️⃣ Table Counts:');
    console.log('='.repeat(80));
    const counts = await sql`
      SELECT 
        (SELECT COUNT(*) FROM chuyen_di) as trips,
        (SELECT COUNT(*) FROM chi_tiet_chuyen_di) as details,
        (SELECT COUNT(*) FROM nhap_nhien_lieu) as fuel_imports,
        (SELECT COUNT(*) FROM xuat_nhien_lieu) as fuel_transactions,
        (SELECT COUNT(*) FROM nhan_vien) as employees,
        (SELECT COUNT(*) FROM phuong_tien) as vehicles
    `;
    console.table(counts.rows[0]);
    console.log('');

    // Test 5: Transaction
    console.log('5️⃣ Transaction Test (Read-only):');
    console.log('='.repeat(80));
    const txResult = await transaction(async (client) => {
      const result1 = await client.query('SELECT COUNT(*) as count FROM chuyen_di');
      const result2 = await client.query('SELECT COUNT(*) as count FROM chi_tiet_chuyen_di');
      return {
        trips: result1.rows[0].count,
        details: result2.rows[0].count,
      };
    });
    console.log('Transaction result:', txResult);
    console.log('');

    // Test 6: JOIN query
    console.log('6️⃣ JOIN Query:');
    console.log('='.repeat(80));
    const joinQuery = await sql`
      SELECT 
        cd.ma_chuyen_di,
        cd.ten_khach_hang,
        COUNT(ct."Id") as detail_count,
        SUM(CAST(ct.quang_duong AS NUMERIC)) as total_distance
      FROM chuyen_di cd
      LEFT JOIN chi_tiet_chuyen_di ct ON ct.ma_chuyen_di = cd.ma_chuyen_di
      WHERE cd.ngay_tao >= '2026-01-01'
      GROUP BY cd.ma_chuyen_di, cd.ten_khach_hang
      ORDER BY cd.ma_chuyen_di DESC
      LIMIT 5
    `;
    console.log(`Found ${joinQuery.rowCount} trips with details:`);
    console.table(joinQuery.rows);
    console.log('');

    // Test 7: Fuel data
    console.log('7️⃣ Fuel Import/Export Summary:');
    console.log('='.repeat(80));
    const fuelSummary = await sql`
      SELECT 
        'Imports' as type,
        COUNT(*) as count,
        SUM(so_luong) as total_quantity,
        SUM(thanh_tien) as total_amount
      FROM nhap_nhien_lieu
      UNION ALL
      SELECT 
        'Exports' as type,
        COUNT(*) as count,
        SUM(so_luong) as total_quantity,
        SUM(thanh_tien) as total_amount
      FROM xuat_nhien_lieu
    `;
    console.table(fuelSummary.rows);
    console.log('');

    console.log('✅ All tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    // Close pool
    await closePool();
  }
}

// Run tests
testConnection().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
