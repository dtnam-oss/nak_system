/**
 * J&T Route Parser (Theo Tuyến)
 *
 * Template structure:
 * - 1 order = 1 row
 * - Tem chiều đi: First maTuyen (index 0)
 * - Tem chiều về: Last maTuyen (index length-1)
 *
 * Unique Key Strategy: date|stampOut|stampIn
 */

import { BaseParser } from './BaseParser';
import { ReconciliationRow } from './types';

export class JnTRouteParser extends BaseParser {
  templateType = 'jnt_route';

  expectedColumns = [
    'STT',
    'Ngày',
    'Biển số xe',
    'Điểm đi - Điểm đến',
    'Tem chiều đi',
    'Tem chiều về',
    'Thể tích'
  ];

  async parse(file: File): Promise<ReconciliationRow[]> {
    const rawData = await this.readExcel(file);

    if (!this.validateColumns(rawData)) {
      throw new Error(
        `Invalid J&T Route template format. Expected columns: ${this.expectedColumns.join(', ')}`
      );
    }

    console.log(`📝 Parsing J&T Route template: ${rawData.length} rows`);

    const rows: ReconciliationRow[] = [];

    for (let index = 0; index < rawData.length; index++) {
      const row = rawData[index];

      // Skip empty rows
      if (!row['Ngày'] && !row['Tem chiều đi']) {
        continue;
      }

      try {
        const reconciliationRow: ReconciliationRow = {
          date: this.normalizeDate(row['Ngày']),
          licensePlate: this.normalizeString(row['Biển số xe']),
          routeName: this.normalizeString(row['Điểm đi - Điểm đến']),
          uniqueKey: this.generateUniqueKey(row),
          rawData: row,
          templateType: this.templateType,
          rowNumber: index + 2, // Excel rows start at 2 (header = row 1)
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
    // Key strategy: date + stampOut + stampIn
    const date = this.normalizeDate(row['Ngày']);
    const stampOut = this.normalizeString(row['Tem chiều đi']);
    const stampIn = this.normalizeString(row['Tem chiều về']);

    const key = `${date}|${stampOut}|${stampIn}`;
    return key.toLowerCase().trim();
  }
}
