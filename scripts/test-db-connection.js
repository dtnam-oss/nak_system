/**
 * Test Database Connection Script
 * Verifies PostgreSQL connection with current .env.local credentials
 */

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: false,
});

async function testConnection() {
  console.log('🔌 Testing PostgreSQL connection...');
  console.log('📍 Connection string:', process.env.POSTGRES_URL?.replace(/:[^:@]*@/, ':***@'));
  console.log('');

  try {
    const client = await pool.connect();
    console.log('✅ Connection successful!');

    const result = await client.query('SELECT NOW(), version()');
    console.log('📅 Server time:', result.rows[0].now);
    console.log('🗄️  PostgreSQL version:', result.rows[0].version.split(',')[0]);

    // Test query on chuyen_di table
    const testQuery = await client.query('SELECT COUNT(*) as count FROM chuyen_di');
    console.log('📊 Total trips in database:', testQuery.rows[0].count);

    client.release();
    await pool.end();

    console.log('');
    console.log('✅ All tests passed! Database connection is working correctly.');
    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('❌ Connection failed!');
    console.error('Error:', error.message);
    console.error('');
    console.error('💡 Troubleshooting:');
    console.error('   1. Check if password in .env.local is correct: Nak_Str0ng_2026');
    console.error('   2. Verify PostgreSQL server is running at 163.223.12.189:5432');
    console.error('   3. Confirm user "nak_user" has access to database "nak_vn"');
    console.error('');
    process.exit(1);
  }
}

testConnection();
