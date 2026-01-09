/**
 * Base Parser Class
 *
 * Abstract base class for all customer template parsers.
 * Provides common functionality for reading Excel files and validation.
 */

import * as XLSX from 'xlsx';
import { ReconciliationRow, ParserStrategy } from './types';

export abstract class BaseParser implements ParserStrategy {
  abstract templateType: string;
  abstract expectedColumns: string[];

  /**
   * Read Excel file and convert to JSON
   */
  protected async readExcel(file: File): Promise<any[]> {
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });

      // Get first sheet
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      // Convert to JSON with header row
      const data = XLSX.utils.sheet_to_json(worksheet, {
        raw: false, // Format values as strings
        defval: '', // Default value for empty cells
      });

      return data;
    } catch (error) {
      throw new Error(`Failed to read Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate that all expected columns exist in the data
   */
  validateColumns(data: any[]): boolean {
    if (!data || data.length === 0) {
      return false;
    }

    const firstRow = data[0];
    const actualColumns = Object.keys(firstRow);

    // Check if all expected columns exist
    const missingColumns = this.expectedColumns.filter(
      col => !actualColumns.includes(col)
    );

    if (missingColumns.length > 0) {
      console.error(`Missing columns: ${missingColumns.join(', ')}`);
      return false;
    }

    return true;
  }

  /**
   * Normalize date from dd/MM/yyyy to YYYY-MM-DD
   */
  protected normalizeDate(dateStr: string): string {
    if (!dateStr) return '';

    try {
      // Handle format: dd/MM/yyyy
      if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
          const [day, month, year] = parts;
          return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
      }

      // Handle format: yyyy-MM-dd (already normalized)
      if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return dateStr;
      }

      // Try to parse as Date object
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }

      return '';
    } catch (error) {
      console.error(`Failed to normalize date: ${dateStr}`, error);
      return '';
    }
  }

  /**
   * Trim and normalize string value
   */
  protected normalizeString(value: any): string {
    if (value === null || value === undefined) return '';
    return String(value).trim();
  }

  /**
   * Abstract methods to be implemented by subclasses
   */
  abstract parse(file: File): Promise<ReconciliationRow[]>;
  abstract generateUniqueKey(row: any): string;
}
