#!/usr/bin/env tsx
/**
 * Script to check PostgreSQL database schema
 * Usage: tsx scripts/check-database-schema.ts
 */

import { Client } from 'pg';

const DATABASE_URL = 'postgresql://nak_user:123@163.223.12.189:5432/nak_vn';

async function checkSchema() {
  const client = new Client({
    connectionString: DATABASE_URL,
  });
  
  try {
    console.log('🔌 Connecting to PostgreSQL...');
    console.log('📍 Database:', DATABASE_URL.replace(/:[^:@]*@/, ':***@'));
    await client.connect();
    console.log('✅ Connected successfully!\n');

    // List all tables
    console.log('📋 TABLES IN DATABASE:');
    console.log('='.repeat(80));
    const tablesResult = await client.query(`
      SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `);
    
    console.table(tablesResult.rows);

    // Get detailed schema for each table
    for (const table of tablesResult.rows) {
      const tableName = table.tablename;
      console.log(`\n📊 TABLE: ${tableName}`);
      console.log('='.repeat(80));

      // Get columns
      const columnsResult = await client.query(`
        SELECT 
          column_name,
          data_type,
          character_maximum_length,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' 
          AND table_name = $1
        ORDER BY ordinal_position;
      `, [tableName]);

      console.table(columnsResult.rows);

      // Get indexes
      const indexesResult = await client.query(`
        SELECT
          indexname,
          indexdef
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = $1;
      `, [tableName]);

      if (indexesResult.rows.length > 0) {
        console.log('\n🔑 INDEXES:');
        indexesResult.rows.forEach(idx => {
          console.log(`  - ${idx.indexname}`);
        });
      }

      // Get foreign keys
      const fkResult = await client.query(`
        SELECT
          tc.constraint_name,
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
          AND tc.table_name = $1
          AND tc.table_schema = 'public';
      `, [tableName]);

      if (fkResult.rows.length > 0) {
        console.log('\n🔗 FOREIGN KEYS:');
        fkResult.rows.forEach(fk => {
          console.log(`  - ${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
        });
      }

      // Get row count
      try {
        const countResult = await client.query(`SELECT COUNT(*) as count FROM ${tableName}`);
        console.log(`\n📊 Row Count: ${countResult.rows[0].count}`);
      } catch (e) {
        console.log(`\n📊 Row Count: Unable to fetch`);
      }
      
      console.log('\n' + '-'.repeat(80));
    }

    // Check for specific tables we expect
    console.log('\n\n🔍 CHECKING FOR EXPECTED TABLES:');
    console.log('='.repeat(80));
    
    const expectedTables = [
      'chuyen_di',
      'chi_tiet_chuyen_di',
      'reconciliation_orders',
      'fuel_transactions',
      'fuel_imports',
      'vehicles',
      'nhan_vien'
    ];

    const tableNames = tablesResult.rows.map(t => t.tablename);
    
    expectedTables.forEach(tableName => {
      const exists = tableNames.includes(tableName);
      console.log(`  ${exists ? '✅' : '❌'} ${tableName}`);
    });

    // Check if reconciliation_orders has JSONB details column
    const detailsCheck = await client.query(`
      SELECT 
        column_name,
        data_type
      FROM information_schema.columns
      WHERE table_name = 'reconciliation_orders'
        AND column_name = 'details'
        AND table_schema = 'public';
    `);

    if (detailsCheck.rows.length > 0) {
      console.log(`\n📦 reconciliation_orders.details column found: ${detailsCheck.rows[0].data_type}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await client.end();
    console.log('\n🔌 Connection closed');
  }
}

// Run the script
checkSchema().catch(console.error);
