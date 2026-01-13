#!/usr/bin/env node
/**
 * CSV Transform & Import Script
 * Main entry point for CSV import
 */

import * as fs from 'fs';
import * as path from 'path';
import { parseCSVFile, validateCSVFile } from './csv-parser';
import {
  transformMasterRow,
  transformDetailRow,
  groupDetailsByTrip,
  buildFullPayload,
  payloadToDatabaseRecord,
} from './mappers';
import {
  validateDataset,
  printValidationResults,
} from './validator';
import {
  createDatabaseConnection,
  bulkInsertRecords,
  generateSQLFile,
  verifyImport,
} from './database';
import type {
  MasterCSVRow,
  DetailCSVRow,
  MasterRecord,
  DetailRecord,
  DatabaseRecord,
  ImportResult,
} from './types';

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  INPUT_DIR: path.join(__dirname, 'data', 'input'),
  OUTPUT_DIR: path.join(__dirname, 'data', 'output'),
  MASTER_FILE: 'chuyen_di.csv',
  DETAIL_FILE: 'chi_tiet_chuyen_di.csv',
  SQL_OUTPUT: 'import.sql',
  REPORT_OUTPUT: 'import-report.json',
};

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Read and parse CSV files
 */
function readCSVFiles(): {
  masterRecords: MasterRecord[];
  detailRecords: DetailRecord[];
} {
  console.log('\n========================================');
  console.log('📖 READING CSV FILES');
  console.log('========================================\n');

  // Validate files exist
  const masterPath = path.join(CONFIG.INPUT_DIR, CONFIG.MASTER_FILE);
  const detailPath = path.join(CONFIG.INPUT_DIR, CONFIG.DETAIL_FILE);

  console.log(`📄 Master file: ${masterPath}`);
  const masterValidation = validateCSVFile(masterPath);
  if (!masterValidation.valid) {
    console.error('❌ Master file validation failed:');
    masterValidation.errors.forEach((err) => console.error(`  - ${err}`));
    process.exit(1);
  }

  console.log(`📄 Detail file: ${detailPath}`);
  const detailValidation = validateCSVFile(detailPath);
  if (!detailValidation.valid) {
    console.error('❌ Detail file validation failed:');
    detailValidation.errors.forEach((err) => console.error(`  - ${err}`));
    process.exit(1);
  }

  // Parse CSV files
  console.log('\n🔄 Parsing CSV files...');

  const masterCSV = parseCSVFile<MasterCSVRow>(masterPath);
  console.log(`✅ Found ${masterCSV.length} master records`);

  const detailCSV = parseCSVFile<DetailCSVRow>(detailPath);
  console.log(`✅ Found ${detailCSV.length} detail records`);

  // Transform to typed records
  console.log('\n🔄 Transforming data...');

  const masterRecords = masterCSV.map((row) => transformMasterRow(row));
  const detailRecords = detailCSV.map((row) => transformDetailRow(row));

  console.log('✅ Transformation complete');

  return { masterRecords, detailRecords };
}

/**
 * Build database records
 */
function buildDatabaseRecords(
  masterRecords: MasterRecord[],
  detailRecords: DetailRecord[]
): DatabaseRecord[] {
  console.log('\n========================================');
  console.log('🔧 BUILDING DATABASE RECORDS');
  console.log('========================================\n');

  // Group details by trip
  console.log('🔄 Grouping details by trip...');
  const detailsByTrip = groupDetailsByTrip(detailRecords);

  // Build full payloads
  console.log('🔄 Building payloads...');
  const databaseRecords: DatabaseRecord[] = [];

  for (const master of masterRecords) {
    const details = detailsByTrip[master.orderId] || [];
    const payload = buildFullPayload(master, details);
    const dbRecord = payloadToDatabaseRecord(payload);
    databaseRecords.push(dbRecord);
  }

  console.log(`✅ Built ${databaseRecords.length} database records`);

  // Stats
  const detailCounts = databaseRecords.map(
    (r) => r.details.chiTietLoTrinh.length
  );
  const totalDetails = detailCounts.reduce((a, b) => a + b, 0);
  const avgDetails = totalDetails / databaseRecords.length;
  const maxDetails = Math.max(...detailCounts);
  const minDetails = Math.min(...detailCounts);

  console.log(`\n📊 Statistics:`);
  console.log(`  Total details: ${totalDetails}`);
  console.log(`  Avg details per trip: ${avgDetails.toFixed(2)}`);
  console.log(`  Min details: ${minDetails}`);
  console.log(`  Max details: ${maxDetails}`);

  return databaseRecords;
}

/**
 * Generate SQL file
 */
function generateSQL(records: DatabaseRecord[]): void {
  console.log('\n========================================');
  console.log('📝 GENERATING SQL FILE');
  console.log('========================================\n');

  const sql = generateSQLFile(records);
  const outputPath = path.join(CONFIG.OUTPUT_DIR, CONFIG.SQL_OUTPUT);

  // Ensure output directory exists
  if (!fs.existsSync(CONFIG.OUTPUT_DIR)) {
    fs.mkdirSync(CONFIG.OUTPUT_DIR, { recursive: true });
  }

  fs.writeFileSync(outputPath, sql, 'utf-8');

  console.log(`✅ SQL file generated: ${outputPath}`);
  console.log(`📦 File size: ${(sql.length / 1024).toFixed(2)} KB`);
  console.log(`\n📋 To import, run:`);
  console.log(`   psql $DATABASE_URL -f ${outputPath}`);
}

/**
 * Direct import to database
 */
async function importToDatabase(
  records: DatabaseRecord[]
): Promise<ImportResult> {
  console.log('\n========================================');
  console.log('💾 IMPORTING TO DATABASE');
  console.log('========================================\n');

  const startTime = Date.now();

  // Get database URL from environment
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not found in environment variables');
    console.error('   Please set DATABASE_URL or POSTGRES_URL');
    process.exit(1);
  }

  console.log('🔌 Connecting to database...');
  const sql = createDatabaseConnection(databaseUrl);

  console.log('✅ Connected');
  console.log(`\n🔄 Inserting ${records.length} records...`);

  // Bulk insert
  const { inserted, errors } = await bulkInsertRecords(sql, records);

  const duration = (Date.now() - startTime) / 1000;

  console.log(`\n✅ Import complete in ${duration.toFixed(2)}s`);
  console.log(`   Inserted: ${inserted}/${records.length}`);

  if (errors.length > 0) {
    console.log(`   Errors: ${errors.length}`);
    errors.forEach((err) => console.error(`     - ${err}`));
  }

  // Verify import
  console.log('\n🔍 Verifying import...');
  const expectedIds = records.map((r) => r.order_id);
  const verification = await verifyImport(sql, expectedIds);

  if (verification.success) {
    console.log(`✅ Verification passed: ${verification.found}/${expectedIds.length} records found`);
  } else {
    console.log(`⚠️  Verification issues:`);
    console.log(`   Found: ${verification.found}/${expectedIds.length}`);
    console.log(`   Missing: ${verification.missing.length}`);
    if (verification.missing.length <= 10) {
      verification.missing.forEach((id) => console.log(`     - ${id}`));
    }
  }

  // Close connection
  await sql.end();

  // Build result
  const result: ImportResult = {
    success: errors.length === 0 && verification.success,
    timestamp: new Date().toISOString(),
    totalRecords: records.length,
    imported: inserted,
    errors: errors.length,
    errorRecords: errors,
    durationSeconds: duration,
    details: {
      masterRecords: records.length,
      detailRecords: records.reduce(
        (sum, r) => sum + r.details.chiTietLoTrinh.length,
        0
      ),
      avgDetailsPerTrip:
        records.reduce(
          (sum, r) => sum + r.details.chiTietLoTrinh.length,
          0
        ) / records.length,
    },
  };

  return result;
}

/**
 * Save import report
 */
function saveReport(result: ImportResult): void {
  const reportPath = path.join(CONFIG.OUTPUT_DIR, CONFIG.REPORT_OUTPUT);

  if (!fs.existsSync(CONFIG.OUTPUT_DIR)) {
    fs.mkdirSync(CONFIG.OUTPUT_DIR, { recursive: true });
  }

  fs.writeFileSync(reportPath, JSON.stringify(result, null, 2), 'utf-8');

  console.log(`\n📊 Report saved: ${reportPath}`);
}

// ============================================================================
// CLI COMMANDS
// ============================================================================

/**
 * Transform command: Generate SQL file only
 */
async function commandTransform(): Promise<void> {
  console.log('🚀 Starting CSV Transform (SQL generation mode)');

  const { masterRecords, detailRecords } = readCSVFiles();

  // Validate
  console.log('\n========================================');
  console.log('✅ VALIDATING DATA');
  console.log('========================================');

  const validation = validateDataset(masterRecords, detailRecords);
  printValidationResults(validation);

  if (!validation.valid) {
    console.error('\n❌ Validation failed. Please fix errors and try again.');
    process.exit(1);
  }

  // Build records
  const dbRecords = buildDatabaseRecords(masterRecords, detailRecords);

  // Generate SQL
  generateSQL(dbRecords);

  console.log('\n✅ Transform complete!');
  console.log('\n📋 Next steps:');
  console.log('   1. Review the SQL file');
  console.log('   2. Run: psql $DATABASE_URL -f scripts/csv-import/data/output/import.sql');
}

/**
 * Import command: Direct database import
 */
async function commandImport(): Promise<void> {
  console.log('🚀 Starting CSV Import (direct database mode)');

  const { masterRecords, detailRecords } = readCSVFiles();

  // Validate
  console.log('\n========================================');
  console.log('✅ VALIDATING DATA');
  console.log('========================================');

  const validation = validateDataset(masterRecords, detailRecords);
  printValidationResults(validation);

  if (!validation.valid) {
    console.error('\n❌ Validation failed. Please fix errors and try again.');
    process.exit(1);
  }

  // Build records
  const dbRecords = buildDatabaseRecords(masterRecords, detailRecords);

  // Import
  const result = await importToDatabase(dbRecords);

  // Save report
  saveReport(result);

  // Summary
  console.log('\n========================================');
  console.log('🎉 IMPORT SUMMARY');
  console.log('========================================');
  console.log(`✅ Success: ${result.success}`);
  console.log(`📊 Total records: ${result.totalRecords}`);
  console.log(`💾 Imported: ${result.imported}`);
  console.log(`❌ Errors: ${result.errors}`);
  console.log(`⏱️  Duration: ${result.durationSeconds.toFixed(2)}s`);
  console.log('========================================\n');

  if (!result.success) {
    process.exit(1);
  }
}

/**
 * Validate command: Validate CSV only
 */
async function commandValidate(): Promise<void> {
  console.log('🚀 Starting CSV Validation');

  const { masterRecords, detailRecords } = readCSVFiles();

  const validation = validateDataset(masterRecords, detailRecords);
  printValidationResults(validation);

  if (validation.valid) {
    console.log('✅ Validation passed! Ready to import.');
    process.exit(0);
  } else {
    console.error('❌ Validation failed.');
    process.exit(1);
  }
}

// ============================================================================
// CLI ENTRY POINT
// ============================================================================

async function main() {
  const command = process.argv[2] || 'transform';

  try {
    switch (command) {
      case 'transform':
        await commandTransform();
        break;
      case 'import':
        await commandImport();
        break;
      case 'validate':
        await commandValidate();
        break;
      default:
        console.error(`Unknown command: ${command}`);
        console.log('\nAvailable commands:');
        console.log('  transform  - Generate SQL file (default)');
        console.log('  import     - Direct database import');
        console.log('  validate   - Validate CSV files only');
        process.exit(1);
    }
  } catch (error: any) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { commandTransform, commandImport, commandValidate };
