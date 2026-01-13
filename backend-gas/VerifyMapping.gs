// =============================================================================
// FIELD MAPPING VERIFICATION - Debug Helper
// =============================================================================

/**
 * Test function: Verify all detail columns are properly mapped
 * Run this to check if any columns are missing from sync
 */
function verifyDetailColumnMapping() {
  const config = getConfig();
  const ss = SpreadsheetApp.openById(config.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(config.SHEET_NAMES.DETAIL);

  if (!sheet) {
    Logger.log('❌ Sheet not found: ' + config.SHEET_NAMES.DETAIL);
    return;
  }

  Logger.log('========================================');
  Logger.log('🔍 DETAIL COLUMN MAPPING VERIFICATION');
  Logger.log('========================================\n');

  // Get headers from sheet
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  Logger.log(`📋 Found ${headers.length} columns in sheet:\n`);

  let mappedCount = 0;
  let unmappedCount = 0;
  const unmappedColumns = [];

  // Check each header
  for (let i = 0; i < headers.length; i++) {
    const headerName = String(headers[i]).trim();

    if (!headerName) continue; // Skip empty headers

    // Check if this column is mapped
    const isMapped = Object.keys(config.DETAIL_COLUMNS).some(
      key => key.toLowerCase() === headerName.toLowerCase()
    );

    if (isMapped) {
      const jsonKey = config.DETAIL_COLUMNS[headerName] ||
                      config.DETAIL_COLUMNS[headerName.toLowerCase()] ||
                      config.DETAIL_COLUMNS[Object.keys(config.DETAIL_COLUMNS).find(
                        k => k.toLowerCase() === headerName.toLowerCase()
                      )];

      // Check type
      const isNumber = config.NUMBER_COLUMNS.includes(headerName);
      const isDate = config.DATE_COLUMNS.includes(headerName);
      const type = isNumber ? 'Number' : (isDate ? 'Date' : 'String');

      Logger.log(`  ✅ ${headerName} → ${jsonKey} (${type})`);
      mappedCount++;
    } else {
      Logger.log(`  ❌ ${headerName} → NOT MAPPED`);
      unmappedColumns.push(headerName);
      unmappedCount++;
    }
  }

  Logger.log('\n========================================');
  Logger.log('📊 SUMMARY');
  Logger.log('========================================');
  Logger.log(`✅ Mapped columns: ${mappedCount}`);
  Logger.log(`❌ Unmapped columns: ${unmappedCount}`);

  if (unmappedCount > 0) {
    Logger.log('\n⚠️  UNMAPPED COLUMNS:');
    unmappedColumns.forEach(col => {
      Logger.log(`   - ${col}`);
    });
    Logger.log('\n💡 TIP: Add these to DETAIL_COLUMNS in Config.gs if they should be synced');
  } else {
    Logger.log('\n🎉 All columns are mapped!');
  }

  Logger.log('========================================\n');
}

/**
 * Test function: Verify a specific detail row mapping
 * Shows actual values and how they will be transformed
 */
function testDetailRowMapping() {
  const config = getConfig();
  const ss = SpreadsheetApp.openById(config.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(config.SHEET_NAMES.DETAIL);

  if (!sheet) {
    Logger.log('❌ Sheet not found');
    return;
  }

  const values = sheet.getDataRange().getValues();

  if (values.length < 2) {
    Logger.log('❌ No data rows found');
    return;
  }

  const headers = values[0];
  const testRow = values[1]; // First data row

  Logger.log('========================================');
  Logger.log('🧪 TEST ROW MAPPING');
  Logger.log('========================================\n');

  Logger.log('📋 Raw values from sheet:\n');

  for (let i = 0; i < headers.length; i++) {
    const headerName = String(headers[i]).trim();
    const rawValue = testRow[i];
    const valueType = (rawValue === null) ? 'null' : (rawValue instanceof Date ? 'Date' : typeof rawValue);

    if (!headerName) continue;

    Logger.log(`  ${headerName}: ${rawValue} (${valueType})`);
  }

  Logger.log('\n🔄 After mapping:\n');

  const mapped = mapDetailRow(testRow, headers);

  for (const key in mapped) {
    const value = mapped[key];
    const valueType = (value === null) ? 'null' : (value instanceof Date ? 'Date' : typeof value);
    Logger.log(`  ${key}: ${value} (${valueType})`);
  }

  Logger.log('\n========================================');
  Logger.log('✅ Mapping complete');
  Logger.log('========================================\n');
}
