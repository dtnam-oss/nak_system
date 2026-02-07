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
    console.log('Testing query with and without aliases...\n');
    
    console.log('1. Query WITH aliases (current API style):\n');
    const withAlias = await pool.query(`
      SELECT 
        id,
        ngay_tao as transaction_date,
        loai_hinh as fuel_source,
        bien_so_xe as license_plate
      FROM public.xuat_nhien_lieu
      LIMIT 2
    `);
    console.log(JSON.stringify(withAlias.rows, null, 2));
    
    console.log('\n2. Query WITHOUT aliases (direct column names):\n');
    const noAlias = await pool.query(`
      SELECT 
        id,
        ngay_tao,
        loai_hinh,
        bien_so_xe
      FROM public.xuat_nhien_lieu
      LIMIT 2
    `);
    console.log(JSON.stringify(noAlias.rows, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

test();
