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
  
  // 3. Build JSON payload thô
  const payload = {
    Action: eventType,
    ...masterData,
    data_json: {
      chiTietLoTrinh: detailData
    }
  };
  
  // 4. Log giá trị TRƯỚC khi tính auto pricing
  logInfo(`[BEFORE AUTO PRICING] tongDoanhThu: ${payload.tongDoanhThu}, tongChiPhi: ${payload.tongChiPhi || 0}`);
  
  // 5. Tính cước tự động (Auto Pricing)
  if (config.PRICING.ENABLED) {
    logInfo('Starting auto pricing calculation...');
    const priceMaps = loadPricingCache();
    calculateTripCost(payload, priceMaps);
    logInfo('Auto pricing calculation complete');
  }
  
  // 6. Log giá trị SAU khi tính auto pricing
  logInfo(`[AFTER AUTO PRICING] tongDoanhThu: ${payload.tongDoanhThu}, tongChiPhi: ${payload.tongChiPhi || 0}`);
  logInfo(`[FINAL PAYLOAD] Will send to Backend: tongDoanhThu=${payload.tongDoanhThu}, tongChiPhi=${payload.tongChiPhi || 0}`);
  
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
// AUTO PRICING FUNCTIONS
// =============================================================================

/**
 * Load pricing cache from bang_gia sheet
 * Creates Maps for O(1) lookup:
 * - mapTheoTuyen: Key = ma_tuyen (normalized), Value = { donGia, chiPhiLuongTX, chiPhiKhoanNCC }
 * - mapTheoCa: Key = ten_tuyen (normalized), Value = { donGia, chiPhiLuongTX, chiPhiKhoanNCC }
 * 
 * @returns {Object} Object containing { mapTheoTuyen, mapTheoCa }
 */
function loadPricingCache() {
  const config = getConfig();
  const ss = SpreadsheetApp.openById(config.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(config.SHEET_NAMES.PRICING);
  
  if (!sheet) {
    logWarning(`Sheet "${config.SHEET_NAMES.PRICING}" not found. Auto pricing disabled.`);
    return { mapTheoTuyen: {}, mapTheoCa: {} };
  }
  
  // Get all data
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  
  if (values.length === 0) {
    logWarning('Pricing sheet is empty. Auto pricing disabled.');
    return { mapTheoTuyen: {}, mapTheoCa: {} };
  }
  
  // Row đầu tiên là header
  const headers = values[0];
  
  // Get column indexes
  const maTuyenIndex = getColumnIndex(headers, 'ma_tuyen');
  const tenTuyenIndex = getColumnIndex(headers, 'ten_tuyen');
  const donGiaIndex = getColumnIndex(headers, 'don_gia');
  const chiPhiLuongTXIndex = getColumnIndex(headers, 'chi_phi_luong_tx');
  const chiPhiKhoanNCCIndex = getColumnIndex(headers, 'chi_phi_khoan_ncc');
  
  if (maTuyenIndex === -1 || tenTuyenIndex === -1 || donGiaIndex === -1) {
    logError('Pricing sheet missing required columns: ma_tuyen, ten_tuyen, or don_gia');
    return { mapTheoTuyen: {}, mapTheoCa: {} };
  }
  
  // Build pricing maps
  const mapTheoTuyen = {};
  const mapTheoCa = {};
  
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    
    // Get values
    const maTuyen = String(row[maTuyenIndex] || '').trim();
    const tenTuyen = String(row[tenTuyenIndex] || '').trim();
    const donGia = parseNumber(row[donGiaIndex]);
    const chiPhiLuongTX = chiPhiLuongTXIndex !== -1 ? parseNumber(row[chiPhiLuongTXIndex]) : 0;
    const chiPhiKhoanNCC = chiPhiKhoanNCCIndex !== -1 ? parseNumber(row[chiPhiKhoanNCCIndex]) : 0;
    
    // Create pricing object
    const pricingData = {
      donGia: donGia,
      chiPhiLuongTX: chiPhiLuongTX,
      chiPhiKhoanNCC: chiPhiKhoanNCC
    };
    
    // Populate mapTheoTuyen (normalize key to lowercase for case-insensitive lookup)
    if (maTuyen) {
      const normalizedKey = maTuyen.toLowerCase();
      mapTheoTuyen[normalizedKey] = pricingData;
    }
    
    // Populate mapTheoCa (normalize key to lowercase for case-insensitive lookup)
    if (tenTuyen) {
      const normalizedKey = tenTuyen.toLowerCase();
      mapTheoCa[normalizedKey] = pricingData;
    }
  }
  
  logInfo(`Pricing cache loaded: ${Object.keys(mapTheoTuyen).length} routes, ${Object.keys(mapTheoCa).length} shifts`);
  
  return { mapTheoTuyen, mapTheoCa };
}

/**
 * Calculate trip cost and update payload directly
 * Now calculates both revenue (tongDoanhThu) and cost (tongChiPhi)
 * 
 * @param {Object} payload - The payload object (will be modified in place)
 * @param {Object} priceMaps - Object containing { mapTheoTuyen, mapTheoCa }
 */
function calculateTripCost(payload, priceMaps) {
  const config = getConfig();
  const { mapTheoTuyen, mapTheoCa } = priceMaps;
  
  // Get loaiChuyen (trip type) and donViVanChuyen from payload
  const loaiChuyen = String(payload.loaiChuyen || '').toLowerCase().trim();
  const donViVanChuyen = String(payload.donViVanChuyen || '').trim();
  const isNAK = donViVanChuyen.toUpperCase() === 'NAK';
  
  logInfo(`[AUTO PRICING] === START CALCULATION ===`);
  logInfo(`[AUTO PRICING] Input values - tongDoanhThu: ${payload.tongDoanhThu}, tongChiPhi: ${payload.tongChiPhi || 0}`);
  logInfo(`[AUTO PRICING] Trip type: "${loaiChuyen}"`);
  logInfo(`[AUTO PRICING] Provider: "${donViVanChuyen}" (isNAK: ${isNAK})`);
  
  // CASE 1: "Theo tuyến" - Line Item Pricing
  if (loaiChuyen === config.PRICING.TRIP_TYPE_THEO_TUYEN) {
    logInfo('Using Line Item Pricing (Theo tuyến)');
    
    let totalRevenue = 0;
    let totalCost = 0;
    const chiTietLoTrinh = payload.data_json?.chiTietLoTrinh || [];
    
    // Loop through each detail line
    for (let i = 0; i < chiTietLoTrinh.length; i++) {
      const item = chiTietLoTrinh[i];
      
      // ✅ Sử dụng loTrinh (từ cột 'lo_trinh') để lookup với ma_tuyen trong bảng giá
      const loTrinh = String(item.loTrinh || '').trim();
      const lookupKey = loTrinh.toLowerCase();
      
      // Lookup pricing data in mapTheoTuyen
      const pricingData = mapTheoTuyen[lookupKey] || { donGia: 0, chiPhiLuongTX: 0, chiPhiKhoanNCC: 0 };
      
      // Update don_gia (revenue) in detail item
      item.donGia = pricingData.donGia;
      
      // Calculate cost based on provider
      const itemCost = isNAK ? pricingData.chiPhiLuongTX : pricingData.chiPhiKhoanNCC;
      
      // Add to totals
      totalRevenue += pricingData.donGia;
      totalCost += itemCost;
      
      logInfo(`  Detail ${i + 1}: loTrinh="${loTrinh}" -> donGia=${pricingData.donGia}, cost=${itemCost}`);
    }
    
    // Update master values
    payload.tongDoanhThu = totalRevenue;
    payload.tongChiPhi = totalCost;
    logInfo(`[AUTO PRICING] THEO TUYẾN - Set tongDoanhThu=${totalRevenue}, tongChiPhi=${totalCost}`);
    logInfo(`[AUTO PRICING] Total revenue: ${totalRevenue}, Total cost: ${totalCost}`);
  }
  
  // CASE 2: "Theo ca" - Master Pricing (Package)
  else if (loaiChuyen === config.PRICING.TRIP_TYPE_THEO_CA) {
    logInfo('Using Package Pricing (Theo ca)');
    
    // Get tenTuyen value and normalize for lookup
    const tenTuyen = String(payload.tenTuyen || '').trim();
    const lookupKey = tenTuyen.toLowerCase();
    
    // Lookup pricing data in mapTheoCa
    const pricingData = mapTheoCa[lookupKey] || { donGia: 0, chiPhiLuongTX: 0, chiPhiKhoanNCC: 0 };
    
    // Calculate cost based on provider
    const cost = isNAK ? pricingData.chiPhiLuongTX : pricingData.chiPhiKhoanNCC;
    
    // Update master values
    payload.tongDoanhThu = pricingData.donGia;
    payload.tongChiPhi = cost;
    
    logInfo(`[AUTO PRICING] THEO CA - Set tongDoanhThu=${pricingData.donGia}, tongChiPhi=${cost}`);
    logInfo(`[AUTO PRICING] tenTuyen="${tenTuyen}" -> revenue=${pricingData.donGia}, cost=${cost}`);
    
    // Optional: Set all detail items donGia to 0 (not used in this mode)
    const chiTietLoTrinh = payload.data_json?.chiTietLoTrinh || [];
    for (let item of chiTietLoTrinh) {
      item.donGia = 0;
    }
  }
  
  // CASE 3: Other trip types - no auto pricing
  else {
    logWarning(`[AUTO PRICING] Unknown trip type: "${loaiChuyen}". No auto pricing applied.`);
    payload.tongChiPhi = 0;
  }
  
  logInfo(`[AUTO PRICING] === END CALCULATION ===`);
  logInfo(`[AUTO PRICING] Final values - tongDoanhThu: ${payload.tongDoanhThu}, tongChiPhi: ${payload.tongChiPhi}`);
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
/**
 * Gửi payload tới Backend API
 * 
 * @param {Object} payload - JSON payload
 * @returns {Object} Response từ API
 */
function sendToBackendAPI(payload) {
  const config = getConfig();
  
  // --- DEBUG LOG: Kiểm tra Key trước khi gửi ---
  // Log này giúp bạn yên tâm là Key đã được lấy ra
  logInfo(`🔑 Using API Key: ${config.API.KEY}`); 
  // ---------------------------------------------

  const options = {
    method: 'post',
    contentType: config.API.CONTENT_TYPE,
    
    // 👇👇👇 ĐÂY LÀ PHẦN BẠN ĐANG BỊ THIẾU 👇👇👇
    headers: {
      'x-api-key': config.API.KEY
    },
    // 👆👆👆 ------------------------------- 👆👆👆
    
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

/**
 * Test load pricing cache
 */
function testLoadPricingCache() {
  const priceMaps = loadPricingCache();
  Logger.log('Pricing Maps Loaded:');
  Logger.log('mapTheoTuyen keys:', Object.keys(priceMaps.mapTheoTuyen));
  Logger.log('mapTheoCa keys:', Object.keys(priceMaps.mapTheoCa));
  Logger.log('Sample mapTheoTuyen:', JSON.stringify(priceMaps.mapTheoTuyen, null, 2));
  Logger.log('Sample mapTheoCa:', JSON.stringify(priceMaps.mapTheoCa, null, 2));
}

/**
 * Debug specific route pricing from bang_gia table
 * Use this to verify don_gia, chi_phi_luong_tx, chi_phi_khoan_ncc values
 */
function debugPricingForSpecificRoute() {
  Logger.log('========================================');
  Logger.log('🔍 DEBUG PRICING FOR SPECIFIC ROUTE');
  Logger.log('========================================\n');
  
  const priceMaps = loadPricingCache();
  
  // Check the route from the screenshot
  const routeName = "5. Nội thành Hà Nội | 14m3";
  const normalizedKey = routeName.toLowerCase();
  
  Logger.log(`Looking up route: "${routeName}"`);
  Logger.log(`Normalized key: "${normalizedKey}"`);
  Logger.log(`\nFound in mapTheoCa:`);
  
  const pricing = priceMaps.mapTheoCa[normalizedKey];
  if (pricing) {
    Logger.log(`  ✅ FOUND!`);
    Logger.log(`  - don_gia (Revenue): ${pricing.donGia}`);
    Logger.log(`  - chi_phi_luong_tx (NAK Cost): ${pricing.chiPhiLuongTX}`);
    Logger.log(`  - chi_phi_khoan_ncc (VENDOR Cost): ${pricing.chiPhiKhoanNCC}`);
    Logger.log(`\n🎯 EXPECTED FOR THIS ORDER:`);
    Logger.log(`  - Provider: VENDOR`);
    Logger.log(`  - tongDoanhThu (revenue) should be: ${pricing.donGia}`);
    Logger.log(`  - tongChiPhi (cost) should be: ${pricing.chiPhiKhoanNCC}`);
    Logger.log(`\n📊 ACTUAL IN DATABASE (from screenshot):`);
    Logger.log(`  - revenue column: 1,200,000`);
    Logger.log(`  - cost column: 33,000,000`);
    Logger.log(`\n❓ ANALYSIS:`);
    if (pricing.donGia === 1200000 && pricing.chiPhiKhoanNCC === 33000000) {
      Logger.log(`  ✅ GAS pricing values are CORRECT!`);
      Logger.log(`  ✅ Backend INSERT column swap fix should resolve this.`);
    } else if (pricing.donGia === 33000000 && pricing.chiPhiKhoanNCC === 1200000) {
      Logger.log(`  ❌ PRICING TABLE IS WRONG!`);
      Logger.log(`  ❌ don_gia and chi_phi_khoan_ncc are SWAPPED in bang_gia!`);
      Logger.log(`  🔧 FIX: Swap values in bang_gia table for this route.`);
    } else {
      Logger.log(`  ⚠️  Values don't match screenshot. Manual investigation needed.`);
      Logger.log(`  Expected revenue: ${pricing.donGia}, cost: ${pricing.chiPhiKhoanNCC}`);
    }
  } else {
    Logger.log(`  ❌ NOT FOUND in mapTheoCa!`);
    Logger.log(`\nAvailable routes in mapTheoCa:`);
    Object.keys(priceMaps.mapTheoCa).forEach(key => {
      Logger.log(`  - "${key}"`);
    });
  }
  
  Logger.log('\n========================================');
}

/**
 * Test auto pricing calculation
 * 
 * HƯỚNG DẪN SỬ DỤNG:
 * 1. Kiểm tra bảng bang_gia và lấy các giá trị ma_tuyen thực tế
 * 2. Cập nhật loTrinh trong mock data với ma_tuyen từ bảng giá
 * 3. Chạy hàm để xem kết quả tính giá tự động (revenue và cost)
 */
function testAutoPricing() {
  Logger.log('========================================');
  Logger.log('🧪 AUTO PRICING TEST SUITE');
  Logger.log('========================================\n');
  
  // Load pricing cache once
  const priceMaps = loadPricingCache();
  Logger.log(`📊 Pricing data loaded:`);
  Logger.log(`   - Routes (Theo tuyến): ${Object.keys(priceMaps.mapTheoTuyen).join(', ')}`);
  Logger.log(`   - Shifts (Theo ca): ${Object.keys(priceMaps.mapTheoCa).join(', ')}\n`);
  
  // === TEST CASE 1: Theo Tuyến + NAK Provider ===
  Logger.log('=== TEST CASE 1: THEO TUYẾN + NAK ===');
  Logger.log('Expected: Revenue from don_gia, Cost from chi_phi_luong_tx\n');
  
  const mockPayload1 = {
    maChuyenDi: 'NAKab10abce-11d8-4c77-baa9-4077c1e07702',
    loaiChuyen: 'Theo tuyến',
    donViVanChuyen: 'NAK',  // ✅ NAK → chi_phi_luong_tx
    tenTuyen: 'Nội tỉnh Sơn La 03',
    tongDoanhThu: 0,
    tongChiPhi: 0,
    data_json: {
      chiTietLoTrinh: [
        {
          thuTu: 1,
          loTrinh: 'SonLa_T_03',  // Thay bằng mã tuyến thực tế
          loTrinhChiTiet: 'Kho Chuyển Tiếp Sơn La -> Bưu Cục 354',
          donGia: 0
        },
        {
          thuTu: 2,
          loTrinh: 'SonLa_S_01',  // Thay bằng mã tuyến thực tế
          loTrinhChiTiet: 'Bưu Cục 354 -> Kho Chuyển Tiếp Sơn La',
          donGia: 0
        }
      ]
    }
  };
  
  Logger.log('BEFORE:');
  Logger.log(`  tongDoanhThu: ${mockPayload1.tongDoanhThu}, tongChiPhi: ${mockPayload1.tongChiPhi}`);
  
  calculateTripCost(mockPayload1, priceMaps);
  
  Logger.log('\nAFTER:');
  Logger.log(`  tongDoanhThu (revenue): ${mockPayload1.tongDoanhThu}`);
  Logger.log(`  tongChiPhi (cost): ${mockPayload1.tongChiPhi}`);
  Logger.log(`  Profit: ${mockPayload1.tongDoanhThu - mockPayload1.tongChiPhi}`);
  Logger.log('\nDetails:');
  mockPayload1.data_json.chiTietLoTrinh.forEach((item, i) => {
    Logger.log(`  ${i + 1}. ${item.loTrinh} → donGia: ${item.donGia}`);
  });
  
  // === TEST CASE 2: Theo Tuyến + Vendor Provider ===
  Logger.log('\n\n=== TEST CASE 2: THEO TUYẾN + VENDOR ===');
  Logger.log('Expected: Revenue from don_gia, Cost from chi_phi_khoan_ncc\n');
  
  const mockPayload2 = {
    maChuyenDi: 'NAKf0a8a9bb-11db-468b-91d3-de3994e21137',
    loaiChuyen: 'Theo tuyến',
    donViVanChuyen: 'Vendor',  // ✅ Vendor → chi_phi_khoan_ncc
    tenTuyen: 'Nội tỉnh Sơn La 03',
    tongDoanhThu: 0,
    tongChiPhi: 0,
    data_json: {
      chiTietLoTrinh: [
        {
          thuTu: 1,
          loTrinh: 'SonLa_T_03',
          donGia: 0
        }
      ]
    }
  };
  
  Logger.log('BEFORE:');
  Logger.log(`  tongDoanhThu: ${mockPayload2.tongDoanhThu}, tongChiPhi: ${mockPayload2.tongChiPhi}`);
  
  calculateTripCost(mockPayload2, priceMaps);
  
  Logger.log('\nAFTER:');
  Logger.log(`  tongDoanhThu (revenue): ${mockPayload2.tongDoanhThu}`);
  Logger.log(`  tongChiPhi (cost): ${mockPayload2.tongChiPhi}`);
  Logger.log(`  Profit: ${mockPayload2.tongDoanhThu - mockPayload2.tongChiPhi}`);
  
  // === TEST CASE 3: Theo Ca + NAK ===
  Logger.log('\n\n=== TEST CASE 3: THEO CA + NAK ===');
  Logger.log('Expected: Package pricing with NAK driver costs\n');
  
  const mockPayload3 = {
    maChuyenDi: 'TEST-003',
    loaiChuyen: 'Theo ca',
    donViVanChuyen: 'NAK',
    tenTuyen: 'Nội tỉnh Sơn La 03',  // ✅ Match với ten_tuyen trong bang_gia
    tongDoanhThu: 0,
    tongChiPhi: 0,
    data_json: {
      chiTietLoTrinh: []
    }
  };
  
  Logger.log('BEFORE:');
  Logger.log(`  tongDoanhThu: ${mockPayload3.tongDoanhThu}, tongChiPhi: ${mockPayload3.tongChiPhi}`);
  
  calculateTripCost(mockPayload3, priceMaps);
  
  Logger.log('\nAFTER:');
  Logger.log(`  tongDoanhThu (revenue): ${mockPayload3.tongDoanhThu}`);
  Logger.log(`  tongChiPhi (cost): ${mockPayload3.tongChiPhi}`);
  Logger.log(`  Profit: ${mockPayload3.tongDoanhThu - mockPayload3.tongChiPhi}`);
  
  // === TEST CASE 4: Theo Ca + Vendor ===
  Logger.log('\n\n=== TEST CASE 4: THEO CA + VENDOR ===');
  Logger.log('Expected: Package pricing with vendor contract costs\n');
  
  const mockPayload4 = {
    maChuyenDi: 'TEST-004',
    loaiChuyen: 'Theo ca',
    donViVanChuyen: 'Nhà xe ABC',
    tenTuyen: 'Nội tỉnh Sơn La 03',
    tongDoanhThu: 0,
    tongChiPhi: 0,
    data_json: {
      chiTietLoTrinh: []
    }
  };
  
  Logger.log('BEFORE:');
  Logger.log(`  tongDoanhThu: ${mockPayload4.tongDoanhThu}, tongChiPhi: ${mockPayload4.tongChiPhi}`);
  
  calculateTripCost(mockPayload4, priceMaps);
  
  Logger.log('\nAFTER:');
  Logger.log(`  tongDoanhThu (revenue): ${mockPayload4.tongDoanhThu}`);
  Logger.log(`  tongChiPhi (cost): ${mockPayload4.tongChiPhi}`);
  Logger.log(`  Profit: ${mockPayload4.tongDoanhThu - mockPayload4.tongChiPhi}`);
  
  Logger.log('\n========================================');
  Logger.log('✅ TEST SUITE COMPLETED');
  Logger.log('========================================');
}



// =============================================================================
// MIGRATION TOOLS - CHẠY THỦ CÔNG TỪ TRÌNH SOẠN THẢO
// =============================================================================

const MIGRATION_OPTS = {
  BATCH_SIZE: 25, // Số lượng đơn xử lý mỗi lần chạy. Tăng lên 50 để nhanh hơn.
  PROP_KEY: 'MIGRATION_LAST_ROW_INDEX' // Biến lưu vị trí dòng
};

/**
 * 1. HÀM RESET: Chạy hàm này ĐẦU TIÊN nếu muốn bắt đầu lại từ dòng 1
 */
function manualResetMigration() {
  PropertiesService.getScriptProperties().deleteProperty(MIGRATION_OPTS.PROP_KEY);
  Logger.log("✅ [RESET] Đã xóa bộ đếm. Lần chạy tới sẽ bắt đầu từ dòng đầu tiên.");
}

/**
 * 2. HÀM KIỂM TRA: Xem đang chạy đến đâu rồi
 */
function manualCheckStatus() {
  const scriptProps = PropertiesService.getScriptProperties();
  const lastRow = parseInt(scriptProps.getProperty(MIGRATION_OPTS.PROP_KEY) || '1');
  Logger.log(`ℹ️ [STATUS] Hệ thống đang dừng ở dòng: ${lastRow}`);
  Logger.log(`ℹ️ [STATUS] Lần chạy tiếp theo sẽ xử lý từ dòng: ${lastRow + 1}`);
}

/**
 * 3. HÀM CHÍNH: Chạy hàm này NHIỀU LẦN để đồng bộ dữ liệu
 */
function manualRunMigrationBatch() {
  const config = getConfig();
  const scriptProps = PropertiesService.getScriptProperties();

  Logger.log("🔄 Đang khởi tạo kết nối đến Spreadsheet...");

  // 1. Mở Sheet Master qua ID
  const ss = SpreadsheetApp.openById(config.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(config.SHEET_NAMES.MASTER);
  
  if (!sheet) {
    Logger.log(`❌ LỖI: Không tìm thấy sheet "${config.SHEET_NAMES.MASTER}"`);
    return;
  }

  // 2. Xác định dòng bắt đầu
  let lastRowIndex = parseInt(scriptProps.getProperty(MIGRATION_OPTS.PROP_KEY) || '1');
  let startRow = lastRowIndex + 1;
  const totalRows = sheet.getLastRow();

  if (startRow > totalRows) {
    Logger.log("✅ [HOÀN TẤT] Toàn bộ dữ liệu đã được xử lý. Không còn dòng nào mới.");
    return;
  }

  // 3. Tìm cột ID
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const idColIndex = getColumnIndex(headers, config.FOREIGN_KEY.MASTER_COLUMN);

  if (idColIndex === -1) {
    Logger.log(`❌ Lỗi: Không tìm thấy cột ID "${config.FOREIGN_KEY.MASTER_COLUMN}"`);
    return;
  }

  // 4. Lấy dữ liệu Batch
  const numRows = Math.min(MIGRATION_OPTS.BATCH_SIZE, totalRows - startRow + 1);
  Logger.log(`🚀 BẮT ĐẦU BATCH: Xử lý từ dòng ${startRow} đến ${startRow + numRows - 1} (Tổng: ${totalRows})`);
  
  const dataRange = sheet.getRange(startRow, 1, numRows, sheet.getLastColumn());
  const dataValues = dataRange.getValues();

  let success = 0;
  let skipped = 0;
  let errors = 0;

  // 5. Vòng lặp xử lý
  for (let i = 0; i < dataValues.length; i++) {
    const row = dataValues[i];
    const tripId = row[idColIndex]; 

    // Kiểm tra ID rỗng
    if (!tripId || String(tripId).trim() === '') {
      skipped++;
      continue;
    }

    try {
      // Gọi lại hàm logic chính
      // Lưu ý: Dùng 'Add' để kích hoạt Upsert
      const result = syncTripToBackend(tripId, 'Add');

      if (result.success) {
        success++;
        Logger.log(`✅ OK [${tripId}]`);
      } else {
        errors++;
        Logger.log(`❌ FAIL [${tripId}]: ${result.message}`);
      }
    } catch (e) {
      errors++;
      Logger.log(`🔥 ERROR [${tripId}]: ${e.toString()}`);
    }
  }

  // 6. Lưu vị trí mới
  const nextRowIndex = startRow + numRows - 1;
  scriptProps.setProperty(MIGRATION_OPTS.PROP_KEY, String(nextRowIndex));

  // 7. Tổng kết
  Logger.log("---------------------------------------------------");
  Logger.log(`🏁 KẾT THÚC BATCH.`);
  Logger.log(`- Thành công: ${success}`);
  Logger.log(`- Lỗi: ${errors}`);
  Logger.log(`- Bỏ qua (No ID): ${skipped}`);
  Logger.log(`📍 Đã lưu vị trí dòng: ${nextRowIndex}`);
  
  if (nextRowIndex < totalRows) {
    Logger.log(`👉 HÃY CHẠY LẠI HÀM 'manualRunMigrationBatch' ĐỂ TIẾP TỤC.`);
  } else {
    Logger.log(`🎉 CHÚC MỪNG! ĐÃ HOÀN THÀNH TOÀN BỘ DỮ LIỆU.`);
  }
}


// =============================================================================
// VEHICLES SYNC MODULE
// =============================================================================

/**
 * Đồng bộ toàn bộ danh sách xe từ Sheet phuong_tien sang Backend
 * 
 * Hàm này:
 * - Đọc toàn bộ sheet phuong_tien
 * - Transform dữ liệu (convert số, trim text, handle null)
 * - Gửi batch upsert sang API
 * 
 * @returns {Object} Kết quả sync (success, count, errors)
 * 
 * @example
 * // Chạy manual từ GAS Editor:
 * syncVehiclesToDB()
 * 
 * // Hoặc schedule với trigger:
 * // Triggers -> Add Trigger -> syncVehiclesToDB -> Time-driven -> Daily 2AM
 */
function syncVehiclesToDB() {
  const config = getConfig();
  
  try {
    logInfo(`========== START VEHICLES SYNC ==========`);
    logInfo(`Sheet: ${config.SHEET_NAMES.VEHICLES}`);
    logInfo(`Target API: ${config.API.ENDPOINT}`);
    
    // 1. Đọc toàn bộ sheet phuong_tien
    const vehicles = readVehiclesFromSheet();
    
    if (!vehicles || vehicles.length === 0) {
      logInfo('⚠️  Sheet phuong_tien is empty or has no data');
      return {
        success: true,
        message: 'No vehicles to sync',
        count: 0
      };
    }
    
    logInfo(`✅ Read ${vehicles.length} vehicles from sheet`);
    
    // 2. Build payload
    const payload = {
      Action: 'UpsertVehicles',
      vehicles: vehicles
    };
    
    // 3. Log payload (if verbose)
    if (config.LOGGING.VERBOSE) {
      logInfo('📦 Payload Preview (first 3 vehicles):');
      logInfo(JSON.stringify(vehicles.slice(0, 3), null, 2));
    }
    
    logInfo(`📤 Sending ${vehicles.length} vehicles to Backend...`);
    
    // 4. Send to Backend API
    const response = sendToBackendAPI(payload);
    
    logInfo(`========== VEHICLES SYNC SUCCESS ==========`);
    logInfo(`✅ ${vehicles.length} vehicles synchronized successfully`);
    
    return {
      success: true,
      message: 'Vehicles synchronized successfully',
      count: vehicles.length,
      response: response
    };
    
  } catch (error) {
    logError(`========== VEHICLES SYNC FAILED ==========`);
    logError(`Error: ${error.message}`);
    logError(`Stack: ${error.stack}`);
    
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
}

/**
 * Đọc và transform dữ liệu từ sheet phuong_tien
 * 
 * @returns {Array<Object>} Mảng các vehicle objects đã được transform
 */
function readVehiclesFromSheet() {
  const config = getConfig();
  const ss = SpreadsheetApp.openById(config.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(config.SHEET_NAMES.VEHICLES);
  
  if (!sheet) {
    throw new Error(`Sheet "${config.SHEET_NAMES.VEHICLES}" not found in spreadsheet`);
  }
  
  // Lấy tất cả data
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  
  if (values.length <= 1) {
    // Chỉ có header hoặc empty
    return [];
  }
  
  // Row đầu tiên là header
  const headers = values[0];
  logInfo(`📋 Headers: ${headers.join(', ')}`);
  
  // Build column mapping
  const columnMap = buildVehicleColumnMap(headers);
  
  // Transform từng row thành vehicle object
  const vehicles = [];
  
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    
    try {
      const vehicle = transformVehicleRow(row, headers, columnMap);
      
      // Skip nếu không có biển kiểm soát (required field)
      if (!vehicle.licensePlate || vehicle.licensePlate.trim() === '') {
        logInfo(`⚠️  Row ${i + 1}: Skipped - No license plate`);
        continue;
      }
      
      vehicles.push(vehicle);
      
    } catch (rowError) {
      logError(`❌ Row ${i + 1}: Error - ${rowError.message}`);
      // Continue với row tiếp theo
    }
  }
  
  return vehicles;
}

/**
 * Build column index map cho sheet vehicles
 * 
 * @param {Array<string>} headers - Array of header names
 * @returns {Object} Map từ camelCase key -> column index
 */
function buildVehicleColumnMap(headers) {
  const config = getConfig();
  const columnMap = {};
  const mapping = config.VEHICLES_COLUMNS;
  
  // Iterate qua mapping config
  for (const [sheetColumn, jsonKey] of Object.entries(mapping)) {
    const index = getColumnIndex(headers, sheetColumn);
    
    if (index !== -1) {
      columnMap[jsonKey] = index;
    } else {
      logInfo(`⚠️  Column "${sheetColumn}" not found in sheet`);
    }
  }
  
  return columnMap;
}

/**
 * Transform 1 row thành vehicle object
 * 
 * @param {Array} row - Array of cell values
 * @param {Array<string>} headers - Array of header names
 * @param {Object} columnMap - Map từ jsonKey -> column index
 * @returns {Object} Vehicle object
 */
function transformVehicleRow(row, headers, columnMap) {
  const vehicle = {};
  
  // Map tất cả các fields
  for (const [jsonKey, colIndex] of Object.entries(columnMap)) {
    let value = row[colIndex];
    
    // Handle null/undefined
    if (value === null || value === undefined || value === '') {
      // Set default values for critical fields
      if (jsonKey === 'weightCapacity' || jsonKey === 'fuelNorm') {
        value = 0;
      } else {
        value = null;
      }
    } else {
      // Trim strings
      if (typeof value === 'string') {
        value = value.trim();
      }
      
      // Convert numbers for specific fields
      if (jsonKey === 'weightCapacity' || jsonKey === 'fuelNorm') {
        value = parseVietnameseNumber(value);
      }
    }
    
    vehicle[jsonKey] = value;
  }
  
  return vehicle;
}

/**
 * Parse số từ format Việt Nam sang number
 * Handles: "1,9" -> 1.9, "2.5" -> 2.5, "15" -> 15
 * 
 * @param {*} value - Giá trị cần parse
 * @returns {number} Số đã parse, hoặc 0 nếu invalid
 */
function parseVietnameseNumber(value) {
  if (typeof value === 'number') {
    return value;
  }
  
  if (typeof value === 'string') {
    // Replace dấu phẩy thành dấu chấm
    value = value.replace(',', '.');
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }
  
  return 0;
}


// =============================================================================
// FUEL SYNC MODULE
// =============================================================================
// Module này đồng bộ dữ liệu Nhiên liệu (Import + Export) sang Backend
// - Import: Nhập kho nhiên liệu
// - Export: Xuất kho nhiên liệu (giao dịch tiêu thụ)
// =============================================================================

/**
 * Main function: Đồng bộ toàn bộ dữ liệu Nhiên liệu sang Backend
 * 
 * Thực hiện 2 bước:
 * 1. Đồng bộ Fuel Import (nhap_nhien_lieu)
 * 2. Đồng bộ Fuel Export (xuat_nhien_lieu)
 * 
 * @returns {Object} Kết quả đồng bộ
 */
function syncFuelToBackend() {
  const config = getConfig();
  
  try {
    logInfo('========== START FUEL SYNC ==========');
    
    // STEP 1: Đồng bộ Fuel Imports
    logInfo('Step 1: Syncing Fuel Imports...');
    const importResult = syncFuelImports();
    logInfo(`✓ Fuel Imports synced: ${importResult.count} records`);
    
    // STEP 2: Đồng bộ Fuel Transactions (Exports)
    logInfo('Step 2: Syncing Fuel Transactions...');
    const exportResult = syncFuelTransactions();
    logInfo(`✓ Fuel Transactions synced: ${exportResult.count} records`);
    
    logInfo('========== FUEL SYNC SUCCESS ==========');
    
    return {
      success: true,
      message: 'Fuel data synchronized successfully',
      imports: importResult,
      transactions: exportResult
    };
    
  } catch (error) {
    logError('========== FUEL SYNC FAILED ==========');
    logError(`Error: ${error.message}`);
    logError(`Stack: ${error.stack}`);
    
    return {
      success: false,
      message: error.message,
      error: error.toString()
    };
  }
}

/**
 * Đồng bộ Fuel Imports (nhập nhiên liệu)
 */
function syncFuelImports() {
  const config = getConfig();
  const ss = SpreadsheetApp.openById(config.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(config.SHEET_NAMES.FUEL_IMPORT);
  
  if (!sheet) {
    throw new Error(`Sheet not found: ${config.SHEET_NAMES.FUEL_IMPORT}`);
  }
  
  // 1. Đọc dữ liệu
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  
  if (values.length <= 1) {
    logInfo('No fuel import data to sync (sheet empty or only headers)');
    return { count: 0, records: [] };
  }
  
  // 2. Extract headers
  const headers = values[0];
  
  // 3. Build column index map
  const columnMap = buildColumnMapForImport(headers);
  
  // 4. Transform data rows
  const imports = [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    
    // Skip empty rows (check if Id column is empty)
    const idIndex = columnMap['id'];
    if (idIndex === undefined || !row[idIndex]) {
      continue;
    }
    
    const importRecord = transformFuelImportRow(row, headers, columnMap);
    imports.push(importRecord);
  }
  
  logInfo(`Transformed ${imports.length} fuel import records`);
  
  // 5. Gửi lên Backend
  const payload = {
    Action: 'UpsertFuelImports',
    imports: imports
  };
  
  const response = sendToBackendAPI(payload);
  
  return {
    count: imports.length,
    records: imports,
    response: response
  };
}

/**
 * Đồng bộ Fuel Transactions (xuất nhiên liệu)
 */
function syncFuelTransactions() {
  const config = getConfig();
  const ss = SpreadsheetApp.openById(config.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(config.SHEET_NAMES.FUEL_EXPORT);
  
  if (!sheet) {
    throw new Error(`Sheet not found: ${config.SHEET_NAMES.FUEL_EXPORT}`);
  }
  
  // 1. Đọc dữ liệu
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  
  if (values.length <= 1) {
    logInfo('No fuel transaction data to sync (sheet empty or only headers)');
    return { count: 0, records: [] };
  }
  
  // 2. Extract headers
  const headers = values[0];
  
  // 3. Build column index map
  const columnMap = buildColumnMapForExport(headers);
  
  // 4. Transform data rows
  const transactions = [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    
    // Skip empty rows (check if Id column is empty)
    const idIndex = columnMap['id'];
    if (idIndex === undefined || !row[idIndex]) {
      continue;
    }
    
    const transaction = transformFuelExportRow(row, headers, columnMap);
    transactions.push(transaction);
  }
  
  logInfo(`Transformed ${transactions.length} fuel transaction records`);
  
  // 5. Gửi lên Backend
  const payload = {
    Action: 'UpsertFuelTransactions',
    transactions: transactions
  };
  
  const response = sendToBackendAPI(payload);
  
  return {
    count: transactions.length,
    records: transactions,
    response: response
  };
}

/**
 * Build column index map cho Fuel Import
 */
function buildColumnMapForImport(headers) {
  const config = getConfig();
  const columnMap = {};
  
  for (const [sheetColumn, jsonKey] of Object.entries(config.FUEL_IMPORT_COLUMNS)) {
    const colIndex = getColumnIndex(headers, sheetColumn);
    if (colIndex !== -1) {
      columnMap[jsonKey] = colIndex;
    }
  }
  
  return columnMap;
}

/**
 * Build column index map cho Fuel Export
 */
function buildColumnMapForExport(headers) {
  const config = getConfig();
  const columnMap = {};
  
  for (const [sheetColumn, jsonKey] of Object.entries(config.FUEL_EXPORT_COLUMNS)) {
    const colIndex = getColumnIndex(headers, sheetColumn);
    if (colIndex !== -1) {
      columnMap[jsonKey] = colIndex;
    }
  }
  
  return columnMap;
}

/**
 * Transform một row thành Fuel Import record
 */
function transformFuelImportRow(row, headers, columnMap) {
  const record = {};
  
  // Map tất cả các fields
  for (const [jsonKey, colIndex] of Object.entries(columnMap)) {
    let value = row[colIndex];
    
    // Handle null/undefined
    if (value === null || value === undefined || value === '') {
      value = null;
    } else {
      // Trim strings
      if (typeof value === 'string') {
        value = value.trim();
      }
      
      // Convert date fields
      if (jsonKey === 'importDate') {
        value = formatDate(value);
      }
      
      // Convert number fields (quantity, unitPrice, totalAmount, avgPrice)
      if (['quantity', 'unitPrice', 'totalAmount', 'avgPrice'].includes(jsonKey)) {
        value = parseVietnameseNumber(value);
      }
    }
    
    record[jsonKey] = value;
  }
  
  return record;
}

/**
 * Transform một row thành Fuel Export record (Transaction)
 */
function transformFuelExportRow(row, headers, columnMap) {
  const record = {};
  
  // Map tất cả các fields
  for (const [jsonKey, colIndex] of Object.entries(columnMap)) {
    let value = row[colIndex];
    
    // Handle null/undefined
    if (value === null || value === undefined || value === '') {
      value = null;
    } else {
      // Trim strings
      if (typeof value === 'string') {
        value = value.trim();
      }
      
      // Convert date fields
      if (jsonKey === 'transactionDate') {
        value = formatDate(value);
      }
      
      // Convert number fields (quantity, unitPrice, totalAmount, odoNumber)
      if (['quantity', 'unitPrice', 'totalAmount', 'odoNumber'].includes(jsonKey)) {
        value = parseVietnameseNumber(value);
      }
      
      // Trim whitespace for critical string fields
      if (['fuelSource', 'object', 'category'].includes(jsonKey) && value !== null) {
        value = String(value).trim();
      }
    }
    
    record[jsonKey] = value;
  }
  
  return record;
}


// =============================================================================
// FUEL REAL-TIME SYNC MODULE
// =============================================================================
// Module này xử lý đồng bộ Real-time từng record khi có sự kiện Add/Edit/Delete
// Được trigger bởi AppSheet Bot
// =============================================================================

/**
 * Real-time sync cho Fuel Import (nhập nhiên liệu)
 * Được gọi từ AppSheet Bot khi có sự kiện trên bảng nhap_nhien_lieu
 * 
 * @param {string} importId - ID của record (từ cột Id)
 * @param {string} eventType - Loại sự kiện: 'Add', 'Edit', hoặc 'Delete'
 * @returns {Object} Response từ API hoặc error message
 * 
 * @example
 * // Gọi từ AppSheet Bot:
 * syncFuelImportToBackend([Id], "Add")
 * syncFuelImportToBackend([Id], "Edit")
 * syncFuelImportToBackend([_THISROW_BEFORE].[Id], "Delete")
 */
function syncFuelImportToBackend(importId, eventType) {
  const config = getConfig();
  
  try {
    logInfo(`========== START FUEL IMPORT SYNC ==========`);
    logInfo(`Import ID: ${importId}`);
    logInfo(`Event Type: ${eventType}`);
    
    // Validate inputs
    if (!importId) {
      throw new Error('importId is required');
    }
    
    if (!eventType) {
      throw new Error('eventType is required');
    }
    
    // Validate event type
    const validEvents = Object.values(config.EVENTS);
    if (!validEvents.includes(eventType)) {
      throw new Error(`Invalid eventType: ${eventType}. Must be one of: ${validEvents.join(', ')}`);
    }
    
    let payload;
    
    if (eventType === config.EVENTS.DELETE) {
      // DELETE: Chỉ gửi ID
      payload = {
        Action: 'FuelImport_Delete',
        id: importId
      };
      logInfo('DELETE event - Sending ID only');
      
    } else {
      // ADD/EDIT: Đọc dữ liệu từ Sheet
      const importData = getFuelImportData(importId);
      
      if (!importData) {
        throw new Error(`Không tìm thấy record với Id: ${importId}`);
      }
      
      payload = {
        Action: 'FuelImport_Upsert',
        data: importData
      };
      logInfo('ADD/EDIT event - Full data payload created');
    }
    
    // Log payload (verbose mode)
    if (config.LOGGING.VERBOSE) {
      logInfo('Payload JSON:');
      logInfo(JSON.stringify(payload, null, 2));
    }
    
    // Send to Backend API
    const response = sendToBackendAPI(payload);
    
    logInfo(`========== FUEL IMPORT SYNC SUCCESS ==========`);
    return {
      success: true,
      message: 'Fuel import synchronized successfully',
      importId: importId,
      eventType: eventType,
      response: response
    };
    
  } catch (error) {
    logError(`========== FUEL IMPORT SYNC FAILED ==========`);
    logError(`Error: ${error.message}`);
    logError(`Stack: ${error.stack}`);
    
    return {
      success: false,
      message: error.message,
      importId: importId,
      eventType: eventType
    };
  }
}

/**
 * Real-time sync cho Fuel Transaction (xuất nhiên liệu)
 * Được gọi từ AppSheet Bot khi có sự kiện trên bảng xuat_nhien_lieu
 * 
 * @param {string} transId - ID của record (từ cột Id)
 * @param {string} eventType - Loại sự kiện: 'Add', 'Edit', hoặc 'Delete'
 * @returns {Object} Response từ API hoặc error message
 * 
 * @example
 * // Gọi từ AppSheet Bot:
 * syncFuelTransactionToBackend([Id], "Add")
 * syncFuelTransactionToBackend([Id], "Edit")
 * syncFuelTransactionToBackend([_THISROW_BEFORE].[Id], "Delete")
 */
function syncFuelTransactionToBackend(transId, eventType) {
  const config = getConfig();
  
  try {
    logInfo(`========== START FUEL TRANSACTION SYNC ==========`);
    logInfo(`Transaction ID: ${transId}`);
    logInfo(`Event Type: ${eventType}`);
    
    // Validate inputs
    if (!transId) {
      throw new Error('transId is required');
    }
    
    if (!eventType) {
      throw new Error('eventType is required');
    }
    
    // Validate event type
    const validEvents = Object.values(config.EVENTS);
    if (!validEvents.includes(eventType)) {
      throw new Error(`Invalid eventType: ${eventType}. Must be one of: ${validEvents.join(', ')}`);
    }
    
    let payload;
    
    if (eventType === config.EVENTS.DELETE) {
      // DELETE: Chỉ gửi ID
      payload = {
        Action: 'FuelTransaction_Delete',
        id: transId
      };
      logInfo('DELETE event - Sending ID only');
      
    } else {
      // ADD/EDIT: Đọc dữ liệu từ Sheet
      const transData = getFuelTransactionData(transId);
      
      if (!transData) {
        throw new Error(`Không tìm thấy record với Id: ${transId}`);
      }
      
      payload = {
        Action: 'FuelTransaction_Upsert',
        data: transData
      };
      logInfo('ADD/EDIT event - Full data payload created');
    }
    
    // Log payload (verbose mode)
    if (config.LOGGING.VERBOSE) {
      logInfo('Payload JSON:');
      logInfo(JSON.stringify(payload, null, 2));
    }
    
    // Send to Backend API
    const response = sendToBackendAPI(payload);
    
    logInfo(`========== FUEL TRANSACTION SYNC SUCCESS ==========`);
    return {
      success: true,
      message: 'Fuel transaction synchronized successfully',
      transId: transId,
      eventType: eventType,
      response: response
    };
    
  } catch (error) {
    logError(`========== FUEL TRANSACTION SYNC FAILED ==========`);
    logError(`Error: ${error.message}`);
    logError(`Stack: ${error.stack}`);
    
    return {
      success: false,
      message: error.message,
      transId: transId,
      eventType: eventType
    };
  }
}

/**
 * Helper: Đọc 1 record từ sheet Fuel Import theo ID
 */
function getFuelImportData(importId) {
  const config = getConfig();
  const ss = SpreadsheetApp.openById(config.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(config.SHEET_NAMES.FUEL_IMPORT);
  
  if (!sheet) {
    throw new Error(`Sheet not found: ${config.SHEET_NAMES.FUEL_IMPORT}`);
  }
  
  // Đọc toàn bộ dữ liệu
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  
  if (values.length <= 1) {
    throw new Error('Sheet is empty or has no data rows');
  }
  
  // Extract headers
  const headers = values[0];
  
  // Build column map
  const columnMap = buildColumnMapForImport(headers);
  
  // Find Id column
  const idColIndex = columnMap['id'];
  if (idColIndex === undefined) {
    throw new Error('Id column not found in sheet');
  }
  
  // Tìm row theo ID
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const rowId = String(row[idColIndex]).trim();
    
    if (rowId === String(importId).trim()) {
      // Found the row - transform and return
      return transformFuelImportRow(row, headers, columnMap);
    }
  }
  
  // Not found
  return null;
}

/**
 * Helper: Đọc 1 record từ sheet Fuel Transaction theo ID
 */
function getFuelTransactionData(transId) {
  const config = getConfig();
  const ss = SpreadsheetApp.openById(config.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(config.SHEET_NAMES.FUEL_EXPORT);
  
  if (!sheet) {
    throw new Error(`Sheet not found: ${config.SHEET_NAMES.FUEL_EXPORT}`);
  }
  
  // Đọc toàn bộ dữ liệu
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  
  if (values.length <= 1) {
    throw new Error('Sheet is empty or has no data rows');
  }
  
  // Extract headers
  const headers = values[0];
  
  // Build column map
  const columnMap = buildColumnMapForExport(headers);
  
  // Find Id column
  const idColIndex = columnMap['id'];
  if (idColIndex === undefined) {
    throw new Error('Id column not found in sheet');
  }
  
  // Tìm row theo ID
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const rowId = String(row[idColIndex]).trim();
    
    if (rowId === String(transId).trim()) {
      // Found the row - transform and return
      return transformFuelExportRow(row, headers, columnMap);
    }
  }
  
  // Not found
  return null;
}

