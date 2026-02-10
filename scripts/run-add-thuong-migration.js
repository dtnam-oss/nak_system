const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

// Support both POSTGRES_URL and individual env vars
const poolConfig = process.env.POSTGRES_URL 
  ? { connectionString: process.env.POSTGRES_URL, ssl: false }
  : {
      host: process.env.POSTGRES_HOST,
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DATABASE,
      user: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      ssl: false,
    };

const pool = new Pool(poolConfig);

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting migration: Add thuong column...');
    
    // Read migration file
    const fs = require('fs');
    const path = require('path');
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, '..', 'migrations', '2026-02-10_add_thuong_column.sql'),
      'utf8'
    );
    
    // Execute migration
    console.log('📝 Executing SQL migration...');
    await client.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    
    // Verify results
    const result = await client.query(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(CASE WHEN thuong IS NOT NULL THEN 1 END) as records_with_thuong,
        SUM(COALESCE(thuong, 0)) as total_thuong
      FROM luong_tong_hop
    `);
    
    console.log('\n📊 Migration Results:');
    console.log(result.rows[0]);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
