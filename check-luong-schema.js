const { Pool } = require('pg');

const pool = new Pool({
  host: '163.223.12.189',
  port: 5432,
  database: 'nak_vn',
  user: 'nam',
  password: 'Namne$262535',
  ssl: { rejectUnauthorized: false }
});

async function checkSchema() {
  try {
    console.log('📊 Checking du_lieu_luong table schema...\n');
    
    const schemaResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns
      WHERE table_name = 'du_lieu_luong'
      ORDER BY ordinal_position
    `);
    
    console.log('✅ Columns:');
    schemaResult.rows.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type}`);
    });
    
    const countResult = await pool.query('SELECT COUNT(*) FROM du_lieu_luong');
    console.log(`\nTotal records: ${countResult.rows[0].count}`);
    
    const sampleResult = await pool.query('SELECT * FROM du_lieu_luong LIMIT 2');
    console.log('\nSample data:', JSON.stringify(sampleResult.rows, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkSchema();
