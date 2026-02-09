const { Pool } = require('pg');

async function checkCreatedSlips() {
  const pool = new Pool({
    connectionString: 'postgresql://nak_user:Nak_Str0ng_2026@163.223.12.189:5432/nak_vn',
  });

  try {
    console.log('🔌 Connecting to database...');
    const client = await pool.connect();
    console.log('✅ Connected');

    // Check for February 2026 data
    const result = await client.query(`
      SELECT
        ma_nhan_vien,
        ten_nhan_vien,
        phong_ban,
        chuc_vu,
        thang,
        nam,
        luong_chuyen,
        id
      FROM luong_tong_hop
      WHERE thang = 2 AND nam = 2026
      ORDER BY ma_nhan_vien
      LIMIT 10
    `);

    console.log(`\n📊 Found ${result.rows.length} salary slips for February 2026:`);

    if (result.rows.length > 0) {
      console.log('\n📄 Sample records:');
      result.rows.forEach((row, index) => {
        console.log(`${index + 1}. ${row.ma_nhan_vien} - ${row.ten_nhan_vien} - ${row.phong_ban} - Lương: ${row.luong_chuyen}`);
      });
    } else {
      console.log('❌ No records found!');
    }

    client.release();
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkCreatedSlips();
