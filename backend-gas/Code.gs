/**
 * =============================================================================
 * NAK LOGISTICS SYSTEM - GOOGLE APPS SCRIPT SYNC HANDLER
 * =============================================================================
 * 
 * Purpose: Đồng bộ dữ liệu từ AppSheet sang Backend API (Next.js)
 * Author: Senior GAS Developer
 * Version: 2.0
 * Date: December 30, 2025
 * 
 * Architecture:
 * - AppSheet Bots trigger GAS Script
 * - GAS đọc data từ Google Sheets
 * - GAS format và validate data
 * - GAS gửi JSON chuẩn sang Backend API
 * 
 * Key Features:
 * - Dynamic column mapping (NO hard-coded indexes)
 * - Type-safe data conversion
 * - Event handling (Add/Edit/Delete)
 * - Error handling & logging
 * =============================================================================
 */


// =============================================================================
// MAIN ENTRY POINT
// =============================================================================

/**
 * Hàm chính được gọi từ AppSheet Bot
 * 
 * @param {string} tripId - Mã chuyến đi (ma_chuyen_di)
 * @param {string} eventType - Loại sự kiện: 'Add', 'Edit', hoặc 'Delete'
 * @returns {Object} Response từ API hoặc error message
 * 
 * @example
 * // Gọi từ AppSheet Bot:
 * syncTripToBackend([ma_chuyen_di], "Add")
 * syncTripToBackend([ma_chuyen_di], "Edit")
 * syncTripToBackend([ma_chuyen_di], "Delete")
 */
function syncTripToBackend(tripId, eventType) {
  const config = getConfig();
  
  try {
    logInfo(`========== START SYNC ==========`);
    logInfo(`Trip ID: ${tripId}`);
    logInfo(`Event Type: ${eventType}`);
    
    // Validate inputs
    if (!tripId) {
      throw new Error('tripId is required');
    }
    
    if (!eventType) {
      throw new Error('eventType is required');
    }
    
    // Validate event type
    const validEvents = Object.values(config.EVENTS);
    if (!validEvents.includes(eventType)) {
      throw new Error(`Invalid eventType: ${eventType}. Must be one of: ${validEvents.join(', ')}`);
    }
    
    // Build payload based on event type
    let payload;
    
    if (eventType === config.EVENTS.DELETE) {
      // DELETE: Không cần đọc Sheet, chỉ gửi tripId
      payload = buildDeletePayload(tripId);
      logInfo('DELETE event - Payload created without reading sheets');
    } else {
      // ADD/EDIT: Đọc đầy đủ dữ liệu từ Sheets
      payload = buildFullPayload(tripId, eventType);
      logInfo('ADD/EDIT event - Full payload created');
    }
    
    // Log payload (trong môi trường development)
    if (config.LOGGING.VERBOSE) {
      logInfo('Payload JSON:');
      logInfo(JSON.stringify(payload, null, 2));
    }
    
    // Send to Backend API
    const response = sendToBackendAPI(payload);
    
    logInfo(`========== SYNC SUCCESS ==========`);
    return {
      success: true,
      message: 'Data synchronized successfully',
      tripId: tripId,
      eventType: eventType,
      response: response
    };
    
  } catch (error) {
    logError(`========== SYNC FAILED ==========`);
    logError(`Error: ${error.message}`);
    logError(`Stack: ${error.stack}`);
    
    // Return error để AppSheet có thể xử lý
    return {
      success: false,
      message: error.message,
      tripId: tripId,
      eventType: eventType
    };
  }
}


// =============================================================================
// PAYLOAD BUILDERS
// =============================================================================

/**
 * Build payload cho event DELETE
 */
function buildDeletePayload(tripId) {
  return {
    Action: getConfig().EVENTS.DELETE,
    maChuyenDi: tripId
  };
}

/**
 * Build payload đầy đủ cho event ADD/EDIT
 */
function buildFullPayload(tripId, eventType) {
  const config = getConfig();
  
  // 1. Lấy thông tin Master
  const masterData = getMasterData(tripId);
  if (!masterData) {
    throw new Error(`Không tìm thấy chuyến đi với ma_chuyen_di: ${tripId}`);
  }
  
  // 2. Lấy thông tin Detail
  const detailData = getDetailData(tripId);
  logInfo(`Found ${detailData.length} detail records`);
  
  // 3. Build JSON payload
  const payload = {
    Action: eventType,
    ...masterData,
    data_json: {
      chiTietLoTrinh: detailData
    }
  };
  
  return payload;
}


// =============================================================================
// DATA FETCHERS
// =============================================================================

/**
 * Lấy dữ liệu Master từ Sheet chuyen_di
 * 
 * @param {string} tripId - Mã chuyến đi
 * @returns {Object|null} Object chứa dữ liệu Master đã được map
 */
function getMasterData(tripId) {
  const config = getConfig();
  const ss = SpreadsheetApp.openById(config.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(config.SHEET_NAMES.MASTER);
  
  if (!sheet) {
    throw new Error(`Sheet "${config.SHEET_NAMES.MASTER}" not found`);
  }
  
  // Lấy tất cả data
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  
  if (values.length === 0) {
    throw new Error('Sheet is empty');
  }
  
  // Row đầu tiên là header
  const headers = values[0];
  
  // Build column index map
  const columnMap = buildColumnIndexMap(headers);
  
  // Tìm row có ma_chuyen_di = tripId
  const foreignKeyColumn = config.FOREIGN_KEY.MASTER_COLUMN;
  const tripIdIndex = getColumnIndex(headers, foreignKeyColumn);
  
  if (tripIdIndex === -1) {
    throw new Error(`Column "${foreignKeyColumn}" not found in sheet "${config.SHEET_NAMES.MASTER}"`);
  }
  
  // Tìm row (bỏ qua header row)
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const currentTripId = String(row[tripIdIndex]).trim();
    
    if (currentTripId === String(tripId).trim()) {
      // Found the row, map data
      return mapMasterRow(row, headers);
    }
  }
  
  return null; // Không tìm thấy
}

/**
 * Lấy dữ liệu Detail từ Sheet chi_tiet_chuyen_di
 * 
 * @param {string} tripId - Mã chuyến đi
 * @returns {Array} Mảng các object detail đã được map
 */
function getDetailData(tripId) {
  const config = getConfig();
  const ss = SpreadsheetApp.openById(config.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(config.SHEET_NAMES.DETAIL);
  
  if (!sheet) {
    throw new Error(`Sheet "${config.SHEET_NAMES.DETAIL}" not found`);
  }
  
  // Lấy tất cả data
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  
  if (values.length === 0) {
    return []; // Không có detail, trả về array rỗng
  }
  
  // Row đầu tiên là header
  const headers = values[0];
  
  // Tìm column index của foreign key
  const foreignKeyColumn = config.FOREIGN_KEY.DETAIL_COLUMN;
  const tripIdIndex = getColumnIndex(headers, foreignKeyColumn);
  
  if (tripIdIndex === -1) {
    throw new Error(`Column "${foreignKeyColumn}" not found in sheet "${config.SHEET_NAMES.DETAIL}"`);
  }
  
  // Lọc và map các rows có ma_chuyen_di = tripId
  const detailRecords = [];
  let thuTu = 1; // Counter for sequence number
  
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const currentTripId = String(row[tripIdIndex]).trim();
    
    if (currentTripId === String(tripId).trim()) {
      const mappedRow = mapDetailRow(row, headers);
      
      // Add thuTu (sequence number)
      mappedRow.thuTu = thuTu++;
      
      // Calculate thanhTien (amount) if not already present
      // Formula: thanhTien = donGia * taiTrongTinhPhi * soChieu (or variations)
      if (!mappedRow.thanhTien || mappedRow.thanhTien === 0) {
        const donGia = parseNumber(mappedRow.donGia);
        const taiTrong = parseNumber(mappedRow.taiTrongTinhPhi || mappedRow.taiTrong);
        const soChieu = parseNumber(mappedRow.soChieu || 1);
        const quangDuong = parseNumber(mappedRow.quangDuong);
        
        // Try different calculation methods based on available data
        if (donGia > 0 && taiTrong > 0) {
          mappedRow.thanhTien = donGia * taiTrong * soChieu;
        } else if (donGia > 0 && quangDuong > 0) {
          mappedRow.thanhTien = donGia * quangDuong * soChieu;
        } else {
          mappedRow.thanhTien = 0;
        }
      }
      
      detailRecords.push(mappedRow);
    }
  }
  
  return detailRecords;
}


// =============================================================================
// DATA MAPPERS
// =============================================================================

/**
 * Map một row từ Master Sheet sang JSON object
 * 
 * @param {Array} row - Dữ liệu row từ sheet
 * @param {Array} headers - Header row
 * @returns {Object} Mapped object
 */
function mapMasterRow(row, headers) {
  const config = getConfig();
  const mappedData = {};
  
  // Duyệt qua tất cả các column mapping
  for (const [sheetColumn, jsonKey] of Object.entries(config.MASTER_COLUMNS)) {
    const columnIndex = getColumnIndex(headers, sheetColumn);
    
    if (columnIndex === -1) {
      logWarning(`Column "${sheetColumn}" not found in Master sheet, skipping`);
      continue;
    }
    
    let value = row[columnIndex];
    
    // Xử lý data type
    if (config.NUMBER_COLUMNS.includes(sheetColumn)) {
      value = parseNumber(value);
    } else if (config.DATE_COLUMNS.includes(sheetColumn)) {
      value = formatDate(value);
    } else {
      // String: trim và convert về string
      value = String(value || '').trim();
    }
    
    mappedData[jsonKey] = value;
  }
  
  return mappedData;
}

/**
 * Map một row từ Detail Sheet sang JSON object
 * 
 * @param {Array} row - Dữ liệu row từ sheet
 * @param {Array} headers - Header row
 * @returns {Object} Mapped object
 */
function mapDetailRow(row, headers) {
  const config = getConfig();
  const mappedData = {};
  
  // Duyệt qua tất cả các column mapping
  for (const [sheetColumn, jsonKey] of Object.entries(config.DETAIL_COLUMNS)) {
    const columnIndex = getColumnIndex(headers, sheetColumn);
    
    if (columnIndex === -1) {
      logWarning(`Column "${sheetColumn}" not found in Detail sheet, skipping`);
      continue;
    }
    
    let value = row[columnIndex];
    
    // Xử lý data type
    if (config.NUMBER_COLUMNS.includes(sheetColumn)) {
      value = parseNumber(value);
    } else if (config.DATE_COLUMNS.includes(sheetColumn)) {
      value = formatDate(value);
    } else {
      // String: trim và convert về string
      value = String(value || '').trim();
    }
    
    mappedData[jsonKey] = value;
  }
  
  return mappedData;
}


// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Tìm index của column dựa trên tên column (Header)
 * Hàm này đảm bảo code KHÔNG phụ thuộc vào thứ tự cột
 * 
 * @param {Array} headers - Array chứa tên các cột (header row)
 * @param {string} columnName - Tên cột cần tìm
 * @returns {number} Index của cột (0-based), hoặc -1 nếu không tìm thấy
 */
function getColumnIndex(headers, columnName) {
  const normalizedColumnName = String(columnName).trim().toLowerCase();
  
  for (let i = 0; i < headers.length; i++) {
    const headerName = String(headers[i]).trim().toLowerCase();
    if (headerName === normalizedColumnName) {
      return i;
    }
  }
  
  return -1; // Không tìm thấy
}

/**
 * Build map từ column name -> index để optimize performance
 */
function buildColumnIndexMap(headers) {
  const map = {};
  for (let i = 0; i < headers.length; i++) {
    const columnName = String(headers[i]).trim().toLowerCase();
    map[columnName] = i;
  }
  return map;
}

/**
 * Parse giá trị thành number
 * Nếu invalid hoặc empty, trả về 0
 * 
 * @param {*} value - Giá trị cần parse
 * @returns {number} Số đã parse, hoặc 0
 */
function parseNumber(value) {
  if (value === null || value === undefined || value === '') {
    return 0;
  }
  
  const parsed = Number(value);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Format date thành chuẩn YYYY-MM-DD
 * 
 * @param {*} value - Giá trị date (có thể là Date object, string, hoặc number)
 * @returns {string} Date string format YYYY-MM-DD, hoặc empty string nếu invalid
 */
function formatDate(value) {
  if (!value) {
    return '';
  }
  
  try {
    let date;
    
    if (value instanceof Date) {
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
      return '';
    }
    
    // Format as YYYY-MM-DD
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
    
  } catch (error) {
    logWarning(`Error formatting date: ${value}, Error: ${error.message}`);
    return '';
  }
}


// =============================================================================
// API COMMUNICATION
// =============================================================================

/**
 * Gửi payload tới Backend API
 * 
 * @param {Object} payload - JSON payload
 * @returns {Object} Response từ API
 */
function sendToBackendAPI(payload) {
  const config = getConfig();
  
  const options = {
    method: 'post',
    contentType: config.API.CONTENT_TYPE,
    payload: JSON.stringify(payload),
    muteHttpExceptions: true, // Để xử lý error response
    timeout: config.API.TIMEOUT
  };
  
  logInfo(`Sending request to: ${config.API.ENDPOINT}`);
  
  try {
    const response = UrlFetchApp.fetch(config.API.ENDPOINT, options);
    const responseCode = response.getResponseCode();
    const responseBody = response.getContentText();
    
    logInfo(`Response Code: ${responseCode}`);
    logInfo(`Response Body: ${responseBody}`);
    
    // Check response code
    if (responseCode >= 200 && responseCode < 300) {
      // Success
      try {
        return JSON.parse(responseBody);
      } catch (e) {
        return { message: responseBody };
      }
    } else {
      // Error from API
      throw new Error(`API Error (${responseCode}): ${responseBody}`);
    }
    
  } catch (error) {
    logError(`Error calling API: ${error.message}`);
    throw error;
  }
}


// =============================================================================
// LOGGING UTILITIES
// =============================================================================

/**
 * Log info message
 */
function logInfo(message) {
  const config = getConfig();
  if (config.LOGGING.ENABLED) {
    Logger.log(`[INFO] ${message}`);
  }
}

/**
 * Log warning message
 */
function logWarning(message) {
  const config = getConfig();
  if (config.LOGGING.ENABLED) {
    Logger.log(`[WARNING] ${message}`);
  }
}

/**
 * Log error message
 */
function logError(message) {
  const config = getConfig();
  if (config.LOGGING.ENABLED) {
    Logger.log(`[ERROR] ${message}`);
  }
}


// =============================================================================
// TEST FUNCTIONS (Chỉ dùng trong development)
// =============================================================================

/**
 * Test hàm với event ADD
 */
function testSyncAdd() {
  const result = syncTripToBackend('TEST-001', 'Add');
  Logger.log('Test Add Result:');
  Logger.log(JSON.stringify(result, null, 2));
}

/**
 * Test hàm với event EDIT
 */
function testSyncEdit() {
  const result = syncTripToBackend('TEST-001', 'Edit');
  Logger.log('Test Edit Result:');
  Logger.log(JSON.stringify(result, null, 2));
}

/**
 * Test hàm với event DELETE
 */
function testSyncDelete() {
  const result = syncTripToBackend('TEST-001', 'Delete');
  Logger.log('Test Delete Result:');
  Logger.log(JSON.stringify(result, null, 2));
}

/**
 * Test đọc Master data
 */
function testGetMasterData() {
  const data = getMasterData('TEST-001');
  Logger.log('Master Data:');
  Logger.log(JSON.stringify(data, null, 2));
}

/**
 * Test đọc Detail data
 */
function testGetDetailData() {
  const data = getDetailData('TEST-001');
  Logger.log('Detail Data:');
  Logger.log(JSON.stringify(data, null, 2));
}
