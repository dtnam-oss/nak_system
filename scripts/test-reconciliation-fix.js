const { Client } = require('pg');

const client = new Client({ 
  connectionString: 'postgresql://nak_user:Nak_Str0ng_2026@163.223.12.189:6432/nak_vn' 
});

async function testReconciliationQuery() {
  try {
    await client.connect();
    console.log('✅ Connected to database');
    
    const khachHang = 'J&T';
    const loaiChuyen = 'Theo tuyến';
    const limit = 2;
    
    const sqlQuery = `
      SELECT
        cd.ma_chuyen_di,
        cd.ngay_tao,
        cd.ten_khach_hang,
        cd.loai_chuyen,
        json_agg(
          json_build_object(
            'id', ct.id,
            'loTrinh', ct.lo_trinh,
            'taiTrongTinhPhi', ct.tai_trong_tinh_phi,
            'quangDuong', ct.quang_duong,
            'donGia', ct.don_gia
          ) ORDER BY ct.id
        ) FILTER (WHERE ct.id IS NOT NULL) as chi_tiet_lo_trinh
      FROM chuyen_di cd
      LEFT JOIN chi_tiet_chuyen_di ct ON ct.ma_chuyen_di = cd.ma_chuyen_di
      WHERE cd.ten_khach_hang ILIKE $1 AND cd.loai_chuyen = $2
      GROUP BY cd.ma_chuyen_di, cd.ngay_tao, cd.ten_khach_hang, cd.loai_chuyen
      ORDER BY cd.ngay_tao DESC
      LIMIT $3
    `;
    
    console.log('🔍 Testing query with filters:', { khachHang, loaiChuyen, limit });
    const res = await client.query(sqlQuery, [`%${khachHang}%`, loaiChuyen, limit]);
    
    console.log('✅ Query successful!');
    console.log('📊 Rows returned:', res.rows.length);
    
    if (res.rows.length > 0) {
      const firstRow = res.rows[0];
      console.log('\n📋 First row:');
      console.log('  ma_chuyen_di:', firstRow.ma_chuyen_di);
      console.log('  ten_khach_hang:', firstRow.ten_khach_hang);
      console.log('  loai_chuyen:', firstRow.loai_chuyen);
      console.log('  chi_tiet_lo_trinh count:', firstRow.chi_tiet_lo_trinh?.length || 0);
      
      if (firstRow.chi_tiet_lo_trinh && firstRow.chi_tiet_lo_trinh.length > 0) {
        const firstDetail = firstRow.chi_tiet_lo_trinh[0];
        console.log('\n📦 First detail:');
        console.log('  id:', firstDetail.id);
        console.log('  loTrinh:', firstDetail.loTrinh);
        console.log('  taiTrongTinhPhi:', firstDetail.taiTrongTinhPhi, '(type:', typeof firstDetail.taiTrongTinhPhi, ')');
        console.log('  quangDuong:', firstDetail.quangDuong, '(type:', typeof firstDetail.quangDuong, ')');
        console.log('  donGia:', firstDetail.donGia, '(type:', typeof firstDetail.donGia, ')');
      }
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    if (err.detail) console.error('   Detail:', err.detail);
    if (err.hint) console.error('   Hint:', err.hint);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n✅ Test complete');
  }
}

testReconciliationQuery();
