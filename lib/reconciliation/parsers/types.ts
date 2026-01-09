/**
 * Type Definitions for Reconciliation Import System
 */

/**
 * Parsed row from customer reconciliation file
 */
export interface ReconciliationRow {
  // Common fields across all templates
  date: string;              // YYYY-MM-DD normalized
  licensePlate?: string;     // Biển số xe
  routeName?: string;        // Tên tuyến

  // Template-specific identifiers
  uniqueKey: string;         // Composite key for matching

  // Raw data for comparison
  rawData: Record<string, any>;

  // Metadata
  templateType: string;      // 'jnt_route' | 'jnt_shift' | 'ghn'
  rowNumber: number;         // Original Excel row number
}

/**
 * Strategy interface for parsing different customer templates
 */
export interface ParserStrategy {
  templateType: string;
  expectedColumns: string[];
  parse(file: File): Promise<ReconciliationRow[]>;
  generateUniqueKey(row: any): string;
  validateColumns(data: any[]): boolean;
}

/**
 * Result of parsing operation
 */
export interface ParseResult {
  success: boolean;
  templateType: string;
  rowCount: number;
  rows: ReconciliationRow[];
  errors?: string[];
}

/**
 * Template detection result
 */
export interface TemplateDetectionResult {
  templateType: string;
  confidence: number; // 0-100
  matchedColumns: string[];
  missingColumns: string[];
}
