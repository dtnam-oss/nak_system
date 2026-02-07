const { Pool } = require('pg');

const pool = new Pool({
  host: '163.223.12.189',
  port: 5432,
  user: 'nak_user',
  password: '123',
  database: 'nak_vn',
  ssl: false
});

async function test() {
  try {
    console.log('Testing direct database connection...\n');
    
    const result = await pool.query(`
      SELECT 
        id,
        ngay_nhap,
        to_char(ngay_nhap, 'YYYY-MM-DD') as formatted_date,
        nha_cung_cap,
        ten_nhien_lieu,
        so_luong
      FROM public.nhap_nhien_lieu
      ORDER BY ngay_nhap DESC
      LIMIT 5
    `);
    
    console.log('Query successful!');
    console.log('Rows:', result.rowCount);
    console.log('\nData:');
    console.log(JSON.stringify(result.rows, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

test();
