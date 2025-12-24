/**
 * Webhook Service - Đồng bộ dữ liệu từ AppSheet sang Google Sheets
 * Workflow: AppSheet (VEHICLE_SPREADSHEET_ID) → Webhook → Google Apps Script → Create JSON → Update SPREADSHEET_ID
 * NAK Logistics System
 * 
 * Logic tương tự CreateDataBase.gs nhưng trigger bởi webhook thay vì manual run
 */

/**
 * Entry point cho webhook từ AppSheet
 * Deploy as Web App với URL: https://script.google.com/macros/s/.../exec
 * 
 * Hỗ trợ 3 loại events từ AppSheet:
 * 1. eventType: "add" - Thêm mới chuyến đi
 * 2. eventType: "edit" - Cập nhật chuyến đi (full data replacement)
 * 3. eventType: "delete" - Xóa chuyến đi
 */
function doPost(e) {
  try {
    // Parse request data
    const requestData = JSON.parse(e.postData.contents);
    Logger.log('📥 Received webhook: ' + JSON.stringify(requestData));

    // Route theo loại cập nhật
    let result;

    // 1. Sync toàn bộ database (rebuild từ VEHICLE_SPREADSHEET_ID)
    if (requestData.action === 'syncFullDatabase' || requestData.fullSync === true) {
      result = syncFullDatabase();
    }
    // 2. ADD Event - Thêm mới chuyến đi
    else if (requestData.eventType === 'add') {
      result = handleAddEvent(requestData);
    }
    // 3. EDIT Event - Cập nhật chuyến đi (full data replacement)
    else if (requestData.eventType === 'edit') {
      result = handleEditEvent(requestData);
    }
    // 4. DELETE Event - Xóa chuyến đi
    else if (requestData.eventType === 'delete') {
      result = handleDeleteEvent(requestData);
    }
    // 5. CHI_TIET ADD Event - Thêm chi tiết mới → update parent data_json
    else if (requestData.eventType === 'chitiet_add') {
      result = handleChiTietAddEvent(requestData);
    }
    // 6. CHI_TIET EDIT Event - Sửa chi tiết → update parent data_json
    else if (requestData.eventType === 'chitiet_edit') {
      result = handleChiTietEditEvent(requestData);
    }
    // 7. CHI_TIET DELETE Event - Xóa chi tiết → update parent data_json
    else if (requestData.eventType === 'chitiet_delete') {
      result = handleChiTietDeleteEvent(requestData);
    }
    // Legacy: Cập nhật trạng thái chuyến đi (từ phuong_tien sheet)
    else if (requestData.ma_tai_xe && requestData.trang_thai_chuyen_di) {
      result = syncVehicleStatus(requestData);
    }
    // Legacy: Cập nhật hoạt động xe (từ doi_xe sheet)
    else if (requestData.bien_kiem_soat && requestData.tinh_trang_hoat_dong) {
      result = syncVehicleActivity(requestData);
    }
    // Fallback: Sync chuyến đi (backward compatibility)
    else if (requestData.ma_chuyen_di || requestData.ngay_tao) {
      result = syncChuyenDiWithJson(requestData);
    }
    // Generic update
    else {
      result = handleGenericUpdate(requestData);
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: 'Webhook processed successfully',
      data: result
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log('❌ Error in webhook: ' + error.toString());
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Sync toan bo database - Rebuild JSON structure
 * Logic giong CreateDataBase.gs
 */
function syncFullDatabase() {
  try {
    Logger.log('🔄 Starting full database sync...');
    
    const vehicleSpreadsheetId = Config.getVehicleSpreadsheetId();
    const targetSpreadsheetId = Config.getSpreadsheetId();
    
    // 1. Đọc dữ liệu từ VEHICLE_SPREADSHEET_ID
    const sourceData = readVehicleSpreadsheetData(vehicleSpreadsheetId);
    Logger.log(`✅ Loaded ${sourceData.chuyenDi.data.length} chuyến đi, ${sourceData.chiTiet.data.length} chi tiết`);
    
    // 2. Transform thành JSON structure
    const jsonRecords = transformToJsonStructure(sourceData);
    Logger.log(`✅ Transformed ${jsonRecords.length} records`);
    
    // 3. Ghi vào data_chuyen_di sheet
    writeJsonToTargetSheet(jsonRecords, targetSpreadsheetId);
    Logger.log(`✅ Wrote ${jsonRecords.length} records to data_chuyen_di`);
    
    return {
      action: 'syncFullDatabase',
      recordCount: jsonRecords.length,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    Logger.log('Error in syncFullDatabase: ' + error.toString());
    throw error;
  }
}

/**
 * Handle ADD Event - Thêm mới chuyến đi
 * Strategy: Query chi_tiet from VEHICLE_SPREADSHEET → Build JSON → Append row
 * 
 * Webhook data không chứa chi_tiet_lo_trinh (AppSheet REF_ROWS gây lỗi JSON)
 * Thay vào đó, query chi_tiet_chuyen_di từ VEHICLE_SPREADSHEET bằng ma_chuyen_di
 */
function handleAddEvent(data) {
  try {
    Logger.log('➕ Handling ADD event for: ' + data.ma_chuyen_di);
    
    if (!data.ma_chuyen_di) {
      throw new Error('ma_chuyen_di is required for ADD event');
    }
    
    const targetSS = SpreadsheetApp.openById(Config.getSpreadsheetId());
    let targetSheet = targetSS.getSheetByName('data_chuyen_di');
    
    // Create sheet if not exists
    if (!targetSheet) {
      targetSheet = targetSS.insertSheet('data_chuyen_di');
      const headers = [
        'maChuyenDi', 'ngayTao', 'tenKhachHang', 'loaiChuyen', 
        'loaiTuyen', 'tenTuyen', 'tenTaiXe', 'donViVanChuyen',
        'trangThai', 'tongQuangDuong', 'tongDoanhThu', 'data_json'
      ];
      targetSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      targetSheet.setFrozenRows(1);
    }
    
    // ⚠️ DUPLICATE CHECK - Prevent multiple webhook calls creating duplicate rows
    const dataRange = targetSheet.getDataRange();
    const values = dataRange.getValues();
    const headers = values[0];
    const maChuyenDiIndex = headers.indexOf('maChuyenDi');
    
    if (maChuyenDiIndex !== -1) {
      for (let i = 1; i < values.length; i++) {
        if (values[i][maChuyenDiIndex] === data.ma_chuyen_di) {
          Logger.log('⚠️ DUPLICATE DETECTED - ma_chuyen_di already exists: ' + data.ma_chuyen_di);
          Logger.log('⚠️ Converting ADD to EDIT to prevent duplicate row');
          return handleEditEvent(data); // Convert to EDIT instead
        }
      }
    }
    
    // Query chi_tiet_chuyen_di từ VEHICLE_SPREADSHEET
    const chiTietLoTrinh = queryChiTietFromVehicleSpreadsheet(data.ma_chuyen_di);
    Logger.log(`✅ Queried ${chiTietLoTrinh.length} chi tiết records`);
    
    // Build JSON record từ webhook data + chi tiết từ VEHICLE_SPREADSHEET
    const jsonRecord = buildJsonRecordFromWebhook(data, chiTietLoTrinh);
    
    // Append row mới
    const newRow = [
      jsonRecord.maChuyenDi,
      jsonRecord.ngayTao,
      jsonRecord.tenKhachHang,
      jsonRecord.loaiChuyen,
      jsonRecord.loaiTuyen,
      jsonRecord.tenTuyen,
      jsonRecord.tenTaiXe,
      jsonRecord.donViVanChuyen,
      jsonRecord.trangThai,
      jsonRecord.tongQuangDuong,
      jsonRecord.tongDoanhThu,
      JSON.stringify(jsonRecord.data)
    ];
    
    targetSheet.appendRow(newRow);
    
    Logger.log('✅ Added new record: ' + data.ma_chuyen_di);
    
    return {
      eventType: 'add',
      status: 'success',
      maChuyenDi: data.ma_chuyen_di,
      chiTietCount: chiTietLoTrinh.length,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    Logger.log('❌ Error in handleAddEvent: ' + error.toString());
    throw error;
  }
}

/**
 * Handle EDIT Event - Cập nhật chuyến đi
 * Strategy: Query chi_tiet from VEHICLE_SPREADSHEET → Build JSON → Replace row
 */
function handleEditEvent(data) {
  try {
    Logger.log('✏️ Handling EDIT event for: ' + data.ma_chuyen_di);
    
    if (!data.ma_chuyen_di) {
      throw new Error('ma_chuyen_di is required for EDIT event');
    }
    
    const targetSS = SpreadsheetApp.openById(Config.getSpreadsheetId());
    const targetSheet = targetSS.getSheetByName('data_chuyen_di');
    
    if (!targetSheet) {
      throw new Error('Sheet data_chuyen_di không tồn tại. Chạy ADD event trước.');
    }
    
    // Tìm row theo ma_chuyen_di
    const dataRange = targetSheet.getDataRange();
    const values = dataRange.getValues();
    const headers = values[0];
    const maChuyenDiIndex = headers.indexOf('maChuyenDi');
    
    if (maChuyenDiIndex === -1) {
      throw new Error('Column maChuyenDi không tồn tại');
    }
    
    let rowIndex = -1;
    for (let i = 1; i < values.length; i++) {
      if (values[i][maChuyenDiIndex] === data.ma_chuyen_di) {
        rowIndex = i + 1; // +1 vì getRange là 1-indexed
        break;
      }
    }
    
    if (rowIndex === -1) {
      throw new Error('Không tìm thấy chuyến đi với ma_chuyen_di: ' + data.ma_chuyen_di);
    }
    
    // Query chi_tiet_chuyen_di từ VEHICLE_SPREADSHEET
    const chiTietLoTrinh = queryChiTietFromVehicleSpreadsheet(data.ma_chuyen_di);
    Logger.log(`✅ Queried ${chiTietLoTrinh.length} chi tiết records`);
    
    // Build JSON record từ webhook data + chi tiết từ VEHICLE_SPREADSHEET
    const jsonRecord = buildJsonRecordFromWebhook(data, chiTietLoTrinh);
    
    // REPLACE toàn bộ row
    const updatedRow = [
      jsonRecord.maChuyenDi,
      jsonRecord.ngayTao,
      jsonRecord.tenKhachHang,
      jsonRecord.loaiChuyen,
      jsonRecord.loaiTuyen,
      jsonRecord.tenTuyen,
      jsonRecord.tenTaiXe,
      jsonRecord.donViVanChuyen,
      jsonRecord.trangThai,
      jsonRecord.tongQuangDuong,
      jsonRecord.tongDoanhThu,
      JSON.stringify(jsonRecord.data)
    ];
    
    targetSheet.getRange(rowIndex, 1, 1, updatedRow.length).setValues([updatedRow]);
    
    Logger.log('✅ Updated record: ' + data.ma_chuyen_di);
    
    return {
      eventType: 'edit',
      status: 'success',
      maChuyenDi: data.ma_chuyen_di,
      rowIndex: rowIndex,
      chiTietCount: chiTietLoTrinh.length,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    Logger.log('❌ Error in handleEditEvent: ' + error.toString());
    throw error;
  }
}

/**
 * Handle DELETE Event - Xóa chuyến đi
 * Strategy: Tìm row theo ma_chuyen_di → Delete row
 */
function handleDeleteEvent(data) {
  try {
    Logger.log('🗑️ Handling DELETE event for: ' + data.ma_chuyen_di);
    
    if (!data.ma_chuyen_di) {
      throw new Error('ma_chuyen_di is required for DELETE event');
    }
    
    const targetSS = SpreadsheetApp.openById(Config.getSpreadsheetId());
    const targetSheet = targetSS.getSheetByName('data_chuyen_di');
    
    if (!targetSheet) {
      throw new Error('Sheet data_chuyen_di không tồn tại');
    }
    
    // Tìm row theo ma_chuyen_di
    const dataRange = targetSheet.getDataRange();
    const values = dataRange.getValues();
    const headers = values[0];
    const maChuyenDiIndex = headers.indexOf('maChuyenDi');
    
    if (maChuyenDiIndex === -1) {
      throw new Error('Column maChuyenDi không tồn tại');
    }
    
    let rowIndex = -1;
    for (let i = 1; i < values.length; i++) {
      if (values[i][maChuyenDiIndex] === data.ma_chuyen_di) {
        rowIndex = i + 1; // +1 vì deleteRow là 1-indexed
        break;
      }
    }
    
    if (rowIndex === -1) {
      throw new Error('Không tìm thấy chuyến đi với ma_chuyen_di: ' + data.ma_chuyen_di);
    }
    
    // Delete row
    targetSheet.deleteRow(rowIndex);
    
    Logger.log('✅ Deleted record: ' + data.ma_chuyen_di);
    
    return {
      eventType: 'delete',
      status: 'success',
      maChuyenDi: data.ma_chuyen_di,
      deletedRowIndex: rowIndex,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    Logger.log('❌ Error in handleDeleteEvent: ' + error.toString());
    throw error;
  }
}

/**
 * Handle CHI_TIET ADD Event - Thêm chi tiết mới
 * Strategy: Query all chi_tiet của ma_chuyen_di → Update parent data_json
 * 
 * @param {Object} data - Webhook data from chi_tiet_chuyen_di table
 * Expected fields: ma_chuyen_di, id (chi_tiet id)
 */
function handleChiTietAddEvent(data) {
  try {
    Logger.log('➕📋 Handling CHI_TIET ADD event for ma_chuyen_di: ' + data.ma_chuyen_di);
    
    if (!data.ma_chuyen_di) {
      throw new Error('ma_chuyen_di is required for CHI_TIET ADD event');
    }
    
    return updateParentChuyenDiDataJson(data.ma_chuyen_di, 'chitiet_add');
    
  } catch (error) {
    Logger.log('❌ Error in handleChiTietAddEvent: ' + error.toString());
    throw error;
  }
}

/**
 * Handle CHI_TIET EDIT Event - Sửa chi tiết
 * Strategy: Query all chi_tiet của ma_chuyen_di → Update parent data_json
 * 
 * @param {Object} data - Webhook data from chi_tiet_chuyen_di table
 * Expected fields: ma_chuyen_di, id (chi_tiet id)
 */
function handleChiTietEditEvent(data) {
  try {
    Logger.log('✏️📋 Handling CHI_TIET EDIT event for ma_chuyen_di: ' + data.ma_chuyen_di);
    
    if (!data.ma_chuyen_di) {
      throw new Error('ma_chuyen_di is required for CHI_TIET EDIT event');
    }
    
    return updateParentChuyenDiDataJson(data.ma_chuyen_di, 'chitiet_edit');
    
  } catch (error) {
    Logger.log('❌ Error in handleChiTietEditEvent: ' + error.toString());
    throw error;
  }
}

/**
 * Handle CHI_TIET DELETE Event - Xóa chi tiết
 * Strategy: Query all chi_tiet của ma_chuyen_di → Update parent data_json
 * (Chi tiết đã bị xóa trong VEHICLE_SPREADSHEET nên query sẽ không có nó)
 * 
 * @param {Object} data - Webhook data from chi_tiet_chuyen_di table
 * Expected fields: ma_chuyen_di, id (chi_tiet id to delete)
 */
function handleChiTietDeleteEvent(data) {
  try {
    Logger.log('🗑️📋 Handling CHI_TIET DELETE event for ma_chuyen_di: ' + data.ma_chuyen_di);
    
    if (!data.ma_chuyen_di) {
      throw new Error('ma_chuyen_di is required for CHI_TIET DELETE event');
    }
    
    return updateParentChuyenDiDataJson(data.ma_chuyen_di, 'chitiet_delete');
    
  } catch (error) {
    Logger.log('❌ Error in handleChiTietDeleteEvent: ' + error.toString());
    throw error;
  }
}

/**
 * Update parent chuyen_di's data_json with latest chi_tiet from VEHICLE_SPREADSHEET
 * Used by all chi_tiet ADD/EDIT/DELETE events
 * 
 * @param {string} maChuyenDi - Parent ma_chuyen_di
 * @param {string} eventType - Event type for logging
 */
function updateParentChuyenDiDataJson(maChuyenDi, eventType) {
  try {
    Logger.log('🔄 Updating data_json for parent: ' + maChuyenDi);
    
    const targetSS = SpreadsheetApp.openById(Config.getSpreadsheetId());
    const targetSheet = targetSS.getSheetByName('data_chuyen_di');
    
    if (!targetSheet) {
      throw new Error('Sheet data_chuyen_di không tồn tại');
    }
    
    // Find parent row
    const dataRange = targetSheet.getDataRange();
    const values = dataRange.getValues();
    const headers = values[0];
    const maChuyenDiIndex = headers.indexOf('maChuyenDi');
    const dataJsonIndex = headers.indexOf('data_json');
    
    if (maChuyenDiIndex === -1 || dataJsonIndex === -1) {
      throw new Error('Columns maChuyenDi or data_json not found');
    }
    
    let rowIndex = -1;
    for (let i = 1; i < values.length; i++) {
      if (values[i][maChuyenDiIndex] === maChuyenDi) {
        rowIndex = i + 1; // 1-indexed
        break;
      }
    }
    
    if (rowIndex === -1) {
      Logger.log('⚠️ Parent chuyen_di not found: ' + maChuyenDi);
      Logger.log('⚠️ Skipping update (parent may not be synced yet)');
      return {
        eventType: eventType,
        status: 'skipped',
        reason: 'parent_not_found',
        maChuyenDi: maChuyenDi
      };
    }
    
    // Query latest chi_tiet from VEHICLE_SPREADSHEET
    const chiTietLoTrinh = queryChiTietFromVehicleSpreadsheet(maChuyenDi);
    Logger.log(`✅ Queried ${chiTietLoTrinh.length} chi tiết records`);
    
    // Parse existing data_json to preserve other fields
    let existingDataJson = {};
    try {
      const existingJsonString = values[rowIndex - 1][dataJsonIndex];
      if (existingJsonString && existingJsonString !== '') {
        existingDataJson = JSON.parse(existingJsonString);
      }
    } catch (e) {
      Logger.log('⚠️ Failed to parse existing data_json, using empty object');
    }
    
    // Update chiTietLoTrinh array only
    existingDataJson.chiTietLoTrinh = chiTietLoTrinh;
    
    // Write back to sheet
    const updatedJsonString = JSON.stringify(existingDataJson);
    targetSheet.getRange(rowIndex, dataJsonIndex + 1).setValue(updatedJsonString);
    
    Logger.log('✅ Updated data_json with ' + chiTietLoTrinh.length + ' chi tiết');
    
    return {
      eventType: eventType,
      status: 'success',
      maChuyenDi: maChuyenDi,
      rowIndex: rowIndex,
      chiTietCount: chiTietLoTrinh.length,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    Logger.log('❌ Error in updateParentChuyenDiDataJson: ' + error.toString());
    throw error;
  }
}

/**
 * Đọc dữ liệu từ VEHICLE_SPREADSHEET_ID
 */
function readVehicleSpreadsheetData(spreadsheetId) {
  Logger.log('📖 Reading vehicle spreadsheet data...');
  
  const ss = SpreadsheetApp.openById(spreadsheetId);
  
  // Đọc sheet chuyen_di
  const sheetChuyenDi = ss.getSheetByName('chuyen_di');
  if (!sheetChuyenDi) {
    throw new Error('Không tìm thấy sheet "chuyen_di"');
  }
  
  // Đọc sheet chi_tiet_chuyen_di
  const sheetChiTiet = ss.getSheetByName('chi_tiet_chuyen_di');
  if (!sheetChiTiet) {
    throw new Error('Không tìm thấy sheet "chi_tiet_chuyen_di"');
  }
  
  const dataChuyenDi = sheetChuyenDi.getDataRange().getValues();
  const headersChuyenDi = dataChuyenDi[0];
  
  const dataChiTiet = sheetChiTiet.getDataRange().getValues();
  const headersChiTiet = dataChiTiet[0];
  
  return {
    chuyenDi: { headers: headersChuyenDi, data: dataChuyenDi.slice(1) },
    chiTiet: { headers: headersChiTiet, data: dataChiTiet.slice(1) }
  };
}

/**
 * Transform data sang JSON structure (logic từ CreateDataBase.gs)
 */
function transformToJsonStructure(sourceData) {
  Logger.log('🔄 Transforming to JSON structure...');
  
  const { chuyenDi, chiTiet } = sourceData;
  
  // Build column index maps
  const chuyenDiMap = buildColumnMap(chuyenDi.headers);
  const chiTietMap = buildColumnMap(chiTiet.headers);
  
  // Build chi tiết theo mã chuyến đi
  const chiTietByMaChuyenDi = buildChiTietMap(chiTiet.data, chiTietMap);
  
  // Transform từng chuyến đi
  const records = [];
  
  for (let i = 0; i < chuyenDi.data.length; i++) {
    const row = chuyenDi.data[i];
    const maChuyenDi = row[chuyenDiMap.ma_chuyen_di];
    
    if (!maChuyenDi || maChuyenDi === '') {
      continue;
    }
    
    const record = buildJsonRecord(row, chuyenDiMap, chiTietByMaChuyenDi[maChuyenDi] || [], chiTietMap);
    records.push(record);
  }
  
  return records;
}

/**
 * Build JSON record
 */
function buildJsonRecord(chuyenDiRow, chuyenDiMap, chiTietRows, chiTietMap) {
  const record = {
    maChuyenDi: getValueSafe(chuyenDiRow, chuyenDiMap.ma_chuyen_di),
    ngayTao: formatDateValue(getValueSafe(chuyenDiRow, chuyenDiMap.ngay_tao)),
    tenKhachHang: getValueSafe(chuyenDiRow, chuyenDiMap.ten_khach_hang),
    loaiChuyen: getValueSafe(chuyenDiRow, chuyenDiMap.loai_chuyen),
    loaiTuyen: getValueSafe(chuyenDiRow, chuyenDiMap.loai_tuyen),
    tenTuyen: getValueSafe(chuyenDiRow, chuyenDiMap.ten_tuyen),
    tenTaiXe: getValueSafe(chuyenDiRow, chuyenDiMap.ten_tai_xe),
    donViVanChuyen: getValueSafe(chuyenDiRow, chuyenDiMap.don_vi_van_chuyen),
    trangThai: getValueSafe(chuyenDiRow, chuyenDiMap.trang_thai_chuyen_di),
    tongQuangDuong: parseFloat(getValueSafe(chuyenDiRow, chuyenDiMap.so_km_theo_odo)) || 0,
    tongDoanhThu: parseFloat(getValueSafe(chuyenDiRow, chuyenDiMap.doanh_thu)) || 0,
    
    data: {
      thongTinChuyenDi: {
        soXe: getValueSafe(chuyenDiRow, chuyenDiMap.bien_kiem_soat),
        khCap1: getValueSafe(chuyenDiRow, chuyenDiMap.ten_khach_hang_cap_1)
      },
      chiTietLoTrinh: buildChiTietLoTrinh(chiTietRows, chiTietMap)
    }
  };
  
  return record;
}

/**
 * Build chi tiết lộ trình
 */
function buildChiTietLoTrinh(chiTietRows, colMap) {
  const chiTiet = [];
  
  for (let i = 0; i < chiTietRows.length; i++) {
    const row = chiTietRows[i];
    
    const item = {
      thuTu: i + 1,
      id: getValueSafe(row, colMap.id) || getValueSafe(row, 0),
      loaiTuyenKH: getValueSafe(row, colMap.loai_tuyen_khach_hang),
      maTuyen: getValueSafe(row, colMap.lo_trinh),
      loTrinh: getValueSafe(row, colMap.lo_trinh_chi_tiet_theo_diem),
      maTem: getValueSafe(row, colMap.ma_chuyen_di_kh),
      quangDuong: parseFloat(getValueSafe(row, colMap.quang_duong)) || 0,
      taiTrong: parseFloat(getValueSafe(row, colMap.tai_trong)) || 0,
      taiTrongTinhPhi: parseFloat(getValueSafe(row, colMap.tai_trong_tinh_phi)) || 0,
      hinhThucTinhGia: getValueSafe(row, colMap.hinh_thuc_tinh_gia),
      soChieu: parseInt(getValueSafe(row, colMap.so_chieu)) || 0,
      donGia: parseFloat(getValueSafe(row, colMap.don_gia)) || 0,
      thanhTien: parseFloat(getValueSafe(row, colMap.ket_qua)) || 0
    };
    
    chiTiet.push(item);
  }
  
  return chiTiet;
}

/**
 * Build chi tiết map by ma_chuyen_di
 */
function buildChiTietMap(data, colMap) {
  const map = {};
  const maChuyenDiIdx = colMap.ma_chuyen_di;
  
  if (maChuyenDiIdx === undefined) {
    Logger.log('⚠️ Warning: ma_chuyen_di column not found in chi_tiet sheet');
    return map;
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
 * Ghi JSON records vào target sheet
 */
function writeJsonToTargetSheet(records, spreadsheetId) {
  Logger.log('📝 Writing JSON to target sheet...');
  
  const ss = SpreadsheetApp.openById(spreadsheetId);
  const sheetName = 'data_chuyen_di';
  
  // Get or create target sheet
  let sheet = ss.getSheetByName(sheetName);
  
  if (sheet) {
    sheet.clear();
  } else {
    sheet = ss.insertSheet(sheetName);
  }
  
  // Write headers
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
  sheet.getRange(1, 1, 1, headers.length)
    .setFontWeight('bold')
    .setBackground('#4285f4')
    .setFontColor('#ffffff');
  
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
      JSON.stringify(record.data)
    ]);
  }
  
  // Write all data
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
  
  // Format
  sheet.autoResizeColumns(1, 11);
  sheet.setFrozenRows(1);
  
  Logger.log(`✅ Wrote ${rows.length} records`);
}

/**
 * Đồng bộ chuyến đi mới/cập nhật với JSON structure
 * Được gọi khi có webhook từ AppSheet về chuyến đi mới
 */
function syncChuyenDiWithJson(data) {
  try {
    Logger.log('🔄 Syncing chuyen di with JSON structure...');
    
    const targetSS = SpreadsheetApp.openById(Config.getSpreadsheetId());
    const targetSheet = targetSS.getSheetByName('data_chuyen_di');
    
    if (!targetSheet) {
      throw new Error('Sheet data_chuyen_di không tồn tại');
    }
    
    const headers = targetSheet.getRange(1, 1, 1, targetSheet.getLastColumn()).getValues()[0];
    const colMap = buildColumnMap(headers);
    
    // Tìm row theo ma_chuyen_di
    let rowIndex = -1;
    
    if (data.ma_chuyen_di) {
      rowIndex = findRowByColumn(targetSheet, colMap, 'maChuyenDi', data.ma_chuyen_di);
    }
    
    // Build JSON record từ webhook data
    const jsonRecord = buildJsonRecordFromWebhook(data);
    
    // Nếu không tìm thấy, thêm mới
    if (rowIndex === -1) {
      const newRow = [
        jsonRecord.maChuyenDi,
        jsonRecord.ngayTao,
        jsonRecord.tenKhachHang,
        jsonRecord.loaiChuyen,
        jsonRecord.loaiTuyen,
        jsonRecord.tenTuyen,
        jsonRecord.tenTaiXe,
        jsonRecord.donViVanChuyen,
        jsonRecord.trangThai,
        jsonRecord.tongQuangDuong,
        jsonRecord.tongDoanhThu,
        JSON.stringify(jsonRecord.data)
      ];
      
      targetSheet.appendRow(newRow);
      rowIndex = targetSheet.getLastRow();
      
      Logger.log('✅ Added new chuyen di JSON record at row ' + rowIndex);
      
      return {
        action: 'added',
        rowIndex: rowIndex,
        maChuyenDi: data.ma_chuyen_di
      };
    } else {
      // Cập nhật existing row
      targetSheet.getRange(rowIndex, colMap['maChuyenDi'] + 1).setValue(jsonRecord.maChuyenDi);
      targetSheet.getRange(rowIndex, colMap['ngayTao'] + 1).setValue(jsonRecord.ngayTao);
      targetSheet.getRange(rowIndex, colMap['tenKhachHang'] + 1).setValue(jsonRecord.tenKhachHang);
      targetSheet.getRange(rowIndex, colMap['loaiChuyen'] + 1).setValue(jsonRecord.loaiChuyen);
      targetSheet.getRange(rowIndex, colMap['loaiTuyen'] + 1).setValue(jsonRecord.loaiTuyen);
      targetSheet.getRange(rowIndex, colMap['tenTuyen'] + 1).setValue(jsonRecord.tenTuyen);
      targetSheet.getRange(rowIndex, colMap['tenTaiXe'] + 1).setValue(jsonRecord.tenTaiXe);
      targetSheet.getRange(rowIndex, colMap['donViVanChuyen'] + 1).setValue(jsonRecord.donViVanChuyen);
      targetSheet.getRange(rowIndex, colMap['trangThai'] + 1).setValue(jsonRecord.trangThai);
      targetSheet.getRange(rowIndex, colMap['tongQuangDuong'] + 1).setValue(jsonRecord.tongQuangDuong);
      targetSheet.getRange(rowIndex, colMap['tongDoanhThu'] + 1).setValue(jsonRecord.tongDoanhThu);
      targetSheet.getRange(rowIndex, colMap['data_json'] + 1).setValue(JSON.stringify(jsonRecord.data));
      
      Logger.log('✅ Updated chuyen di JSON at row ' + rowIndex);
      
      return {
        action: 'updated',
        rowIndex: rowIndex,
        maChuyenDi: data.ma_chuyen_di
      };
    }
    
  } catch (error) {
    Logger.log('Error in syncChuyenDiWithJson: ' + error.toString());
    throw error;
  }
}

/**
 * Build JSON record từ webhook data + chi_tiet_chuyen_di từ VEHICLE_SPREADSHEET
 * 
 * @param {Object} data - Webhook data từ AppSheet (không chứa chi_tiet_lo_trinh)
 * @param {Array} chiTietLoTrinh - Chi tiết lo trình đã query từ VEHICLE_SPREADSHEET
 */
function buildJsonRecordFromWebhook(data, chiTietLoTrinh = []) {
  // Fallback for ngay_tao: Use provided date or current date
  let ngayTao = formatDateValue(data.ngay_tao);
  if (!ngayTao || ngayTao === '') {
    Logger.log('⚠️ ngay_tao is empty or invalid, using current date');
    ngayTao = Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd');
  }
  
  return {
    maChuyenDi: data.ma_chuyen_di || '',
    ngayTao: ngayTao,
    tenKhachHang: data.ten_khach_hang || '',
    loaiChuyen: data.loai_chuyen || '',
    loaiTuyen: data.loai_tuyen || '',
    tenTuyen: data.ten_tuyen || '',
    tenTaiXe: data.ten_tai_xe || '',
    donViVanChuyen: data.don_vi_van_chuyen || '',
    trangThai: data.trang_thai || data.trang_thai_chuyen_di || '',
    tongQuangDuong: parseFloat(data.tong_quang_duong || data.so_km_theo_odo || 0),
    tongDoanhThu: parseFloat(data.tong_doanh_thu || data.doanh_thu || 0),
    
    data: {
      thongTinChuyenDi: {
        soXe: data.bien_kiem_soat || '',
        khCap1: data.ten_khach_hang_cap_1 || ''
      },
      chiTietLoTrinh: chiTietLoTrinh // Use queried data from VEHICLE_SPREADSHEET
    }
  };
}

/**
 * Filter chi tiet lo trinh - chi lay 12 cot can thiet (theo CreateDataBase.gs logic)
 * AppSheet gui toan bo cot, chung ta chi lay nhung cot duoc su dung
 */
function filterChiTietLoTrinh(chiTietArray) {
  if (!Array.isArray(chiTietArray)) return [];
  
  return chiTietArray.map((item, index) => {
    return {
      thuTu: index + 1,
      id: item.id || item.ID || '',
      loaiTuyenKH: item.loai_tuyen_khach_hang || item.loai_tuyen_kh || '',
      maTuyen: item.lo_trinh || item.ma_tuyen || '',
      loTrinh: item.lo_trinh_chi_tiet_theo_diem || item.lo_trinh_chi_tiet || '',
      maTem: item.ma_chuyen_di_kh || item.ma_tem || '',
      quangDuong: parseFloat(item.quang_duong || 0),
      taiTrong: parseFloat(item.tai_trong || 0),
      taiTrongTinhPhi: parseFloat(item.tai_trong_tinh_phi || 0),
      hinhThucTinhGia: item.hinh_thuc_tinh_gia || '',
      soChieu: parseInt(item.so_chieu || 0),
      donGia: parseFloat(item.don_gia || 0),
      thanhTien: parseFloat(item.ket_qua || item.thanh_tien || 0)
    };
  });
}

/**
 * Query chi_tiet_chuyen_di từ VEHICLE_SPREADSHEET bằng ma_chuyen_di
 * Trả về array đã filter 12 cột cần thiết
 * 
 * @param {string} maChuyenDi - Mã chuyến đi cần query
 * @returns {Array} Array of chi tiết records (12 fields)
 */
function queryChiTietFromVehicleSpreadsheet(maChuyenDi) {
  try {
    Logger.log('🔍 Querying chi_tiet for ma_chuyen_di: ' + maChuyenDi);
    
    const vehicleSpreadsheetId = Config.getVehicleSpreadsheetId();
    const ss = SpreadsheetApp.openById(vehicleSpreadsheetId);
    
    const sheetChiTiet = ss.getSheetByName('chi_tiet_chuyen_di');
    if (!sheetChiTiet) {
      Logger.log('⚠️ Sheet chi_tiet_chuyen_di không tồn tại');
      return [];
    }
    
    const dataChiTiet = sheetChiTiet.getDataRange().getValues();
    if (dataChiTiet.length <= 1) {
      Logger.log('⚠️ No chi tiết data found');
      return [];
    }
    
    const headers = dataChiTiet[0];
    const chiTietMap = buildColumnMap(headers);
    
    // Filter rows với matching ma_chuyen_di
    const matchingRows = [];
    for (let i = 1; i < dataChiTiet.length; i++) {
      const row = dataChiTiet[i];
      const rowMaChuyenDi = row[chiTietMap.ma_chuyen_di];
      
      if (rowMaChuyenDi === maChuyenDi) {
        matchingRows.push(row);
      }
    }
    
    Logger.log(`✅ Found ${matchingRows.length} chi tiết records`);
    
    // Transform sang 12 field structure
    return matchingRows.map((row, index) => {
      return {
        thuTu: index + 1,
        id: getValueSafe(row, chiTietMap.id) || getValueSafe(row, chiTietMap.ID),
        loaiTuyenKH: getValueSafe(row, chiTietMap.loai_tuyen_khach_hang),
        maTuyen: getValueSafe(row, chiTietMap.lo_trinh),
        loTrinh: getValueSafe(row, chiTietMap.lo_trinh_chi_tiet_theo_diem),
        maTem: getValueSafe(row, chiTietMap.ma_chuyen_di_kh),
        quangDuong: parseFloat(getValueSafe(row, chiTietMap.quang_duong)) || 0,
        taiTrong: parseFloat(getValueSafe(row, chiTietMap.tai_trong)) || 0,
        taiTrongTinhPhi: parseFloat(getValueSafe(row, chiTietMap.tai_trong_tinh_phi)) || 0,
        hinhThucTinhGia: getValueSafe(row, chiTietMap.hinh_thuc_tinh_gia),
        soChieu: parseInt(getValueSafe(row, chiTietMap.so_chieu)) || 0,
        donGia: parseFloat(getValueSafe(row, chiTietMap.don_gia)) || 0,
        thanhTien: parseFloat(getValueSafe(row, chiTietMap.thanh_tien)) || 0
      };
    });
    
  } catch (error) {
    Logger.log('❌ Error querying chi_tiet: ' + error.toString());
    return [];
  }
}

/**
 * Đồng bộ t error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Đồng bộ trạng thái phương tiện
 * Cập nhật từ VEHICLE_SPREADSHEET_ID/phuong_tien sang SPREADSHEET_ID/phuong_tien
 */
function syncVehicleStatus(data) {
  try {
    const targetSS = SpreadsheetApp.openById(Config.getSpreadsheetId());
    const targetSheet = targetSS.getSheetByName(Config.getSheetName('PHUONG_TIEN'));

    if (!targetSheet) {
      throw new Error('Sheet phuong_tien không tồn tại');
    }

    // Lấy headers và data
    const headers = targetSheet.getRange(1, 1, 1, targetSheet.getLastColumn()).getValues()[0];
    const colMap = buildColumnIndexMap(headers);

    // Tìm row theo ma_tai_xe
    const maTaiXe = Array.isArray(data.ma_tai_xe) ? data.ma_tai_xe : [data.ma_tai_xe];
    const dataRange = targetSheet.getRange(2, 1, targetSheet.getLastRow() - 1, targetSheet.getLastColumn());
    const dataValues = dataRange.getValues();

    let updatedCount = 0;
    const updatedRows = [];

    // Cập nhật từng tài xế
    for (let i = 0; i < dataValues.length; i++) {
      const rowMaTaiXe = dataValues[i][colMap['tai_xe_theo_xe'] || 0];
      
      if (maTaiXe.includes(rowMaTaiXe)) {
        // Cập nhật trang_thai
        if (colMap['trang_thai'] !== undefined) {
          targetSheet.getRange(i + 2, colMap['trang_thai'] + 1).setValue(data.trang_thai_chuyen_di);
          updatedCount++;
          updatedRows.push(i + 2);
        }
      }
    }

    Logger.log('✅ Updated ' + updatedCount + ' vehicle status records');

    return {
      action: 'syncVehicleStatus',
      updatedCount: updatedCount,
      updatedRows: updatedRows,
      maTaiXe: maTaiXe,
      trangThai: data.trang_thai_chuyen_di
    };

  } catch (error) {
    Logger.log('Error in syncVehicleStatus: ' + error.toString());
    throw error;
  }
}

/**
 * Đồng bộ hoạt động xe
 * Cập nhật từ VEHICLE_SPREADSHEET_ID/doi_xe sang SPREADSHEET_ID/doi_xe
 */
function syncVehicleActivity(data) {
  try {
    const targetSS = SpreadsheetApp.openById(Config.getSpreadsheetId());
    const targetSheet = targetSS.getSheetByName(Config.getSheetName('DOI_XE'));

    if (!targetSheet) {
      throw new Error('Sheet doi_xe không tồn tại');
    }

    const headers = targetSheet.getRange(1, 1, 1, targetSheet.getLastColumn()).getValues()[0];
    const colMap = buildColumnIndexMap(headers);

    // Tìm row theo bien_kiem_soat và ngay_tao
    const dataRange = targetSheet.getRange(2, 1, targetSheet.getLastRow() - 1, targetSheet.getLastColumn());
    const dataValues = dataRange.getValues();

    let rowIndex = -1;
    for (let i = 0; i < dataValues.length; i++) {
      const rowBienKS = dataValues[i][colMap['bien_kiem_soat'] || 0];
      const rowNgay = dataValues[i][colMap['ngay_tao'] || 0];
      
      if (rowBienKS === data.bien_kiem_soat && 
          formatDate(rowNgay) === data.ngay_tao) {
        rowIndex = i + 2;
        break;
      }
    }

    // Nếu không tìm thấy, thêm mới
    if (rowIndex === -1) {
      const newRow = createRowFromData(headers, data);
      targetSheet.appendRow(newRow);
      rowIndex = targetSheet.getLastRow();
      
      Logger.log('✅ Added new vehicle activity record at row ' + rowIndex);
      
      return {
        action: 'added',
        rowIndex: rowIndex,
        bienKiemSoat: data.bien_kiem_soat
      };
    } else {
      // Cập nhật
      updateRowFromData(targetSheet, rowIndex, headers, colMap, data);
      
      Logger.log('✅ Updated vehicle activity at row ' + rowIndex);
      
      return {
        action: 'updated',
        rowIndex: rowIndex,
        bienKiemSoat: data.bien_kiem_soat
      };
    }

  } catch (error) {
    Logger.log('Error in syncVehicleActivity: ' + error.toString());
    throw error;
  }
}

/**
 * Đồng bộ chuyến đi
 * Cập nhật từ VEHICLE_SPREADSHEET_ID/ke_toan sang SPREADSHEET_ID/ke_toan
 */
function syncChuyenDi(data) {
  try {
    const targetSS = SpreadsheetApp.openById(Config.getSpreadsheetId());
    const targetSheet = targetSS.getSheetByName(Config.getSheetName('KE_TOAN'));

    if (!targetSheet) {
      throw new Error('Sheet ke_toan không tồn tại');
    }

    const headers = targetSheet.getRange(1, 1, 1, targetSheet.getLastColumn()).getValues()[0];
    const colMap = buildColumnIndexMap(headers);

    // Tìm row theo ma_chuyen_di hoặc ngay_tao + bien_kiem_soat
    let rowIndex = -1;

    if (data.ma_chuyen_di) {
      rowIndex = findRowByColumn(targetSheet, colMap, 'ma_chuyen_di', data.ma_chuyen_di);
    }

    // Nếu không tìm thấy, thêm mới
    if (rowIndex === -1) {
      const newRow = createRowFromData(headers, data);
      targetSheet.appendRow(newRow);
      rowIndex = targetSheet.getLastRow();
      
      Logger.log('✅ Added new chuyen di record at row ' + rowIndex);
      
      return {
        action: 'added',
        rowIndex: rowIndex,
        maChuyenDi: data.ma_chuyen_di
      };
    } else {
      // Cập nhật
      updateRowFromData(targetSheet, rowIndex, headers, colMap, data);
      
      Logger.log('✅ Updated chuyen di at row ' + rowIndex);
      
      return {
        action: 'updated',
        rowIndex: rowIndex,
        maChuyenDi: data.ma_chuyen_di
      };
    }

  } catch (error) {
    Logger.log('Error in syncChuyenDi: ' + error.toString());
    throw error;
  }
}

/**
 * Xử lý update chung
 */
function handleGenericUpdate(data) {
  Logger.log('Generic update: ' + JSON.stringify(data));
  
  // Có thể mở rộng logic ở đây
  return {
    action: 'generic',
    received: true,
    data: data
  };
}

/**
 * Helper: Build column index map
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
 * Helper: Normalize column name
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
 * Helper: Get value safely
 */
function getValueSafe(row, index) {
  if (index === undefined || index === null) return '';
  const value = row[index];
  return (value === null || value === undefined || value === '') ? '' : value;
}

/**
 * Helper: Format date value
 */
function formatDateValue(dateValue) {
  if (!dateValue || dateValue === '') {
    Logger.log('⚠️ formatDateValue: Empty or null date value');
    return '';
  }
  
  try {
    Logger.log('📅 formatDateValue input: ' + JSON.stringify(dateValue) + ' (type: ' + typeof dateValue + ')');
    
    // If already string in correct format (YYYY-MM-DD)
    if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      Logger.log('✅ formatDateValue: Already in correct format');
      return dateValue;
    }
    
    // Handle AppSheet date formats (ISO 8601, etc.)
    // Examples: "2025-12-24T00:00:00", "2025-12-24T00:00:00Z", "2025-12-24T00:00:00.000Z"
    if (typeof dateValue === 'string' && dateValue.includes('T')) {
      const datePart = dateValue.split('T')[0];
      if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
        Logger.log('✅ formatDateValue: Extracted date from ISO format: ' + datePart);
        return datePart;
      }
    }
    
    // Try to parse as Date object
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) {
      Logger.log('❌ formatDateValue: Invalid date, cannot parse');
      return '';
    }
    
    const formatted = Utilities.formatDate(date, 'GMT+7', 'yyyy-MM-dd');
    Logger.log('✅ formatDateValue output: ' + formatted);
    return formatted;
    
  } catch (e) {
    Logger.log('❌ formatDateValue error: ' + e.toString());
    return '';
  }
}

/**
 * Helper: Tìm row theo column value
 */
function findRowByColumn(sheet, colMap, columnName, value) {
  if (colMap[columnName] === undefined) {
    return -1;
  }

  const columnIndex = colMap[columnName];
  const dataRange = sheet.getRange(2, columnIndex + 1, sheet.getLastRow() - 1, 1);
  const dataValues = dataRange.getValues();

  for (let i = 0; i < dataValues.length; i++) {
    if (dataValues[i][0] === value) {
      return i + 2; // +2 vì 1-indexed và bỏ qua header
    }
  }

  return -1;
}

/**
 * Helper: Tạo row từ data
 */
function createRowFromData(headers, data) {
  const row = [];
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    row.push(data[header] || '');
  }
  return row;
}

/**
 * Helper: Update row từ data
 */
function updateRowFromData(sheet, rowIndex, headers, colMap, data) {
  for (const key in data) {
    if (colMap[key] !== undefined) {
      sheet.getRange(rowIndex, colMap[key] + 1).setValue(data[key]);
    }
  }
}

/**
 * Helper: Format date
 */
function formatDate(date) {
  if (!date) return '';
  if (typeof date === 'string') return date;
  
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * CORS preflight
 */
function doOptions(e) {
  return ContentService.createTextOutput()
    .setMimeType(ContentService.MimeType.TEXT)
    .setContent('OK')
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type');
}
