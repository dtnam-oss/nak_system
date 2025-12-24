/**
 * Utilities Service
 * Common helper functions
 */

var Utils = (function() {
  'use strict';

  return {
    /**
     * Format date to DD/MM/YYYY
     */
    formatDateToDMY: function(date) {
      if (!(date instanceof Date)) {
        return date;
      }
      var day = String(date.getDate()).padStart(2, '0');
      var month = String(date.getMonth() + 1).padStart(2, '0');
      var year = date.getFullYear();
      return day + '/' + month + '/' + year;
    },

    /**
     * Format date to YYYY-MM-DD
     */
    formatDateToYMD: function(date) {
      if (!(date instanceof Date)) {
        return date;
      }
      var day = String(date.getDate()).padStart(2, '0');
      var month = String(date.getMonth() + 1).padStart(2, '0');
      var year = date.getFullYear();
      return year + '-' + month + '-' + day;
    },

    /**
     * Convert date format from YYYY-MM-DD to DD/MM/YYYY
     */
    convertDateFormat: function(dateString) {
      if (!dateString || typeof dateString !== 'string') {
        return dateString;
      }
      if (dateString.includes('-')) {
        var parts = dateString.split('-');
        if (parts.length === 3) {
          return parts[2] + '/' + parts[1] + '/' + parts[0];
        }
      }
      return dateString;
    },

    /**
     * Safe JSON parse
     */
    parseJSON: function(jsonString, defaultValue) {
      if (typeof jsonString !== 'string' || !jsonString.trim()) {
        return defaultValue || null;
      }
      try {
        return JSON.parse(jsonString);
      } catch (e) {
        Logger.log('Error parsing JSON: ' + e);
        return defaultValue || null;
      }
    },

    /**
     * Safe JSON stringify
     */
    stringifyJSON: function(obj) {
      try {
        return JSON.stringify(obj);
      } catch (e) {
        Logger.log('Error stringifying JSON: ' + e);
        return '';
      }
    },

    /**
     * Get column index by name
     */
    getColumnIndex: function(headers, columnName) {
      for (var i = 0; i < headers.length; i++) {
        if (headers[i] === columnName) {
          return i;
        }
      }
      return -1;
    },

    /**
     * Get multiple column indexes
     */
    getColumnIndexes: function(headers, columnNames) {
      var indexes = {};
      for (var i = 0; i < headers.length; i++) {
        if (columnNames.indexOf(headers[i]) !== -1) {
          indexes[headers[i]] = i;
        }
      }
      return indexes;
    },

    /**
     * Normalize string for comparison
     */
    normalizeString: function(str) {
      if (!str) return '';
      return str.toString().trim();
    },

    /**
     * Create success response
     */
    createSuccessResponse: function(data, message) {
      return {
        success: true,
        message: message || 'Operation completed successfully',
        data: data
      };
    },

    /**
     * Create error response
     */
    createErrorResponse: function(message, error) {
      var response = {
        success: false,
        message: message || 'Operation failed'
      };
      if (error) {
        response.error = error.toString();
        Logger.log('Error: ' + error);
      }
      return response;
    },

    /**
     * Convert array to JSON response
     */
    arrayToJsonResponse: function(headers, dataArray, transformFn) {
      var jsonData = [];

      for (var i = 0; i < dataArray.length; i++) {
        var row = {};
        for (var j = 0; j < headers.length; j++) {
          row[headers[j]] = dataArray[i][j];
        }

        // Apply transformation function if provided
        if (typeof transformFn === 'function') {
          row = transformFn(row, headers);
        }

        jsonData.push(row);
      }

      return jsonData;
    },

    /**
     * Ensure array type
     */
    ensureArray: function(value) {
      if (Array.isArray(value)) {
        return value;
      }
      if (typeof value === 'string') {
        return [value];
      }
      return [];
    }
  };
})();
