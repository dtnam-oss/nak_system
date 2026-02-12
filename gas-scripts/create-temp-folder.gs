/**
 * TẠO TEMP FOLDER MỚI
 * Chạy function này để tạo folder lưu temp files
 */

function createTempFolder() {
  Logger.log('=== TẠO TEMP FOLDER ===\n');
  
  // Tạo folder mới
  var folderName = 'NAK_Payslip_Temp';
  var newFolder = DriveApp.createFolder(folderName);
  
  Logger.log('✅ ĐÃ TẠO FOLDER MỚI!');
  Logger.log('   📁 Tên: ' + newFolder.getName());
  Logger.log('   📋 ID: ' + newFolder.getId());
  Logger.log('   🔗 URL: ' + newFolder.getUrl());
  Logger.log('');
  Logger.log('=== HƯỚNG DẪN ===');
  Logger.log('1. Copy ID từ log trên');
  Logger.log('2. Paste vào TEMP_FOLDER_ID trong PAYSLIP_CONFIG');
  Logger.log('3. Paste vào TEST_TEMP_FOLDER_ID trong test-drive-access.gs');
}

/**
 * TÌM TẤT CẢ FOLDERS TRONG DRIVE
 * Xem tất cả folders để chọn đúng cái
 */
function listAllFolders() {
  Logger.log('=== TẤT CẢ FOLDERS TRONG DRIVE ===\n');
  
  var folders = DriveApp.getFolders();
  var count = 0;
  
  while (folders.hasNext() && count < 20) { // Giới hạn 20 folders đầu tiên
    var folder = folders.next();
    Logger.log('📁 ' + folder.getName());
    Logger.log('   ID: ' + folder.getId());
    Logger.log('   URL: ' + folder.getUrl());
    Logger.log('');
    count++;
  }
  
  if (count === 0) {
    Logger.log('❌ Không tìm thấy folder nào');
    Logger.log('💡 Hãy chạy createTempFolder() để tạo folder mới');
  } else {
    Logger.log('Tìm thấy ' + count + ' folders');
    Logger.log('Chọn 1 folder phù hợp và copy ID của nó');
  }
}
