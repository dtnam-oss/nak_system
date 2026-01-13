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
 * Handle GET requests to the Apps Script web app
 * URL: https://script.google.com/macros/s/{SCRIPT_ID}/exec?action={ACTION}
 * 
 * @param {Object} e - Event object from doGet
 * @returns {TextOutput} JSON response
 * 
 * @example
 * // Get all employees:
 * https://script.google.com/macros/s/{SCRIPT_ID}/exec?action=getNhanVien
 */
function doGet(e) {
  try {
    const action = e.parameter.action;
    
    if (!action) {
      return ContentService
        .createTextOutput(JSON.stringify({
          success: false,
          error: 'Missing action parameter'
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Route to appropriate function
    let result;
    switch(action) {
      case 'getNhanVien':
        result = getNhanVien();
        break;
      default:
        return ContentService
          .createTextOutput(JSON.stringify({
            success: false,
            error: `Unknown action: ${action}`
          }))
          .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Return success response
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        data: result
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    logError(`doGet error: ${error.message}`);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

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
// TEST FUNCTIONS - Chỉ dùng để test trong GAS Editor
// =============================================================================

/**
 * Test function để test syncEmployeeToBackend
 * Run function này trong GAS Editor thay vì run syncEmployeeToBackend trực tiếp
 */
function testSyncEmployeeAdd() {
  // IMPORTANT: Thay 'NV001' bằng mã nhân viên thực tế trong Google Sheets
  const employeeCode = 'NV001';  // ← SỬA MÃ NÀY
  const eventType = 'Add';
  
  Logger.log('========================================');
  Logger.log('Testing Employee Sync - ADD');
  Logger.log('========================================');
  
  const result = syncEmployeeToBackend(employeeCode, eventType);
  
  Logger.log('\nResult:');
  Logger.log(JSON.stringify(result, null, 2));
  
  if (result.success) {
    Logger.log('\n✅ TEST PASSED');
  } else {
    Logger.log('\n❌ TEST FAILED: ' + result.message);
  }
}

/**
 * Test function để test Edit
 */
function testSyncEmployeeEdit() {
  const employeeCode = 'NV001';  // ← SỬA MÃ NÀY
  const eventType = 'Edit';
  
  Logger.log('========================================');
  Logger.log('Testing Employee Sync - EDIT');
  Logger.log('========================================');
  
  const result = syncEmployeeToBackend(employeeCode, eventType);
  
  Logger.log('\nResult:');
  Logger.log(JSON.stringify(result, null, 2));
  
  if (result.success) {
    Logger.log('\n✅ TEST PASSED');
  } else {
    Logger.log('\n❌ TEST FAILED: ' + result.message);
  }
}

/**
 * Test function để test Delete
 */
function testSyncEmployeeDelete() {
  const employeeCode = 'NV001';  // ← SỬA MÃ NÀY
  const eventType = 'Delete';
  
  Logger.log('========================================');
  Logger.log('Testing Employee Sync - DELETE');
  Logger.log('========================================');
  
  const result = syncEmployeeToBackend(employeeCode, eventType);
  
  Logger.log('\nResult:');
  Logger.log(JSON.stringify(result, null, 2));
  
  if (result.success) {
    Logger.log('\n✅ TEST PASSED');
  } else {
    Logger.log('\n❌ TEST FAILED: ' + result.message);
  }
}

/**
 * Test getNhanVien function
 */
function testGetNhanVien() {
  Logger.log('========================================');
  Logger.log('Testing getNhanVien');
  Logger.log('========================================');
  
  try {
    const employees = getNhanVien();
    
    Logger.log(`\n✅ Found ${employees.length} employees`);
    
    if (employees.length > 0) {
      Logger.log('\nFirst employee:');
      Logger.log(JSON.stringify(employees[0], null, 2));
      
      Logger.log('\nAll employee codes:');
      employees.forEach(emp => {
        Logger.log(`  - ${emp.maNhanVien}: ${emp.hoVaTen}`);
      });
    }
    
    Logger.log('\n✅ TEST PASSED');
    
  } catch (error) {
    Logger.log('\n❌ TEST FAILED: ' + error.message);
    Logger.log(error.stack);
  }
}

/**
 * Test getEmployeeData cho 1 nhân viên cụ thể
 */
function testGetEmployeeData() {
  const employeeCode = 'NV001';  // ← SỬA MÃ NÀY
  
  Logger.log('========================================');
  Logger.log('Testing getEmployeeData');
  Logger.log(`Employee Code: ${employeeCode}`);
  Logger.log('========================================');
  
  try {
    const employee = getEmployeeData(employeeCode);
    
    if (employee) {
      Logger.log('\n✅ Employee found:');
      Logger.log(JSON.stringify(employee, null, 2));
      Logger.log('\n✅ TEST PASSED');
    } else {
      Logger.log(`\n❌ Employee not found: ${employeeCode}`);
      Logger.log('Make sure the employee code exists in Google Sheets');
    }
    
  } catch (error) {
    Logger.log('\n❌ TEST FAILED: ' + error.message);
    Logger.log(error.stack);
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
  PROP_KEY: 'MIGRATION_LAST_ROW_INDEX', // Biến lưu vị trí dòng

  // ========== CẤU HÌNH LỌC THEO NGÀY ==========
  // Chỉ import các chuyến có ngày_tao >= START_DATE
  // Format: 'YYYY-MM-DD' hoặc null để import tất cả
  START_DATE: '2026-01-01',  // ✅ Chỉ import từ 1/1/2026 trở đi

  // ========== CẤU HÌNH DÒNG BẮT ĐẦU ==========
  // Bắt đầu từ dòng cụ thể (bỏ qua dòng header = 1)
  // Set null để sử dụng vị trí đã lưu hoặc bắt đầu từ đầu
  MANUAL_START_ROW: null  // VD: 100 - bắt đầu từ dòng 100
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

  // Display filter config
  if (MIGRATION_OPTS.START_DATE) {
    Logger.log(`📅 [FILTER] Chỉ import từ ngày: ${MIGRATION_OPTS.START_DATE}`);
  } else {
    Logger.log(`📅 [FILTER] Import tất cả (không lọc theo ngày)`);
  }

  if (MIGRATION_OPTS.MANUAL_START_ROW) {
    Logger.log(`📍 [START ROW] Manual start row: ${MIGRATION_OPTS.MANUAL_START_ROW}`);
  }
}

/**
 * 2.1. HÀM TIỆN ÍCH: Set ngày bắt đầu import
 * @param {string} dateString - Ngày bắt đầu format YYYY-MM-DD, VD: '2025-01-01'
 *
 * @example
 * setStartDate('2025-01-01')  // Chỉ import từ 1/1/2025
 * setStartDate(null)          // Import tất cả
 */
function setStartDate(dateString) {
  if (dateString === null) {
    Logger.log(`✅ Đã tắt filter ngày. Sẽ import TẤT CẢ dữ liệu.`);
    Logger.log(`⚠️  LƯU Ý: Bạn cần sửa MIGRATION_OPTS.START_DATE = null trong code.`);
    return;
  }

  // Validate date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) {
    Logger.log(`❌ LỖI: Format ngày không đúng. Cần format: YYYY-MM-DD (VD: 2025-01-01)`);
    return;
  }

  Logger.log(`✅ Đã set ngày bắt đầu: ${dateString}`);
  Logger.log(`📋 Chỉ các chuyến có ngay_tao >= ${dateString} sẽ được import.`);
  Logger.log(`⚠️  LƯU Ý: Bạn cần sửa MIGRATION_OPTS.START_DATE = '${dateString}' trong code.`);
}

/**
 * 2.2. HÀM TIỆN ÍCH: Set dòng bắt đầu
 * @param {number} rowNumber - Số dòng bắt đầu (từ 2 trở đi, 1 là header)
 *
 * @example
 * setStartRow(100)  // Bắt đầu từ dòng 100
 * setStartRow(null) // Sử dụng vị trí đã lưu
 */
function setStartRow(rowNumber) {
  if (rowNumber === null) {
    Logger.log(`✅ Sẽ sử dụng vị trí đã lưu hoặc bắt đầu từ dòng đầu tiên.`);
    Logger.log(`⚠️  LƯU Ý: Bạn cần sửa MIGRATION_OPTS.MANUAL_START_ROW = null trong code.`);
    return;
  }

  if (rowNumber < 2) {
    Logger.log(`❌ LỖI: Số dòng phải >= 2 (dòng 1 là header)`);
    return;
  }

  Logger.log(`✅ Đã set dòng bắt đầu: ${rowNumber}`);
  Logger.log(`📋 Import sẽ bắt đầu từ dòng ${rowNumber}.`);
  Logger.log(`⚠️  LƯU Ý: Bạn cần sửa MIGRATION_OPTS.MANUAL_START_ROW = ${rowNumber} trong code.`);
  Logger.log(`⚠️  Nhớ chạy manualResetMigration() trước để áp dụng start row.`);
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

  // ✨ NEW: Override bằng MANUAL_START_ROW nếu được set
  if (MIGRATION_OPTS.MANUAL_START_ROW !== null && lastRowIndex === 1) {
    lastRowIndex = MIGRATION_OPTS.MANUAL_START_ROW - 1;
    Logger.log(`📍 Sử dụng MANUAL_START_ROW: Bắt đầu từ dòng ${MIGRATION_OPTS.MANUAL_START_ROW}`);
  }

  let startRow = lastRowIndex + 1;
  const totalRows = sheet.getLastRow();

  if (startRow > totalRows) {
    Logger.log("✅ [HOÀN TẤT] Toàn bộ dữ liệu đã được xử lý. Không còn dòng nào mới.");
    return;
  }

  // 3. Tìm cột ID và cột ngày
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const idColIndex = getColumnIndex(headers, config.FOREIGN_KEY.MASTER_COLUMN);
  const dateColIndex = getColumnIndex(headers, 'ngay_tao');

  if (idColIndex === -1) {
    Logger.log(`❌ Lỗi: Không tìm thấy cột ID "${config.FOREIGN_KEY.MASTER_COLUMN}"`);
    return;
  }

  // ✨ NEW: Log filter config
  if (MIGRATION_OPTS.START_DATE) {
    Logger.log(`📅 Filter: Chỉ import chuyến từ ${MIGRATION_OPTS.START_DATE} trở đi`);
  }

  // 4. Lấy dữ liệu Batch
  const numRows = Math.min(MIGRATION_OPTS.BATCH_SIZE, totalRows - startRow + 1);
  Logger.log(`🚀 BẮT ĐẦU BATCH: Xử lý từ dòng ${startRow} đến ${startRow + numRows - 1} (Tổng: ${totalRows})`);

  const dataRange = sheet.getRange(startRow, 1, numRows, sheet.getLastColumn());
  const dataValues = dataRange.getValues();

  let success = 0;
  let skipped = 0;
  let errors = 0;
  let filteredByDate = 0;

  // 5. Vòng lặp xử lý
  for (let i = 0; i < dataValues.length; i++) {
    const row = dataValues[i];
    const tripId = row[idColIndex];

    // Kiểm tra ID rỗng
    if (!tripId || String(tripId).trim() === '') {
      skipped++;
      continue;
    }

    // ✨ NEW: Filter theo ngày nếu được cấu hình
    if (MIGRATION_OPTS.START_DATE && dateColIndex !== -1) {
      const rowDate = formatDate(row[dateColIndex]);

      if (rowDate && rowDate < MIGRATION_OPTS.START_DATE) {
        filteredByDate++;
        continue; // Bỏ qua các chuyến trước ngày bắt đầu
      }
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
  if (filteredByDate > 0) {
    Logger.log(`- Lọc theo ngày: ${filteredByDate} (trước ${MIGRATION_OPTS.START_DATE})`);
  }
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
// Bao gồm:
// - Tính giá Bình quân gia quyền (WAC) khi Nhập kho
// - Tính giá vốn (COGS) khi Xuất kho
// =============================================================================

/**
 * Helper: Lấy trạng thái tồn kho và giá bình quân hiện tại từ Database
 * 
 * @returns {Object} { currentInventory, currentAvgPrice } hoặc { currentInventory: 0, currentAvgPrice: 0 } nếu chưa có dữ liệu
 * 
 * @example
 * const state = fetchLatestFuelState();
 * // { currentInventory: 5000, currentAvgPrice: 22500 }
 */
function fetchLatestFuelState() {
  const config = getConfig();
  
  try {
    logInfo('Fetching latest fuel state from database...');
    
    const url = config.API.ENDPOINT.replace('/webhook/appsheet', '/fuel/stats');
    
    const options = {
      method: 'get',
      headers: {
        'Content-Type': config.API.CONTENT_TYPE,
        'x-api-key': config.API.KEY
      },
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(url, options);
    const statusCode = response.getResponseCode();
    const responseBody = response.getContentText();
    
    if (statusCode !== 200) {
      logWarning(`Failed to fetch fuel state. Status: ${statusCode}. Response: ${responseBody}`);
      // Return default values if API fails
      return {
        currentInventory: 0,
        currentAvgPrice: 0
      };
    }
    
    const data = JSON.parse(responseBody);
    
    // Extract current inventory and avgPrice from stats
    const currentInventory = parseFloat(data.current_inventory || 0);
    const currentAvgPrice = parseFloat(data.current_avg_price || 0);
    
    logInfo(`Fetched state: Inventory=${currentInventory}L, AvgPrice=${currentAvgPrice} VND/L`);
    
    return {
      currentInventory: currentInventory,
      currentAvgPrice: currentAvgPrice
    };
    
  } catch (error) {
    logError(`Error fetching fuel state: ${error.message}`);
    // Return default values on error
    return {
      currentInventory: 0,
      currentAvgPrice: 0
    };
  }
}

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
      
      // ========== TÍNH GIÁ BÌNH QUÂN GIA QUYỀN (WAC) ==========
      logInfo('Calculating Weighted Average Cost (WAC)...');
      
      // 1. Lấy trạng thái tồn kho hiện tại
      const fuelState = fetchLatestFuelState();
      const currentStock = fuelState.currentInventory;  // Q_tồn
      const currentAvgPrice = fuelState.currentAvgPrice; // P_cũ
      
      // 2. Lấy dữ liệu nhập hiện tại
      const importQuantity = parseFloat(importData.quantity || 0);  // Q_nhập
      const importUnitPrice = parseFloat(importData.unitPrice || 0); // P_nhập
      
      // 3. Tính giá bình quân mới theo công thức WAC
      let newAvgPrice = 0;
      
      const totalQuantity = currentStock + importQuantity;
      
      if (totalQuantity > 0) {
        // P_mới = (Q_tồn * P_cũ + Q_nhập * P_nhập) / (Q_tồn + Q_nhập)
        newAvgPrice = ((currentStock * currentAvgPrice) + (importQuantity * importUnitPrice)) / totalQuantity;
      } else {
        // Edge case: nếu tổng = 0, giữ nguyên giá cũ
        newAvgPrice = currentAvgPrice;
      }
      
      // 4. Làm tròn 2 chữ số thập phân
      newAvgPrice = Math.round(newAvgPrice * 100) / 100;
      
      // 5. Gán vào data
      importData.avgPrice = newAvgPrice;
      
      logInfo(`WAC Calculation:`);
      logInfo(`  Current Stock: ${currentStock}L @ ${currentAvgPrice} VND/L`);
      logInfo(`  Import: ${importQuantity}L @ ${importUnitPrice} VND/L`);
      logInfo(`  New Avg Price: ${newAvgPrice} VND/L`);
      logInfo(`  Total Stock After: ${totalQuantity}L`);
      
      payload = {
        Action: 'FuelImport_Upsert',
        data: importData
      };
      logInfo('ADD/EDIT event - Full data payload created with avgPrice');
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
      
      // ========== TÍNH GIÁ VỐN (COGS) ==========
      logInfo('Calculating Cost of Goods Sold (COGS)...');
      
      // 1. Lấy giá bình quân hiện tại
      const fuelState = fetchLatestFuelState();
      const currentAvgPrice = fuelState.currentAvgPrice;
      
      // 2. Lấy số lượng xuất
      const exportQuantity = parseFloat(transData.quantity || 0);
      
      // 3. Tính thành tiền (COGS)
      let totalAmount = exportQuantity * currentAvgPrice;
      
      // 4. Làm tròn 2 chữ số thập phân
      totalAmount = Math.round(totalAmount * 100) / 100;
      
      // 5. Gán vào data (Override giá trị từ Sheet nếu có)
      transData.unitPrice = currentAvgPrice;  // Sử dụng giá BQ làm đơn giá
      transData.totalAmount = totalAmount;
      
      logInfo(`COGS Calculation:`);
      logInfo(`  Avg Price: ${currentAvgPrice} VND/L`);
      logInfo(`  Export Quantity: ${exportQuantity}L`);
      logInfo(`  Total Amount (COGS): ${totalAmount} VND`);
      
      payload = {
        Action: 'FuelTransaction_Upsert',
        data: transData
      };
      logInfo('ADD/EDIT event - Full data payload created with COGS');
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


// =============================================================================
// HISTORICAL DATA IMPORT - BATCH PROCESSING
// =============================================================================

/**
 * Import Historical Fuel Imports (Nhập nhiên liệu cũ)
 * ⚠️ CHẠY HÀM NÀY TRƯỚC để có tồn kho cho việc tính toán
 * 
 * Features:
 * - Đọc toàn bộ dữ liệu từ sheet nhap_nhien_lieu
 * - Gửi từng record lên Backend qua API webhook
 * - Tính giá bình quân gia quyền (WAC) cho mỗi lần nhập
 * - Log chi tiết tiến trình và lỗi
 * 
 * @returns {Object} Kết quả import (success, total, imported, failed)
 */
function importHistoricalFuelImports() {
  const config = getConfig();
  const ss = SpreadsheetApp.openById(config.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(config.SHEET_NAMES.FUEL_IMPORT);
  
  if (!sheet) {
    throw new Error(`Sheet not found: ${config.SHEET_NAMES.FUEL_IMPORT}`);
  }
  
  logInfo('========== START HISTORICAL FUEL IMPORTS IMPORT ==========');
  logInfo(`Sheet: ${config.SHEET_NAMES.FUEL_IMPORT}`);
  
  // Đọc toàn bộ dữ liệu
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  
  if (values.length <= 1) {
    logWarning('Sheet is empty or has only headers. No data to import.');
    return {
      success: true,
      total: 0,
      imported: 0,
      failed: 0,
      message: 'No data to import'
    };
  }
  
  // Extract headers
  const headers = values[0];
  logInfo(`Headers: ${headers.join(', ')}`);
  
  // Build column map
  const columnMap = buildColumnMapForImport(headers);
  
  // Track results
  let total = values.length - 1; // Exclude header
  let imported = 0;
  let failed = 0;
  const errors = [];
  
  logInfo(`Total records to import: ${total}`);
  logInfo('Starting batch import...');
  
  // Process each row (skip header)
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const rowNumber = i + 1; // Sheet row number (1-indexed)
    
    try {
      // Transform row to data object
      const importData = transformFuelImportRow(row, headers, columnMap);
      
      if (!importData || !importData.id) {
        logWarning(`Row ${rowNumber}: Missing ID, skipping...`);
        failed++;
        errors.push({ row: rowNumber, error: 'Missing ID' });
        continue;
      }
      
      logInfo(`\n--- Processing Row ${rowNumber} ---`);
      logInfo(`  ID: ${importData.id}`);
      logInfo(`  Date: ${importData.importDate}`);
      logInfo(`  Quantity: ${importData.quantity}L`);
      logInfo(`  Unit Price: ${importData.unitPrice} VND/L`);
      
      // ========== TÍNH GIÁ BÌNH QUÂN GIA QUYỀN (WAC) ==========
      const fuelState = fetchLatestFuelState();
      const currentStock = fuelState.currentInventory;
      const currentAvgPrice = fuelState.currentAvgPrice;
      
      const importQuantity = parseFloat(importData.quantity || 0);
      const importUnitPrice = parseFloat(importData.unitPrice || 0);
      
      let newAvgPrice = 0;
      const totalQuantity = currentStock + importQuantity;
      
      if (totalQuantity > 0) {
        newAvgPrice = ((currentStock * currentAvgPrice) + (importQuantity * importUnitPrice)) / totalQuantity;
      } else {
        newAvgPrice = currentAvgPrice;
      }
      
      newAvgPrice = Math.round(newAvgPrice * 100) / 100;
      importData.avgPrice = newAvgPrice;
      
      logInfo(`  WAC: Stock(${currentStock}L @ ${currentAvgPrice}) + Import(${importQuantity}L @ ${importUnitPrice}) = ${newAvgPrice} VND/L`);
      
      // Build payload
      const payload = {
        Action: 'FuelImport_Upsert',
        data: importData
      };
      
      // Send to API
      const response = sendToBackendAPI(payload);
      
      logInfo(`  ✓ Row ${rowNumber} imported successfully`);
      logInfo(`  Response: ${JSON.stringify(response)}`);
      
      imported++;
      
      // Delay to avoid overwhelming API (100ms between requests)
      Utilities.sleep(100);
      
    } catch (error) {
      logError(`  ✗ Row ${rowNumber} failed: ${error.message}`);
      failed++;
      errors.push({ 
        row: rowNumber, 
        id: row[columnMap['id']] || 'unknown',
        error: error.message 
      });
    }
  }
  
  // Summary
  logInfo('\n========== IMPORT SUMMARY ==========');
  logInfo(`Total: ${total}`);
  logInfo(`✓ Imported: ${imported}`);
  logInfo(`✗ Failed: ${failed}`);
  
  if (errors.length > 0) {
    logError('\nFailed rows:');
    errors.forEach(err => {
      logError(`  Row ${err.row} (ID: ${err.id}): ${err.error}`);
    });
  }
  
  logInfo('========== IMPORT COMPLETE ==========\n');
  
  return {
    success: true,
    total: total,
    imported: imported,
    failed: failed,
    errors: errors
  };
}


/**
 * Import Historical Fuel Transactions (Xuất nhiên liệu cũ)
 * ⚠️ CHẠY HÀM NÀY SAU importHistoricalFuelImports()
 * 
 * Features:
 * - Đọc toàn bộ dữ liệu từ sheet xuat_nhien_lieu
 * - Gửi từng record lên Backend qua API webhook
 * - Auto-calculation sẽ tự động tính toán:
 *   * is_full_tank (từ category: Chốt tháng, Bàn giao, Khởi tạo)
 *   * km_traveled (quãng đường từ lần đổ dầy trước)
 *   * total_fuel_period (tổng dầu trong kỳ)
 *   * efficiency (hiệu suất L/100km)
 * - Log chi tiết tiến trình và lỗi
 * 
 * @returns {Object} Kết quả import (success, total, imported, failed)
 */
function importHistoricalFuelTransactions() {
  const config = getConfig();
  const ss = SpreadsheetApp.openById(config.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(config.SHEET_NAMES.FUEL_EXPORT);
  
  if (!sheet) {
    throw new Error(`Sheet not found: ${config.SHEET_NAMES.FUEL_EXPORT}`);
  }
  
  logInfo('========== START HISTORICAL FUEL TRANSACTIONS IMPORT ==========');
  logInfo(`Sheet: ${config.SHEET_NAMES.FUEL_EXPORT}`);
  
  // Đọc toàn bộ dữ liệu
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  
  if (values.length <= 1) {
    logWarning('Sheet is empty or has only headers. No data to import.');
    return {
      success: true,
      total: 0,
      imported: 0,
      failed: 0,
      message: 'No data to import'
    };
  }
  
  // Extract headers
  const headers = values[0];
  logInfo(`Headers: ${headers.join(', ')}`);
  
  // Build column map
  const columnMap = buildColumnMapForExport(headers);
  
  // Track results
  let total = values.length - 1; // Exclude header
  let imported = 0;
  let failed = 0;
  let calculated = 0; // Track how many had auto-calculation triggered
  const errors = [];
  
  logInfo(`Total records to import: ${total}`);
  logInfo('Starting batch import with auto-calculation...');
  
  // Process each row (skip header)
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const rowNumber = i + 1; // Sheet row number (1-indexed)
    
    try {
      // Transform row to data object
      const transactionData = transformFuelExportRow(row, headers, columnMap);
      
      if (!transactionData || !transactionData.id) {
        logWarning(`Row ${rowNumber}: Missing ID, skipping...`);
        failed++;
        errors.push({ row: rowNumber, error: 'Missing ID' });
        continue;
      }
      
      logInfo(`\n--- Processing Row ${rowNumber} ---`);
      logInfo(`  ID: ${transactionData.id}`);
      logInfo(`  Date: ${transactionData.transactionDate}`);
      logInfo(`  License Plate: ${transactionData.licensePlate}`);
      logInfo(`  Category: ${transactionData.category}`);
      logInfo(`  Quantity: ${transactionData.quantity}L`);
      logInfo(`  Odo: ${transactionData.odoNumber} km`);
      
      // Check if this is a full-tank record (will trigger auto-calculation)
      const category = String(transactionData.category || '').toUpperCase().trim();
      const isFullTank = ['CHỐT THÁNG', 'BÀN GIAO', 'KHỞI TẠO'].includes(category);
      
      if (isFullTank) {
        logInfo(`  🔔 Full-tank record detected! Auto-calculation will be triggered.`);
        calculated++;
      }
      
      // Build payload
      const payload = {
        Action: 'FuelTransaction_Upsert',
        data: transactionData
      };
      
      // Send to API (auto-calculation happens in webhook handler)
      const response = sendToBackendAPI(payload);
      
      logInfo(`  ✓ Row ${rowNumber} imported successfully`);
      
      // Log calculation results if available
      if (response && response.calculation) {
        logInfo(`  📊 Calculation Results:`);
        logInfo(`     km_traveled: ${response.calculation.km_traveled} km`);
        logInfo(`     total_fuel: ${response.calculation.total_fuel_period}L`);
        logInfo(`     efficiency: ${response.calculation.efficiency} L/100km`);
      }
      
      imported++;
      
      // Delay to avoid overwhelming API (150ms for transactions to allow calculation time)
      Utilities.sleep(150);
      
    } catch (error) {
      logError(`  ✗ Row ${rowNumber} failed: ${error.message}`);
      failed++;
      errors.push({ 
        row: rowNumber, 
        id: row[columnMap['id']] || 'unknown',
        error: error.message 
      });
    }
  }
  
  // Summary
  logInfo('\n========== IMPORT SUMMARY ==========');
  logInfo(`Total: ${total}`);
  logInfo(`✓ Imported: ${imported}`);
  logInfo(`📊 Auto-calculated: ${calculated} (full-tank records)`);
  logInfo(`✗ Failed: ${failed}`);
  
  if (errors.length > 0) {
    logError('\nFailed rows:');
    errors.forEach(err => {
      logError(`  Row ${err.row} (ID: ${err.id}): ${err.error}`);
    });
  }
  
  logInfo('========== IMPORT COMPLETE ==========\n');
  logInfo('💡 TIP: Check database for calculated values (km_traveled, efficiency)');
  logInfo('💡 Expected calculations for records with category: Chốt tháng, Bàn giao');
  
  return {
    success: true,
    total: total,
    imported: imported,
    calculated: calculated,
    failed: failed,
    errors: errors
  };
}


// =============================================================================
// EMPLOYEE SYNC FUNCTIONS (Similar to Trip Sync)
// =============================================================================

/**
 * Hàm chính được gọi từ AppSheet Bot để sync nhân viên
 * 
 * @param {string} employeeCode - Mã nhân viên (ma_nhan_vien)
 * @param {string} eventType - Loại sự kiện: 'Add', 'Edit', hoặc 'Delete'
 * @returns {Object} Response từ API hoặc error message
 * 
 * @example
 * // Gọi từ AppSheet Bot:
 * syncEmployeeToBackend([ma_nhan_vien], "Add")
 * syncEmployeeToBackend([ma_nhan_vien], "Edit")
 * syncEmployeeToBackend([ma_nhan_vien], "Delete")
 */
function syncEmployeeToBackend(employeeCode, eventType) {
  const config = getConfig();
  
  try {
    logInfo(`========== START EMPLOYEE SYNC ==========`);
    logInfo(`Employee Code: ${employeeCode}`);
    logInfo(`Event Type: ${eventType}`);
    
    // Validate inputs
    if (!employeeCode) {
      throw new Error('employeeCode is required');
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
      // DELETE: Không cần đọc Sheet, chỉ gửi employeeCode
      payload = buildEmployeeDeletePayload(employeeCode);
      logInfo('DELETE event - Payload created without reading sheet');
    } else {
      // ADD/EDIT: Đọc đầy đủ dữ liệu từ Sheet
      payload = buildEmployeeFullPayload(employeeCode, eventType);
      logInfo('ADD/EDIT event - Full payload created');
    }
    
    // Log payload (trong môi trường development)
    if (config.LOGGING.VERBOSE) {
      logInfo('Employee Payload JSON:');
      logInfo(JSON.stringify(payload, null, 2));
    }
    
    // Send to Backend API
    const response = sendToBackendAPI(payload);
    
    logInfo(`========== EMPLOYEE SYNC SUCCESS ==========`);
    return {
      success: true,
      message: 'Employee data synchronized successfully',
      employeeCode: employeeCode,
      eventType: eventType,
      response: response
    };
    
  } catch (error) {
    logError(`========== EMPLOYEE SYNC FAILED ==========`);
    logError(`Error: ${error.message}`);
    logError(`Stack: ${error.stack}`);
    
    // Return error để AppSheet có thể xử lý
    return {
      success: false,
      message: error.message,
      employeeCode: employeeCode,
      eventType: eventType
    };
  }
}

/**
 * Build payload cho event DELETE (Employee)
 */
function buildEmployeeDeletePayload(employeeCode) {
  return {
    Action: 'Employee_Delete',
    maNhanVien: employeeCode
  };
}

/**
 * Build payload đầy đủ cho event ADD/EDIT (Employee)
 */
function buildEmployeeFullPayload(employeeCode, eventType) {
  const config = getConfig();
  
  // Lấy thông tin nhân viên
  const employeeData = getEmployeeData(employeeCode);
  if (!employeeData) {
    throw new Error(`Không tìm thấy nhân viên với ma_nhan_vien: ${employeeCode}`);
  }
  
  // Build JSON payload
  const payload = {
    Action: eventType === config.EVENTS.ADD ? 'Employee_Add' : 'Employee_Edit',
    ...employeeData
  };
  
  logInfo(`[EMPLOYEE PAYLOAD] maNhanVien: ${payload.maNhanVien}, hoVaTen: ${payload.hoVaTen}`);
  
  return payload;
}

/**
 * Lấy dữ liệu nhân viên từ Sheet nhan_vien
 * 
 * @param {string} employeeCode - Mã nhân viên
 * @returns {Object|null} Object chứa dữ liệu nhân viên đã được map
 */
function getEmployeeData(employeeCode) {
  const config = getConfig();
  const ss = SpreadsheetApp.openById(config.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(config.SHEET_NAMES.EMPLOYEES);
  
  if (!sheet) {
    throw new Error(`Sheet "${config.SHEET_NAMES.EMPLOYEES}" not found`);
  }
  
  // Lấy tất cả data
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  
  if (values.length === 0) {
    throw new Error('Employee sheet is empty');
  }
  
  // Row đầu tiên là header
  const headers = values[0];
  
  // Tìm column index của ma_nhan_vien
  const employeeCodeIndex = getColumnIndex(headers, 'ma_nhan_vien');
  
  if (employeeCodeIndex === -1) {
    throw new Error(`Column "ma_nhan_vien" not found in sheet "${config.SHEET_NAMES.EMPLOYEES}"`);
  }
  
  // Tìm row (bỏ qua header row)
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const currentEmployeeCode = String(row[employeeCodeIndex]).trim();
    
    if (currentEmployeeCode === String(employeeCode).trim()) {
      // Found the row, map data
      return mapEmployeeRow(row, headers);
    }
  }
  
  return null; // Không tìm thấy
}

/**
 * Map một row từ Employee Sheet sang JSON object
 * 
 * @param {Array} row - Dữ liệu row từ sheet
 * @param {Array} headers - Header row
 * @returns {Object} Mapped object
 */
function mapEmployeeRow(row, headers) {
  const config = getConfig();
  const mappedData = {};
  
  // Duyệt qua tất cả các column mapping
  for (const [sheetColumn, jsonKey] of Object.entries(config.EMPLOYEES_COLUMNS)) {
    const columnIndex = getColumnIndex(headers, sheetColumn);
    
    if (columnIndex === -1) {
      logWarning(`Column "${sheetColumn}" not found in Employee sheet, skipping`);
      continue;
    }
    
    let value = row[columnIndex];
    
    // Xử lý data type theo loại column
    if (['ngay_vao_lam', 'ngay_nghi_viec', 'ngay_sinh'].includes(sheetColumn)) {
      // Date columns
      value = formatDate(value);
    } else if (['xem', 'them', 'sua', 'xoa'].includes(sheetColumn)) {
      // Boolean columns
      if (typeof value === 'boolean') {
        // Keep as is
      } else if (typeof value === 'string') {
        const normalized = String(value).trim().toUpperCase();
        value = (normalized === 'TRUE' || normalized === '1' || normalized === 'YES');
      } else {
        value = false; // Default to false
      }
    } else {
      // String: trim và convert về string
      value = String(value || '').trim();
      if (value === '') {
        value = null;
      }
    }
    
    mappedData[jsonKey] = value;
  }
  
  return mappedData;
}


// =============================================================================
// FUNCTION: GET EMPLOYEES (Read All)
// =============================================================================
/**
 * Get all employees from nhan_vien sheet
 * URL: https://script.google.com/macros/s/{SCRIPT_ID}/exec?action=getNhanVien
 * 
 * Returns JSON array of all employee records
 */
function getNhanVien() {
  try {
    logInfo('========== GET EMPLOYEES - START ==========');
    
    const config = getConfig();
    const ss = SpreadsheetApp.openById(config.SPREADSHEET_ID);
    const sheet = ss.getSheetByName(config.SHEET_NAMES.EMPLOYEES);
    
    if (!sheet) {
      throw new Error(`Sheet "${config.SHEET_NAMES.EMPLOYEES}" not found`);
    }
    
    logInfo(`Reading from sheet: ${config.SHEET_NAMES.EMPLOYEES}`);
    
    // Get all data
    const values = sheet.getDataRange().getValues();
    if (values.length === 0) {
      logWarning('Sheet is empty');
      return [];
    }
    
    // Get headers (row 1)
    const headers = values[0].map(h => String(h).trim().toLowerCase());
    logInfo(`Found ${headers.length} columns, ${values.length - 1} rows`);
    
    // Column mapping
    const columnMap = config.EMPLOYEES_COLUMNS;
    
    // Transform rows to objects
    const employees = [];
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const employee = {};
      
      // Map each column
      for (let j = 0; j < headers.length; j++) {
        const headerName = headers[j];
        const jsonKey = columnMap[headerName];
        
        if (jsonKey) {
          let value = row[j];
          
          // Handle dates
          if (['ngay_vao_lam', 'ngay_nghi_viec', 'ngay_sinh'].includes(headerName)) {
            if (value instanceof Date) {
              value = Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
            } else if (value) {
              value = String(value).trim();
            } else {
              value = null;
            }
          }
          // Handle booleans
          else if (['xem', 'them', 'sua', 'xoa'].includes(headerName)) {
            if (typeof value === 'boolean') {
              // Keep as is
            } else if (typeof value === 'string') {
              const normalized = String(value).trim().toUpperCase();
              value = (normalized === 'TRUE' || normalized === '1' || normalized === 'YES');
            } else {
              value = false; // Default to false
            }
          }
          // Handle strings
          else if (typeof value === 'string') {
            value = value.trim();
            if (value === '') {
              value = null;
            }
          }
          // Handle empty values
          else if (value === '' || value === null || value === undefined) {
            value = null;
          }
          
          employee[jsonKey] = value;
        }
      }
      
      // Only add if has employee code
      if (employee.maNhanVien) {
        employees.push(employee);
      }
    }
    
    logInfo(`✓ Processed ${employees.length} employees`);
    logInfo('========== GET EMPLOYEES - COMPLETE ==========');
    
    return employees;
    
  } catch (error) {
    logError(`Failed to get employees: ${error.message}`);
    logError(error.stack);
    throw error;
  }
}

// =============================================================================
// BULK IMPORT EMPLOYEES TO DATABASE
// =============================================================================

/**
 * Import tất cả nhân viên từ Google Sheets lên Database
 * Tương tự như syncFuelImports() - chạy trực tiếp từ GAS Editor
 * 
 * CÁCH SỬ DỤNG:
 * 1. Mở GAS Editor
 * 2. Chọn function: importEmployeesToDB
 * 3. Click Run
 * 4. Xem logs (View → Logs)
 * 
 * @returns {Object} Summary của quá trình import
 */
function importEmployeesToDB() {
  const config = getConfig();
  
  try {
    logInfo('========== START BULK EMPLOYEE IMPORT ==========');
    logInfo(`Target: ${config.API.ENDPOINT}`);
    
    // 1. Đọc tất cả nhân viên từ Sheet
    logInfo('Step 1: Reading employees from Google Sheets...');
    const employees = getNhanVien();
    
    if (employees.length === 0) {
      logInfo('⚠️  No employees found in sheet');
      return {
        success: true,
        total: 0,
        imported: 0,
        failed: 0,
        errors: []
      };
    }
    
    logInfo(`✓ Found ${employees.length} employees`);
    
    // 2. Import từng nhân viên
    logInfo('Step 2: Importing employees to database...');
    
    let imported = 0;
    let failed = 0;
    const errors = [];
    
    for (let i = 0; i < employees.length; i++) {
      const employee = employees[i];
      const rowNumber = i + 1;
      
      try {
        logInfo(`\n--- Processing ${rowNumber}/${employees.length} ---`);
        logInfo(`  Employee: ${employee.maNhanVien} - ${employee.hoVaTen}`);
        
        // Build payload
        const payload = {
          Action: 'Employee_Add',  // Sử dụng Add, API sẽ tự UPSERT
          ...employee
        };
        
        // Send to API
        const response = sendToBackendAPI(payload);
        
        logInfo(`  ✓ Imported successfully`);
        imported++;
        
        // Delay để tránh quá tải API (100ms)
        Utilities.sleep(100);
        
      } catch (error) {
        logError(`  ✗ Failed: ${error.message}`);
        failed++;
        errors.push({
          row: rowNumber,
          employeeCode: employee.maNhanVien,
          employeeName: employee.hoVaTen,
          error: error.message
        });
      }
    }
    
    // 3. Summary
    logInfo('\n========== IMPORT SUMMARY ==========');
    logInfo(`Total: ${employees.length}`);
    logInfo(`✓ Imported: ${imported}`);
    logInfo(`✗ Failed: ${failed}`);
    
    if (errors.length > 0) {
      logError('\nFailed employees:');
      errors.forEach(err => {
        logError(`  Row ${err.row}: ${err.employeeCode} - ${err.employeeName}`);
        logError(`    Error: ${err.error}`);
      });
    }
    
    logInfo('========== IMPORT COMPLETE ==========\n');
    
    return {
      success: true,
      total: employees.length,
      imported: imported,
      failed: failed,
      errors: errors
    };
    
  } catch (error) {
    logError('========== IMPORT FAILED ==========');
    logError(`Error: ${error.message}`);
    logError(error.stack);
    
    return {
      success: false,
      error: error.message,
      total: 0,
      imported: 0,
      failed: 0
    };
  }
}

/**
 * Test function - Import 1 nhân viên để test
 */
function testImportOneEmployee() {
  const employeeCode = 'NV001';  // ← SỬA MÃ NÀY
  
  Logger.log('=== TEST IMPORT ONE EMPLOYEE ===');
  Logger.log(`Employee Code: ${employeeCode}`);
  
  try {
    // Get employee data
    const employee = getEmployeeData(employeeCode);
    
    if (!employee) {
      Logger.log('❌ Employee not found in sheet');
      return;
    }
    
    Logger.log('✓ Employee data retrieved:');
    Logger.log(`  - ${employee.maNhanVien}: ${employee.hoVaTen}`);
    Logger.log(`  - Department: ${employee.phongBan}`);
    Logger.log(`  - Position: ${employee.chucVu}`);
    
    // Build payload
    const payload = {
      Action: 'Employee_Add',
      ...employee
    };
    
    Logger.log('\nSending to API...');
    
    // Send to API
    const response = sendToBackendAPI(payload);
    
    Logger.log('✓ API Response:');
    Logger.log(JSON.stringify(response, null, 2));
    
    Logger.log('\n✅ TEST PASSED');
    
  } catch (error) {
    Logger.log('❌ TEST FAILED');
    Logger.log('Error: ' + error.message);
    Logger.log(error.stack);
  }
}

/**
 * Import với batch size (import từng nhóm)
 * Hữu ích khi có nhiều nhân viên (>100)
 */
function importEmployeesBatch() {
  const BATCH_SIZE = 10;  // Import 10 nhân viên mỗi lần
  const BATCH_DELAY = 1000;  // Delay 1s giữa các batch
  
  Logger.log('=== BATCH IMPORT EMPLOYEES ===');
  Logger.log(`Batch size: ${BATCH_SIZE}`);
  Logger.log(`Batch delay: ${BATCH_DELAY}ms`);
  
  try {
    // Get all employees
    const employees = getNhanVien();
    Logger.log(`Total employees: ${employees.length}`);
    
    const totalBatches = Math.ceil(employees.length / BATCH_SIZE);
    Logger.log(`Total batches: ${totalBatches}\n`);
    
    let imported = 0;
    let failed = 0;
    
    for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
      const start = batchNum * BATCH_SIZE;
      const end = Math.min(start + BATCH_SIZE, employees.length);
      const batch = employees.slice(start, end);
      
      Logger.log(`\n--- Batch ${batchNum + 1}/${totalBatches} (${start + 1}-${end}) ---`);
      
      for (let i = 0; i < batch.length; i++) {
        const employee = batch[i];
        
        try {
          const payload = {
            Action: 'Employee_Add',
            ...employee
          };
          
          sendToBackendAPI(payload);
          Logger.log(`  ✓ ${employee.maNhanVien}: ${employee.hoVaTen}`);
          imported++;
          
          Utilities.sleep(100);  // Small delay between records
          
        } catch (error) {
          Logger.log(`  ✗ ${employee.maNhanVien}: ${error.message}`);
          failed++;
        }
      }
      
      // Delay between batches
      if (batchNum < totalBatches - 1) {
        Logger.log(`Waiting ${BATCH_DELAY}ms before next batch...`);
        Utilities.sleep(BATCH_DELAY);
      }
    }
    
    Logger.log('\n=== BATCH IMPORT COMPLETE ===');
    Logger.log(`Total: ${employees.length}`);
    Logger.log(`✓ Imported: ${imported}`);
    Logger.log(`✗ Failed: ${failed}`);
    
  } catch (error) {
    Logger.log('❌ Batch import failed: ' + error.message);
    Logger.log(error.stack);
  }
}