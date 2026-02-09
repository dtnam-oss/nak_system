const { Pool } = require('pg');

async function verifyTable() {
  const pool = new Pool({
    connectionString: 'postgresql://nak_user:Nak_Str0ng_2026@163.223.12.189:5432/nak_vn',
  });

  try {
    console.log('🔌 Connecting to database...');
    const client = await pool.connect();
    console.log('✅ Connected');

    // Check if table exists
    const result = await client.query(`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'bang_luong'
      ORDER BY ordinal_position
      LIMIT 10
    `);

    if (result.rows.length > 0) {
      console.log('\n✅ Table "bang_luong" exists with columns:');
      result.rows.forEach(row => {
        console.log(`  - ${row.column_name} (${row.data_type})`);
      });
    } else {
      console.log('❌ Table "bang_luong" not found');
    }

    // Count rows
    const countResult = await client.query('SELECT COUNT(*) FROM bang_luong');
    console.log(`\n📊 Total rows in bang_luong: ${countResult.rows[0].count}`);

    client.release();
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

verifyTable();
