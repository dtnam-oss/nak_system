/**
 * Data Validator
 * Validate CSV data before import
 */

import type {
  MasterRecord,
  DetailRecord,
  ValidationError,
  DatabaseRecord,
} from './types';
import {
  validateMasterRecord,
  validateDetailRecord,
} from './mappers';

/**
 * Validate all master records
 */
export function validateMasterRecords(
  records: MasterRecord[]
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const rowErrors = validateMasterRecord(record);

    for (const message of rowErrors) {
      errors.push({
        row: i + 2, // +2 because CSV row 1 is header, array is 0-indexed
        orderId: record.orderId || 'UNKNOWN',
        field: 'master',
        message,
      });
    }
  }

  return errors;
}

/**
 * Validate all detail records
 */
export function validateDetailRecords(
  records: DetailRecord[]
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const rowErrors = validateDetailRecord(record);

    for (const message of rowErrors) {
      errors.push({
        row: i + 2,
        orderId: record.maChuyenDi || 'UNKNOWN',
        field: 'detail',
        message,
      });
    }
  }

  return errors;
}

/**
 * Validate detail records reference valid master records
 */
export function validateDetailReferences(
  masterRecords: MasterRecord[],
  detailRecords: DetailRecord[]
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Build set of valid master IDs
  const validMasterIds = new Set(
    masterRecords.map((m) => m.orderId)
  );

  // Check each detail references a valid master
  for (let i = 0; i < detailRecords.length; i++) {
    const detail = detailRecords[i];

    if (!validMasterIds.has(detail.maChuyenDi)) {
      errors.push({
        row: i + 2,
        orderId: detail.maChuyenDi,
        field: 'maChuyenDi',
        message: `Detail references non-existent trip: ${detail.maChuyenDi}`,
      });
    }
  }

  return errors;
}

/**
 * Check for duplicate order IDs
 */
export function checkDuplicateOrderIds(
  records: MasterRecord[]
): ValidationError[] {
  const errors: ValidationError[] = [];
  const seen = new Map<string, number>();

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const orderId = record.orderId;

    if (seen.has(orderId)) {
      const firstRow = seen.get(orderId)!;
      errors.push({
        row: i + 2,
        orderId,
        field: 'orderId',
        message: `Duplicate order ID. First occurrence at row ${firstRow}`,
      });
    } else {
      seen.set(orderId, i + 2);
    }
  }

  return errors;
}

/**
 * Validate complete dataset
 */
export function validateDataset(
  masterRecords: MasterRecord[],
  detailRecords: DetailRecord[]
): {
  valid: boolean;
  errors: ValidationError[];
  warnings: string[];
} {
  const allErrors: ValidationError[] = [];
  const warnings: string[] = [];

  // Validate master records
  const masterErrors = validateMasterRecords(masterRecords);
  allErrors.push(...masterErrors);

  // Check for duplicate order IDs
  const duplicateErrors = checkDuplicateOrderIds(masterRecords);
  allErrors.push(...duplicateErrors);

  // Validate detail records
  const detailErrors = validateDetailRecords(detailRecords);
  allErrors.push(...detailErrors);

  // Validate references
  const refErrors = validateDetailReferences(masterRecords, detailRecords);
  allErrors.push(...refErrors);

  // Check for orphaned details (details with no master)
  const masterIds = new Set(masterRecords.map((m) => m.orderId));
  const orphanedDetails = detailRecords.filter(
    (d) => !masterIds.has(d.maChuyenDi)
  );

  if (orphanedDetails.length > 0) {
    warnings.push(
      `Found ${orphanedDetails.length} detail records without matching master records`
    );
  }

  // Check for trips with no details
  const detailTripIds = new Set(detailRecords.map((d) => d.maChuyenDi));
  const tripsWithoutDetails = masterRecords.filter(
    (m) => !detailTripIds.has(m.orderId)
  );

  if (tripsWithoutDetails.length > 0) {
    warnings.push(
      `Found ${tripsWithoutDetails.length} trips without detail records`
    );
  }

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    warnings,
  };
}

/**
 * Print validation results
 */
export function printValidationResults(results: {
  valid: boolean;
  errors: ValidationError[];
  warnings: string[];
}): void {
  console.log('\n========================================');
  console.log('📋 VALIDATION RESULTS');
  console.log('========================================\n');

  if (results.errors.length === 0) {
    console.log('✅ All validations passed!\n');
  } else {
    console.log(`❌ Found ${results.errors.length} errors:\n`);

    // Group errors by type
    const errorsByField = new Map<string, ValidationError[]>();

    for (const error of results.errors) {
      const key = error.field;
      if (!errorsByField.has(key)) {
        errorsByField.set(key, []);
      }
      errorsByField.get(key)!.push(error);
    }

    // Print errors by group
    for (const [field, errors] of errorsByField) {
      console.log(`\n${field.toUpperCase()} ERRORS (${errors.length}):`);
      for (const error of errors.slice(0, 10)) {
        // Show first 10
        console.log(
          `  Row ${error.row}: [${error.orderId}] ${error.message}`
        );
      }
      if (errors.length > 10) {
        console.log(`  ... and ${errors.length - 10} more`);
      }
    }
  }

  // Print warnings
  if (results.warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:');
    for (const warning of results.warnings) {
      console.log(`  - ${warning}`);
    }
  }

  console.log('\n========================================\n');
}
