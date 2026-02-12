// Quick script to check nhan_vien table schema
const { sql } = require('@vercel/postgres');

async function checkSchema() {
  try {
    // Query to get all column names
    const result = await sql`
      SELECT column_name, data_type, character_maximum_length, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'nhan_vien'
      ORDER BY ordinal_position
    `;

    console.log('\n📋 NHAN_VIEN TABLE SCHEMA:\n');
    console.log('Total columns:', result.rows.length);
    console.log('\nColumn details:');
    console.log('─'.repeat(80));

    result.rows.forEach((col, index) => {
      const type = col.character_maximum_length
        ? `${col.data_type}(${col.character_maximum_length})`
        : col.data_type;
      console.log(`${index + 1}. ${col.column_name.padEnd(30)} | ${type.padEnd(20)} | Nullable: ${col.is_nullable}`);
    });

    console.log('─'.repeat(80));
    console.log('\n✅ Schema check complete\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  process.exit(0);
}

checkSchema();
