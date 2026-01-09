/**
 * GHN Parser
 *
 * Template structure:
 * - Row flattening: 1 order = N rows
 * - Each chiTietLoTrinh item becomes separate row
 * - Each row has unique tripCode (maTuyen)
 *
 * Unique Key Strategy: tripCode (maTuyen)
 */

import { BaseParser } from './BaseParser';
import { ReconciliationRow } from './types';

export class GHNParser extends BaseParser {
  templateType = 'ghn';

  expectedColumns = [
    'STT',
    'Ngày',
    'Biển số xe',
    'Trọng tải yêu cầu',
    'Hình thức tính giá',
    'Lộ trình',
    'Số KM',
    'Đơn giá khung',
    'Tên tuyến',
    'Mã chuyến'
  ];

  async parse(file: File): Promise<ReconciliationRow[]> {
    const rawData = await this.readExcel(file);

    if (!this.validateColumns(rawData)) {
      throw new Error(
        `Invalid GHN template format. Expected columns: ${this.expectedColumns.join(', ')}`
      );
    }

    console.log(`📝 Parsing GHN template: ${rawData.length} rows`);

    const rows: ReconciliationRow[] = [];

    for (let index = 0; index < rawData.length; index++) {
      const row = rawData[index];

      // Skip empty rows
      if (!row['Ngày'] && !row['Mã chuyến']) {
        continue;
      }

      try {
        const reconciliationRow: ReconciliationRow = {
          date: this.normalizeDate(row['Ngày']),
          licensePlate: this.normalizeString(row['Biển số xe']),
          routeName: this.normalizeString(row['Tên tuyến']),
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
    // Key strategy: tripCode (maTuyen) is unique per detail row
    const tripCode = this.normalizeString(row['Mã chuyến']);
    return tripCode.toLowerCase().trim();
  }
}
