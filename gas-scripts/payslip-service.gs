/**
 * Google Apps Script - Payslip Email Service
 * Generates PDFs from Google Docs templates and sends emails
 */

// === CẤU HÌNH - PASTE TEMPLATE IDs VÀO ĐÂY ===
var PAYSLIP_CONFIG = {
  TEMPLATE_TONG_HOP_ID: '1EFvSIeUZRI0r2L-cZmCuWOwvwVar3uABRYy1Y2XB4w4',
  TEMPLATE_CHI_TIET_ID: '1Xs44kf8mFEoctGoLF8-YeEoLdD5u0u2Ou8YrCtbITfF',
  TEMP_FOLDER_ID: '12Vtqd6Wd4mHr4JQ55t9cmAaffYL5XDJ'
};

/**
 * doPost - Main endpoint nhận request từ Next.js
 */
function doPost(e) {
  try {
    Logger.log('=== doPost called ===');
    
    // Parse incoming data
    var data = JSON.parse(e.postData.contents);
    Logger.log('Received data for: ' + data.ten_nhan_vien);
    
    // Generate PDFs from Google Docs templates
    var pdfs = createPayslipPDFs(data);
    Logger.log('PDFs generated successfully');
    
    // Send email
    sendEmailWithPDFs(data, pdfs.pdfTongHop, pdfs.pdfChiTiet);
    Logger.log('Email sent successfully');
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    Logger.log('ERROR in doPost: ' + error.toString());
    Logger.log('Stack: ' + error.stack);
    
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * doGet - For testing Web App deployment
 */
function doGet() {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'ok',
    message: 'NAK Payslip Service is running',
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Tạo PDF từ Google Docs templates
 */
function createPayslipPDFs(data) {
  try {
    // 1. Tạo PDF Tổng hợp
    var pdfTongHop = createTongHopPDF(data);
    
    // 2. Tạo PDF Chi tiết
    var pdfChiTiet = createChiTietPDF(data);
    
    return {
      pdfTongHop: pdfTongHop,
      pdfChiTiet: pdfChiTiet
    };
    
  } catch (error) {
    Logger.log('Error creating PDFs: ' + error);
    throw error;
  }
}

/**
 * Tạo PDF Tổng hợp
 */
function createTongHopPDF(data) {
  try {
    var template = DriveApp.getFileById(PAYSLIP_CONFIG.TEMPLATE_TONG_HOP_ID);
  } catch (error) {
    Logger.log('ERROR: Cannot access template');
    Logger.log('TEMPLATE_TONG_HOP_ID: ' + PAYSLIP_CONFIG.TEMPLATE_TONG_HOP_ID);
    throw new Error('Cannot access Google Drive files. Check Template IDs and permissions: ' + error.toString());
  }
  
  // Copy template (save to root Drive)
  var tempDoc = template.makeCopy('Temp_TongHop_' + data.ma_nhan_vien);
  var doc = DocumentApp.openById(tempDoc.getId());
  var body = doc.getBody();
  
  // Replace placeholders
  body.replaceText('\\{\\{MaTX\\}\\}', data.ma_nhan_vien || '');
  body.replaceText('\\{\\{HoTen\\}\\}', data.ten_nhan_vien || '');
  body.replaceText('\\{\\{thang\\}\\}', data.thang || '');
  body.replaceText('\\{\\{nam\\}\\}', data.nam || '');
  
  // Format currency and replace - Thu nhập
  body.replaceText('\\{\\{luong_bat_dau\\}\\}', formatCurrency(data.luong_bat_dau));
  body.replaceText('\\{\\{hoan_coc\\}\\}', formatCurrency(data.hoan_coc));
  body.replaceText('\\{\\{thuong\\}\\}', formatCurrency(data.thuong));
  body.replaceText('\\{\\{tong_thu_nhap\\}\\}', formatCurrency(data.tong_thu_nhap));
  
  // Format currency and replace - Khấu trừ
  body.replaceText('\\{\\{truy_thu_dau\\}\\}', formatCurrency(data.truy_thu_dau));
  body.replaceText('\\{\\{truy_thu_ontime\\}\\}', formatCurrency(data.truy_thu_ontime));
  body.replaceText('\\{\\{tru_coc\\}\\}', formatCurrency(data.tru_coc));
  body.replaceText('\\{\\{phat_che_tai\\}\\}', formatCurrency(data.phat_che_tai));
  body.replaceText('\\{\\{truy_thu_vetc\\}\\}', formatCurrency(data.truy_thu_vetc));
  body.replaceText('\\{\\{phat_nguoi\\}\\}', formatCurrency(data.phat_nguoi));
  body.replaceText('\\{\\{tien_lam_the\\}\\}', formatCurrency(data.tien_lam_the));
  body.replaceText('\\{\\{bhxh\\}\\}', formatCurrency(data.bhxh));
  body.replaceText('\\{\\{khac\\}\\}', formatCurrency(data.khac));
  body.replaceText('\\{\\{tong_khau_tru\\}\\}', formatCurrency(data.tong_khau_tru));
  body.replaceText('\\{\\{luong_thuc_lanh\\}\\}', formatCurrency(data.luong_thuc_lanh));
  
  doc.saveAndClose();
  
  // Convert to PDF
  var pdf = tempDoc.getAs(MimeType.PDF);
  pdf.setName('Phieu_Luong_Tong_Hop_' + data.thang + '_' + data.nam + '_' + data.ma_nhan_vien + '.pdf');
  
  tempDoc.setTrashed(true); // Delete temp doc
  
  return pdf;
}

/**
 * Tạo PDF Chi tiết (Chỉ lương chuyến)
 */
function createChiTietPDF(data) {
  try {
    var template = DriveApp.getFileById(PAYSLIP_CONFIG.TEMPLATE_CHI_TIET_ID);
  } catch (error) {
    Logger.log('ERROR: Cannot access chi tiet template');
    Logger.log('TEMPLATE_CHI_TIET_ID: ' + PAYSLIP_CONFIG.TEMPLATE_CHI_TIET_ID);
    throw new Error('Cannot access Google Drive files: ' + error.toString());
  }
  
  var tempDoc = template.makeCopy('Temp_ChiTiet_' + data.ma_nhan_vien);
  var doc = DocumentApp.openById(tempDoc.getId());
  var body = doc.getBody();
  
  // Replace basic info
  body.replaceText('\\{\\{ten_nhan_vien\\}\\}', data.ten_nhan_vien || '');
  body.replaceText('\\{\\{ma_nhan_vien\\}\\}', data.ma_nhan_vien || '');
  body.replaceText('\\{\\{thang\\}\\}', data.thang || '');
  body.replaceText('\\{\\{nam\\}\\}', data.nam || '');
  
  // Fill table with lương chuyến data
  var tables = body.getTables();
  if (tables.length > 0 && data.luongChuyen && data.luongChuyen.length > 0) {
    var table = tables[0];
    
    // Remove sample rows (keep header row 0)
    while (table.getNumRows() > 1) {
      table.removeRow(1);
    }
    
    // Add data rows
    data.luongChuyen.forEach(function(row, index) {
      var newRow = table.appendTableRow();
      newRow.appendTableCell((index + 1).toString());
      newRow.appendTableCell(row.ma_chuyen || '');
      newRow.appendTableCell(row.ngay_bat_dau || '');
      newRow.appendTableCell(row.ten_khach_hang || '');
      newRow.appendTableCell(row.tuyen_duong || '');
      newRow.appendTableCell(formatCurrency(row.luong_chuyen || 0));
    });
  }
  
  // Replace tổng lương
  body.replaceText('\\{\\{tong_luong_chuyen\\}\\}', formatCurrency(data.tong_luong_chuyen || 0));
  
  doc.saveAndClose();
  
  var pdf = tempDoc.getAs(MimeType.PDF);
  pdf.setName('Phieu_Luong_Chi_Tiet_' + data.thang + '_' + data.nam + '_' + data.ma_nhan_vien + '.pdf');
  
  tempDoc.setTrashed(true);
  
  return pdf;
}

/**
 * Send email với PDFs
 */
function sendEmailWithPDFs(data, pdfTongHop, pdfChiTiet) {
  var subject = 'Phiếu lương tháng ' + data.month + '/' + data.year + ' - ' + data.recipientName;
  var htmlBody = getEmailTemplate(data);
  
  GmailApp.sendEmail(
    data.recipientEmail,
    subject,
    'Phiếu lương tháng ' + data.month + '/' + data.year,
    {
      htmlBody: htmlBody,
      attachments: [pdfTongHop, pdfChiTiet],
      name: 'Phòng Nhân sự NAK'
    }
  );
}

/**
 * Email HTML template
 */
function getEmailTemplate(data) {
  return '<!DOCTYPE html>' +
    '<html>' +
    '<head><meta charset="UTF-8"></head>' +
    '<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">' +
    '<div style="max-width: 600px; margin: 0 auto; padding: 20px;">' +
    '<h2 style="color: #4272c4;">NAK Logistics - Phòng Nhân sự</h2>' +
    '<p>Kính gửi anh/chị <strong>' + data.recipientName + '</strong>,</p>' +
    '<p>Công ty gửi anh/chị phiếu lương tháng <strong>' + data.month + '/' + data.year + '</strong>.</p>' +
    '<p>Vui lòng xem các file đính kèm để biết chi tiết.</p>' +
    '<p>Trân trọng,<br>Phòng Nhân sự NAK</p>' +
    '</div></body></html>';
}

/**
 * Format currency
 */
function formatCurrency(value) {
  if (!value || value === 0) return '0 đ';
  return parseFloat(value).toLocaleString('vi-VN') + ' đ';
}

/**
 * Test function - Run this to test
 */
function testSendEmail() {
  var testData = {
    recipientEmail: 'test@example.com',
    recipientName: 'Nguyễn Văn A',
    month: 2,
    year: 2026,
    ma_nhan_vien: 'LX001',
    ten_nhan_vien: 'Nguyễn Văn A',
    thang: 2,
    nam: 2026,
    luong_bat_dau: 18750000,
    hoan_coc: 0,
    thuong: 5000000,
    tong_thu_nhap: 23750000,
    truy_thu_dau: 0,
    truy_thu_ontime: 0,
    tru_coc: 0,
    phat_che_tai: 0,
    truy_thu_vetc: 0,
    phat_nguoi: 0,
    tien_lam_the: 0,
    bhxh: 520000,
    khac: 0,
    tong_khau_tru: 520000,
    luong_thuc_lanh: 23230000,
    tong_luong_chuyen: 18750000,
    luongChuyen: [
      {
        ma_chuyen: 'CHT001',
        ngay_bat_dau: '05/02/2026',
        ten_khach_hang: 'Công ty ABC',
        tuyen_duong: 'HCM - Hà Nội',
        luong_chuyen: 6250000
      },
      {
        ma_chuyen: 'CHT002',
        ngay_bat_dau: '12/02/2026',
        ten_khach_hang: 'Công ty XYZ',
        tuyen_duong: 'HCM - Đà Nẵng',
        luong_chuyen: 6250000
      }
    ]
  };
  
  try {
    var pdfs = createPayslipPDFs(testData);
    sendEmailWithPDFs(testData, pdfs.pdfTongHop, pdfs.pdfChiTiet);
    Logger.log('✅ Test email sent successfully!');
  } catch (error) {
    Logger.log('❌ Test failed: ' + error);
  }
}
