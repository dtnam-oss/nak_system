/**
 * Test Date Formatting - Debug ngay_tren_tem issue
 */
function testDateFormatting() {
  Logger.log('========================================');
  Logger.log('🧪 TEST DATE FORMATTING');
  Logger.log('========================================\n');

  // Test cases covering different input formats
  const testCases = [
    { input: '2026-01-02 01:30:00', expected: '2026-01-02', description: 'DateTime string (current issue)' },
    { input: '2026-01-02', expected: '2026-01-02', description: 'Date string' },
    { input: '02/01/2026', expected: '2026-01-02', description: 'DD/MM/YYYY format' },
    { input: new Date(2026, 0, 2, 1, 30, 0), expected: '2026-01-02', description: 'Date object with time' },
    { input: new Date(2026, 0, 2), expected: '2026-01-02', description: 'Date object' },
    { input: 44928.0625, expected: '2023-01-02', description: 'Excel serial number' },
    { input: '', expected: '', description: 'Empty string' },
    { input: null, expected: '', description: 'Null value' }
  ];

  Logger.log('Running test cases:\n');

  let passed = 0;
  let failed = 0;

  for (let i = 0; i < testCases.length; i++) {
    const test = testCases[i];

    try {
      const result = formatDate(test.input);
      const success = result === test.expected;

      if (success) {
        Logger.log(`✅ PASS: ${test.description}`);
        Logger.log(`   Input: ${test.input}`);
        Logger.log(`   Expected: ${test.expected}`);
        Logger.log(`   Got: ${result}\n`);
        passed++;
      } else {
        Logger.log(`❌ FAIL: ${test.description}`);
        Logger.log(`   Input: ${test.input}`);
        Logger.log(`   Expected: ${test.expected}`);
        Logger.log(`   Got: ${result}\n`);
        failed++;
      }
    } catch (error) {
      Logger.log(`💥 ERROR: ${test.description}`);
      Logger.log(`   Input: ${test.input}`);
      Logger.log(`   Error: ${error.message}\n`);
      failed++;
    }
  }

  Logger.log('========================================');
  Logger.log('📊 RESULTS');
  Logger.log('========================================');
  Logger.log(`✅ Passed: ${passed}/${testCases.length}`);
  Logger.log(`❌ Failed: ${failed}/${testCases.length}`);
  Logger.log('========================================\n');
}

/**
 * Test với giá trị thực tế từ sheet ngay_tren_tem
 */
function testRealDateFromSheet() {
  const config = getConfig();
  const ss = SpreadsheetApp.openById(config.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(config.SHEET_NAMES.DETAIL);

  if (!sheet) {
    Logger.log('❌ Sheet not found');
    return;
  }

  const values = sheet.getDataRange().getValues();

  if (values.length < 2) {
    Logger.log('❌ No data rows');
    return;
  }

  const headers = values[0];
  const dateColIndex = getColumnIndex(headers, 'ngay_tren_tem');

  if (dateColIndex === -1) {
    Logger.log('❌ Column ngay_tren_tem not found');
    return;
  }

  Logger.log('========================================');
  Logger.log('🔍 REAL DATA FROM SHEET');
  Logger.log('========================================\n');

  // Check first 5 rows
  const rowsToCheck = Math.min(6, values.length);

  for (let i = 1; i < rowsToCheck; i++) {
    const rawValue = values[i][dateColIndex];

    Logger.log(`Row ${i}:`);
    Logger.log(`  Raw value: ${rawValue}`);
    Logger.log(`  Type: ${typeof rawValue}`);
    Logger.log(`  Is Date object: ${rawValue instanceof Date}`);

    if (rawValue) {
      const formatted = formatDate(rawValue);
      Logger.log(`  Formatted: ${formatted}`);

      // Additional info for Date objects
      if (rawValue instanceof Date) {
        Logger.log(`  Full datetime: ${rawValue.toString()}`);
        Logger.log(`  Time portion: ${rawValue.getHours()}:${rawValue.getMinutes()}:${rawValue.getSeconds()}`);
      }
    }

    Logger.log('');
  }

  Logger.log('========================================\n');
}

/**
 * Test improved formatDate function with better datetime string handling
 */
function testImprovedFormatDate() {
  Logger.log('========================================');
  Logger.log('🧪 TEST IMPROVED FORMAT DATE');
  Logger.log('========================================\n');

  // Test the problematic case
  const testValue = '2026-01-02 01:30:00';

  Logger.log(`Testing: "${testValue}"\n`);

  // Current function
  const currentResult = formatDate(testValue);
  Logger.log(`Current formatDate(): ${currentResult}`);

  // Test improved parsing
  try {
    let value = testValue;
    let date;

    // NEW: If string contains both date and time, extract only date part
    if (typeof value === 'string' && value.includes(' ')) {
      Logger.log(`  Detected datetime string with space`);
      const datePart = value.split(' ')[0]; // Take only date part
      Logger.log(`  Extracted date part: "${datePart}"`);
      date = new Date(datePart);
    } else if (value instanceof Date) {
      date = value;
    } else if (typeof value === 'number') {
      // Excel serial date number
      date = new Date((value - 25569) * 86400 * 1000);
    } else {
      // Try to parse as string
      date = new Date(value);
    }

    // Check if valid date
    if (isNaN(date.getTime())) {
      Logger.log(`  ❌ Invalid date`);
    } else {
      // Format as YYYY-MM-DD
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const result = `${year}-${month}-${day}`;

      Logger.log(`  ✅ Improved result: ${result}`);
    }

  } catch (error) {
    Logger.log(`  ❌ Error: ${error.message}`);
  }

  Logger.log('\n========================================\n');
}
