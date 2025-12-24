/**
 * AppSheet Webhook Service
 * Xử lý webhook từ AppSheet automation để đồng bộ dữ liệu
 * NAK Logistics System
 */

/**
 * Xử lý webhook từ AppSheet
 * @param {Object} payload - Dữ liệu từ AppSheet
 * @returns {Object} Response
 */
function handleAppSheetWebhook(payload) {
  try {
    Logger.log('Received AppSheet webhook: ' + JSON.stringify(payload));

    // Validate payload
    if (!payload) {
      throw new Error('Payload is empty');
    }

    // Xác định loại event
    const eventType = payload.eventType || payload.event_type || 'unknown';
    const data = payload.data || payload;

    Logger.log('Event type: ' + eventType);

    // Route theo event type
    let result;
    switch (eventType.toLowerCase()) {
      case 'add':
      case 'insert':
      case 'create':
        result = handleAddEvent(data);
        break;

      case 'update':
      case 'edit':
        result = handleUpdateEvent(data);
        break;

      case 'delete':
      case 'remove':
        result = handleDeleteEvent(data);
        break;

      default:
        // Nếu không có eventType, cố gắng xác định từ payload
        if (data.maChuyenDi) {
          result = handleUpsertEvent(data);
        } else {
          throw new Error('Unknown event type: ' + eventType);
        }
    }

    return {
      success: true,
      message: 'Webhook processed successfully',
      eventType: eventType,
      result: result
    };

  } catch (error) {
    Logger.log('Error in handleAppSheetWebhook: ' + error.toString());
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Xử lý event ADD - Thêm mới record
 */
function handleAddEvent(data) {
  try {
    const ss = SpreadsheetApp.openById(Config.getSpreadsheetId());
    const sheet = ss.getSheetByName('data_chuyen_di');

    if (!sheet) {
      throw new Error('Sheet data_chuyen_di không tồn tại');
    }

    // Lấy headers
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const colMap = buildColumnIndexMap(headers);

    // Kiểm tra trùng lặp maChuyenDi
    if (data.maChuyenDi) {
      const existingRow = findRowByMaChuyenDi(sheet, colMap, data.maChuyenDi);
      if (existingRow > 0) {
        Logger.log('Record already exists, updating instead: ' + data.maChuyenDi);
        return handleUpdateEvent(data);
      }
    }

    // Tạo row mới
    const newRow = createRowFromData(headers, data);

    // Thêm vào cuối sheet
    sheet.appendRow(newRow);

    Logger.log('Added new record: ' + data.maChuyenDi);

    return {
      action: 'added',
      maChuyenDi: data.maChuyenDi,
      rowAdded: sheet.getLastRow()
    };

  } catch (error) {
    Logger.log('Error in handleAddEvent: ' + error.toString());
    throw error;
  }
}

/**
 * Xử lý event UPDATE - Cập nhật record
 */
function handleUpdateEvent(data) {
  try {
    const ss = SpreadsheetApp.openById(Config.getSpreadsheetId());
    const sheet = ss.getSheetByName('data_chuyen_di');

    if (!sheet) {
      throw new Error('Sheet data_chuyen_di không tồn tại');
    }

    // Lấy headers
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const colMap = buildColumnIndexMap(headers);

    // Tìm row cần update
    const maChuyenDi = data.maChuyenDi || data.ma_chuyen_di;
    if (!maChuyenDi) {
      throw new Error('maChuyenDi is required for update');
    }

    const rowIndex = findRowByMaChuyenDi(sheet, colMap, maChuyenDi);
    if (rowIndex <= 0) {
      Logger.log('Record not found, adding instead: ' + maChuyenDi);
      return handleAddEvent(data);
    }

    // Update từng field
    updateRowFromData(sheet, rowIndex, headers, colMap, data);

    Logger.log('Updated record at row ' + rowIndex + ': ' + maChuyenDi);

    return {
      action: 'updated',
      maChuyenDi: maChuyenDi,
      rowUpdated: rowIndex
    };

  } catch (error) {
    Logger.log('Error in handleUpdateEvent: ' + error.toString());
    throw error;
  }
}

/**
 * Xử lý event DELETE - Xóa record
 */
function handleDeleteEvent(data) {
  try {
    const ss = SpreadsheetApp.openById(Config.getSpreadsheetId());
    const sheet = ss.getSheetByName('data_chuyen_di');

    if (!sheet) {
      throw new Error('Sheet data_chuyen_di không tồn tại');
    }

    // Lấy headers
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const colMap = buildColumnIndexMap(headers);

    // Tìm row cần xóa
    const maChuyenDi = data.maChuyenDi || data.ma_chuyen_di;
    if (!maChuyenDi) {
      throw new Error('maChuyenDi is required for delete');
    }

    const rowIndex = findRowByMaChuyenDi(sheet, colMap, maChuyenDi);
    if (rowIndex <= 0) {
      throw new Error('Record not found: ' + maChuyenDi);
    }

    // Xóa row
    sheet.deleteRow(rowIndex);

    Logger.log('Deleted record at row ' + rowIndex + ': ' + maChuyenDi);

    return {
      action: 'deleted',
      maChuyenDi: maChuyenDi,
      rowDeleted: rowIndex
    };

  } catch (error) {
    Logger.log('Error in handleDeleteEvent: ' + error.toString());
    throw error;
  }
}

/**
 * Xử lý UPSERT - Thêm mới hoặc cập nhật
 */
function handleUpsertEvent(data) {
  try {
    const ss = SpreadsheetApp.openById(Config.getSpreadsheetId());
    const sheet = ss.getSheetByName('data_chuyen_di');

    if (!sheet) {
      throw new Error('Sheet data_chuyen_di không tồn tại');
    }

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const colMap = buildColumnIndexMap(headers);

    const maChuyenDi = data.maChuyenDi || data.ma_chuyen_di;
    if (!maChuyenDi) {
      throw new Error('maChuyenDi is required');
    }

    const rowIndex = findRowByMaChuyenDi(sheet, colMap, maChuyenDi);

    if (rowIndex > 0) {
      // Update existing
      return handleUpdateEvent(data);
    } else {
      // Add new
      return handleAddEvent(data);
    }

  } catch (error) {
    Logger.log('Error in handleUpsertEvent: ' + error.toString());
    throw error;
  }
}

/**
 * Helper: Tìm row theo maChuyenDi
 */
function findRowByMaChuyenDi(sheet, colMap, maChuyenDi) {
  const maChuyenDiCol = colMap.maChuyenDi || colMap.ma_chuyen_di;
  if (typeof maChuyenDiCol === 'undefined') {
    throw new Error('Column maChuyenDi not found');
  }

  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][maChuyenDiCol]).trim() === String(maChuyenDi).trim()) {
      return i + 1; // Row index (1-based)
    }
  }

  return -1; // Not found
}

/**
 * Helper: Tạo row từ data object
 */
function createRowFromData(headers, data) {
  const row = [];

  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    const value = data[header] || data[toCamelCase(header)] || '';
    row.push(value);
  }

  return row;
}

/**
 * Helper: Update row từ data object
 */
function updateRowFromData(sheet, rowIndex, headers, colMap, data) {
  // Update từng field có trong data
  for (const key in data) {
    if (data.hasOwnProperty(key)) {
      const colIndex = colMap[key];
      if (typeof colIndex !== 'undefined') {
        const value = data[key];
        sheet.getRange(rowIndex, colIndex + 1).setValue(value);
      }
    }
  }
}

/**
 * Helper: Convert snake_case to camelCase
 */
function toCamelCase(str) {
  return str.replace(/_([a-z])/g, function(match, letter) {
    return letter.toUpperCase();
  });
}

/**
 * Build column index map (reuse from ReportService)
 */
function buildColumnIndexMap(headers) {
  const map = {};
  for (let i = 0; i < headers.length; i++) {
    map[headers[i]] = i;
  }
  return map;
}
