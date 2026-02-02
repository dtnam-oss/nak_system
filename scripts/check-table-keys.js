#!/usr/bin/env node

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://nak_user:123@163.223.12.189:5432/nak_vn'
});

async function checkKeys() {
  try {
    // Get primary keys
    const pkQuery = `
      SELECT 
        tc.table_name, 
        kcu.column_name,
        tc.constraint_type
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.constraint_type = 'PRIMARY KEY'
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name;
    `;
    
    const pkResult = await pool.query(pkQuery);
    console.log('🔑 PRIMARY KEYS:\n');
    pkResult.rows.forEach(r => {
      console.log(`  ${r.table_name}: ${r.column_name}`);
    });
    
    // Get foreign keys
    const fkQuery = `
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name;
    `;
    
    const fkResult = await pool.query(fkQuery);
    console.log('\n🔗 FOREIGN KEYS:\n');
    if (fkResult.rows.length === 0) {
      console.log('  No foreign keys defined');
    } else {
      fkResult.rows.forEach(r => {
        console.log(`  ${r.table_name}.${r.column_name} -> ${r.foreign_table_name}.${r.foreign_column_name}`);
      });
    }
    
    // Get indexes
    const indexQuery = `
      SELECT
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname;
    `;
    
    const indexResult = await pool.query(indexQuery);
    console.log('\n📇 INDEXES:\n');
    let currentTable = '';
    indexResult.rows.forEach(r => {
      if (r.tablename !== currentTable) {
        console.log(`\n  ${r.tablename}:`);
        currentTable = r.tablename;
      }
      console.log(`    - ${r.indexname}`);
    });
    
    // Check JOIN relationships for main tables
    console.log('\n🔍 CHECKING JOIN RELATIONSHIPS:\n');
    
    const tables = ['chuyen_di', 'chi_tiet_chuyen_di'];
    for (const table of tables) {
      const sampleQuery = `SELECT * FROM ${table} LIMIT 1`;
      const result = await pool.query(sampleQuery);
      if (result.rows.length > 0) {
        console.log(`\n  ${table} sample row:`);
        const row = result.rows[0];
        if (row.ma_chuyen_di) console.log(`    - ma_chuyen_di: ${row.ma_chuyen_di}`);
        if (row.id) console.log(`    - id: ${row.id}`);
      }
    }
    
    // Test JOIN between chuyen_di and chi_tiet_chuyen_di
    console.log('\n🔗 Testing JOIN: chuyen_di <-> chi_tiet_chuyen_di\n');
    const joinTest = `
      SELECT 
        cd.ma_chuyen_di,
        COUNT(ct.*) as detail_count
      FROM chuyen_di cd
      LEFT JOIN chi_tiet_chuyen_di ct ON ct.ma_chuyen_di = cd.ma_chuyen_di
      GROUP BY cd.ma_chuyen_di
      LIMIT 5
    `;
    const joinResult = await pool.query(joinTest);
    joinResult.rows.forEach(r => {
      console.log(`  ${r.ma_chuyen_di}: ${r.detail_count} detail rows`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

checkKeys();
