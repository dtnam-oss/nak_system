/**
 * Comparison Engine
 *
 * Core logic for comparing customer reconciliation files with NAK database.
 * Performs two-way matching to find matched, mismatched, and missing records.
 */

import { ReconciliationRow } from '../parsers/types';
import {
  ComparisonResult,
  ComparisonSummary,
  ComparisonDetails,
  MatchedRecord,
  MismatchedRecord,
  NakRecord,
  CustomerRecord,
  ReconciliationDatabaseRow,
  FieldDifference,
} from './types';

export class ComparisonEngine {
  /**
   * Main comparison function
   */
  async compare(
    customerRows: ReconciliationRow[],
    nakOrders: ReconciliationDatabaseRow[],
    dateRange: { from: string; to: string }
  ): Promise<ComparisonResult> {
    const startTime = Date.now();

    console.log('🔍 Starting comparison...');
    console.log(`   Customer rows: ${customerRows.length}`);
    console.log(`   NAK orders: ${nakOrders.length}`);
    console.log(`   Date range: ${dateRange.from} to ${dateRange.to}`);

    if (customerRows.length === 0) {
      throw new Error('No customer rows to compare');
    }

    const templateType = customerRows[0].templateType;

    // Build index maps for fast lookup
    const customerMap = new Map<string, ReconciliationRow>();
    customerRows.forEach(row => {
      customerMap.set(row.uniqueKey, row);
    });

    const nakMap = new Map<string, ReconciliationDatabaseRow>();
    const nakKeyMap = new Map<string, string>(); // uniqueKey -> order_id

    // Generate NAK unique keys based on template type
    nakOrders.forEach(order => {
      nakMap.set(order.order_id, order);

      const uniqueKeys = this.generateNakUniqueKeys(order, templateType);
      uniqueKeys.forEach(key => {
        // Handle potential duplicates (same key for multiple orders)
        if (nakKeyMap.has(key)) {
          console.warn(`⚠️ Duplicate NAK key detected: ${key}`);
        }
        nakKeyMap.set(key, order.order_id);
      });
    });

    console.log(`   Generated ${nakKeyMap.size} NAK unique keys`);

    // Initialize result containers
    const matched: MatchedRecord[] = [];
    const mismatched: MismatchedRecord[] = [];
    const missingInNak: CustomerRecord[] = [];

    // Pass 1: Customer → NAK matching
    console.log('🔄 Pass 1: Matching customer rows to NAK orders...');

    for (const [customerKey, customerRow] of customerMap) {
      const nakOrderId = nakKeyMap.get(customerKey);

      if (nakOrderId) {
        const nakOrder = nakMap.get(nakOrderId)!;

        // Check if values match
        const differences = this.findDifferences(customerRow, nakOrder, templateType);

        if (differences.length === 0) {
          // Perfect match
          matched.push({
            nakOrderId,
            customerRow,
            matchedOn: customerKey,
            confidence: 100,
          });
        } else {
          // Matched but with differences
          const severity = this.calculateSeverity(differences);
          mismatched.push({
            nakOrderId,
            customerRow,
            matchedOn: customerKey,
            differences,
            severity,
          });
        }
      } else {
        // Not found in NAK
        missingInNak.push({
          row: customerRow,
          reason: 'Không tìm thấy trong hệ thống NAK',
          searchedKey: customerKey,
        });
      }
    }

    console.log(`   Matched: ${matched.length}`);
    console.log(`   Mismatched: ${mismatched.length}`);
    console.log(`   Missing in NAK: ${missingInNak.length}`);

    // Pass 2: Find NAK orders missing in customer file
    console.log('🔄 Pass 2: Finding NAK orders missing in customer file...');

    const missingInCustomer: NakRecord[] = [];

    for (const [nakOrderId, nakOrder] of nakMap) {
      // Check if this NAK order was matched in Pass 1
      const wasMatched = matched.some(m => m.nakOrderId === nakOrderId) ||
                         mismatched.some(m => m.nakOrderId === nakOrderId);

      if (!wasMatched) {
        const expectedKeys = this.generateNakUniqueKeys(nakOrder, templateType);
        missingInCustomer.push({
          order: nakOrder,
          reason: 'Không có trong file đối soát của khách hàng',
          expectedKey: expectedKeys[0] || '',
        });
      }
    }

    console.log(`   Missing in Customer: ${missingInCustomer.length}`);

    // Calculate summary
    const matchRate = customerRows.length > 0
      ? (matched.length / customerRows.length) * 100
      : 0;

    const summary: ComparisonSummary = {
      totalCustomerRows: customerRows.length,
      totalNakOrders: nakOrders.length,
      matched: matched.length,
      mismatched: mismatched.length,
      missingInCustomer: missingInCustomer.length,
      missingInNak: missingInNak.length,
      matchRate: Math.round(matchRate * 100) / 100,
    };

    const details: ComparisonDetails = {
      matched,
      mismatched,
      missingInCustomer,
      missingInNak,
    };

    const processingTime = Date.now() - startTime;

    console.log(`✓ Comparison completed in ${processingTime}ms`);
    console.log(`   Match rate: ${summary.matchRate.toFixed(2)}%`);

    return {
      summary,
      details,
      metadata: {
        templateType,
        dateRange,
        comparedAt: new Date().toISOString(),
        processingTimeMs: processingTime,
      },
    };
  }

  /**
   * Generate unique keys from NAK order based on template type
   */
  private generateNakUniqueKeys(
    order: ReconciliationDatabaseRow,
    templateType: string
  ): string[] {
    const keys: string[] = [];

    try {
      // Parse details JSON if it's a string
      const details = typeof order.details === 'string'
        ? JSON.parse(order.details)
        : order.details;

      const chiTietLoTrinh = details?.chiTietLoTrinh || [];

      switch (templateType) {
        case 'jnt_route': {
          // Key: date|stampOut|stampIn
          const date = this.formatDate(order.date);
          const stampOut = chiTietLoTrinh[0]?.maTuyen || '';
          const stampIn = chiTietLoTrinh[chiTietLoTrinh.length - 1]?.maTuyen || '';

          if (stampOut || stampIn) {
            const key = `${date}|${stampOut}|${stampIn}`;
            keys.push(key.toLowerCase().trim());
          }
          break;
        }

        case 'jnt_shift': {
          // Key: date|sortedStamps
          const date = this.formatDate(order.date);
          const stamps = chiTietLoTrinh
            .map((item: any) => item.maTuyen)
            .filter(Boolean);

          if (stamps.length > 0) {
            const sortedStamps = stamps.sort().join('|');
            const key = `${date}|${sortedStamps}`;
            keys.push(key.toLowerCase().trim());
          }
          break;
        }

        case 'ghn': {
          // Key: each maTuyen is a separate key
          chiTietLoTrinh.forEach((item: any) => {
            if (item.maTuyen) {
              keys.push(item.maTuyen.toLowerCase().trim());
            }
          });
          break;
        }

        default:
          console.warn(`Unknown template type: ${templateType}`);
      }
    } catch (error) {
      console.error('Failed to generate NAK keys:', error);
    }

    return keys;
  }

  /**
   * Format date to YYYY-MM-DD
   */
  private formatDate(date: Date | string): string {
    if (typeof date === 'string') {
      // Already YYYY-MM-DD format
      if (date.match(/^\d{4}-\d{2}-\d{2}/)) {
        return date.split('T')[0];
      }
      return date;
    }

    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Find differences between customer row and NAK order
   */
  private findDifferences(
    customerRow: ReconciliationRow,
    nakOrder: ReconciliationDatabaseRow,
    templateType: string
  ): FieldDifference[] {
    const differences: FieldDifference[] = [];

    // Compare date
    const nakDate = this.formatDate(nakOrder.date);
    if (customerRow.date !== nakDate) {
      differences.push({
        field: 'Ngày',
        nakValue: nakDate,
        customerValue: customerRow.date,
        severity: 'critical',
        message: 'Ngày không khớp',
      });
    }

    // Compare license plate (if available)
    if (customerRow.licensePlate) {
      try {
        const details = typeof nakOrder.details === 'string'
          ? JSON.parse(nakOrder.details)
          : nakOrder.details;

        const nakLicensePlates = details?.chiTietLoTrinh
          ?.map((item: any) => item.bienKiemSoat)
          .filter(Boolean) || [];

        const customerPlate = customerRow.licensePlate.toLowerCase().trim();
        const hasMatchingPlate = nakLicensePlates.some(
          (plate: string) => plate.toLowerCase().trim() === customerPlate
        );

        if (!hasMatchingPlate && nakLicensePlates.length > 0) {
          differences.push({
            field: 'Biển số xe',
            nakValue: nakLicensePlates.join(', '),
            customerValue: customerRow.licensePlate,
            severity: 'warning',
            message: 'Biển số xe không khớp',
          });
        }
      } catch (error) {
        // Ignore parsing errors
      }
    }

    // Additional field comparisons can be added here based on template type

    return differences;
  }

  /**
   * Calculate overall severity from list of differences
   */
  private calculateSeverity(differences: FieldDifference[]): 'critical' | 'warning' | 'info' {
    if (differences.some(d => d.severity === 'critical')) {
      return 'critical';
    }
    if (differences.some(d => d.severity === 'warning')) {
      return 'warning';
    }
    return 'info';
  }
}
