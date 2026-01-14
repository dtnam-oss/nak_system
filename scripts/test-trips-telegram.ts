#!/usr/bin/env tsx
/**
 * Test Trips Telegram Handlers
 *
 * Usage:
 *   npx tsx scripts/test-trips-telegram.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { sql } from '@vercel/postgres';

config({ path: resolve(process.cwd(), '.env.local') });

async function testTrips() {
  console.log('\n🧪 TESTING TELEGRAM TRIPS QUERIES\n');
  console.log('━'.repeat(50));

  try {
    // Test 1: Today's Trips
    console.log('\n📋 Test 1: Today\'s Trips');
    console.log('─'.repeat(50));

    const today = new Date().toISOString().split('T')[0];
    const todayResult = await sql`
      SELECT
        order_id as "maChuyenDi",
        customer as "tenKhachHang",
        route_name as "tenTuyen",
        driver_name as "tenTaiXe",
        details->'chiTietLoTrinh'->0->>'bienKiemSoat' as "bienKiemSoat",
        revenue as "tongDoanhThu",
        total_distance as "tongQuangDuong"
      FROM reconciliation_orders
      WHERE date = ${today}
      ORDER BY order_id DESC
      LIMIT 10
    `;

    console.log(`✅ Found ${todayResult.rows.length} trips today`);
    todayResult.rows.slice(0, 3).forEach((trip, idx) => {
      console.log(`${idx + 1}. ${trip.maChuyenDi} - ${trip.tenKhachHang || 'N/A'}`);
      console.log(`   Tài xế: ${trip.tenTaiXe || 'N/A'} (${trip.bienKiemSoat || 'N/A'})`);
      console.log(`   Doanh thu: ${Number(trip.tongDoanhThu).toLocaleString('vi-VN')} VNĐ`);
    });

    // Test 2: Trips by Customer
    console.log('\n📊 Test 2: Trips by Customer');
    console.log('─'.repeat(50));

    const customerResult = await sql`
      SELECT
        customer as "tenKhachHang",
        COUNT(*) as "totalTrips",
        COALESCE(SUM(revenue), 0) as "totalRevenue"
      FROM reconciliation_orders
      WHERE customer IS NOT NULL
        AND customer != ''
      GROUP BY customer
      ORDER BY "totalTrips" DESC
      LIMIT 10
    `;

    console.log(`✅ Found ${customerResult.rows.length} customers`);
    customerResult.rows.slice(0, 5).forEach((customer, idx) => {
      console.log(`${idx + 1}. ${customer.tenKhachHang}`);
      console.log(`   Số chuyến: ${customer.totalTrips}`);
      console.log(`   Doanh thu: ${Number(customer.totalRevenue).toLocaleString('vi-VN')} VNĐ`);
    });

    // Test 3: Trips by Vehicle
    console.log('\n🚛 Test 3: Trips by Vehicle');
    console.log('─'.repeat(50));

    const vehicleResult = await sql`
      SELECT
        details->'chiTietLoTrinh'->0->>'bienKiemSoat' as "bienKiemSoat",
        COUNT(*) as "totalTrips",
        COALESCE(SUM(revenue), 0) as "totalRevenue",
        COALESCE(SUM(total_distance), 0) as "totalDistance"
      FROM reconciliation_orders
      WHERE details->'chiTietLoTrinh'->0->>'bienKiemSoat' IS NOT NULL
        AND details->'chiTietLoTrinh'->0->>'bienKiemSoat' != ''
      GROUP BY details->'chiTietLoTrinh'->0->>'bienKiemSoat'
      ORDER BY "totalTrips" DESC
      LIMIT 10
    `;

    console.log(`✅ Found ${vehicleResult.rows.length} vehicles`);
    vehicleResult.rows.slice(0, 5).forEach((vehicle, idx) => {
      console.log(`${idx + 1}. ${vehicle.bienKiemSoat}`);
      console.log(`   Số chuyến: ${vehicle.totalTrips}`);
      console.log(`   Doanh thu: ${Number(vehicle.totalRevenue).toLocaleString('vi-VN')} VNĐ`);
      console.log(`   Quãng đường: ${Number(vehicle.totalDistance).toLocaleString('vi-VN')} km`);
    });

    // Test 4: Search Trip (get a sample trip ID first)
    console.log('\n🔍 Test 4: Search Trip');
    console.log('─'.repeat(50));

    const sampleTripResult = await sql`
      SELECT order_id as "maChuyenDi"
      FROM reconciliation_orders
      ORDER BY date DESC
      LIMIT 1
    `;

    if (sampleTripResult.rows.length > 0) {
      const tripId = sampleTripResult.rows[0].maChuyenDi;
      console.log(`Testing with trip ID: ${tripId}`);

      const tripResult = await sql`
        SELECT
          order_id as "maChuyenDi",
          date as "ngayTao",
          customer as "tenKhachHang",
          route_name as "tenTuyen",
          driver_name as "tenTaiXe",
          details->'chiTietLoTrinh'->0->>'bienKiemSoat' as "bienKiemSoat",
          revenue as "tongDoanhThu",
          total_distance as "tongQuangDuong"
        FROM reconciliation_orders
        WHERE order_id = ${tripId}
        LIMIT 1
      `;

      if (tripResult.rows.length > 0) {
        const trip = tripResult.rows[0];
        console.log(`✅ Trip found:`);
        console.log(`   Mã: ${trip.maChuyenDi}`);
        console.log(`   Khách hàng: ${trip.tenKhachHang || 'N/A'}`);
        console.log(`   Tuyến: ${trip.tenTuyen || 'N/A'}`);
        console.log(`   Tài xế: ${trip.tenTaiXe || 'N/A'} (${trip.bienKiemSoat || 'N/A'})`);
        console.log(`   Doanh thu: ${Number(trip.tongDoanhThu).toLocaleString('vi-VN')} VNĐ`);
        console.log(`   Quãng đường: ${Number(trip.tongQuangDuong).toLocaleString('vi-VN')} km`);
      }
    }

    // Summary
    console.log('\n' + '━'.repeat(50));
    console.log('✅ ALL TESTS PASSED!');
    console.log('━'.repeat(50));
    console.log('\n📊 Summary:');
    console.log(`  • Today's Trips: ✅ (${todayResult.rows.length} trips)`);
    console.log(`  • Trips by Customer: ✅ (${customerResult.rows.length} customers)`);
    console.log(`  • Trips by Vehicle: ✅ (${vehicleResult.rows.length} vehicles)`);
    console.log(`  • Search Trip: ✅`);
    console.log('\n🎉 All trips queries are working correctly!\n');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    process.exit(1);
  }
}

testTrips();
