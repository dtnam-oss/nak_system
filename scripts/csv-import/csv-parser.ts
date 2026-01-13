/**
 * CSV Parser
 * Parse CSV files to typed objects
 */

import * as fs from 'fs';
import * as path from 'path';
import type { CSVParseOptions } from './types';

/**
 * Parse CSV file to array of objects
 */
export function parseCSVFile<T = any>(
  filePath: string,
  options: CSVParseOptions = {}
): T[] {
  const {
    delimiter = ',',
    encoding = 'utf-8',
    skipEmptyLines = true,
    trimHeaders = true,
    trimValues = true,
  } = options;

  // Read file
  const fileContent = fs.readFileSync(filePath, { encoding });

  // Parse CSV
  return parseCSVString<T>(fileContent, {
    delimiter,
    skipEmptyLines,
    trimHeaders,
    trimValues,
  });
}

/**
 * Parse CSV string to array of objects
 */
export function parseCSVString<T = any>(
  csvContent: string,
  options: CSVParseOptions = {}
): T[] {
  const {
    delimiter = ',',
    skipEmptyLines = true,
    trimHeaders = true,
    trimValues = true,
  } = options;

  // Split into lines
  const lines = csvContent.split(/\r?\n/);

  if (lines.length === 0) {
    return [];
  }

  // Parse header row
  const headerLine = lines[0];
  let headers = parseCSVLine(headerLine, delimiter);

  if (trimHeaders) {
    headers = headers.map((h) => h.trim());
  }

  // Parse data rows
  const results: T[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];

    // Skip empty lines
    if (skipEmptyLines && (!line || line.trim() === '')) {
      continue;
    }

    // Parse line
    const values = parseCSVLine(line, delimiter);

    // Build object
    const row: any = {};

    for (let j = 0; j < headers.length; j++) {
      const header = headers[j];
      let value = values[j] || '';

      if (trimValues) {
        value = value.trim();
      }

      row[header] = value;
    }

    results.push(row as T);
  }

  return results;
}

/**
 * Parse single CSV line (handles quoted values)
 */
function parseCSVLine(line: string, delimiter: string = ','): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      // End of field
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  // Add last field
  result.push(current);

  return result;
}

/**
 * Check if file exists
 */
export function fileExists(filePath: string): boolean {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

/**
 * Get file size in MB
 */
export function getFileSizeMB(filePath: string): number {
  const stats = fs.statSync(filePath);
  return stats.size / (1024 * 1024);
}

/**
 * Validate CSV file
 */
export function validateCSVFile(filePath: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check if file exists
  if (!fileExists(filePath)) {
    errors.push(`File not found: ${filePath}`);
    return { valid: false, errors };
  }

  // Check file size (warn if > 50MB)
  const sizeMB = getFileSizeMB(filePath);
  if (sizeMB > 50) {
    errors.push(
      `File is very large (${sizeMB.toFixed(2)} MB). Consider splitting into smaller files.`
    );
  }

  // Check file extension
  const ext = path.extname(filePath).toLowerCase();
  if (ext !== '.csv') {
    errors.push(`Invalid file extension: ${ext}. Expected .csv`);
  }

  // Try to read first few lines
  try {
    const content = fs.readFileSync(filePath, { encoding: 'utf-8' });
    const lines = content.split(/\r?\n/).slice(0, 5);

    if (lines.length < 2) {
      errors.push('File appears to be empty or has no data rows');
    }
  } catch (error: any) {
    errors.push(`Error reading file: ${error.message}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
