/**
 * Data Service
 * Generic data retrieval functions for Google Sheets
 * NAK Logistics System
 */

/**
 * Get reconciliation data with optional filters
 * Delegates to ReconciliationService.getReconciliationData()
 * 
 * @param {Object} filters - Filter object
 * @returns {Object} Response with records and summary
 */
function getReconciliationData(filters) {
  // This function is now handled by ReconciliationService.js
  // Keep this as a reference/proxy if needed
  try {
    Logger.log('DataService: Delegating to ReconciliationService.getReconciliationData');
    
    // Note: The actual implementation is in ReconciliationService.js
    // This is just a wrapper for backwards compatibility
    if (typeof getReconciliationData !== 'undefined') {
      return getReconciliationData(filters);
    }
    
    throw new Error('ReconciliationService not found. Please ensure ReconciliationService.gs is included in the project.');
  } catch (error) {
    Logger.log('Error in DataService.getReconciliationData: ' + error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get data from a specific sheet
 * @param {string} sheetName - Name of the sheet
 * @param {Object} options - Options for data retrieval
 * @returns {Object} Response with data
 */
function getSheetData(sheetName, options = {}) {
  try {
    const ss = SpreadsheetApp.openById(Config.getSpreadsheetId());
    const sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      throw new Error('Sheet not found: ' + sheetName);
    }
    
    const data = sheet.getDataRange().getValues();
    
    if (data.length === 0) {
      return {
        success: true,
        data: {
          headers: [],
          rows: []
        }
      };
    }
    
    const headers = data[0];
    const rows = data.slice(1);
    
    return {
      success: true,
      data: {
        headers: headers,
        rows: rows,
        total: rows.length
      }
    };
  } catch (error) {
    Logger.log('Error in getSheetData: ' + error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get data from data_chuyen_di sheet
 * @param {Object} filters - Optional filters
 * @returns {Object} Response with data
 */
function getChuyenDiData(filters) {
  try {
    const ss = SpreadsheetApp.openById(Config.getSpreadsheetId());
    const sheet = ss.getSheetByName('data_chuyen_di');
    
    if (!sheet) {
      throw new Error('Sheet data_chuyen_di not found');
    }
    
    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return {
        success: true,
        data: {
          records: [],
          total: 0
        }
      };
    }
    
    const headers = data[0];
    const rows = data.slice(1);
    
    return {
      success: true,
      data: {
        headers: headers,
        records: rows,
        total: rows.length
      }
    };
  } catch (error) {
    Logger.log('Error in getChuyenDiData: ' + error.message);
    return {
      success: false,
      error: error.message
    };
  }
}
