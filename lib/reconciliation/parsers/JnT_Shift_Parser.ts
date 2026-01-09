/**
 * J&T Shift Parser (Theo Ca)
 *
 * Template structure:
 * - 1 order = 1 row
 * - Multi-line cells: All stamps joined by \n
 * - wrapText enabled in Excel
 *
 * Unique Key Strategy: date|sortedStamps
 */

import { BaseParser } from './BaseParser';
import { ReconciliationRow } from './types';

export class JnTShiftParser extends BaseParser {
  templateType = 'jnt_shift';

  expectedColumns = [
    'Ngày',
    'Biển số xe',
    'Mã tem',
    'Điểm đi - Điểm đến',
    'Thể tích',
    'Loại ca'
  ];

  async parse(file: File): Promise<ReconciliationRow[]> {
    const rawData = await this.readExcel(file);

    if (!this.validateColumns(rawData)) {
      throw new Error(
        `Invalid J&T Shift template format. Expected columns: ${this.expectedColumns.join(', ')}`
      );
    }

    console.log(`📝 Parsing J&T Shift template: ${rawData.length} rows`);

    const rows: ReconciliationRow[] = [];

    for (let index = 0; index < rawData.length; index++) {
      const row = rawData[index];

      // Skip empty rows
      if (!row['Ngày'] && !row['Mã tem']) {
        continue;
      }

      try {
        // Extract first route from multi-line cell
        const routeText = this.normalizeString(row['Điểm đi - Điểm đến']);
        const firstRoute = routeText.split('\n')[0] || routeText;

        const reconciliationRow: ReconciliationRow = {
          date: this.normalizeDate(row['Ngày']),
          licensePlate: this.normalizeString(row['Biển số xe']),
          routeName: firstRoute,
          uniqueKey: this.generateUniqueKey(row),
          rawData: row,
          templateType: this.templateType,
          rowNumber: index + 2,
        };

        rows.push(reconciliationRow);
      } catch (error) {
        console.error(`Failed to parse row ${index + 2}:`, error);
      }
    }

    console.log(`✓ Successfully parsed ${rows.length} rows`);
    return rows;
  }

  generateUniqueKey(row: any): string {
    // Key strategy: date + all stampCodes (sorted)
    const date = this.normalizeDate(row['Ngày']);
    const stampCodesText = this.normalizeString(row['Mã tem']);

    // Split by newline and filter empty
    const stampCodes = stampCodesText
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    // Sort stamps for consistent key generation
    const sortedStamps = stampCodes.sort().join('|');

    const key = `${date}|${sortedStamps}`;
    return key.toLowerCase().trim();
  }
}
