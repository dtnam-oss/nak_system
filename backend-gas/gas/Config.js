/**
 * Configuration Service
 * Centralized configuration management
 */

var Config = (function() {
  'use strict';

  // Private configuration
  var config = {
    SPREADSHEET_ID: '18pS9YMZSwZCVBt_anIGn3GN4qFoPpMtALQm4YvMDd-g',
    VEHICLE_SPREADSHEET_ID: '1fzepYrS-o5zc01h7nQFzJSOwagoTvOgoiDQHrTLB12E',

    SHEETS: {
      KE_TOAN: 'ke_toan',
      TONG_QUAN: 'tong_quan',
      DOI_XE: 'doi_xe',
      BAO_CAO_GHN: 'bao_cao_ghn',
      BAO_CAO_JNT: 'bao_cao_jnt_tuyen_nhanh',
      PHUONG_TIEN: 'phuong_tien'
    },

    COLUMNS: {
      NGAY_TAO: 'ngay_tao',
      CHI_TIET_CHUYEN_DI: 'chi_tiet_chuyen_di',
      CHI_TIET_BAO_CAO: 'chi_tiet_bao_cao',
      BIEN_KIEM_SOAT: 'bien_kiem_soat',
      TINH_TRANG_HOAT_DONG: 'tinh_trang_hoat_dong',
      TAI_XE_THEO_XE: 'tai_xe_theo_xe',
      TRANG_THAI: 'trang_thai',
      BIEN_SO: 'bien_so',
      LOAI_CHUYEN: 'loai_chuyen',
      NGAY: 'ngay',
      TONG_CHUYEN: 'tong_chuyen',
      TONG_QUANG_DUONG: 'tong_quang_duong',
      TONG_TAI_TRONG: 'tong_tai_trong'
    },

    ACTIONS: {
      GET_DATA: 'getData',
      GET_REPORT_DATA: 'getReportData',
      GET_VEHICLE_DATA: 'getVehicleData',
      GET_JNT_REPORT: 'getJNTReportData',
      GET_GHN_REPORT: 'getGHNReportData',
      UPDATE_STATUS: 'updateStatus',
      UPDATE_ACTIVITY: 'updateActivity'
    }
  };

  return {
    /**
     * Get spreadsheet ID
     */
    getSpreadsheetId: function() {
      return config.SPREADSHEET_ID;
    },

    /**
     * Get vehicle spreadsheet ID
     */
    getVehicleSpreadsheetId: function() {
      return config.VEHICLE_SPREADSHEET_ID;
    },

    /**
     * Get sheet name by key
     */
    getSheetName: function(sheetKey) {
      return config.SHEETS[sheetKey];
    },

    /**
     * Get column name by key
     */
    getColumnName: function(columnKey) {
      return config.COLUMNS[columnKey];
    },

    /**
     * Get action name by key
     */
    getActionName: function(actionKey) {
      return config.ACTIONS[actionKey];
    },

    /**
     * Get all configuration
     */
    getAll: function() {
      return config;
    }
  };
})();
