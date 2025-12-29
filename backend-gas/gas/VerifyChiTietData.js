/**
 * Script để verify dữ liệu chi tiết chuyến đi
 * Kiểm tra xem chuyến đi có chi tiết trong sheet chi_tiet_chuyen_di không
 */

function verifyChiTietData() {
  const VEHICLE_SPREADSHEET_ID = '1fzepYrS-o5zc01h7nQFzJSOwagoTvOgoiDQHrTLB12E';
  const SHEET_CHI_TIET = 'chi_tiet_chuyen_di';

  // Mã chuyến đi cần kiểm tra (từ screenshot)
  const MA_CHUYEN_DI_TEST = 'nak_a7b325ec';

  Logger.log('🔍 Verifying chi tiết data for: ' + MA_CHUYEN_DI_TEST);
  Logger.log('');

  try {
    // Mở spreadsheet
    const ss = SpreadsheetApp.openById(VEHICLE_SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_CHI_TIET);

    if (!sheet) {
      Logger.log('❌ Sheet "' + SHEET_CHI_TIET + '" không tồn tại!');
      return;
    }

    // Đọc dữ liệu
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);

    Logger.log('📊 Total chi tiết rows: ' + rows.length);
    Logger.log('📋 Headers: ' + JSON.stringify(headers));
    Logger.log('');

    // Tìm index của cột ma_chuyen_di
    const maChuyenDiIdx = headers.indexOf('ma_chuyen_di');

    if (maChuyenDiIdx === -1) {
      Logger.log('❌ Không tìm thấy cột "ma_chuyen_di" trong headers!');
      Logger.log('   Available columns: ' + JSON.stringify(headers));
      return;
    }

    Logger.log('✅ Found ma_chuyen_di at index: ' + maChuyenDiIdx);
    Logger.log('');

    // Filter rows có mã chuyến đi cần test
    const matchingRows = rows.filter(row => row[maChuyenDiIdx] === MA_CHUYEN_DI_TEST);

    Logger.log('🔍 Chi tiết rows for "' + MA_CHUYEN_DI_TEST + '": ' + matchingRows.length);
    Logger.log('');

    if (matchingRows.length === 0) {
      Logger.log('⚠️ KHÔNG CÓ CHI TIẾT CHO CHUYẾN ĐI NÀY!');
      Logger.log('');
      Logger.log('📝 Hướng dẫn fix:');
      Logger.log('   1. Mở sheet "chi_tiet_chuyen_di"');
      Logger.log('   2. Thêm các rows chi tiết cho mã chuyến đi: ' + MA_CHUYEN_DI_TEST);
      Logger.log('   3. Đảm bảo các cột sau có data:');
      Logger.log('      - lo_trinh');
      Logger.log('      - ma_tem');
      Logger.log('      - quang_duong');
      Logger.log('      - tai_trong');
      Logger.log('      - don_gia');
      Logger.log('      - ket_qua (thành tiền)');
      Logger.log('   4. Chạy lại createJsonDatabase()');
      return;
    }

    // Log chi tiết từng row
    Logger.log('📋 Chi tiết rows found:');
    Logger.log('');

    matchingRows.forEach((row, index) => {
      Logger.log('   Row ' + (index + 1) + ':');

      // Log important fields
      const loTrinhIdx = headers.indexOf('lo_trinh');
      const maTemIdx = headers.indexOf('ma_tem');
      const quangDuongIdx = headers.indexOf('quang_duong');
      const taiTrongIdx = headers.indexOf('tai_trong');
      const donGiaIdx = headers.indexOf('don_gia');
      const ketQuaIdx = headers.indexOf('ket_qua');

      Logger.log('      - Lộ trình: ' + (row[loTrinhIdx] || 'RỖNG'));
      Logger.log('      - Mã tem: ' + (row[maTemIdx] || 'RỖNG'));
      Logger.log('      - Quãng đường: ' + (row[quangDuongIdx] || 0));
      Logger.log('      - Tải trọng: ' + (row[taiTrongIdx] || 0));
      Logger.log('      - Đơn giá: ' + (row[donGiaIdx] || 0));
      Logger.log('      - Thành tiền: ' + (row[ketQuaIdx] || 0));
      Logger.log('');
    });

    // Kiểm tra values
    let hasEmptyData = false;
    matchingRows.forEach(row => {
      const loTrinhIdx = headers.indexOf('lo_trinh');
      const quangDuongIdx = headers.indexOf('quang_duong');

      if (!row[loTrinhIdx] || row[loTrinhIdx] === '') {
        hasEmptyData = true;
      }
      if (!row[quangDuongIdx] || row[quangDuongIdx] === 0) {
        hasEmptyData = true;
      }
    });

    if (hasEmptyData) {
      Logger.log('⚠️ WARNING: Chi tiết rows có data RỖNG hoặc = 0!');
      Logger.log('');
      Logger.log('📝 Hướng dẫn fix:');
      Logger.log('   1. Kiểm tra dữ liệu trong sheet "chi_tiet_chuyen_di"');
      Logger.log('   2. Đảm bảo các trường có giá trị hợp lệ');
      Logger.log('   3. Chạy lại createJsonDatabase() sau khi fix');
    } else {
      Logger.log('✅ Data looks good! Chi tiết có đầy đủ thông tin.');
    }

  } catch (error) {
    Logger.log('❌ ERROR: ' + error.toString());
    Logger.log('Stack: ' + error.stack);
  }
}

/**
 * Kiểm tra tất cả chuyến đi có bao nhiêu % có chi tiết
 */
function checkChiTietCoverage() {
  const VEHICLE_SPREADSHEET_ID = '1fzepYrS-o5zc01h7nQFzJSOwagoTvOgoiDQHrTLB12E';
  const SHEET_CHUYEN_DI = 'chuyen_di';
  const SHEET_CHI_TIET = 'chi_tiet_chuyen_di';

  Logger.log('🔍 Checking chi tiết coverage...');
  Logger.log('');

  try {
    const ss = SpreadsheetApp.openById(VEHICLE_SPREADSHEET_ID);

    // Đọc chuyến đi
    const sheetChuyenDi = ss.getSheetByName(SHEET_CHUYEN_DI);
    const dataChuyenDi = sheetChuyenDi.getDataRange().getValues();
    const headersChuyenDi = dataChuyenDi[0];
    const rowsChuyenDi = dataChuyenDi.slice(1);

    const maChuyenDiIdxChuyenDi = headersChuyenDi.indexOf('ma_chuyen_di');
    const uniqueChuyenDi = new Set(
      rowsChuyenDi
        .map(row => row[maChuyenDiIdxChuyenDi])
        .filter(ma => ma && ma !== '')
    );

    // Đọc chi tiết
    const sheetChiTiet = ss.getSheetByName(SHEET_CHI_TIET);
    const dataChiTiet = sheetChiTiet.getDataRange().getValues();
    const headersChiTiet = dataChiTiet[0];
    const rowsChiTiet = dataChiTiet.slice(1);

    const maChuyenDiIdxChiTiet = headersChiTiet.indexOf('ma_chuyen_di');
    const chuyenDiCoChiTiet = new Set(
      rowsChiTiet
        .map(row => row[maChuyenDiIdxChiTiet])
        .filter(ma => ma && ma !== '')
    );

    Logger.log('📊 Statistics:');
    Logger.log('   Total chuyến đi: ' + uniqueChuyenDi.size);
    Logger.log('   Chuyến đi có chi tiết: ' + chuyenDiCoChiTiet.size);
    Logger.log('   Coverage: ' + ((chuyenDiCoChiTiet.size / uniqueChuyenDi.size) * 100).toFixed(2) + '%');
    Logger.log('');

    // Tìm chuyến đi KHÔNG có chi tiết
    const chuyenDiKhongCoChiTiet = [];
    uniqueChuyenDi.forEach(ma => {
      if (!chuyenDiCoChiTiet.has(ma)) {
        chuyenDiKhongCoChiTiet.push(ma);
      }
    });

    if (chuyenDiKhongCoChiTiet.length > 0) {
      Logger.log('⚠️ Chuyến đi KHÔNG có chi tiết (' + chuyenDiKhongCoChiTiet.length + ' chuyến):');
      chuyenDiKhongCoChiTiet.slice(0, 10).forEach(ma => {
        Logger.log('   - ' + ma);
      });
      if (chuyenDiKhongCoChiTiet.length > 10) {
        Logger.log('   ... và ' + (chuyenDiKhongCoChiTiet.length - 10) + ' chuyến khác');
      }
    } else {
      Logger.log('✅ Tất cả chuyến đi đều có chi tiết!');
    }

  } catch (error) {
    Logger.log('❌ ERROR: ' + error.toString());
  }
}
