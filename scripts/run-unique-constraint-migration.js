const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: '163.223.12.189',
  port: 5432,
  database: 'nak_vn',
  user: 'nak_user',
  password: 'Nak_Str0ng_2026',
  ssl: false
});

async function runMigration() {
  try {
    const sql = fs.readFileSync(
      path.join(__dirname, '../migrations/2026-02-10_add_unique_constraint_salary.sql'),
      'utf8'
    );
    
    console.log('🔧 Running migration: Add UNIQUE constraint...\n');
    await pool.query(sql);
    console.log('✅ Migration completed successfully!\n');
    
    await pool.end();
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
