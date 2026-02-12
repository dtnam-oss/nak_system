/**
 * KIỂM TRA QUYỀN TRUY CẬP TEMPLATES
 * Chạy function này để xem GAS có quyền truy cập templates không
 */

function verifyTemplateAccess() {
  Logger.log('=== KIỂM TRA QUYỀN TRUY CẬP TEMPLATES ===\n');
  
  var TEMPLATE_TONG_HOP_ID = '1EFvSIeUZRI0r2L-cZmCuWOwvwVar3uABRYy1Y2XB4w4';
  var TEMPLATE_CHI_TIET_ID = '1Xs44kf8mFEoctGoLF8-YeEoLdD5u0u2Ou8YrCtbITfF';
  
  // Test Template Tổng hợp
  Logger.log('1. KIỂM TRA TEMPLATE TỔNG HỢP');
  Logger.log('   ID: ' + TEMPLATE_TONG_HOP_ID);
  try {
    var file1 = DriveApp.getFileById(TEMPLATE_TONG_HOP_ID);
    Logger.log('   ✅ CÓ QUYỀN TRUY CẬP');
    Logger.log('   📄 Tên file: ' + file1.getName());
    Logger.log('   👤 Owner: ' + file1.getOwner().getEmail());
    Logger.log('   🔗 URL: ' + file1.getUrl());
    Logger.log('');
  } catch (e) {
    Logger.log('   ❌ KHÔNG THỂ TRUY CẬP!');
    Logger.log('   ⚠️ Lỗi: ' + e.toString());
    Logger.log('   💡 GIẢI PHÁP:');
    Logger.log('      1. Mở URL template trong browser');
    Logger.log('      2. Click "Share" → Thêm email của GAS project');
    Logger.log('      3. Hoặc chọn "Anyone with the link can view"');
    Logger.log('');
    return false;
  }
  
  // Test Template Chi tiết
  Logger.log('2. KIỂM TRA TEMPLATE CHI TIẾT');
  Logger.log('   ID: ' + TEMPLATE_CHI_TIET_ID);
  try {
    var file2 = DriveApp.getFileById(TEMPLATE_CHI_TIET_ID);
    Logger.log('   ✅ CÓ QUYỀN TRUY CẬP');
    Logger.log('   📄 Tên file: ' + file2.getName());
    Logger.log('   👤 Owner: ' + file2.getOwner().getEmail());
    Logger.log('   🔗 URL: ' + file2.getUrl());
    Logger.log('');
  } catch (e) {
    Logger.log('   ❌ KHÔNG THỂ TRUY CẬP!');
    Logger.log('   ⚠️ Lỗi: ' + e.toString());
    Logger.log('   💡 GIẢI PHÁP: Tương tự như template tổng hợp');
    Logger.log('');
    return false;
  }
  
  Logger.log('=== TẤT CẢ TEMPLATES OK! ✅ ===');
  Logger.log('Bạn có thể chạy testSendEmail() bây giờ');
  return true;
}

/**
 * LẤY EMAIL CỦA GAS PROJECT
 * Email này cần được share quyền truy cập templates
 */
function getGasProjectEmail() {
  Logger.log('=== EMAIL CỦA GAS PROJECT ===\n');
  Logger.log('Script ID: ' + ScriptApp.getScriptId());
  Logger.log('Project Key: ' + ScriptApp.getProjectKey());
  
  try {
    var email = Session.getEffectiveUser().getEmail();
    Logger.log('\n📧 Email đang chạy script: ' + email);
    Logger.log('\n💡 HƯỚNG DẪN:');
    Logger.log('1. Mở Google Docs template trong browser');
    Logger.log('2. Click nút "Share" (Chia sẻ)');
    Logger.log('3. Thêm email: ' + email);
    Logger.log('4. Chọn quyền: "Viewer" hoặc "Editor"');
    Logger.log('5. Click "Send"');
  } catch (e) {
    Logger.log('\n⚠️ Không lấy được email: ' + e.toString());
    Logger.log('\nHOẶC làm đơn giản hơn:');
    Logger.log('1. Mở template → Click "Share"');
    Logger.log('2. Chọn "Anyone with the link" → "Viewer"');
    Logger.log('3. Copy link và gửi cho bất kỳ ai');
  }
}

/**
 * TÌM TẤT CẢ GOOGLE DOCS TRONG DRIVE
 * Để tìm templates nếu không biết ID
 */
function findAllGoogleDocs() {
  Logger.log('=== TÌM TẤT CẢ GOOGLE DOCS ===\n');
  
  var docs = DriveApp.searchFiles('mimeType = "application/vnd.google-apps.document"');
  var count = 0;
  
  while (docs.hasNext() && count < 30) {
    var doc = docs.next();
    Logger.log((count + 1) + '. ' + doc.getName());
    Logger.log('   ID: ' + doc.getId());
    Logger.log('   URL: ' + doc.getUrl());
    Logger.log('');
    count++;
  }
  
  if (count === 0) {
    Logger.log('❌ Không tìm thấy Google Docs nào trong Drive');
    Logger.log('💡 Tạo templates bằng cách:');
    Logger.log('1. Mở Google Docs → Tạo file mới');
    Logger.log('2. Thiết kế template với placeholders {{MaTX}}, {{HoTen}}, v.v.');
    Logger.log('3. Copy ID từ URL và paste vào PAYSLIP_CONFIG');
  } else {
    Logger.log('✅ Tìm thấy ' + count + ' Google Docs');
    Logger.log('Tìm 2 templates phù hợp và copy IDs');
  }
}
