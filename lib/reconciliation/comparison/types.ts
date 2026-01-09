/**
 * Type Definitions for Comparison Engine
 */

import { ReconciliationRow } from '../parsers/types';

/**
 * Overall comparison result
 */
export interface ComparisonResult {
  summary: ComparisonSummary;
  details: ComparisonDetails;
  metadata: ComparisonMetadata;
}

/**
 * Summary statistics
 */
export interface ComparisonSummary {
  totalCustomerRows: number;
  totalNakOrders: number;
  matched: number;
  mismatched: number;
  missingInCustomer: number;
  missingInNak: number;
  matchRate: number; // Percentage (0-100)
}

/**
 * Detailed comparison results
 */
export interface ComparisonDetails {
  matched: MatchedRecord[];
  mismatched: MismatchedRecord[];
  missingInCustomer: NakRecord[];
  missingInNak: CustomerRecord[];
}

/**
 * Comparison metadata
 */
export interface ComparisonMetadata {
  templateType: string;
  dateRange: {
    from: string;
    to: string;
  };
  comparedAt: string; // ISO timestamp
  processingTimeMs: number;
}

/**
 * Matched record (found in both NAK and customer file)
 */
export interface MatchedRecord {
  nakOrderId: string;
  customerRow: ReconciliationRow;
  matchedOn: string; // The unique key used for matching
  confidence: number; // 0-100%
}

/**
 * Mismatched record (found in both but with differences)
 */
export interface MismatchedRecord {
  nakOrderId: string;
  customerRow: ReconciliationRow;
  matchedOn: string;
  differences: FieldDifference[];
  severity: 'critical' | 'warning' | 'info';
}

/**
 * Field-level difference
 */
export interface FieldDifference {
  field: string;
  nakValue: any;
  customerValue: any;
  severity: 'critical' | 'warning' | 'info';
  message?: string;
}

/**
 * NAK record missing in customer file
 */
export interface NakRecord {
  order: any; // Full order from database
  reason: string;
  expectedKey: string; // Key that should have been in customer file
}

/**
 * Customer record missing in NAK database
 */
export interface CustomerRecord {
  row: ReconciliationRow;
  reason: string;
  searchedKey: string;
}

/**
 * Database order row structure
 */
export interface ReconciliationDatabaseRow {
  id: string;
  order_id: string;
  date: Date | string;
  customer: string;
  route_name: string;
  driver_name: string;
  provider: string;
  status: string;
  cost: number;
  revenue: number;
  trip_type: string;
  route_type: string;
  weight: number;
  total_distance: number;
  details: any; // JSON or parsed object
  note?: string;
  created_at: Date;
}
