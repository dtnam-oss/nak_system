const { Pool } = require('pg');

async function checkRelationships() {
  const pool = new Pool({
    connectionString: 'postgresql://nak_user:Nak_Str0ng_2026@163.223.12.189:5432/nak_vn',
  });

  try {
    console.log('🔌 Connecting to database...');
    const client = await pool.connect();
    console.log('✅ Connected');

    // Check for foreign keys on luong_tong_hop
    const fkResult = await client.query(`
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = 'luong_tong_hop';
    `);

    if (fkResult.rows.length > 0) {
      console.log('\n🔗 Foreign key relationships:');
      fkResult.rows.forEach(row => {
        console.log(`  ${row.column_name} -> ${row.foreign_table_name}.${row.foreign_column_name}`);
      });
    } else {
      console.log('\n❌ No foreign key relationships found');
    }

    // Check all columns including any we might have missed
    const allColumnsResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'luong_tong_hop'
      ORDER BY ordinal_position
    `);

    console.log('\n📋 Complete table structure:');
    allColumnsResult.rows.forEach(row => {
      const nullable = row.is_nullable === 'YES' ? '(nullable)' : '(not null)';
      console.log(`  ${row.column_name}: ${row.data_type} ${nullable}`);
    });

    client.release();
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkRelationships();
