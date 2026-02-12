/**
 * LẤY ĐÚNG TEMPLATE IDs
 * Chạy function này để tìm đúng IDs của Templates và Folder
 */

function listMyDriveFiles() {
  Logger.log('=== TÌM KIẾM FILES TRONG GOOGLE DRIVE ===\n');
  
  // 1. Tìm Phiếu lương tổng hợp
  Logger.log('1. TÌM "Phiếu lương tổng hợp":');
  var searchTongHop = DriveApp.searchFiles('title contains "tổng hợp"');
  var foundTongHop = false;
  while (searchTongHop.hasNext()) {
    var file = searchTongHop.next();
    Logger.log('   ✅ Tìm thấy: ' + file.getName());
    Logger.log('   📋 ID: ' + file.getId());
    Logger.log('   🔗 URL: ' + file.getUrl());
    Logger.log('');
    foundTongHop = true;
  }
  if (!foundTongHop) {
    Logger.log('   ❌ Không tìm thấy file nào\n');
  }
  
  // 2. Tìm Phiếu lương chi tiết
  Logger.log('2. TÌM "Phiếu lương chi tiết":');
  var searchChiTiet = DriveApp.searchFiles('title contains "chi tiết"');
  var foundChiTiet = false;
  while (searchChiTiet.hasNext()) {
    var file = searchChiTiet.next();
    Logger.log('   ✅ Tìm thấy: ' + file.getName());
    Logger.log('   📋 ID: ' + file.getId());
    Logger.log('   🔗 URL: ' + file.getUrl());
    Logger.log('');
    foundChiTiet = true;
  }
  if (!foundChiTiet) {
    Logger.log('   ❌ Không tìm thấy file nào\n');
  }
  
  // 3. Tìm Temp folder
  Logger.log('3. TÌM FOLDER "Temp" hoặc "temp":');
  var searchFolder = DriveApp.searchFolders('title contains "temp"');
  var foundFolder = false;
  while (searchFolder.hasNext()) {
    var folder = searchFolder.next();
    Logger.log('   ✅ Tìm thấy: ' + folder.getName());
    Logger.log('   📋 ID: ' + folder.getId());
    Logger.log('   🔗 URL: ' + folder.getUrl());
    Logger.log('');
    foundFolder = true;
  }
  if (!foundFolder) {
    Logger.log('   ❌ Không tìm thấy folder nào\n');
  }
  
  Logger.log('=== HƯỚNG DẪN ===');
  Logger.log('1. Copy 3 IDs từ log trên');
  Logger.log('2. Paste vào PAYSLIP_CONFIG trong file payslip-service.gs');
  Logger.log('3. Paste vào TEST_TEMPLATE_... trong file test-drive-access.gs');
}

/**
 * LẤY ID TỪ URL
 * Nếu bạn có URL của file/folder, paste URL vào đây
 */
function getIdFromUrl() {
  // PASTE URL VÀO ĐÂY:
  var url1 = 'https://docs.google.com/document/d/1EFvSIeUZRI0r2L-cZmCuWOwvwVar3uABRYy1Y2XB4w4/edit';
  var url2 = 'https://docs.google.com/document/d/1Xs44kf8mFEoctGoLF8-YeEoLdD5u0u2Ou8YrCtbITfF/edit';
  var url3 = 'https://drive.google.com/drive/folders/12Vtqd6Wd4mHr4JQ55t9cmAaffYL5XDJ';
  
  Logger.log('ID từ URL 1: ' + extractId(url1));
  Logger.log('ID từ URL 2: ' + extractId(url2));
  Logger.log('ID từ URL 3: ' + extractId(url3));
}

function extractId(url) {
  if (!url) return 'CHƯA PASTE URL';
  
  // Extract from /d/ID/ or /folders/ID
  var match1 = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match1) return match1[1];
  
  var match2 = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (match2) return match2[1];
  
  var match3 = url.match(/id=([a-zA-Z0-9_-]+)/);
  if (match3) return match3[1];
  
  return 'KHÔNG TRÍCH XUẤT ĐƯỢC ID TỪ URL';
}

/**
 * TEST ACCESS VỚI ID CỤ THỂ
 * Paste ID bạn muốn test vào đây
 */
function testSpecificId() {
  var testId = '12VtqdGMd4mHrE4JQ55t9cmAaffYL5XDa'; // PASTE ID VÀO ĐÂY
  
  Logger.log('Testing ID: ' + testId);
  
  // Try as file
  try {
    var file = DriveApp.getFileById(testId);
    Logger.log('✅ ĐÂY LÀ FILE');
    Logger.log('   Tên: ' + file.getName());
    Logger.log('   URL: ' + file.getUrl());
    return;
  } catch (e) {
    Logger.log('❌ Không phải file: ' + e.toString());
  }
  
  // Try as folder
  try {
    var folder = DriveApp.getFolderById(testId);
    Logger.log('✅ ĐÂY LÀ FOLDER');
    Logger.log('   Tên: ' + folder.getName());
    Logger.log('   URL: ' + folder.getUrl());
    return;
  } catch (e) {
    Logger.log('❌ Không phải folder: ' + e.toString());
  }
  
  Logger.log('❌ KHÔNG THỂ TRUY CẬP ID NÀY!');
  Logger.log('Kiểm tra:');
  Logger.log('1. ID có đúng không?');
  Logger.log('2. File/Folder đã share với email GAS chưa?');
  Logger.log('3. Đã cho phép quyền truy cập chưa?');
}
