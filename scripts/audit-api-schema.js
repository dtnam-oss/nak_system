#!/usr/bin/env node

/**
 * Database Schema Audit Script
 * 
 * Checks all API routes for potential column name mismatches
 * Usage: node scripts/audit-api-schema.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const CONNECTION_STRING = 'postgresql://nak_user:123@163.223.12.189:5432/nak_vn';

async function getTableSchema(pool, tableName) {
  const result = await pool.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = $1
    ORDER BY ordinal_position
  `, [tableName]);
  
  return result.rows.map(r => r.column_name);
}

async function findColumnsInFiles(directory, pattern) {
  const results = [];
  
  function readDir(dir) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        readDir(fullPath);
      } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        const matches = content.match(pattern);
        
        if (matches) {
          results.push({
            file: fullPath,
            matches: [...new Set(matches)]
          });
        }
      }
    }
  }
  
  readDir(directory);
  return results;
}

async function main() {
  const pool = new Pool({ connectionString: CONNECTION_STRING });
  
  try {
    console.log('🔍 Database Schema Audit\n');
    
    // Get schemas for main tables
    const tables = ['nhan_vien', 'chuyen_di', 'chi_tiet_chuyen_di', 'phuong_tien', 'khach_hang'];
    const schemas = {};
    
    for (const table of tables) {
      console.log(`📊 Fetching schema for: ${table}`);
      schemas[table] = await getTableSchema(pool, table);
      console.log(`   Columns: ${schemas[table].length}`);
    }
    
    console.log('\n✅ Schema fetched successfully\n');
    
    // Known column issues to check
    const knownIssues = [
      'is_active',
      'last_login',
      'thu_tu',
      'loai_tuyen_kh',
      'ma_tuyen',
      'lo_trinh_chi_tiet[^_]', // but not lo_trinh_chi_tiet_theo_diem
      'ct\\.ld',
      'cd\\.ld'
    ];
    
    console.log('🔍 Checking API routes for potential issues...\n');
    
    const apiDir = path.join(process.cwd(), 'app', 'api');
    
    for (const issue of knownIssues) {
      const pattern = new RegExp(issue, 'gi');
      const found = await findColumnsInFiles(apiDir, pattern);
      
      if (found.length > 0) {
        console.log(`⚠️  Found "${issue}" in ${found.length} file(s):`);
        found.forEach(f => {
          const relativePath = f.file.replace(process.cwd(), '.');
          console.log(`   - ${relativePath}`);
          f.matches.forEach(m => console.log(`     → ${m}`));
        });
        console.log('');
      }
    }
    
    // Print actual schemas for reference
    console.log('\n📋 Table Schemas:\n');
    
    for (const [table, columns] of Object.entries(schemas)) {
      console.log(`${table}:`);
      columns.forEach(col => console.log(`  - ${col}`));
      console.log('');
    }
    
    console.log('✅ Audit complete');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
