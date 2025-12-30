/**
 * NAK Logistics - AppSheet to Next.js Sync Service v2.0
 *
 * Architecture: AppSheet Bot → GAS → Next.js API
 * Purpose: Data validation, cleaning, and guaranteed valid JSON
 *
 * @author NAK Logistics Development Team
 * @version 2.0.0
 * @date 2024-12-30
 */

// ==================== CONFIGURATION ====================

/**
 * Configuration object - MUST be updated for your environment
 */
const CONFIG = {
  // Spreadsheet IDs
  MAIN_SPREADSHEET_ID: '18pS9YMZSwZCVBt_anIGn3GN4qFoPpMtALQm4YvMDd-g',

  // Sheet Names
  SHEET_CHUYEN_DI: 'chuyen_di',
  SHEET_CHI_TIET: 'chi_tiet_lo_trinh',

  // API Configuration
  BACKEND_API_URL: 'https://your-app.vercel.app/api/webhook/appsheet',
  API_SECRET_KEY: 'your-secret-key-here', // TODO: Move to Script Properties

  // Retry Configuration
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000,

  // Logging
  DEBUG_MODE: true,
  LOG_PREFIX: '[GAS_SYNC_V2]'
};

// Column Indexes (0-based) - Update based on your actual sheet structure
const COLUMNS = {
  CHUYEN_DI: {
    MA_CHUYEN_DI: 0,      // A: Primary Key
    NGAY_TAO: 1,          // B: Date
    BIEN_SO_XE: 2,        // C: License Plate
    TEN_TAI_XE: 3,        // D: Driver Name
    TEN_KHACH_HANG: 4,    // E: Customer
    DON_VI_VAN_CHUYEN: 5, // F: Provider (NAK/VENDOR)
    LOAI_CHUYEN: 6,       // G: Trip Type
    LOAI_TUYEN: 7,        // H: Route Type
    TEN_TUYEN: 8,         // I: Route Name
    TONG_QUANG_DUONG: 9,  // J: Total Distance
    TONG_DOANH_THU: 10,   // K: Total Revenue
    TRONG_LUONG: 11,      // L: Weight
    TRANG_THAI: 12        // M: Status
  },
  CHI_TIET: {
    MA_CHUYEN_DI_REF: 0,  // A: Foreign Key reference
    DIEM_DI: 1,           // B: From
    DIEM_DEN: 2,          // C: To
    KHOANG_CACH: 3,       // D: Distance
    TAI_TRONG: 4,         // E: Weight
    DOANH_THU: 5          // F: Revenue
  }
};

// ==================== MAIN ENTRY POINT ====================

/**
 * Main sync function called by AppSheet Automation
 *
 * @param {string} tripId - Primary key of the trip (maChuyenDi)
 * @param {string} eventType - Event type: "Add", "Edit", or "Delete"
 * @returns {Object} Sync result with success status and details
 */
function syncTripToBackend(tripId, eventType) {
  const startTime = new Date();
  log(`========== SYNC START ==========`);
  log(`Trip ID: ${tripId}`);
  log(`Event Type: ${eventType}`);

  try {
    // 1. Validate inputs
    validateInputs(tripId, eventType);

    // 2. Build payload based on event type
    let payload;
    if (eventType === 'Delete') {
      payload = buildDeletePayload(tripId);
    } else {
      payload = buildUpsertPayload(tripId, eventType);
    }

    // 3. Send to backend with retry logic
    const response = sendToBackendWithRetry(payload);

    // 4. Log success
    const duration = new Date() - startTime;
    log(`Sync successful in ${duration}ms`);
    log(`Response: ${JSON.stringify(response)}`);
    log(`========== SYNC END ==========`);

    return {
      success: true,
      tripId: tripId,
      eventType: eventType,
      duration: duration,
      response: response
    };

  } catch (error) {
    // Log error with full context
    logError('Sync failed', error, { tripId, eventType });

    return {
      success: false,
      tripId: tripId,
      eventType: eventType,
      error: error.message,
      stack: error.stack
    };
  }
}

// ==================== INPUT VALIDATION ====================

/**
 * Validate input parameters
 * @throws {Error} if validation fails
 */
function validateInputs(tripId, eventType) {
  if (!tripId || String(tripId).trim() === '') {
    throw new Error('tripId cannot be empty');
  }

  const validEventTypes = ['Add', 'Edit', 'Delete'];
  if (!validEventTypes.includes(eventType)) {
    throw new Error(`Invalid eventType: ${eventType}. Must be one of: ${validEventTypes.join(', ')}`);
  }

  log(`Input validation passed`);
}

// ==================== PAYLOAD BUILDERS ====================

/**
 * Build DELETE payload (no need to read from sheet)
 */
function buildDeletePayload(tripId) {
  log(`Building DELETE payload for: ${tripId}`);

  const payload = {
    Action: 'Delete',
    maChuyenDi: String(tripId)
  };

  log(`DELETE payload: ${JSON.stringify(payload)}`);
  return payload;
}

/**
 * Build UPSERT payload (Add/Edit) with data validation and cleaning
 */
function buildUpsertPayload(tripId, eventType) {
  log(`Building ${eventType} payload for: ${tripId}`);

  // 1. Read data from sheets
  const tripData = readTripData(tripId);
  const chiTietData = readChiTietData(tripId);

  // 2. Clean and validate data
  const cleanedTrip = cleanTripData(tripData);
  const cleanedChiTiet = cleanChiTietArray(chiTietData);

  // 3. Build final payload
  const payload = {
    Action: eventType,
    maChuyenDi: String(cleanedTrip.maChuyenDi),
    ngayTao: cleanedTrip.ngayTao,
    bienSoXe: cleanedTrip.bienSoXe,
    tenTaiXe: cleanedTrip.tenTaiXe,
    tenKhachHang: cleanedTrip.tenKhachHang,
    donViVanChuyen: cleanedTrip.donViVanChuyen,
    loaiChuyen: cleanedTrip.loaiChuyen,
    loaiTuyen: cleanedTrip.loaiTuyen,
    tenTuyen: cleanedTrip.tenTuyen,
    tongQuangDuong: cleanedTrip.tongQuangDuong,
    tongDoanhThu: cleanedTrip.tongDoanhThu,
    trongLuong: cleanedTrip.trongLuong,
    trangThai: cleanedTrip.trangThai,
    data_json: {
      thongTinChuyenDi: {
        bienSoXe: cleanedTrip.bienSoXe,
        tenTaiXe: cleanedTrip.tenTaiXe,
        loaiXe: cleanedTrip.loaiXe || 'Standard',
        taiTrong: cleanedTrip.trongLuong
      },
      chiTietLoTrinh: cleanedChiTiet
    }
  };

  // 4. Validate final JSON
  validatePayloadJSON(payload);

  log(`${eventType} payload built successfully`);
  return payload;
}

// ==================== DATA READERS ====================

/**
 * Read trip data from ChuyenDi sheet
 * @returns {Object} Raw trip data
 * @throws {Error} if trip not found
 */
function readTripData(tripId) {
  log(`Reading trip data for: ${tripId}`);

  const ss = SpreadsheetApp.openById(CONFIG.MAIN_SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEET_CHUYEN_DI);

  if (!sheet) {
    throw new Error(`Sheet not found: ${CONFIG.SHEET_CHUYEN_DI}`);
  }

  // Get all data at once (batch read - more efficient)
  const data = sheet.getDataRange().getValues();

  // Find row with matching tripId (skip header row)
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (String(row[COLUMNS.CHUYEN_DI.MA_CHUYEN_DI]) === String(tripId)) {
      log(`Found trip at row ${i + 1}`);

      return {
        maChuyenDi: row[COLUMNS.CHUYEN_DI.MA_CHUYEN_DI],
        ngayTao: row[COLUMNS.CHUYEN_DI.NGAY_TAO],
        bienSoXe: row[COLUMNS.CHUYEN_DI.BIEN_SO_XE],
        tenTaiXe: row[COLUMNS.CHUYEN_DI.TEN_TAI_XE],
        tenKhachHang: row[COLUMNS.CHUYEN_DI.TEN_KHACH_HANG],
        donViVanChuyen: row[COLUMNS.CHUYEN_DI.DON_VI_VAN_CHUYEN],
        loaiChuyen: row[COLUMNS.CHUYEN_DI.LOAI_CHUYEN],
        loaiTuyen: row[COLUMNS.CHUYEN_DI.LOAI_TUYEN],
        tenTuyen: row[COLUMNS.CHUYEN_DI.TEN_TUYEN],
        tongQuangDuong: row[COLUMNS.CHUYEN_DI.TONG_QUANG_DUONG],
        tongDoanhThu: row[COLUMNS.CHUYEN_DI.TONG_DOANH_THU],
        trongLuong: row[COLUMNS.CHUYEN_DI.TRONG_LUONG],
        trangThai: row[COLUMNS.CHUYEN_DI.TRANG_THAI]
      };
    }
  }

  throw new Error(`Trip not found: ${tripId}`);
}

/**
 * Read chi tiet lo trinh data
 * @returns {Array} Array of route detail objects (can be empty)
 */
function readChiTietData(tripId) {
  log(`Reading chi tiet data for: ${tripId}`);

  const ss = SpreadsheetApp.openById(CONFIG.MAIN_SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEET_CHI_TIET);

  if (!sheet) {
    log(`Warning: Sheet not found: ${CONFIG.SHEET_CHI_TIET}, returning empty array`);
    return [];
  }

  // Batch read
  const data = sheet.getDataRange().getValues();
  const chiTietArray = [];

  // Find all rows with matching reference (skip header)
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (String(row[COLUMNS.CHI_TIET.MA_CHUYEN_DI_REF]) === String(tripId)) {
      chiTietArray.push({
        diemDi: row[COLUMNS.CHI_TIET.DIEM_DI],
        diemDen: row[COLUMNS.CHI_TIET.DIEM_DEN],
        khoangCach: row[COLUMNS.CHI_TIET.KHOANG_CACH],
        taiTrong: row[COLUMNS.CHI_TIET.TAI_TRONG],
        doanhThu: row[COLUMNS.CHI_TIET.DOANH_THU]
      });
    }
  }

  log(`Found ${chiTietArray.length} chi tiet records`);
  return chiTietArray;
}

// ==================== DATA CLEANING ====================

/**
 * Clean trip data with type conversion and validation
 */
function cleanTripData(raw) {
  return {
    maChuyenDi: cleanString(raw.maChuyenDi),
    ngayTao: formatDate(raw.ngayTao),
    bienSoXe: cleanString(raw.bienSoXe),
    tenTaiXe: cleanString(raw.tenTaiXe),
    tenKhachHang: cleanString(raw.tenKhachHang),
    donViVanChuyen: cleanString(raw.donViVanChuyen),
    loaiChuyen: cleanString(raw.loaiChuyen),
    loaiTuyen: cleanString(raw.loaiTuyen),
    tenTuyen: cleanString(raw.tenTuyen),
    tongQuangDuong: cleanNumber(raw.tongQuangDuong),
    tongDoanhThu: cleanNumber(raw.tongDoanhThu),
    trongLuong: cleanNumber(raw.trongLuong),
    trangThai: normalizeStatus(raw.trangThai)
  };
}

/**
 * Clean chi tiet array
 */
function cleanChiTietArray(rawArray) {
  return rawArray.map((item, index) => {
    try {
      return {
        diemDi: cleanString(item.diemDi),
        diemDen: cleanString(item.diemDen),
        khoangCach: cleanNumber(item.khoangCach),
        taiTrong: cleanNumber(item.taiTrong),
        doanhThu: cleanNumber(item.doanhThu)
      };
    } catch (error) {
      logError(`Error cleaning chi tiet item ${index}`, error, item);
      // Return safe default instead of throwing
      return {
        diemDi: '',
        diemDen: '',
        khoangCach: 0,
        taiTrong: 0,
        doanhThu: 0
      };
    }
  });
}

// ==================== DATA TYPE CONVERTERS ====================

/**
 * Clean string value - handle null, undefined, empty
 */
function cleanString(value) {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  return String(value).trim();
}

/**
 * Clean number value - CRITICAL: Never return null
 * @returns {number} Always returns a number (0 if invalid)
 */
function cleanNumber(value) {
  // Handle null, undefined, empty string
  if (value === null || value === undefined || value === '') {
    return 0;
  }

  // If already a number
  if (typeof value === 'number') {
    return isNaN(value) ? 0 : value;
  }

  // Convert string to number
  const str = String(value).replace(/[^0-9.-]/g, ''); // Remove non-numeric chars
  const num = parseFloat(str);

  return isNaN(num) ? 0 : num;
}

/**
 * Format date to YYYY-MM-DD
 * @returns {string} Date in YYYY-MM-DD format
 */
function formatDate(value) {
  if (!value) {
    return new Date().toISOString().split('T')[0];
  }

  // If already a Date object
  if (value instanceof Date) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }

  // If string, try to parse
  const str = String(value).trim();

  // Already in YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // DD/MM/YYYY format
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    const parts = str.split('/');
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }

  // Try parsing as date
  try {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    }
  } catch (e) {
    // Fall through to default
  }

  // Default to today
  return new Date().toISOString().split('T')[0];
}

/**
 * Normalize Vietnamese status to English enum
 * CRITICAL: This mapping must match backend expectations
 */
function normalizeStatus(value) {
  if (!value) return 'new';

  const status = String(value).toLowerCase().trim();

  // Mapping table
  const statusMap = {
    'khởi tạo': 'draft',
    'draft': 'draft',
    'mới': 'new',
    'new': 'new',
    'chờ giao': 'pending_delivery',
    'chờ': 'pending_delivery',
    'pending': 'pending_delivery',
    'đang giao': 'in_progress',
    'delivery': 'in_progress',
    'in_progress': 'in_progress',
    'kết thúc': 'completed',
    'finished': 'completed',
    'completed': 'completed',
    'hoàn tất': 'approved',
    'đã duyệt': 'approved',
    'approved': 'approved',
    'huỷ': 'rejected',
    'rejected': 'rejected',
    'cancel': 'rejected'
  };

  // Find exact match
  if (statusMap[status]) {
    return statusMap[status];
  }

  // Find partial match
  for (const key in statusMap) {
    if (status.includes(key)) {
      return statusMap[key];
    }
  }

  // Default
  return 'pending';
}

// ==================== JSON VALIDATION ====================

/**
 * Validate that payload is valid JSON
 * @throws {Error} if JSON is invalid
 */
function validatePayloadJSON(payload) {
  try {
    // Try to serialize and deserialize
    const jsonString = JSON.stringify(payload);
    const parsed = JSON.parse(jsonString);

    // Check for required fields
    if (!parsed.Action) {
      throw new Error('Missing required field: Action');
    }
    if (!parsed.maChuyenDi) {
      throw new Error('Missing required field: maChuyenDi');
    }

    log('Payload JSON validation passed');
    log(`Payload size: ${jsonString.length} bytes`);

  } catch (error) {
    throw new Error(`Invalid JSON payload: ${error.message}`);
  }
}

// ==================== HTTP REQUEST ====================

/**
 * Send payload to backend with retry logic
 */
function sendToBackendWithRetry(payload) {
  let lastError;

  for (let attempt = 1; attempt <= CONFIG.MAX_RETRIES; attempt++) {
    try {
      log(`Attempt ${attempt}/${CONFIG.MAX_RETRIES}: Sending to backend...`);

      const response = sendToBackend(payload);

      log(`Success on attempt ${attempt}`);
      return response;

    } catch (error) {
      lastError = error;
      logError(`Attempt ${attempt} failed`, error);

      if (attempt < CONFIG.MAX_RETRIES) {
        log(`Retrying in ${CONFIG.RETRY_DELAY_MS}ms...`);
        Utilities.sleep(CONFIG.RETRY_DELAY_MS);
      }
    }
  }

  throw new Error(`Failed after ${CONFIG.MAX_RETRIES} attempts: ${lastError.message}`);
}

/**
 * Send HTTP POST request to backend
 */
function sendToBackend(payload) {
  const options = {
    method: 'post',
    contentType: 'application/json; charset=utf-8',
    headers: {
      'x-api-key': CONFIG.API_SECRET_KEY
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true // Don't throw on non-2xx status codes
  };

  log(`POST ${CONFIG.BACKEND_API_URL}`);
  log(`Headers: ${JSON.stringify(options.headers)}`);
  log(`Payload: ${options.payload}`);

  const response = UrlFetchApp.fetch(CONFIG.BACKEND_API_URL, options);
  const statusCode = response.getResponseCode();
  const responseText = response.getContentText();

  log(`Response Status: ${statusCode}`);
  log(`Response Body: ${responseText}`);

  // Parse response
  let responseData;
  try {
    responseData = JSON.parse(responseText);
  } catch (e) {
    responseData = { raw: responseText };
  }

  // Check status code
  if (statusCode < 200 || statusCode >= 300) {
    throw new Error(`HTTP ${statusCode}: ${responseText}`);
  }

  return responseData;
}

// ==================== LOGGING UTILITIES ====================

/**
 * Log message with prefix
 */
function log(message) {
  if (CONFIG.DEBUG_MODE) {
    const timestamp = new Date().toISOString();
    Logger.log(`${CONFIG.LOG_PREFIX} [${timestamp}] ${message}`);
  }
}

/**
 * Log error with context
 */
function logError(message, error, context = {}) {
  const timestamp = new Date().toISOString();
  Logger.log(`${CONFIG.LOG_PREFIX} [${timestamp}] ERROR: ${message}`);
  Logger.log(`Error Message: ${error.message}`);
  Logger.log(`Error Stack: ${error.stack}`);
  Logger.log(`Context: ${JSON.stringify(context)}`);
}

// ==================== TESTING UTILITIES ====================

/**
 * Test function - Add event
 */
function testSyncAdd() {
  const result = syncTripToBackend('TEST_ADD_001', 'Add');
  Logger.log('Test Result: ' + JSON.stringify(result));
}

/**
 * Test function - Edit event
 */
function testSyncEdit() {
  const result = syncTripToBackend('TEST_EDIT_001', 'Edit');
  Logger.log('Test Result: ' + JSON.stringify(result));
}

/**
 * Test function - Delete event
 */
function testSyncDelete() {
  const result = syncTripToBackend('TEST_DELETE_001', 'Delete');
  Logger.log('Test Result: ' + JSON.stringify(result));
}

/**
 * Test data cleaning functions
 */
function testDataCleaning() {
  Logger.log('=== Testing Data Cleaning ===');

  // Test cleanNumber
  Logger.log('cleanNumber(null): ' + cleanNumber(null)); // Should be 0
  Logger.log('cleanNumber(""): ' + cleanNumber('')); // Should be 0
  Logger.log('cleanNumber("123.45"): ' + cleanNumber('123.45')); // Should be 123.45
  Logger.log('cleanNumber("1,234.56"): ' + cleanNumber('1,234.56')); // Should be 1234.56

  // Test formatDate
  Logger.log('formatDate("25/12/2024"): ' + formatDate('25/12/2024')); // Should be 2024-12-25
  Logger.log('formatDate("2024-12-25"): ' + formatDate('2024-12-25')); // Should be 2024-12-25
  Logger.log('formatDate(new Date()): ' + formatDate(new Date())); // Should be today

  // Test normalizeStatus
  Logger.log('normalizeStatus("Hoàn tất"): ' + normalizeStatus('Hoàn tất')); // Should be approved
  Logger.log('normalizeStatus("Mới"): ' + normalizeStatus('Mới')); // Should be new
  Logger.log('normalizeStatus("Huỷ"): ' + normalizeStatus('Huỷ')); // Should be rejected
}
