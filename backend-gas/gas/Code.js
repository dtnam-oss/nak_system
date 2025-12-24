/**
 * Main Entry Point
 * Google Apps Script Code for NAK Logistics
 *
 * Workflow: AppSheet → Webhook → Google Sheets
 * 
 * AppSheet (VEHICLE_SPREADSHEET_ID) gọi webhook để sync data
 * sang Google Sheets chính (SPREADSHEET_ID) cho web dashboard
 *
 * Migration: Simplified to webhook-only architecture (2025-12-23)
 */

/**
 * Handle GET requests
 * Serve dashboard reports từ Google Sheets
 */
function doGet(e) {
  try {
    const params = e.parameter;
    const action = params.action;

    // Route: Get Dashboard Report
    if (action === 'getDashboardReport') {
      const result = getDashboardReport();
      return createJsonResponse(result);
    }

    // Route: Get Dashboard Report with Filters
    if (action === 'getDashboardReportWithFilters') {
      const filters = params.filters ? JSON.parse(params.filters) : {};
      const result = getDashboardReportWithFilters(filters);
      return createJsonResponse(result);
    }

    // Route: Get Reconciliation Data
    if (action === 'getReconciliationData') {
      const filters = params.filters ? JSON.parse(params.filters) : null;
      const result = getReconciliationData(filters);
      return createJsonResponse(result);
    }

    // Default response
    return createJsonResponse({
      success: true,
      message: 'NAK Logistics API - Webhook Sync',
      version: '2.0',
      architecture: 'AppSheet → Webhook → Google Sheets',
      availableActions: [
        'getDashboardReport',
        'getDashboardReportWithFilters',
        'getReconciliationData'
      ]
    });

  } catch (error) {
    Logger.log('Error in doGet: ' + error.toString());
    return createJsonResponse({
      success: false,
      error: error.toString()
    });
  }
}

/**
 * Handle POST requests - Webhook từ AppSheet
 * ⚠️ DEPRECATED - Logic moved to WebhookSync.gs
 * Giữ lại để backward compatibility
 */
function doPost(e) {
  try {
    // Parse request data
    var requestData = JSON.parse(e.postData.contents);
    var action = requestData.action;

    // Route: Update vehicle status
    if (action === Config.getActionName('UPDATE_STATUS') ||
        (requestData.ma_tai_xe && requestData.trang_thai_chuyen_di)) {

      var maTaiXe = requestData.ma_tai_xe;
      var trangThaiChuyenDi = requestData.trang_thai_chuyen_di;

      if (!maTaiXe || !trangThaiChuyenDi) {
        return createJsonResponse(
          Utils.createErrorResponse('Missing required parameters: ma_tai_xe or trang_thai_chuyen_di')
        );
      }

      var result = UpdateService.updateVehicleStatus(maTaiXe, trangThaiChuyenDi);
      return createJsonResponse(result);
    }

    // Route: Update vehicle activity
    if (action === Config.getActionName('UPDATE_ACTIVITY') ||
        (requestData.bien_kiem_soat && requestData.ngay_tao && requestData.so_luong_chuyen !== undefined)) {

      var bienKiemSoat = requestData.bien_kiem_soat;
      var ngayTao = requestData.ngay_tao;
      var soLuongChuyen = requestData.so_luong_chuyen;

      if (!bienKiemSoat || !ngayTao || soLuongChuyen === undefined) {
        return createJsonResponse(
          Utils.createErrorResponse('Missing required parameters: bien_kiem_soat, ngay_tao, or so_luong_chuyen')
        );
      }

      var result = UpdateService.updateVehicleActivity(bienKiemSoat, ngayTao, soLuongChuyen);
      return createJsonResponse(result);
    }

    // Unknown action
    return createJsonResponse(
      Utils.createErrorResponse('Invalid action or missing parameters. Use WebhookSync.gs for new integrations.')
    );

  } catch (error) {
    Logger.log('Error in doPost: ' + error);
    return createJsonResponse(
      Utils.createErrorResponse('Server error', error)
    );
  }
}

/**
 * Create JSON response with CORS headers
 */
function createJsonResponse(data) {
  var output = ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);

  return output;
}

/**
 * Handle OPTIONS requests for CORS preflight
 */
function doOptions(e) {
  return ContentService
    .createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT);
}
