#!/usr/bin/env node

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://nak_user:123@163.223.12.189:5432/nak_vn'
});

async function testReconciliationQuery() {
  try {
    console.log('🧪 Testing reconciliation query...\n');
    
    const query = `
      SELECT
        cd.ma_chuyen_di,
        cd.ngay_tao,
        cd.ten_khach_hang,
        cd.loai_chuyen,
        cd.loai_tuyen,
        cd.ten_tuyen,
        cd.ten_tai_xe,
        cd.don_vi_van_chuyen,
        cd.trang_thai_chuyen_di,
        CASE 
          WHEN cd.doanh_thu::TEXT IS NULL OR cd.doanh_thu::TEXT = '' THEN NULL
          WHEN cd.doanh_thu::TEXT !~ '^-?[0-9]*\\.?[0-9]+$' THEN NULL
          ELSE cd.doanh_thu::NUMERIC
        END as doanh_thu,
        CASE 
          WHEN cd.so_km_theo_odo::TEXT IS NULL OR cd.so_km_theo_odo::TEXT = '' THEN NULL
          WHEN cd.so_km_theo_odo::TEXT !~ '^-?[0-9]*\\.?[0-9]+$' THEN NULL
          ELSE cd.so_km_theo_odo::NUMERIC
        END as so_km_theo_odo,
        cd.thoi_gian_tao,
        json_agg(
          json_build_object(
            'Id', ct.id,
            'LoTrinh', ct.lo_trinh,
            'BienKiemSoat', ct.bien_kiem_soat,
            'QuangDuong', ct.quang_duong
          ) ORDER BY ct.id
        ) FILTER (WHERE ct.id IS NOT NULL) as chi_tiet_lo_trinh
      FROM chuyen_di cd
      LEFT JOIN chi_tiet_chuyen_di ct ON ct.ma_chuyen_di = cd.ma_chuyen_di
      WHERE cd.ngay_tao >= '2025-01-01'
      GROUP BY cd.ma_chuyen_di, cd.ngay_tao, cd.ten_khach_hang, cd.loai_chuyen, cd.loai_tuyen, cd.ten_tuyen, cd.ten_tai_xe, cd.don_vi_van_chuyen, cd.trang_thai_chuyen_di, cd.doanh_thu, cd.so_km_theo_odo, cd.thoi_gian_tao
      ORDER BY cd.ngay_tao DESC
      LIMIT 3
    `;
    
    const result = await pool.query(query);
    
    console.log('✅ Query successful!');
    console.log(`📊 Rows returned: ${result.rows.length}`);
    
    if (result.rows.length > 0) {
      console.log('\n📋 Sample record:');
      const sample = result.rows[0];
      console.log('  - ma_chuyen_di:', sample.ma_chuyen_di);
      console.log('  - ten_khach_hang:', sample.ten_khach_hang);
      console.log('  - chi_tiet count:', sample.chi_tiet_lo_trinh ? sample.chi_tiet_lo_trinh.length : 0);
    }
    
  } catch (error) {
    console.error('❌ Query failed!');
    console.error('Error:', error.message);
    console.error('\nFull error:', error);
  } finally {
    await pool.end();
  }
}

testReconciliationQuery();
