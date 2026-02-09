const { Pool } = require('pg');

async function checkLuongTongHop() {
  const pool = new Pool({
    connectionString: 'postgresql://nak_user:Nak_Str0ng_2026@163.223.12.189:5432/nak_vn',
  });

  try {
    console.log('🔌 Connecting to database...');
    const client = await pool.connect();
    console.log('✅ Connected');

    // Check if table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'luong_tong_hop'
      );
    `);

    if (tableCheck.rows[0].exists) {
      console.log('\n✅ Table "luong_tong_hop" exists');

      // Get table structure
      const columnsResult = await client.query(`
        SELECT column_name, data_type, character_maximum_length
        FROM information_schema.columns
        WHERE table_name = 'luong_tong_hop'
        ORDER BY ordinal_position
      `);

      console.log('\n📋 Table structure:');
      columnsResult.rows.forEach(row => {
        const length = row.character_maximum_length ? `(${row.character_maximum_length})` : '';
        console.log(`  - ${row.column_name}: ${row.data_type}${length}`);
      });

      // Check row count
      const countResult = await client.query('SELECT COUNT(*) FROM luong_tong_hop');
      console.log(`\n📊 Total rows: ${countResult.rows[0].count}`);

      // Sample data
      if (countResult.rows[0].count > 0) {
        const sampleResult = await client.query('SELECT * FROM luong_tong_hop LIMIT 3');
        console.log('\n📄 Sample data (first 3 rows):');
        console.log(JSON.stringify(sampleResult.rows, null, 2));
      }
    } else {
      console.log('\n❌ Table "luong_tong_hop" does NOT exist');
      console.log('💡 Need to create this table');
    }

    client.release();
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkLuongTongHop();
