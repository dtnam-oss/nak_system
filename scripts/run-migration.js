const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const pool = new Pool({
    connectionString: 'postgresql://nak_user:Nak_Str0ng_2026@163.223.12.189:5432/nak_vn',
  });

  try {
    console.log('🔌 Connecting to database...');
    const client = await pool.connect();
    console.log('✅ Connected to database');

    const sqlFile = path.join(__dirname, '../sql/create_bang_luong_table.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    console.log('📝 Executing migration...');
    await client.query(sql);
    console.log('✅ Migration completed successfully!');

    client.release();
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
