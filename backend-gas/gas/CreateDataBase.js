/**
 * Google Apps Script - Create JSON Database in Google Sheets
 * Đọc dữ liệu từ VEHICLE_SPREADSHEET và ghi vào SPREADSHEET dạng JSON
 *
 * UPDATED: Cấu trúc JSON đơn giản hóa theo yêu cầu mới
 *
 * HƯỚNG DẪN:
 * 1. Mở Google Sheets: https://docs.google.com/spreadsheets/d/18pS9YMZSwZCVBt_anIGn3GN4qFoPpMtALQm4YvMDd-g
 * 2. Extensions → Apps Script
 * 3. Copy code này vào
 * 4. Chạy function: createJsonDatabase()
 */

// ============================================================
// CẤU HÌNH
// ============================================================
const CONFIG = {
  // Spreadsheet chứa dữ liệu gốc
  VEHICLE_SPREADSHEET_ID: '1fzepYrS-o5zc01h7nQFzJSOwagoTvOgoiDQHrTLB12E',
  SHEET_CHUYEN_DI: 'chuyen_di',
  SHEET_CHI_TIET: 'chi_tiet_chuyen_di',

  // Spreadsheet đích (để ghi dữ liệu JSON)
  TARGET_SPREADSHEET_ID: '18pS9YMZSwZCVBt_anIGn3GN4qFoPpMtALQm4YvMDd-g',
  TARGET_SHEET_NAME: 'data_chuyen_di',

  // Batch size cho xử lý
  BATCH_SIZE: 500
};

/**
 * Main Function - Tạo database JSON trong Google Sheets
 */
function createJsonDatabase() {
  try {
    Logger.log('🚀 Starting JSON Database Creation...');
    Logger.log('📊 Source: ' + CONFIG.VEHICLE_SPREADSHEET_ID);
    Logger.log('📊 Target: ' + CONFIG.TARGET_SPREADSHEET_ID);

    // 1. Đọc dữ liệu từ source spreadsheet
    const sourceData = readSourceData();
    Logger.log(`✅ Loaded ${sourceData.chuyenDi.data.length} chuyến đi, ${sourceData.chiTiet.data.length} chi tiết`);

    // 2. Transform thành JSON structure
    const jsonRecords = transformToJsonStructure(sourceData);
    Logger.log(`✅ Transformed ${jsonRecords.length} records`);

    // 3. Ghi vào target spreadsheet
    writeToTargetSheet(jsonRecords);

    Logger.log('');
    Logger.log('✅ ============================================');
    Logger.log('✅ DATABASE CREATED SUCCESSFULLY!');
    Logger.log('✅ ============================================');
    Logger.log(`📦 Total records: ${jsonRecords.length}`);
    Logger.log(`📄 Sheet: ${CONFIG.TARGET_SHEET_NAME}`);
    Logger.log(`📁 Spreadsheet: ${CONFIG.TARGET_SPREADSHEET_ID}`);

    // Show success message
    SpreadsheetApp.getUi().alert(
      'Thành công!',
      `Đã tạo database với ${jsonRecords.length} records trong sheet "${CONFIG.TARGET_SHEET_NAME}"`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );

    return {
      success: true,
      recordCount: jsonRecords.length
    };

  } catch (error) {
    Logger.log('❌ ERROR: ' + error.toString());
    Logger.log('Stack: ' + error.stack);

    SpreadsheetApp.getUi().alert(
      'Lỗi!',
      error.toString(),
      SpreadsheetApp.getUi().ButtonSet.OK
    );

    throw error;
  }
}

/**
 * Đọc dữ liệu từ source spreadsheet
 */
function readSourceData() {
  Logger.log('📖 Reading source data...');

  const ss = SpreadsheetApp.openById(CONFIG.VEHICLE_SPREADSHEET_ID);

  // Đọc sheet chuyen_di
  const sheetChuyenDi = ss.getSheetByName(CONFIG.SHEET_CHUYEN_DI);
  if (!sheetChuyenDi) {
    throw new Error(`Không tìm thấy sheet "${CONFIG.SHEET_CHUYEN_DI}"`);
  }

  // Đọc sheet chi_tiet_chuyen_di
  const sheetChiTiet = ss.getSheetByName(CONFIG.SHEET_CHI_TIET);
  if (!sheetChiTiet) {
    throw new Error(`Không tìm thấy sheet "${CONFIG.SHEET_CHI_TIET}"`);
  }

  const dataChuyenDi = sheetChuyenDi.getDataRange().getValues();
  const headersChuyenDi = dataChuyenDi[0];

  const dataChiTiet = sheetChiTiet.getDataRange().getValues();
  const headersChiTiet = dataChiTiet[0];

  Logger.log(`   Chuyến đi: ${dataChuyenDi.length - 1} rows, ${headersChuyenDi.length} columns`);
  Logger.log(`   Chi tiết: ${dataChiTiet.length - 1} rows, ${headersChiTiet.length} columns`);

  return {
    chuyenDi: { headers: headersChuyenDi, data: dataChuyenDi.slice(1) },
    chiTiet: { headers: headersChiTiet, data: dataChiTiet.slice(1) }
  };
}

/**
 * Transform dữ liệu sang JSON structure (UPDATED)
 */
function transformToJsonStructure(sourceData) {
  Logger.log('🔄 Transforming to JSON structure...');

  const { chuyenDi, chiTiet } = sourceData;

  // Build index map cho cột
  const chuyenDiMap = buildColumnMap(chuyenDi.headers);
  const chiTietMap = buildColumnMap(chiTiet.headers);

  // Build chi tiết theo mã chuyến đi
  const chiTietByMaChuyenDi = buildChiTietMap(chiTiet.data, chiTietMap);

  Logger.log(`   Mapped chi tiết for ${Object.keys(chiTietByMaChuyenDi).length} trips`);

  // Transform từng chuyến đi
  const records = [];

  for (let i = 0; i < chuyenDi.data.length; i++) {
    const row = chuyenDi.data[i];
    const maChuyenDi = row[chuyenDiMap.ma_chuyen_di];

    if (!maChuyenDi || maChuyenDi === '') {
      Logger.log(`   ⚠️  Skip row ${i + 2}: empty ma_chuyen_di`);
      continue;
    }

    // Build JSON record với cấu trúc mới
    const record = buildJsonRecord(row, chuyenDiMap, chiTietByMaChuyenDi[maChuyenDi] || [], chiTietMap);
    records.push(record);
  }

  return records;
}

/**
 * Build column index map
 */
function buildColumnMap(headers) {
  const map = {};
  for (let i = 0; i < headers.length; i++) {
    const normalized = normalizeColumnName(headers[i]);
    map[normalized] = i;
  }
  return map;
}

/**
 * Normalize column name
 */
function normalizeColumnName(name) {
  if (!name) return '';
  return String(name)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a')
    .replace(/[èéẹẻẽêềếệểễ]/g, 'e')
    .replace(/[ìíịỉĩ]/g, 'i')
    .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o')
    .replace(/[ùúụủũưừứựửữ]/g, 'u')
    .replace(/[ỳýỵỷỹ]/g, 'y')
    .replace(/đ/g, 'd')
    .replace(/[^\w]/g, '_');
}

/**
 * Build chi tiết map by ma_chuyen_di
 */
function buildChiTietMap(data, colMap) {
  const map = {};
  const maChuyenDiIdx = colMap.ma_chuyen_di;

  if (maChuyenDiIdx === undefined) {
    throw new Error('Không tìm thấy cột ma_chuyen_di trong sheet chi_tiet_chuyen_di');
  }

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const maChuyenDi = row[maChuyenDiIdx];

    if (!maChuyenDi || maChuyenDi === '') continue;

    if (!map[maChuyenDi]) {
      map[maChuyenDi] = [];
    }

    map[maChuyenDi].push(row);
  }

  return map;
}

/**
 * Build JSON record theo cấu trúc mới
 */
function buildJsonRecord(chuyenDiRow, chuyenDiMap, chiTietRows, chiTietMap) {
  // Extract main fields (flat structure)
  const record = {
    maChuyenDi: getValue(chuyenDiRow, chuyenDiMap.ma_chuyen_di),
    ngayTao: formatDate(getValue(chuyenDiRow, chuyenDiMap.ngay_tao)),
    tenKhachHang: getValue(chuyenDiRow, chuyenDiMap.ten_khach_hang),
    loaiChuyen: getValue(chuyenDiRow, chuyenDiMap.loai_chuyen),
    loaiTuyen: getValue(chuyenDiRow, chuyenDiMap.loai_tuyen),
    tenTuyen: getValue(chuyenDiRow, chuyenDiMap.ten_tuyen),
    tenTaiXe: getValue(chuyenDiRow, chuyenDiMap.ten_tai_xe),
    donViVanChuyen: getValue(chuyenDiRow, chuyenDiMap.don_vi_van_chuyen),
    trangThai: getValue(chuyenDiRow, chuyenDiMap.trang_thai_chuyen_di),
    tongQuangDuong: parseFloat(getValue(chuyenDiRow, chuyenDiMap.so_km_theo_odo)) || 0,
    tongDoanhThu: parseFloat(getValue(chuyenDiRow, chuyenDiMap.doanh_thu)) || 0,

    // Nested data structure (simplified)
    data: {
      thongTinChuyenDi: {
        soXe: getValue(chuyenDiRow, chuyenDiMap.bien_kiem_soat),
        khCap1: getValue(chuyenDiRow, chuyenDiMap.ten_khach_hang_cap_1)
      },
      chiTietLoTrinh: []
    }
  };

  // Build chi tiết lộ trình từ chi tiết rows
  if (chiTietRows && chiTietRows.length > 0) {
    record.data.chiTietLoTrinh = buildChiTietLoTrinh(chiTietRows, chiTietMap);
  }

  return record;
}

/**
 * Build chi tiết lộ trình array (UPDATED)
 */
function buildChiTietLoTrinh(chiTietRows, colMap) {
  const chiTiet = [];

  for (let i = 0; i < chiTietRows.length; i++) {
    const row = chiTietRows[i];

    const item = {
      thuTu: i + 1,
      id: getValue(row, colMap.id) || getValue(row, 0),
      loaiTuyenKH: getValue(row, colMap.loai_tuyen_khach_hang),
      maTuyen: getValue(row, colMap.lo_trinh),
      loTrinh: getValue(row, colMap.lo_trinh_chi_tiet_theo_diem),
      maTem: getValue(row, colMap.ma_chuyen_di_kh),
      quangDuong: parseFloat(getValue(row, colMap.quang_duong)) || 0,
      taiTrong: parseFloat(getValue(row, colMap.tai_trong)) || 0,
      taiTrongTinhPhi: parseFloat(getValue(row, colMap.tai_trong_tinh_phi)) || 0,
      hinhThucTinhGia: getValue(row, colMap.hinh_thuc_tinh_gia),
      soChieu: parseInt(getValue(row, colMap.so_chieu)) || 0,
      donGia: parseFloat(getValue(row, colMap.don_gia)) || 0,
      thanhTien: parseFloat(getValue(row, colMap.ket_qua)) || 0
    };

    chiTiet.push(item);
  }

  return chiTiet;
}

/**
 * Get value from row with null handling
 */
function getValue(row, index) {
  if (index === undefined || index === null) return '';
  const value = row[index];
  return (value === null || value === undefined || value === '') ? '' : value;
}

/**
 * Format date to YYYY-MM-DD
 */
function formatDate(dateValue) {
  if (!dateValue) return '';

  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return '';

    return Utilities.formatDate(date, 'GMT+7', 'yyyy-MM-dd');
  } catch (e) {
    return '';
  }
}

/**
 * Ghi dữ liệu vào target spreadsheet
 */
function writeToTargetSheet(records) {
  Logger.log('📝 Writing to target sheet...');

  const ss = SpreadsheetApp.openById(CONFIG.TARGET_SPREADSHEET_ID);

  // Get or create target sheet
  let sheet = ss.getSheetByName(CONFIG.TARGET_SHEET_NAME);

  if (sheet) {
    // Clear existing data
    Logger.log('   Clearing existing data...');
    sheet.clear();
  } else {
    // Create new sheet
    Logger.log('   Creating new sheet...');
    sheet = ss.insertSheet(CONFIG.TARGET_SHEET_NAME);
  }

  // Write header row
  const headers = [
    'maChuyenDi',
    'ngayTao',
    'tenKhachHang',
    'loaiChuyen',
    'loaiTuyen',
    'tenTuyen',
    'tenTaiXe',
    'donViVanChuyen',
    'trangThai',
    'tongQuangDuong',
    'tongDoanhThu',
    'data_json'
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#4285f4').setFontColor('#ffffff');

  // Prepare data rows
  const rows = [];

  for (let i = 0; i < records.length; i++) {
    const record = records[i];

    rows.push([
      record.maChuyenDi,
      record.ngayTao,
      record.tenKhachHang,
      record.loaiChuyen,
      record.loaiTuyen,
      record.tenTuyen,
      record.tenTaiXe,
      record.donViVanChuyen,
      record.trangThai,
      record.tongQuangDuong,
      record.tongDoanhThu,
      JSON.stringify(record.data) // Store nested data as JSON string
    ]);

    // Progress indicator
    if ((i + 1) % 100 === 0) {
      Logger.log(`   Processed ${i + 1}/${records.length} records...`);
    }
  }

  // Write all data at once (more efficient)
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }

  // Format sheet
  sheet.autoResizeColumns(1, 11);
  sheet.setFrozenRows(1);

  Logger.log(`✅ Wrote ${rows.length} records to sheet`);
}

/**
 * Test function - Process only first 5 records
 */
function testCreateDatabase() {
  Logger.log('🧪 TEST MODE - Processing only 5 records...');

  try {
    const sourceData = readSourceData();

    // Limit to 5 records
    sourceData.chuyenDi.data = sourceData.chuyenDi.data.slice(0, 5);

    const jsonRecords = transformToJsonStructure(sourceData);

    Logger.log('📦 Sample records:');
    for (let i = 0; i < Math.min(2, jsonRecords.length); i++) {
      Logger.log('---Record ' + (i + 1) + '---');
      Logger.log(JSON.stringify(jsonRecords[i], null, 2));
    }

    writeToTargetSheet(jsonRecords);

    SpreadsheetApp.getUi().alert(
      'Test thành công!',
      `Đã tạo ${jsonRecords.length} test records. Check logs for details (View → Logs).`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );

  } catch (error) {
    Logger.log('❌ ERROR: ' + error.toString());
    Logger.log('Stack: ' + error.stack);

    SpreadsheetApp.getUi().alert(
      'Lỗi!',
      error.toString(),
      SpreadsheetApp.getUi().ButtonSet.OK
    );

    throw error;
  }
}
