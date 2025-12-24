/**
 * Remove Duplicate Rows from data_chuyen_di Sheet
 * Keeps first occurrence, deletes subsequent duplicates
 * 
 * USE CASE: Fix the issue where webhook triggers 4 times creating 4 identical rows
 * 
 * HOW TO USE:
 * 1. Open Apps Script Editor
 * 2. Copy this file to your project or paste function into Code.gs
 * 3. Run removeDuplicates() from Apps Script
 * 4. Check execution logs to see how many duplicates were removed
 */

/**
 * Main function to remove duplicate rows based on maChuyenDi column
 */
function removeDuplicates() {
  Logger.log('🔄 Starting duplicate removal process...');
  
  const ss = SpreadsheetApp.openById(Config.getSpreadsheetId());
  const sheet = ss.getSheetByName('data_chuyen_di');
  
  if (!sheet) {
    Logger.log('❌ Sheet data_chuyen_di not found');
    return;
  }
  
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    Logger.log('⚠️ No data to process (only headers)');
    return;
  }
  
  const headers = data[0];
  const maChuyenDiIndex = headers.indexOf('maChuyenDi');
  
  if (maChuyenDiIndex === -1) {
    Logger.log('❌ Column maChuyenDi not found');
    return;
  }
  
  Logger.log(`📊 Total rows: ${data.length - 1} (excluding header)`);
  
  const seen = new Map(); // Track first occurrence row index
  const rowsToDelete = [];
  
  // Identify duplicate rows (keep first, mark rest for deletion)
  // Start from row 1 (index 1) because row 0 is header
  for (let i = 1; i < data.length; i++) {
    const maChuyenDi = data[i][maChuyenDiIndex];
    
    if (!maChuyenDi || maChuyenDi === '') {
      Logger.log(`⚠️ Row ${i + 1} has empty ma_chuyen_di, skipping`);
      continue;
    }
    
    if (seen.has(maChuyenDi)) {
      const firstOccurrence = seen.get(maChuyenDi);
      rowsToDelete.push(i + 1); // +1 because sheet rows are 1-indexed
      Logger.log(`🗑️ Duplicate found at row ${i + 1}: ${maChuyenDi} (first occurrence: row ${firstOccurrence})`);
    } else {
      seen.set(maChuyenDi, i + 1); // Store first occurrence
    }
  }
  
  if (rowsToDelete.length === 0) {
    Logger.log('✅ No duplicates found!');
    return;
  }
  
  Logger.log(`⚠️ Found ${rowsToDelete.length} duplicate rows to delete`);
  
  // Delete rows in reverse order (bottom to top) to maintain row indices
  rowsToDelete.sort((a, b) => b - a); // Sort descending
  
  rowsToDelete.forEach(rowIndex => {
    sheet.deleteRow(rowIndex);
    Logger.log(`✅ Deleted row ${rowIndex}`);
  });
  
  Logger.log(`✅ Cleanup complete! Deleted ${rowsToDelete.length} duplicate rows`);
  Logger.log(`📊 Remaining unique rows: ${seen.size}`);
}

/**
 * Find and report duplicates without deleting (dry run)
 * Use this first to see what would be deleted
 */
function reportDuplicates() {
  Logger.log('🔍 Scanning for duplicates (dry run, no deletion)...');
  
  const ss = SpreadsheetApp.openById(Config.getSpreadsheetId());
  const sheet = ss.getSheetByName('data_chuyen_di');
  
  if (!sheet) {
    Logger.log('❌ Sheet data_chuyen_di not found');
    return;
  }
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const maChuyenDiIndex = headers.indexOf('maChuyenDi');
  
  const seen = new Map();
  const duplicates = new Map(); // ma_chuyen_di → [row indices]
  
  for (let i = 1; i < data.length; i++) {
    const maChuyenDi = data[i][maChuyenDiIndex];
    
    if (!maChuyenDi || maChuyenDi === '') continue;
    
    if (seen.has(maChuyenDi)) {
      if (!duplicates.has(maChuyenDi)) {
        duplicates.set(maChuyenDi, [seen.get(maChuyenDi)]);
      }
      duplicates.get(maChuyenDi).push(i + 1);
    } else {
      seen.set(maChuyenDi, i + 1);
    }
  }
  
  if (duplicates.size === 0) {
    Logger.log('✅ No duplicates found!');
    return;
  }
  
  Logger.log(`⚠️ Found ${duplicates.size} ma_chuyen_di with duplicates:`);
  Logger.log('');
  
  duplicates.forEach((rowIndices, maChuyenDi) => {
    Logger.log(`📌 ${maChuyenDi}:`);
    Logger.log(`   - Total occurrences: ${rowIndices.length}`);
    Logger.log(`   - Rows: ${rowIndices.join(', ')}`);
    Logger.log(`   - Will keep: row ${rowIndices[0]}`);
    Logger.log(`   - Will delete: rows ${rowIndices.slice(1).join(', ')}`);
    Logger.log('');
  });
  
  const totalDuplicateRows = Array.from(duplicates.values())
    .reduce((sum, rows) => sum + (rows.length - 1), 0);
  
  Logger.log(`📊 Summary:`);
  Logger.log(`   - Total unique ma_chuyen_di: ${seen.size}`);
  Logger.log(`   - ma_chuyen_di with duplicates: ${duplicates.size}`);
  Logger.log(`   - Total duplicate rows to delete: ${totalDuplicateRows}`);
  Logger.log('');
  Logger.log('💡 To delete these duplicates, run removeDuplicates() function');
}

/**
 * Remove duplicates for specific ma_chuyen_di only
 * Useful for targeted cleanup
 */
function removeDuplicatesForSpecificRecord(maChuyenDi) {
  Logger.log(`🔄 Removing duplicates for: ${maChuyenDi}`);
  
  const ss = SpreadsheetApp.openById(Config.getSpreadsheetId());
  const sheet = ss.getSheetByName('data_chuyen_di');
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const maChuyenDiIndex = headers.indexOf('maChuyenDi');
  
  const matchingRows = [];
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][maChuyenDiIndex] === maChuyenDi) {
      matchingRows.push(i + 1); // 1-indexed
    }
  }
  
  if (matchingRows.length === 0) {
    Logger.log('❌ No rows found for ma_chuyen_di: ' + maChuyenDi);
    return;
  }
  
  if (matchingRows.length === 1) {
    Logger.log('✅ Only 1 row found, no duplicates to remove');
    return;
  }
  
  Logger.log(`⚠️ Found ${matchingRows.length} rows for ${maChuyenDi}:`);
  Logger.log(`   Rows: ${matchingRows.join(', ')}`);
  Logger.log(`   Keeping: row ${matchingRows[0]}`);
  Logger.log(`   Deleting: rows ${matchingRows.slice(1).join(', ')}`);
  
  // Delete duplicates (keep first)
  const rowsToDelete = matchingRows.slice(1).sort((a, b) => b - a);
  
  rowsToDelete.forEach(rowIndex => {
    sheet.deleteRow(rowIndex);
    Logger.log(`✅ Deleted row ${rowIndex}`);
  });
  
  Logger.log(`✅ Cleanup complete for ${maChuyenDi}`);
}

/**
 * Example: Remove duplicates for the specific record shown in screenshot
 */
function removeDuplicatesForNak736e7a46() {
  removeDuplicatesForSpecificRecord('nak_736e7a46');
}
