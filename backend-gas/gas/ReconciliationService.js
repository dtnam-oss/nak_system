/**
 * Reconciliation Service
 * Handles fetching reconciliation data from data_chuyen_di sheet
 */

/**
 * Get reconciliation data with optional filters
 * @param {Object} filters - Filter object
 * @param {string} filters.fromDate - Start date (YYYY-MM-DD)
 * @param {string} filters.toDate - End date (YYYY-MM-DD)
 * @param {string} filters.khachHang - Customer name (text search)
 * @param {string} filters.donViVanChuyen - Transport unit (NAK/VENDOR)
 * @param {string} filters.loaiTuyen - Route type
 * @param {string} filters.trangThai - Status
 * @param {string} filters.searchQuery - General search query
 * @returns {Object} Response with records and summary
 */
function getReconciliationData(filters) {
  try {
    Logger.log('📊 Getting reconciliation data with filters: ' + JSON.stringify(filters || {}));

    const ss = SpreadsheetApp.openById(Config.getSpreadsheetId());
    const sheet = ss.getSheetByName('data_chuyen_di');

    if (!sheet) {
      Logger.log('❌ Sheet data_chuyen_di not found');
      return {
        success: false,
        error: 'Sheet data_chuyen_di not found'
      };
    }

    const data = sheet.getDataRange().getValues();

    if (data.length <= 1) {
      Logger.log('⚠️ No data found (only headers)');
      return {
        success: true,
        data: {
          records: [],
          summary: {
            totalOrders: 0,
            totalAmount: 0,
            totalDistance: 0,
            approvedOrders: 0,
            pendingOrders: 0
          },
          total: 0
        }
      };
    }

    const headers = data[0];
    const rows = data.slice(1);

    // Build column index map
    const colMap = buildColumnIndexMap(headers);

    // Parse and filter records
    let records = rows.map((row, index) => {
      try {
        return parseReconciliationRecord(row, colMap);
      } catch (error) {
        Logger.log(`⚠️ Error parsing row ${index + 2}: ${error.message}`);
        return null;
      }
    }).filter(record => record !== null);

    // Apply filters
    if (filters) {
      records = applyReconciliationFilters(records, filters);
    }

    // Calculate summary
    const summary = calculateReconciliationSummary(records);

    Logger.log(`✅ Found ${records.length} records matching filters`);

    return {
      success: true,
      data: {
        records: records,
        summary: summary,
        total: records.length
      }
    };
  } catch (error) {
    Logger.log('❌ Error in getReconciliationData: ' + error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Build column index map for reconciliation data
 */
function buildColumnIndexMap(headers) {
  const map = {};
  headers.forEach((header, index) => {
    map[header] = index;
  });
  return map;
}

/**
 * Parse row into ReconciliationRecord object
 */
function parseReconciliationRecord(row, colMap) {
  // Parse data_json if exists
  let chiTietLoTrinh = [];
  let soXe = '';

  try {
    if (colMap['data_json'] !== undefined && row[colMap['data_json']]) {
      const dataJson = JSON.parse(row[colMap['data_json']]);

      if (dataJson.data && dataJson.data.chiTietLoTrinh) {
        chiTietLoTrinh = dataJson.data.chiTietLoTrinh;
      }

      if (dataJson.data && dataJson.data.thongTinChuyenDi && dataJson.data.thongTinChuyenDi.soXe) {
        soXe = dataJson.data.thongTinChuyenDi.soXe;
      }
    }
  } catch (e) {
    Logger.log('⚠️ Error parsing data_json: ' + e.message);
  }

  return {
    id: String(row[colMap['maChuyenDi']] || ''),
    maChuyenDi: String(row[colMap['maChuyenDi']] || ''),
    ngayTao: formatDateValue(row[colMap['ngayTao']]),
    tenKhachHang: String(row[colMap['tenKhachHang']] || ''),
    loaiChuyen: String(row[colMap['loaiChuyen']] || ''),
    loaiTuyen: String(row[colMap['loaiTuyen']] || ''),
    tenTuyen: String(row[colMap['tenTuyen']] || ''),
    tenTaiXe: String(row[colMap['tenTaiXe']] || ''),
    donViVanChuyen: String(row[colMap['donViVanChuyen']] || ''),
    trangThai: String(row[colMap['trangThai']] || ''),
    tongQuangDuong: parseFloat(row[colMap['tongQuangDuong']] || 0),
    tongDoanhThu: parseFloat(row[colMap['tongDoanhThu']] || 0),
    soXe: soXe,
    chiTietLoTrinh: chiTietLoTrinh
  };
}

/**
 * Format date value to YYYY-MM-DD
 */
function formatDateValue(value) {
  if (!value) return '';

  if (value instanceof Date) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }

  if (typeof value === 'string') {
    // Already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value;
    }

    // Convert DD/MM/YYYY to YYYY-MM-DD
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
      const parts = value.split('/');
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }

    // Try parsing as date
    try {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
      }
    } catch (e) {
      Logger.log('⚠️ Could not parse date: ' + value);
    }
  }

  return String(value);
}

/**
 * Apply filters to records
 */
function applyReconciliationFilters(records, filters) {
  return records.filter(record => {
    // Date range filter
    if (filters.fromDate) {
      const recordDate = new Date(record.ngayTao);
      const fromDate = new Date(filters.fromDate);
      if (recordDate < fromDate) return false;
    }

    if (filters.toDate) {
      const recordDate = new Date(record.ngayTao);
      const toDate = new Date(filters.toDate);
      if (recordDate > toDate) return false;
    }

    // Customer filter (case-insensitive text search)
    if (filters.khachHang) {
      const searchTerm = filters.khachHang.toLowerCase();
      if (!record.tenKhachHang.toLowerCase().includes(searchTerm)) {
        return false;
      }
    }

    // Transport unit filter (exact match)
    if (filters.donViVanChuyen) {
      if (record.donViVanChuyen !== filters.donViVanChuyen) {
        return false;
      }
    }

    // Route type filter (case-insensitive text search)
    if (filters.loaiTuyen) {
      const searchTerm = filters.loaiTuyen.toLowerCase();
      if (!record.loaiTuyen.toLowerCase().includes(searchTerm)) {
        return false;
      }
    }

    // Status filter (case-insensitive text search)
    if (filters.trangThai) {
      const searchTerm = filters.trangThai.toLowerCase();
      if (!record.trangThai.toLowerCase().includes(searchTerm)) {
        return false;
      }
    }

    // General search query (searches across multiple fields)
    if (filters.searchQuery) {
      const searchTerm = filters.searchQuery.toLowerCase();
      const searchableText = [
        record.maChuyenDi,
        record.tenKhachHang,
        record.tenTuyen,
        record.tenTaiXe,
        record.soXe || ''
      ].join(' ').toLowerCase();

      if (!searchableText.includes(searchTerm)) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Calculate summary statistics from records
 */
function calculateReconciliationSummary(records) {
  const summary = {
    totalOrders: records.length,
    totalAmount: 0,
    totalDistance: 0,
    approvedOrders: 0,
    pendingOrders: 0
  };

  records.forEach(record => {
    summary.totalAmount += record.tongDoanhThu || 0;
    summary.totalDistance += record.tongQuangDuong || 0;

    // Count status (customize based on your actual status values)
    const status = record.trangThai.toLowerCase();
    if (status.includes('duyệt') || status.includes('approved')) {
      summary.approvedOrders++;
    } else if (status.includes('chờ') || status.includes('pending')) {
      summary.pendingOrders++;
    }
  });

  return summary;
}
