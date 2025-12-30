/**
 * NAK Logistics - AppSheet to Next.js Sync Service v2.0
 * UPDATED: Match exact structure from CreateDataBase.js
 *
 * Architecture: AppSheet Bot → GAS → Next.js API
 * Purpose: Data validation, cleaning, and guaranteed valid JSON
 *
 * @author NAK Logistics Development Team
 * @version 2.0.1
 * @date 2024-12-30
 */

// ==================== CONFIGURATION ====================

const CONFIG = {
  // Spreadsheet Configuration
  MAIN_SPREADSHEET_ID: '1fzepYrS-o5zc01h7nQFzJSOwagoTvOgoiDQHrTLB12E', // VEHICLE_SPREADSHEET

  // Sheet Names (CRITICAL: Must match CreateDataBase.js)
  SHEET_CHUYEN_DI: 'chuyen_di',
  SHEET_CHI_TIET: 'chi_tiet_chuyen_di', // Full name with _chuyen_di

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

// Column Indexes (0-based) - UPDATED to match CreateDataBase.js column mapping
const COLUMNS = {
  CHUYEN_DI: {
    // CRITICAL: These names must match the normalized column names from CreateDataBase.js
    // Use normalizeColumnName() to convert: "Mã Chuyến Đi" → "ma_chuyen_di"
    MA_CHUYEN_DI: 0,           // ma_chuyen_di
    NGAY_TAO: 1,               // ngay_tao
    TEN_KHACH_HANG: 2,         // ten_khach_hang (NOT ten_khach_hang_cap_1)
    LOAI_CHUYEN: 3,            // loai_chuyen
    LOAI_TUYEN: 4,             // loai_tuyen
    TEN_TUYEN: 5,              // ten_tuyen
    TEN_TAI_XE: 6,             // ten_tai_xe
    DON_VI_VAN_CHUYEN: 7,      // don_vi_van_chuyen
    TRANG_THAI: 8,             // trang_thai_chuyen_di
    BIEN_KIEM_SOAT: 9,         // bien_kiem_soat (NOT bien_so_xe)
    SO_KM_THEO_ODO: 10,        // so_km_theo_odo (for tongQuangDuong)
    DOANH_THU: 11,             // doanh_thu (for tongDoanhThu)
    TEN_KHACH_HANG_CAP_1: 12   // ten_khach_hang_cap_1 (for khCap1)
  },
  CHI_TIET: {
    // CRITICAL: Match CreateDataBase.js chiTietMap structure
    MA_CHUYEN_DI_REF: 0,       // ma_chuyen_di (foreign key)
    ID: 1,                     // id
    LOAI_TUYEN_KHACH_HANG: 2,  // loai_tuyen_khach_hang
    LO_TRINH: 3,               // lo_trinh (maTuyen)
    LO_TRINH_CHI_TIET: 4,      // lo_trinh_chi_tiet_theo_diem
    MA_CHUYEN_DI_KH: 5,        // ma_chuyen_di_kh (maTem)
    QUANG_DUONG: 6,            // quang_duong
    TAI_TRONG: 7,              // tai_trong
    TAI_TRONG_TINH_PHI: 8,     // tai_trong_tinh_phi
    HINH_THUC_TINH_GIA: 9,     // hinh_thuc_tinh_gia
    SO_CHIEU: 10,              // so_chieu
    DON_GIA: 11,               // don_gia
    KET_QUA: 12,               // ket_qua (thanhTien)
    LOAI_CA: 13                // loai_ca
  }
};

// ==================== MAIN ENTRY POINT ====================

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

function buildDeletePayload(tripId) {
  log(`Building DELETE payload for: ${tripId}`);

  const payload = {
    Action: 'Delete',
    maChuyenDi: String(tripId)
  };

  log(`DELETE payload: ${JSON.stringify(payload)}`);
  return payload;
}

function buildUpsertPayload(tripId, eventType) {
  log(`Building ${eventType} payload for: ${tripId}`);

  // 1. Read data from sheets
  const tripData = readTripData(tripId);
  const chiTietData = readChiTietData(tripId);

  // 2. Clean and validate data
  const cleanedTrip = cleanTripData(tripData);
  const cleanedChiTiet = cleanChiTietArray(chiTietData);

  // 3. Build thongTinChuyenDi with aggregated data from chiTiet
  const thongTinChuyenDi = buildThongTinChuyenDi(cleanedTrip, cleanedChiTiet);

  // 4. Build final payload (MATCHING CreateDataBase.js structure)
  const payload = {
    Action: eventType,
    maChuyenDi: String(cleanedTrip.maChuyenDi),
    ngayTao: cleanedTrip.ngayTao,
    tenKhachHang: cleanedTrip.tenKhachHang,
    loaiChuyen: cleanedTrip.loaiChuyen,
    loaiTuyen: cleanedTrip.loaiTuyen,
    tenTuyen: cleanedTrip.tenTuyen,
    tenTaiXe: cleanedTrip.tenTaiXe,
    donViVanChuyen: cleanedTrip.donViVanChuyen,
    trangThai: cleanedTrip.trangThai,
    tongQuangDuong: cleanedTrip.tongQuangDuong,
    tongDoanhThu: cleanedTrip.tongDoanhThu,

    // Nested data structure (EXACTLY as CreateDataBase.js)
    data_json: {
      thongTinChuyenDi: thongTinChuyenDi,
      chiTietLoTrinh: cleanedChiTiet
    }
  };

  // 5. Validate final JSON
  validatePayloadJSON(payload);

  log(`${eventType} payload built successfully`);
  return payload;
}

// ==================== DATA READERS ====================

function readTripData(tripId) {
  log(`Reading trip data for: ${tripId}`);

  const ss = SpreadsheetApp.openById(CONFIG.MAIN_SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEET_CHUYEN_DI);

  if (!sheet) {
    throw new Error(`Sheet not found: ${CONFIG.SHEET_CHUYEN_DI}`);
  }

  const data = sheet.getDataRange().getValues();

  // Find row with matching tripId (skip header row)
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (String(row[COLUMNS.CHUYEN_DI.MA_CHUYEN_DI]) === String(tripId)) {
      log(`Found trip at row ${i + 1}`);

      // Return structure matching CreateDataBase.js buildJsonRecord()
      return {
        maChuyenDi: row[COLUMNS.CHUYEN_DI.MA_CHUYEN_DI],
        ngayTao: row[COLUMNS.CHUYEN_DI.NGAY_TAO],
        tenKhachHang: row[COLUMNS.CHUYEN_DI.TEN_KHACH_HANG],
        loaiChuyen: row[COLUMNS.CHUYEN_DI.LOAI_CHUYEN],
        loaiTuyen: row[COLUMNS.CHUYEN_DI.LOAI_TUYEN],
        tenTuyen: row[COLUMNS.CHUYEN_DI.TEN_TUYEN],
        tenTaiXe: row[COLUMNS.CHUYEN_DI.TEN_TAI_XE],
        donViVanChuyen: row[COLUMNS.CHUYEN_DI.DON_VI_VAN_CHUYEN],
        trangThai: row[COLUMNS.CHUYEN_DI.TRANG_THAI],
        bienKiemSoat: row[COLUMNS.CHUYEN_DI.BIEN_KIEM_SOAT],
        soKmTheoOdo: row[COLUMNS.CHUYEN_DI.SO_KM_THEO_ODO],
        doanhThu: row[COLUMNS.CHUYEN_DI.DOANH_THU],
        khCap1: row[COLUMNS.CHUYEN_DI.TEN_KHACH_HANG_CAP_1]
      };
    }
  }

  throw new Error(`Trip not found: ${tripId}`);
}

function readChiTietData(tripId) {
  log(`Reading chi tiet data for: ${tripId}`);

  const ss = SpreadsheetApp.openById(CONFIG.MAIN_SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEET_CHI_TIET);

  if (!sheet) {
    log(`Warning: Sheet not found: ${CONFIG.SHEET_CHI_TIET}, returning empty array`);
    return [];
  }

  const data = sheet.getDataRange().getValues();
  const chiTietArray = [];

  // Find all rows with matching reference (skip header)
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (String(row[COLUMNS.CHI_TIET.MA_CHUYEN_DI_REF]) === String(tripId)) {
      // Structure matching CreateDataBase.js buildChiTietLoTrinh()
      chiTietArray.push({
        thuTu: chiTietArray.length + 1,
        id: row[COLUMNS.CHI_TIET.ID],
        loaiTuyenKH: row[COLUMNS.CHI_TIET.LOAI_TUYEN_KHACH_HANG],
        maTuyen: row[COLUMNS.CHI_TIET.LO_TRINH],
        loTrinh: row[COLUMNS.CHI_TIET.LO_TRINH_CHI_TIET],
        maTem: row[COLUMNS.CHI_TIET.MA_CHUYEN_DI_KH],
        quangDuong: row[COLUMNS.CHI_TIET.QUANG_DUONG],
        taiTrong: row[COLUMNS.CHI_TIET.TAI_TRONG],
        taiTrongTinhPhi: row[COLUMNS.CHI_TIET.TAI_TRONG_TINH_PHI],
        hinhThucTinhGia: row[COLUMNS.CHI_TIET.HINH_THUC_TINH_GIA],
        soChieu: row[COLUMNS.CHI_TIET.SO_CHIEU],
        donGia: row[COLUMNS.CHI_TIET.DON_GIA],
        thanhTien: row[COLUMNS.CHI_TIET.KET_QUA],
        loaiCa: row[COLUMNS.CHI_TIET.LOAI_CA]
      });
    }
  }

  log(`Found ${chiTietArray.length} chi tiet records`);
  return chiTietArray;
}

// ==================== DATA CLEANING ====================

function cleanTripData(raw) {
  return {
    maChuyenDi: cleanString(raw.maChuyenDi),
    ngayTao: formatDate(raw.ngayTao),
    tenKhachHang: cleanString(raw.tenKhachHang),
    loaiChuyen: cleanString(raw.loaiChuyen),
    loaiTuyen: cleanString(raw.loaiTuyen),
    tenTuyen: cleanString(raw.tenTuyen),
    tenTaiXe: cleanString(raw.tenTaiXe),
    donViVanChuyen: cleanString(raw.donViVanChuyen),
    trangThai: normalizeStatus(raw.trangThai),
    bienKiemSoat: cleanString(raw.bienKiemSoat),
    tongQuangDuong: cleanNumber(raw.soKmTheoOdo), // From so_km_theo_odo
    tongDoanhThu: cleanNumber(raw.doanhThu),       // From doanh_thu
    khCap1: cleanString(raw.khCap1)
  };
}

function cleanChiTietArray(rawArray) {
  return rawArray.map((item, index) => {
    try {
      return {
        thuTu: index + 1,
        id: cleanString(item.id),
        loaiTuyenKH: cleanString(item.loaiTuyenKH),
        maTuyen: cleanString(item.maTuyen),
        loTrinh: cleanString(item.loTrinh),
        maTem: cleanString(item.maTem),
        quangDuong: cleanNumber(item.quangDuong),
        taiTrong: cleanNumber(item.taiTrong),
        taiTrongTinhPhi: cleanNumber(item.taiTrongTinhPhi),
        hinhThucTinhGia: cleanString(item.hinhThucTinhGia),
        soChieu: cleanNumber(item.soChieu),
        donGia: cleanNumber(item.donGia),
        thanhTien: cleanNumber(item.thanhTien),
        loaiCa: cleanString(item.loaiCa)
      };
    } catch (error) {
      logError(`Error cleaning chi tiet item ${index}`, error, item);
      // Return safe default
      return {
        thuTu: index + 1,
        id: '',
        loaiTuyenKH: '',
        maTuyen: '',
        loTrinh: '',
        maTem: '',
        quangDuong: 0,
        taiTrong: 0,
        taiTrongTinhPhi: 0,
        hinhThucTinhGia: '',
        soChieu: 0,
        donGia: 0,
        thanhTien: 0,
        loaiCa: ''
      };
    }
  });
}

/**
 * Build thongTinChuyenDi with aggregated data from chiTiet
 * EXACTLY matching CreateDataBase.js logic (lines 253-282)
 */
function buildThongTinChuyenDi(cleanedTrip, chiTietArray) {
  const thongTin = {
    soXe: cleanedTrip.bienKiemSoat,
    khCap1: cleanedTrip.khCap1,
    bienKiemSoat: cleanedTrip.bienKiemSoat,
    taiTrong: 0,
    quangDuong: 0,
    soChieu: 0,
    donGia: 0,
    loaiCa: '',
    taiTrongTinhPhi: 0,
    hinhThucTinhGia: ''
  };

  // Aggregate values from chiTiet array (matching CreateDataBase.js lines 256-282)
  if (chiTietArray && chiTietArray.length > 0) {
    let tongTaiTrong = 0;
    let tongQuangDuong = 0;
    let tongSoChieu = 0;
    let tongTaiTrongTinhPhi = 0;

    for (let i = 0; i < chiTietArray.length; i++) {
      const item = chiTietArray[i];
      tongTaiTrong += item.taiTrong;
      tongQuangDuong += item.quangDuong;
      tongSoChieu += item.soChieu;
      tongTaiTrongTinhPhi += item.taiTrongTinhPhi;

      // Take values from first record (matching CreateDataBase.js line 270-274)
      if (i === 0) {
        thongTin.donGia = item.donGia;
        thongTin.loaiCa = item.loaiCa;
        thongTin.hinhThucTinhGia = item.hinhThucTinhGia;
      }
    }

    // Update aggregated values
    thongTin.taiTrong = tongTaiTrong;
    thongTin.quangDuong = tongQuangDuong;
    thongTin.soChieu = tongSoChieu;
    thongTin.taiTrongTinhPhi = tongTaiTrongTinhPhi;
  }

  return thongTin;
}

// ==================== DATA TYPE CONVERTERS ====================

function cleanString(value) {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  return String(value).trim();
}

function cleanNumber(value) {
  if (value === null || value === undefined || value === '') {
    return 0;
  }

  if (typeof value === 'number') {
    return isNaN(value) ? 0 : value;
  }

  const str = String(value).replace(/[^0-9.-]/g, '');
  const num = parseFloat(str);

  return isNaN(num) ? 0 : num;
}

function formatDate(value) {
  if (!value) {
    return new Date().toISOString().split('T')[0];
  }

  if (value instanceof Date) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }

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

  return new Date().toISOString().split('T')[0];
}

function normalizeStatus(value) {
  if (!value) return 'new';

  const status = String(value).toLowerCase().trim();

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

  if (statusMap[status]) {
    return statusMap[status];
  }

  for (const key in statusMap) {
    if (status.includes(key)) {
      return statusMap[key];
    }
  }

  return 'pending';
}

// ==================== JSON VALIDATION ====================

function validatePayloadJSON(payload) {
  try {
    const jsonString = JSON.stringify(payload);
    const parsed = JSON.parse(jsonString);

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

function sendToBackend(payload) {
  const options = {
    method: 'post',
    contentType: 'application/json; charset=utf-8',
    headers: {
      'x-api-key': CONFIG.API_SECRET_KEY
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  log(`POST ${CONFIG.BACKEND_API_URL}`);
  log(`Payload: ${options.payload}`);

  const response = UrlFetchApp.fetch(CONFIG.BACKEND_API_URL, options);
  const statusCode = response.getResponseCode();
  const responseText = response.getContentText();

  log(`Response Status: ${statusCode}`);
  log(`Response Body: ${responseText}`);

  let responseData;
  try {
    responseData = JSON.parse(responseText);
  } catch (e) {
    responseData = { raw: responseText };
  }

  if (statusCode < 200 || statusCode >= 300) {
    throw new Error(`HTTP ${statusCode}: ${responseText}`);
  }

  return responseData;
}

// ==================== LOGGING UTILITIES ====================

function log(message) {
  if (CONFIG.DEBUG_MODE) {
    const timestamp = new Date().toISOString();
    Logger.log(`${CONFIG.LOG_PREFIX} [${timestamp}] ${message}`);
  }
}

function logError(message, error, context = {}) {
  const timestamp = new Date().toISOString();
  Logger.log(`${CONFIG.LOG_PREFIX} [${timestamp}] ERROR: ${message}`);
  Logger.log(`Error Message: ${error.message}`);
  Logger.log(`Error Stack: ${error.stack}`);
  Logger.log(`Context: ${JSON.stringify(context)}`);
}

// ==================== TESTING UTILITIES ====================

function testSyncAdd() {
  const result = syncTripToBackend('TEST_ADD_001', 'Add');
  Logger.log('Test Result: ' + JSON.stringify(result, null, 2));
}

function testSyncEdit() {
  const result = syncTripToBackend('TEST_EDIT_001', 'Edit');
  Logger.log('Test Result: ' + JSON.stringify(result, null, 2));
}

function testSyncDelete() {
  const result = syncTripToBackend('TEST_DELETE_001', 'Delete');
  Logger.log('Test Result: ' + JSON.stringify(result, null, 2));
}

function testDataCleaning() {
  Logger.log('=== Testing Data Cleaning ===');
  Logger.log('cleanNumber(null): ' + cleanNumber(null));
  Logger.log('cleanNumber(""): ' + cleanNumber(''));
  Logger.log('cleanNumber("123.45"): ' + cleanNumber('123.45'));
  Logger.log('formatDate("25/12/2024"): ' + formatDate('25/12/2024'));
  Logger.log('normalizeStatus("Hoàn tất"): ' + normalizeStatus('Hoàn tất'));
}
