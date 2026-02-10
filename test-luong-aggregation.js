const { Pool } = require('pg');

const pool = new Pool({
  host: '163.223.12.189',
  port: 5432,
  database: 'nak_vn',
  user: 'nak_user',
  password: 'Nak_Str0ng_2026'
});

async function testAggregation() {
  try {
    // 1. Sample data
    const sample = await pool.query(`
      SELECT ma_tai_xe, email_tai_xe, ten_tai_xe, ngay_tao, luong_tai_xe
      FROM luong_tai_xe 
      WHERE ma_tai_xe IS NOT NULL 
      LIMIT 5
    `);
    console.log('📊 Sample luong_tai_xe:');
    console.table(sample.rows);
    
    // 2. Aggregated by month
    const aggregated = await pool.query(`
      SELECT 
        ma_tai_xe,
        ten_tai_xe,
        EXTRACT(MONTH FROM ngay_tao)::INTEGER as thang,
        EXTRACT(YEAR FROM ngay_tao)::INTEGER as nam,
        COUNT(*) as so_chuyen,
        SUM(luong_tai_xe)::NUMERIC as tong_luong
      FROM luong_tai_xe
      WHERE ma_tai_xe IS NOT NULL
      GROUP BY ma_tai_xe, ten_tai_xe, thang, nam
      ORDER BY nam DESC, thang DESC
      LIMIT 5
    `);
    console.log('\n💰 Aggregated by month:');
    console.table(aggregated.rows);
    
    await pool.end();
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

testAggregation();
