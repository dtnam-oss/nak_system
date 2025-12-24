/**
 * Report Service - Xử lý báo cáo từ master data data_chuyen_di
 * NAK Logistics System
 */

/**
 * Lấy dữ liệu báo cáo dashboard
 * @returns {Object} Dashboard data với cards và charts
 */
function getDashboardReport() {
  try {
    const ss = SpreadsheetApp.openById(Config.getSpreadsheetId());
    const sheet = ss.getSheetByName('data_chuyen_di');

    if (!sheet) {
      throw new Error('Sheet data_chuyen_di không tồn tại');
    }

    // Đọc toàn bộ dữ liệu
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);

    // Build column map
    const colMap = buildColumnIndexMap(headers);

    // Tính toán các metrics
    const cards = calculateCards(rows, colMap);
    const charts = calculateCharts(rows, colMap);

    return {
      success: true,
      data: {
        cards: cards,
        charts: charts,
        lastUpdated: new Date().toISOString()
      }
    };

  } catch (error) {
    Logger.log('Error in getDashboardReport: ' + error.toString());
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Build column index map
 */
function buildColumnIndexMap(headers) {
  const map = {};
  for (let i = 0; i < headers.length; i++) {
    map[headers[i]] = i;
  }
  return map;
}

/**
 * Tính toán các Cards metrics
 */
function calculateCards(rows, colMap) {
  let tongDoanhThu = 0;
  let soChuyenTotal = 0;
  let soXeNAK = 0;
  let soXeVendor = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    // Skip empty rows
    if (!row[colMap.maChuyenDi]) continue;

    // Tổng doanh thu
    const doanhThu = parseFloat(row[colMap.tongDoanhThu]) || 0;
    tongDoanhThu += doanhThu;

    // Số chuyến
    soChuyenTotal++;

    // Số xe NAK vs Vendor
    const donVi = String(row[colMap.donViVanChuyen]).trim().toUpperCase();
    if (donVi === 'NAK') {
      soXeNAK++;
    } else if (donVi === 'VENDOR') {
      soXeVendor++;
    }
  }

  return {
    tongDoanhThu: tongDoanhThu,
    soChuyen: soChuyenTotal,
    soXeNAK: soXeNAK,
    soXeVendor: soXeVendor
  };
}

/**
 * Tính toán dữ liệu cho Charts
 */
function calculateCharts(rows, colMap) {
  // 1. Doanh thu theo ngày
  const doanhThuTheoNgay = calculateDoanhThuTheoNgay(rows, colMap);

  // 2. Doanh thu theo tuyến
  const doanhThuTheoTuyen = calculateDoanhThuTheoTuyen(rows, colMap);

  // 3. Doanh thu theo khách hàng
  const doanhThuTheoKhachHang = calculateDoanhThuTheoKhachHang(rows, colMap);

  // 4. Doanh thu theo đơn vị vận chuyển
  const doanhThuTheoDonVi = calculateDoanhThuTheoDonVi(rows, colMap);

  return {
    doanhThuTheoNgay: doanhThuTheoNgay,
    doanhThuTheoTuyen: doanhThuTheoTuyen,
    doanhThuTheoKhachHang: doanhThuTheoKhachHang,
    doanhThuTheoDonVi: doanhThuTheoDonVi
  };
}

/**
 * Doanh thu theo ngày (trend line)
 */
function calculateDoanhThuTheoNgay(rows, colMap) {
  const map = {};

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row[colMap.maChuyenDi]) continue;

    const ngayTao = row[colMap.ngayTao];
    const doanhThu = parseFloat(row[colMap.tongDoanhThu]) || 0;

    // Format date
    let dateKey;
    try {
      const date = new Date(ngayTao);
      dateKey = Utilities.formatDate(date, 'GMT+7', 'yyyy-MM-dd');
    } catch (e) {
      continue;
    }

    if (!map[dateKey]) {
      map[dateKey] = 0;
    }
    map[dateKey] += doanhThu;
  }

  // Convert to array và sort theo ngày
  const result = Object.keys(map).map(date => ({
    date: date,
    value: map[date]
  })).sort((a, b) => a.date.localeCompare(b.date));

  return result;
}

/**
 * Doanh thu theo tuyến (column chart)
 */
function calculateDoanhThuTheoTuyen(rows, colMap) {
  const map = {};

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row[colMap.maChuyenDi]) continue;

    const loaiTuyen = String(row[colMap.loaiTuyen] || 'Không xác định').trim();
    const doanhThu = parseFloat(row[colMap.tongDoanhThu]) || 0;

    if (!map[loaiTuyen]) {
      map[loaiTuyen] = 0;
    }
    map[loaiTuyen] += doanhThu;
  }

  // Convert to array và sort theo doanh thu giảm dần
  const result = Object.keys(map).map(tuyen => ({
    label: tuyen,
    value: map[tuyen]
  })).sort((a, b) => b.value - a.value);

  return result;
}

/**
 * Doanh thu theo khách hàng (column chart)
 */
function calculateDoanhThuTheoKhachHang(rows, colMap) {
  const map = {};

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row[colMap.maChuyenDi]) continue;

    const tenKH = String(row[colMap.tenKhachHang] || 'Không xác định').trim();
    const doanhThu = parseFloat(row[colMap.tongDoanhThu]) || 0;

    if (!map[tenKH]) {
      map[tenKH] = 0;
    }
    map[tenKH] += doanhThu;
  }

  // Convert to array và sort theo doanh thu giảm dần, lấy top 10
  const result = Object.keys(map).map(kh => ({
    label: kh,
    value: map[kh]
  })).sort((a, b) => b.value - a.value).slice(0, 10);

  return result;
}

/**
 * Doanh thu theo đơn vị vận chuyển (NAK vs Vendor)
 */
function calculateDoanhThuTheoDonVi(rows, colMap) {
  const map = {
    'NAK': 0,
    'VENDOR': 0,
    'Khác': 0
  };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row[colMap.maChuyenDi]) continue;

    const donVi = String(row[colMap.donViVanChuyen]).trim().toUpperCase();
    const doanhThu = parseFloat(row[colMap.tongDoanhThu]) || 0;

    if (donVi === 'NAK') {
      map['NAK'] += doanhThu;
    } else if (donVi === 'VENDOR') {
      map['VENDOR'] += doanhThu;
    } else {
      map['Khác'] += doanhThu;
    }
  }

  // Convert to array
  const result = Object.keys(map).map(donVi => ({
    label: donVi,
    value: map[donVi]
  }));

  return result;
}

/**
 * Lấy báo cáo với filters
 * @param {Object} filters - {fromDate, toDate, khachHang, loaiTuyen}
 * @returns {Object} Filtered dashboard data
 */
function getDashboardReportWithFilters(filters) {
  try {
    const ss = SpreadsheetApp.openById(Config.getSpreadsheetId());
    const sheet = ss.getSheetByName('data_chuyen_di');

    if (!sheet) {
      throw new Error('Sheet data_chuyen_di không tồn tại');
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const allRows = data.slice(1);

    const colMap = buildColumnIndexMap(headers);

    // Apply filters
    const filteredRows = applyFilters(allRows, colMap, filters);

    // Calculate với filtered data
    const cards = calculateCards(filteredRows, colMap);
    const charts = calculateCharts(filteredRows, colMap);

    return {
      success: true,
      data: {
        cards: cards,
        charts: charts,
        filters: filters,
        totalRecords: filteredRows.length,
        lastUpdated: new Date().toISOString()
      }
    };

  } catch (error) {
    Logger.log('Error in getDashboardReportWithFilters: ' + error.toString());
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Apply filters to rows
 */
function applyFilters(rows, colMap, filters) {
  return rows.filter(row => {
    if (!row[colMap.maChuyenDi]) return false;

    // Filter by date range
    if (filters.fromDate || filters.toDate) {
      const ngayTao = new Date(row[colMap.ngayTao]);

      if (filters.fromDate) {
        const fromDate = new Date(filters.fromDate);
        if (ngayTao < fromDate) return false;
      }

      if (filters.toDate) {
        const toDate = new Date(filters.toDate);
        if (ngayTao > toDate) return false;
      }
    }

    // Filter by khách hàng
    if (filters.khachHang) {
      const tenKH = String(row[colMap.tenKhachHang]).trim().toLowerCase();
      const filterKH = String(filters.khachHang).trim().toLowerCase();
      if (!tenKH.includes(filterKH)) return false;
    }

    // Filter by loại tuyến
    if (filters.loaiTuyen) {
      const loaiTuyen = String(row[colMap.loaiTuyen]).trim();
      if (loaiTuyen !== filters.loaiTuyen) return false;
    }

    return true;
  });
}

/**
 * Format currency VND
 */
function formatCurrency(value) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(value);
}
