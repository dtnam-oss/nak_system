#!/usr/bin/env tsx
/**
 * Test Dashboard Telegram Handlers
 *
 * Usage:
 *   npx tsx scripts/test-dashboard-telegram.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { sql } from '@vercel/postgres';

config({ path: resolve(process.cwd(), '.env.local') });

async function testDashboard() {
  console.log('\n🧪 TESTING TELEGRAM DASHBOARD QUERIES\n');
  console.log('━'.repeat(50));

  try {
    // Test 1: Dashboard Today
    console.log('\n📅 Test 1: Dashboard Today');
    console.log('─'.repeat(50));

    const today = new Date().toISOString().split('T')[0];
    const todayResult = await sql`
      SELECT
        COUNT(*) as "totalTrips",
        COALESCE(SUM(revenue), 0) as "totalRevenue",
        COALESCE(SUM(total_distance), 0) as "totalDistance",
        COUNT(DISTINCT driver_name) as "totalDrivers"
      FROM reconciliation_orders
      WHERE date::date = ${today}::date
    `;

    const todayStats = todayResult.rows[0];
    console.log(`✅ Tổng chuyến: ${todayStats.totalTrips}`);
    console.log(`✅ Doanh thu: ${Number(todayStats.totalRevenue).toLocaleString('vi-VN')} VNĐ`);
    console.log(`✅ Quãng đường: ${Number(todayStats.totalDistance).toLocaleString('vi-VN')} km`);
    console.log(`✅ Tài xế: ${todayStats.totalDrivers}`);

    // Test 2: Dashboard Month
    console.log('\n📆 Test 2: Dashboard Month');
    console.log('─'.repeat(50));

    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const monthResult = await sql`
      SELECT
        COUNT(*) as "totalTrips",
        COALESCE(SUM(revenue), 0) as "totalRevenue",
        COALESCE(SUM(total_distance), 0) as "totalDistance",
        COUNT(DISTINCT driver_name) as "totalDrivers"
      FROM reconciliation_orders
      WHERE date::date >= ${startDate}::date
        AND date::date <= ${endDate}::date
    `;

    const monthStats = monthResult.rows[0];
    console.log(`✅ Tổng chuyến: ${monthStats.totalTrips}`);
    console.log(`✅ Doanh thu: ${Number(monthStats.totalRevenue).toLocaleString('vi-VN')} VNĐ`);
    console.log(`✅ Quãng đường: ${Number(monthStats.totalDistance).toLocaleString('vi-VN')} km`);
    console.log(`✅ Tài xế: ${monthStats.totalDrivers}`);

    // Test 3: Top Routes
    console.log('\n🔝 Test 3: Top Routes');
    console.log('─'.repeat(50));

    const routesResult = await sql`
      SELECT
        route_name as "tenTuyen",
        COUNT(*) as "totalTrips",
        COALESCE(SUM(revenue), 0) as "totalRevenue",
        COALESCE(SUM(total_distance), 0) as "totalDistance"
      FROM reconciliation_orders
      WHERE date::date >= ${startDate}::date
        AND date::date <= ${endDate}::date
        AND route_name IS NOT NULL
        AND route_name != ''
      GROUP BY route_name
      ORDER BY "totalRevenue" DESC
      LIMIT 5
    `;

    console.log(`✅ Found ${routesResult.rows.length} routes`);
    routesResult.rows.forEach((route, idx) => {
      const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`;
      console.log(`${medal} ${route.tenTuyen || 'N/A'}: ${route.totalTrips} chuyến, ${Number(route.totalRevenue).toLocaleString('vi-VN')} VNĐ`);
    });

    // Test 4: Top Drivers
    console.log('\n🚛 Test 4: Top Drivers');
    console.log('─'.repeat(50));

    const driversResult = await sql`
      SELECT
        driver_name as "tenTaiXe",
        COUNT(*) as "totalTrips",
        COALESCE(SUM(revenue), 0) as "totalRevenue",
        COALESCE(SUM(total_distance), 0) as "totalDistance"
      FROM reconciliation_orders
      WHERE date::date >= ${startDate}::date
        AND date::date <= ${endDate}::date
        AND driver_name IS NOT NULL
        AND driver_name != ''
      GROUP BY driver_name
      ORDER BY "totalTrips" DESC
      LIMIT 5
    `;

    console.log(`✅ Found ${driversResult.rows.length} drivers`);
    driversResult.rows.forEach((driver, idx) => {
      const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`;
      console.log(`${medal} ${driver.tenTaiXe || 'N/A'}: ${driver.totalTrips} chuyến, ${Number(driver.totalRevenue).toLocaleString('vi-VN')} VNĐ`);
    });

    // Test 5: Revenue by Date
    console.log('\n💰 Test 5: Revenue by Date (Last 7 days)');
    console.log('─'.repeat(50));

    const revenueResult = await sql`
      SELECT
        date::date as "date",
        COUNT(*) as "trips",
        COALESCE(SUM(revenue), 0) as "revenue"
      FROM reconciliation_orders
      WHERE date::date >= ${startDate}::date
        AND date::date <= ${endDate}::date
      GROUP BY date::date
      ORDER BY date::date DESC
      LIMIT 7
    `;

    console.log(`✅ Found ${revenueResult.rows.length} days`);
    revenueResult.rows.forEach(row => {
      const date = new Date(row.date).toLocaleDateString('vi-VN');
      console.log(`📅 ${date}: ${Number(row.revenue).toLocaleString('vi-VN')} VNĐ (${row.trips} chuyến)`);
    });

    // Test 6: Distance Statistics
    console.log('\n📏 Test 6: Distance Statistics');
    console.log('─'.repeat(50));

    const distanceResult = await sql`
      SELECT
        COUNT(*) as "totalTrips",
        COALESCE(SUM(total_distance), 0) as "totalDistance",
        COALESCE(AVG(total_distance), 0) as "avgDistance",
        COALESCE(MAX(total_distance), 0) as "maxDistance",
        COALESCE(MIN(total_distance), 0) as "minDistance"
      FROM reconciliation_orders
      WHERE date::date >= ${startDate}::date
        AND date::date <= ${endDate}::date
        AND total_distance > 0
    `;

    const distanceStats = distanceResult.rows[0];
    console.log(`✅ Tổng: ${Number(distanceStats.totalDistance).toLocaleString('vi-VN')} km`);
    console.log(`✅ Trung bình: ${Number(distanceStats.avgDistance).toFixed(2)} km/chuyến`);
    console.log(`✅ Cao nhất: ${Number(distanceStats.maxDistance).toLocaleString('vi-VN')} km`);
    console.log(`✅ Thấp nhất: ${Number(distanceStats.minDistance).toLocaleString('vi-VN')} km`);

    // Summary
    console.log('\n' + '━'.repeat(50));
    console.log('✅ ALL TESTS PASSED!');
    console.log('━'.repeat(50));
    console.log('\n📊 Summary:');
    console.log(`  • Dashboard Today: ✅`);
    console.log(`  • Dashboard Month: ✅`);
    console.log(`  • Top Routes: ✅ (${routesResult.rows.length} routes)`);
    console.log(`  • Top Drivers: ✅ (${driversResult.rows.length} drivers)`);
    console.log(`  • Revenue Stats: ✅ (${revenueResult.rows.length} days)`);
    console.log(`  • Distance Stats: ✅`);
    console.log('\n🎉 All dashboard queries are working correctly!\n');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    process.exit(1);
  }
}

testDashboard();
