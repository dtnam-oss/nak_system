/**
 * Update Service
 * Handles all update operations to Google Sheets
 */

var UpdateService = (function() {
  'use strict';

  /**
   * Base function to update sheet data
   */
  function updateSheetData(spreadsheetId, sheetName, searchColumn, searchValue, updateColumn, updateValue) {
    try {
      var spreadsheet = SpreadsheetApp.openById(spreadsheetId);
      var sheet = spreadsheet.getSheetByName(sheetName);

      if (!sheet) {
        return Utils.createErrorResponse('Sheet "' + sheetName + '" not found');
      }

      var data = sheet.getDataRange().getValues();
      var headers = data[0];

      // Get column indexes
      var searchColIndex = Utils.getColumnIndex(headers, searchColumn);
      var updateColIndex = Utils.getColumnIndex(headers, updateColumn);

      if (searchColIndex === -1 || updateColIndex === -1) {
        return Utils.createErrorResponse(
          'Required columns not found. Looking for: ' + searchColumn + ', ' + updateColumn
        );
      }

      // Update rows
      var updatedCount = 0;
      var updatedRows = [];

      for (var row = 1; row < data.length; row++) {
        var cellValue = Utils.normalizeString(data[row][searchColIndex]);
        var searchValueNormalized = Utils.normalizeString(searchValue);

        if (cellValue === searchValueNormalized) {
          sheet.getRange(row + 1, updateColIndex + 1).setValue(updateValue);
          updatedCount++;
          updatedRows.push(row + 1);
          Logger.log('Updated row ' + (row + 1));
        }
      }

      return Utils.createSuccessResponse(
        {
          updatedCount: updatedCount,
          updatedRows: updatedRows
        },
        'Updated ' + updatedCount + ' row(s)'
      );

    } catch (error) {
      return Utils.createErrorResponse('Error updating sheet', error);
    }
  }

  /**
   * Base function to update sheet data with array of search values
   */
  function updateSheetDataBatch(spreadsheetId, sheetName, searchColumn, searchValues, updateColumn, updateValue) {
    try {
      var spreadsheet = SpreadsheetApp.openById(spreadsheetId);
      var sheet = spreadsheet.getSheetByName(sheetName);

      if (!sheet) {
        return Utils.createErrorResponse('Sheet "' + sheetName + '" not found');
      }

      var data = sheet.getDataRange().getValues();
      var headers = data[0];

      // Get column indexes
      var searchColIndex = Utils.getColumnIndex(headers, searchColumn);
      var updateColIndex = Utils.getColumnIndex(headers, updateColumn);

      if (searchColIndex === -1 || updateColIndex === -1) {
        return Utils.createErrorResponse(
          'Required columns not found. Looking for: ' + searchColumn + ', ' + updateColumn
        );
      }

      var searchArray = Utils.ensureArray(searchValues);
      var updatedCount = 0;
      var updatedRows = [];

      // Update rows
      for (var row = 1; row < data.length; row++) {
        var cellValue = Utils.normalizeString(data[row][searchColIndex]);
        var shouldUpdate = false;

        // Check if cell value contains any of the search values
        for (var i = 0; i < searchArray.length; i++) {
          var searchValueNormalized = Utils.normalizeString(searchArray[i]);
          if (cellValue.indexOf(searchValueNormalized) !== -1) {
            shouldUpdate = true;
            break;
          }
        }

        if (shouldUpdate) {
          sheet.getRange(row + 1, updateColIndex + 1).setValue(updateValue);
          updatedCount++;
          updatedRows.push(row + 1);
          Logger.log('Updated row ' + (row + 1) + ' - ' + searchColumn + ': ' + cellValue);
        }
      }

      return Utils.createSuccessResponse(
        {
          updatedCount: updatedCount,
          updatedRows: updatedRows,
          searchValues: searchArray,
          updateValue: updateValue
        },
        'Updated ' + updatedCount + ' row(s)'
      );

    } catch (error) {
      return Utils.createErrorResponse('Error updating sheet', error);
    }
  }

  /**
   * Update JSON field in sheet
   */
  function updateJsonField(spreadsheetId, sheetName, searchColumn, searchValue, jsonColumn, jsonKey, jsonValue) {
    try {
      var spreadsheet = SpreadsheetApp.openById(spreadsheetId);
      var sheet = spreadsheet.getSheetByName(sheetName);

      if (!sheet) {
        return Utils.createErrorResponse('Sheet "' + sheetName + '" not found');
      }

      var data = sheet.getDataRange().getValues();
      var headers = data[0];

      // Get column indexes
      var searchColIndex = Utils.getColumnIndex(headers, searchColumn);
      var jsonColIndex = Utils.getColumnIndex(headers, jsonColumn);

      if (searchColIndex === -1 || jsonColIndex === -1) {
        return Utils.createErrorResponse(
          'Required columns not found. Looking for: ' + searchColumn + ', ' + jsonColumn
        );
      }

      // Find target row
      var targetRow = -1;
      for (var row = 1; row < data.length; row++) {
        var cellValue = Utils.normalizeString(data[row][searchColIndex]);
        var searchValueNormalized = Utils.normalizeString(searchValue);

        if (cellValue === searchValueNormalized) {
          targetRow = row;
          break;
        }
      }

      if (targetRow === -1) {
        return Utils.createErrorResponse(
          'Record with ' + searchColumn + ' "' + searchValue + '" not found'
        );
      }

      // Get current JSON value
      var currentValue = data[targetRow][jsonColIndex];
      var jsonData = Utils.parseJSON(currentValue, {});

      // Update JSON data
      if (jsonValue !== null && jsonValue !== undefined) {
        jsonData[jsonKey] = jsonValue;
      } else {
        delete jsonData[jsonKey];
      }

      // Save updated JSON
      var jsonString = Utils.stringifyJSON(jsonData);
      sheet.getRange(targetRow + 1, jsonColIndex + 1).setValue(jsonString);

      Logger.log('Updated JSON field - row: ' + (targetRow + 1) + ', key: ' + jsonKey);

      return Utils.createSuccessResponse(
        {
          row: targetRow + 1,
          searchValue: searchValue,
          jsonKey: jsonKey,
          jsonValue: jsonValue
        },
        'Updated JSON field successfully'
      );

    } catch (error) {
      return Utils.createErrorResponse('Error updating JSON field', error);
    }
  }

  // Public API
  return {
    /**
     * Update vehicle status
     * Updates trang_thai for vehicles matching tai_xe_theo_xe
     */
    updateVehicleStatus: function(maTaiXe, trangThai) {
      return updateSheetDataBatch(
        Config.getVehicleSpreadsheetId(),
        Config.getSheetName('PHUONG_TIEN'),
        Config.getColumnName('TAI_XE_THEO_XE'),
        maTaiXe,
        Config.getColumnName('TRANG_THAI'),
        trangThai
      );
    },

    /**
     * Update vehicle activity
     * Updates tinh_trang_hoat_dong JSON field
     */
    updateVehicleActivity: function(bienKiemSoat, ngayTao, soLuongChuyen) {
      // Convert date format if needed
      var dateKey = Utils.convertDateFormat(ngayTao);

      // Prepare activity data
      var activityData = (soLuongChuyen > 0)
        ? { so_luong_chuyen: soLuongChuyen }
        : {};

      return updateJsonField(
        Config.getSpreadsheetId(),
        Config.getSheetName('DOI_XE'),
        Config.getColumnName('BIEN_KIEM_SOAT'),
        bienKiemSoat,
        Config.getColumnName('TINH_TRANG_HOAT_DONG'),
        dateKey,
        activityData
      );
    },

    /**
     * Generic update function for custom use cases
     */
    updateCell: function(spreadsheetId, sheetName, searchColumn, searchValue, updateColumn, updateValue) {
      return updateSheetData(spreadsheetId, sheetName, searchColumn, searchValue, updateColumn, updateValue);
    },

    /**
     * Generic batch update function
     */
    updateCellBatch: function(spreadsheetId, sheetName, searchColumn, searchValues, updateColumn, updateValue) {
      return updateSheetDataBatch(spreadsheetId, sheetName, searchColumn, searchValues, updateColumn, updateValue);
    }
  };
})();
