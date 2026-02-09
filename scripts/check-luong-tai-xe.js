const { Pool } = require('pg');

async function checkLuongTaiXe() {
  const pool = new Pool({
    connectionString: 'postgresql://nak_user:Nak_Str0ng_2026@163.223.12.189:5432/nak_vn',
  });

  try {
    console.log('🔌 Connecting to database...');
    const client = await pool.connect();
    console.log('✅ Connected');

    // Check total rows
    const countResult = await client.query('SELECT COUNT(*) FROM luong_tai_xe');
    console.log(`\n📊 Total rows in luong_tai_xe: ${countResult.rows[0].count}`);

    // Check data for January 2026
    const janResult = await client.query(`
      SELECT COUNT(*) as count,
             SUM(luong_tai_xe) as total_luong
      FROM luong_tai_xe
      WHERE thang = 1 AND nam = 2026
    `);
    console.log(`\n📅 January 2026 data:`);
    console.log(`  - Trips: ${janResult.rows[0].count}`);
    console.log(`  - Total salary: ${janResult.rows[0].total_luong || 0}`);

    // Check data for February 2026
    const febResult = await client.query(`
      SELECT COUNT(*) as count,
             SUM(luong_tai_xe) as total_luong
      FROM luong_tai_xe
      WHERE thang = 2 AND nam = 2026
    `);
    console.log(`\n📅 February 2026 data:`);
    console.log(`  - Trips: ${febResult.rows[0].count}`);
    console.log(`  - Total salary: ${febResult.rows[0].total_luong || 0}`);

    // Sample 3 rows
    const sampleResult = await client.query(`
      SELECT ma_chuyen_di, ten_tai_xe, luong_tai_xe, thang, nam
      FROM luong_tai_xe
      ORDER BY ngay_tao DESC
      LIMIT 3
    `);
    console.log(`\n📋 Sample data (latest 3 rows):`);
    sampleResult.rows.forEach(row => {
      console.log(`  ${row.ma_chuyen_di} - ${row.ten_tai_xe} - ${row.luong_tai_xe} (${row.thang}/${row.nam})`);
    });

    client.release();
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkLuongTaiXe();
