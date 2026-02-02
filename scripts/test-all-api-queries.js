#!/usr/bin/env node

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://nak_user:123@163.223.12.189:5432/nak_vn'
});

const tests = [
  {
    name: 'reconciliation - basic query',
    query: `
      SELECT cd.ma_chuyen_di, cd.ten_khach_hang, COUNT(ct.id) as detail_count
      FROM chuyen_di cd
      LEFT JOIN chi_tiet_chuyen_di ct ON ct.ma_chuyen_di = cd.ma_chuyen_di
      WHERE cd.ngay_tao >= '2025-01-01'
      GROUP BY cd.ma_chuyen_di, cd.ten_khach_hang
      LIMIT 5
    `
  },
  {
    name: 'reconciliation-v2 - with json_agg',
    query: `
      SELECT
        cd.ma_chuyen_di,
        cd.ngay_tao,
        COALESCE(
          json_agg(
            json_build_object(
              'id', ct.id,
              'loTrinh', ct.lo_trinh
            ) ORDER BY ct.id
          ) FILTER (WHERE ct.id IS NOT NULL),
          '[]'::json
        ) as chi_tiet_lo_trinh
      FROM chuyen_di cd
      LEFT JOIN chi_tiet_chuyen_di ct ON ct.ma_chuyen_di = cd.ma_chuyen_di
      WHERE cd.ngay_tao >= '2025-01-01'
      GROUP BY cd.ma_chuyen_di, cd.ngay_tao, cd.thoi_gian_tao
      LIMIT 5
    `
  },
  {
    name: 'employees - basic query',
    query: `
      SELECT ma_nhan_vien, ho_va_ten, email, phan_quyen, trang_thai
      FROM nhan_vien
      WHERE phan_quyen = 'Admin'
      LIMIT 5
    `
  },
  {
    name: 'vehicles route-history',
    query: `
      SELECT cd.ma_chuyen_di, ct.bien_kiem_soat, ct.lo_trinh
      FROM chuyen_di cd
      INNER JOIN chi_tiet_chuyen_di ct ON cd.ma_chuyen_di = ct.ma_chuyen_di
      WHERE ct.bien_kiem_soat IS NOT NULL
      LIMIT 5
    `
  },
  {
    name: 'dashboard stats',
    query: `
      SELECT COUNT(*) as total FROM chuyen_di WHERE ngay_tao >= '2025-01-01'
    `
  }
];

async function runTests() {
  console.log('🧪 Running API Query Tests\n');
  console.log('='.repeat(60));
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      console.log(`\n📝 Test: ${test.name}`);
      const start = Date.now();
      const result = await pool.query(test.query);
      const duration = Date.now() - start;
      
      console.log(`✅ PASSED (${duration}ms, ${result.rows.length} rows)`);
      passed++;
    } catch (error) {
      console.log(`❌ FAILED: ${error.message}`);
      console.log(`   Query: ${test.query.substring(0, 100)}...`);
      failed++;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  
  if (failed > 0) {
    console.log('\n⚠️  Some tests failed. Check the errors above.');
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed!');
  }
}

runTests()
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  })
  .finally(() => {
    pool.end();
  });
