/**
 * DEBUG MIGRATION - Kiểm tra ngày trong sheet
 *
 * Hàm này giúp debug vấn đề: Tại sao tất cả records bị filter?
 */

/**
 * Kiểm tra ngày của các dòng đang được xử lý
 * @param {number} startRow - Dòng bắt đầu (mặc định 51)
 * @param {number} endRow - Dòng kết thúc (mặc định 76)
 */
function debugCheckDateValues(startRow = 51, endRow = 76) {
  const config = getConfig();

  Logger.log('========================================');
  Logger.log('🔍 DEBUG: KIỂM TRA GIÁ TRỊ NGÀY TRONG SHEET');
  Logger.log('========================================\n');

  // 1. Mở sheet
  const ss = SpreadsheetApp.openById(config.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(config.SHEET_NAMES.MASTER);

  if (!sheet) {
    Logger.log(`❌ Không tìm thấy sheet "${config.SHEET_NAMES.MASTER}"`);
    return;
  }

  // 2. Lấy headers
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const idColIndex = getColumnIndex(headers, config.FOREIGN_KEY.MASTER_COLUMN);
  const dateColIndex = getColumnIndex(headers, 'ngay_tao');

  if (dateColIndex === -1) {
    Logger.log('❌ Không tìm thấy cột "ngay_tao"');
    return;
  }

  Logger.log(`📋 Cột ID: ${config.FOREIGN_KEY.MASTER_COLUMN} (index: ${idColIndex})`);
  Logger.log(`📋 Cột Ngày: ngay_tao (index: ${dateColIndex})`);
  Logger.log(`📋 Filter được cấu hình: START_DATE >= '2026-01-01'\n`);

  // 3. Đọc dữ liệu
  const totalRows = sheet.getLastRow();

  if (endRow > totalRows) {
    endRow = totalRows;
  }

  const numRows = endRow - startRow + 1;
  Logger.log(`🔍 Đang kiểm tra dòng ${startRow} đến ${endRow} (${numRows} dòng)\n`);

  const dataRange = sheet.getRange(startRow, 1, numRows, sheet.getLastColumn());
  const dataValues = dataRange.getValues();

  // 4. Phân tích từng dòng
  let beforeFilter = 0;
  let afterFilter = 0;
  let emptyDate = 0;
  let emptyId = 0;

  const sampleDates = [];

  for (let i = 0; i < dataValues.length; i++) {
    const row = dataValues[i];
    const currentRow = startRow + i;
    const tripId = row[idColIndex];
    const rawDate = row[dateColIndex];

    // Check ID
    if (!tripId || String(tripId).trim() === '') {
      emptyId++;
      Logger.log(`Dòng ${currentRow}: ⚠️  ID trống`);
      continue;
    }

    // Check Date
    if (!rawDate) {
      emptyDate++;
      Logger.log(`Dòng ${currentRow}: ⚠️  Ngày trống | ID: ${tripId}`);
      continue;
    }

    // Format date
    const formattedDate = formatDate(rawDate);

    // Compare with filter
    const isBeforeFilter = formattedDate < '2026-01-01';

    if (isBeforeFilter) {
      beforeFilter++;
    } else {
      afterFilter++;
    }

    // Log first 5 and last 5 rows for detailed inspection
    if (i < 5 || i >= numRows - 5) {
      Logger.log(`Dòng ${currentRow}:`);
      Logger.log(`  ID: ${tripId}`);
      Logger.log(`  Ngày raw: ${rawDate}`);
      Logger.log(`  Type: ${typeof rawDate} | Is Date: ${rawDate instanceof Date}`);
      Logger.log(`  Formatted: ${formattedDate}`);
      Logger.log(`  Status: ${isBeforeFilter ? '❌ BỊ LỌC (< 2026-01-01)' : '✅ ĐỦ ĐIỀU KIỆN'}\n`);
    }

    // Collect sample dates
    if (sampleDates.length < 10) {
      sampleDates.push({
        row: currentRow,
        raw: rawDate,
        formatted: formattedDate,
        filtered: isBeforeFilter
      });
    }
  }

  // 5. Tổng kết
  Logger.log('========================================');
  Logger.log('📊 TỔNG KẾT');
  Logger.log('========================================');
  Logger.log(`Tổng số dòng kiểm tra: ${numRows}`);
  Logger.log(`  ✅ Đủ điều kiện (>= 2026-01-01): ${afterFilter}`);
  Logger.log(`  ❌ Bị lọc (< 2026-01-01): ${beforeFilter}`);
  Logger.log(`  ⚠️  ID trống: ${emptyId}`);
  Logger.log(`  ⚠️  Ngày trống: ${emptyDate}`);
  Logger.log('');

  // 6. Sample dates
  if (sampleDates.length > 0) {
    Logger.log('📋 SAMPLE DATES:');
    Logger.log('Row | Raw Date | Formatted | Status');
    Logger.log('----+----------+-----------+--------');
    sampleDates.forEach(d => {
      const status = d.filtered ? 'FILTERED' : 'OK';
      Logger.log(`${d.row} | ${d.raw} | ${d.formatted} | ${status}`);
    });
    Logger.log('');
  }

  // 7. Phân tích vấn đề
  Logger.log('========================================');
  Logger.log('🔍 PHÂN TÍCH');
  Logger.log('========================================');

  if (afterFilter === 0 && beforeFilter > 0) {
    Logger.log('⚠️  VẤN ĐỀ: TẤT CẢ các dòng đều có ngày < 2026-01-01');
    Logger.log('');
    Logger.log('✅ GIẢI PHÁP:');
    Logger.log('1. Nếu muốn import TẤT CẢ dữ liệu:');
    Logger.log('   - Sửa MIGRATION_OPTS.START_DATE = null');
    Logger.log('');
    Logger.log('2. Nếu muốn import từ ngày cũ hơn:');
    Logger.log('   - Sửa MIGRATION_OPTS.START_DATE = "2025-01-01"');
    Logger.log('   - Hoặc ngày phù hợp với dữ liệu thực tế');
    Logger.log('');
    Logger.log('3. Kiểm tra xem dữ liệu có đúng không:');
    Logger.log('   - Xem các sample dates ở trên');
    Logger.log('   - Có thể cột ngay_tao không đúng?');
  } else if (afterFilter > 0) {
    Logger.log(`✅ CÓ ${afterFilter} dòng đủ điều kiện để import`);
    Logger.log('⚠️  Tuy nhiên vẫn bị skip - cần kiểm tra logic khác');
  }

  Logger.log('\n========================================\n');
}

/**
 * Kiểm tra cấu hình migration hiện tại
 */
function debugMigrationConfig() {
  const scriptProps = PropertiesService.getScriptProperties();
  const lastRow = parseInt(scriptProps.getProperty('MIGRATION_LAST_ROW_INDEX') || '1');

  Logger.log('========================================');
  Logger.log('⚙️  CẤU HÌNH MIGRATION HIỆN TẠI');
  Logger.log('========================================\n');

  Logger.log('📍 Vị trí:');
  Logger.log(`  Last processed row: ${lastRow}`);
  Logger.log(`  Next batch will start: ${lastRow + 1}`);
  Logger.log('');

  Logger.log('📊 Batch Settings:');
  Logger.log(`  BATCH_SIZE: ${MIGRATION_OPTS.BATCH_SIZE}`);
  Logger.log(`  Next batch: rows ${lastRow + 1} to ${lastRow + MIGRATION_OPTS.BATCH_SIZE}`);
  Logger.log('');

  Logger.log('📅 Date Filter:');
  if (MIGRATION_OPTS.START_DATE) {
    Logger.log(`  START_DATE: ${MIGRATION_OPTS.START_DATE}`);
    Logger.log(`  ⚠️  Only records >= ${MIGRATION_OPTS.START_DATE} will be imported`);
  } else {
    Logger.log(`  START_DATE: null`);
    Logger.log(`  ✅ ALL records will be imported (no date filter)`);
  }
  Logger.log('');

  Logger.log('🎯 Manual Start Row:');
  if (MIGRATION_OPTS.MANUAL_START_ROW) {
    Logger.log(`  MANUAL_START_ROW: ${MIGRATION_OPTS.MANUAL_START_ROW}`);
    Logger.log(`  ⚠️  Will override saved position if reset`);
  } else {
    Logger.log(`  MANUAL_START_ROW: null`);
    Logger.log(`  ✅ Using saved position`);
  }

  Logger.log('\n========================================\n');
}

/**
 * Test formatDate function với các giá trị trong sheet
 */
function debugTestFormatDateWithSheetData() {
  const config = getConfig();

  Logger.log('========================================');
  Logger.log('🧪 TEST formatDate() VỚI DỮ LIỆU THỰC');
  Logger.log('========================================\n');

  // Mở sheet
  const ss = SpreadsheetApp.openById(config.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(config.SHEET_NAMES.MASTER);

  if (!sheet) {
    Logger.log('❌ Sheet not found');
    return;
  }

  // Lấy cột ngày
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const dateColIndex = getColumnIndex(headers, 'ngay_tao');

  if (dateColIndex === -1) {
    Logger.log('❌ Column ngay_tao not found');
    return;
  }

  // Lấy 10 mẫu ngày từ sheet
  const totalRows = sheet.getLastRow();
  const sampleRows = [2, 10, 20, 30, 40, 50, 60, 70, 76]; // Sample different rows

  Logger.log('Testing formatDate() với các giá trị thực từ sheet:\n');

  for (const rowNum of sampleRows) {
    if (rowNum > totalRows) continue;

    const rawValue = sheet.getRange(rowNum, dateColIndex + 1).getValue();
    const formatted = formatDate(rawValue);

    Logger.log(`Dòng ${rowNum}:`);
    Logger.log(`  Raw: ${rawValue}`);
    Logger.log(`  Type: ${typeof rawValue}`);
    Logger.log(`  Is Date: ${rawValue instanceof Date}`);
    if (rawValue instanceof Date) {
      Logger.log(`  Full datetime: ${rawValue.toString()}`);
    }
    Logger.log(`  Formatted: ${formatted}`);
    Logger.log(`  Compare: ${formatted} vs 2026-01-01 => ${formatted < '2026-01-01' ? 'BEFORE (filtered)' : 'AFTER (ok)'}`);
    Logger.log('');
  }

  Logger.log('========================================\n');
}
