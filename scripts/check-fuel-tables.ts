#!/usr/bin/env tsx
/**
 * Script to check fuel tables schema
 */

import { Client } from 'pg';

const DATABASE_URL = 'postgresql://nak_user:123@163.223.12.189:5432/nak_vn';

async function checkFuelTables() {
  const client = new Client({ connectionString: DATABASE_URL });
  
  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Check nhap_nhien_lieu
    console.log('📊 TABLE: nhap_nhien_lieu (Fuel Imports)');
    console.log('='.repeat(80));
    
    const importsColumns = await client.query(`
      SELECT 
        column_name,
        data_type,
        character_maximum_length,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' 
        AND table_name = 'nhap_nhien_lieu'
      ORDER BY ordinal_position;
    `);
    
    console.table(importsColumns.rows);
    
    const importsCount = await client.query(`SELECT COUNT(*) as count FROM nhap_nhien_lieu`);
    console.log(`\n📊 Row Count: ${importsCount.rows[0].count}\n`);
    
    // Sample data
    const importsSample = await client.query(`SELECT * FROM nhap_nhien_lieu LIMIT 3`);
    console.log('📋 Sample Data (first 3 rows):');
    console.table(importsSample.rows);
    
    console.log('\n' + '='.repeat(80) + '\n');

    // Check xuat_nhien_lieu
    console.log('📊 TABLE: xuat_nhien_lieu (Fuel Transactions)');
    console.log('='.repeat(80));
    
    const transColumns = await client.query(`
      SELECT 
        column_name,
        data_type,
        character_maximum_length,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' 
        AND table_name = 'xuat_nhien_lieu'
      ORDER BY ordinal_position;
    `);
    
    console.table(transColumns.rows);
    
    const transCount = await client.query(`SELECT COUNT(*) as count FROM xuat_nhien_lieu`);
    console.log(`\n📊 Row Count: ${transCount.rows[0].count}\n`);
    
    // Sample data
    const transSample = await client.query(`SELECT * FROM xuat_nhien_lieu LIMIT 3`);
    console.log('📋 Sample Data (first 3 rows):');
    console.table(transSample.rows);

    // Check for indexes
    console.log('\n' + '='.repeat(80));
    console.log('🔑 INDEXES:\n');
    
    const indexes = await client.query(`
      SELECT
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename IN ('nhap_nhien_lieu', 'xuat_nhien_lieu')
      ORDER BY tablename, indexname;
    `);
    
    indexes.rows.forEach(idx => {
      console.log(`${idx.tablename}.${idx.indexname}:`);
      console.log(`  ${idx.indexdef}\n`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
  }
}

checkFuelTables().catch(console.error);
