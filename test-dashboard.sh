#!/bin/bash
# Test dashboard API locally

echo "🧪 Testing Dashboard Stats API..."
echo "================================="
echo ""

# Test 1: Check database connection
echo "1️⃣  Testing database connection..."
curl -s http://localhost:3000/api/health/database | jq '.'
echo ""

# Test 2: Test simple query on chuyen_di
echo "2️⃣  Testing chuyen_di table query..."
node -e "
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres:123@163.223.12.189:5432/nak_vn',
  ssl: false
});

(async () => {
  try {
    // Test if table exists and check columns
    const result = await pool.query(\`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'chuyen_di' 
      AND column_name IN ('doanh_thu', 'tong_doanh_thu')
      ORDER BY column_name
    \`);
    
    console.log('Found columns:');
    console.log(JSON.stringify(result.rows, null, 2));
    
    // Test count query
    const count = await pool.query('SELECT COUNT(*) FROM chuyen_di');
    console.log('\\nTotal rows in chuyen_di:', count.rows[0].count);
    
    await pool.end();
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
"

echo ""
echo "3️⃣  Checking what columns exist in chuyen_di..."
echo "Run this SQL to see all columns:"
echo "  SELECT column_name FROM information_schema.columns WHERE table_name = 'chuyen_di' ORDER BY ordinal_position;"
