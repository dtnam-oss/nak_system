/**
 * Test Drive Access - Kiểm tra quyền truy cập Google Drive
 * Chạy function này TRƯỚC KHI chạy testSendEmail
 */

// Paste Template IDs của bạn vào đây
var TEST_TEMPLATE_TONG_HOP_ID = '1EFvSIeUZRI0r2L-cZmCuWOwvwVar3uABRYy1Y2XB4w4';
var TEST_TEMPLATE_CHI_TIET_ID = '1Xs44kf8mFEoctGoLF8-YeEoLdD5u0u2Ou8YrCtbITfF';
var TEST_TEMP_FOLDER_ID = '12Vtqd6Wd4mHr4JQ55t9cmAaffYL5XDJ';

function testDriveAccess() {
  Logger.log('=== TESTING DRIVE ACCESS ===');
  
  // Test 1: Access Tổng hợp template
  try {
    Logger.log('\n1. Testing TEMPLATE_TONG_HOP_ID: ' + TEST_TEMPLATE_TONG_HOP_ID);
    var file1 = DriveApp.getFileById(TEST_TEMPLATE_TONG_HOP_ID);
    Logger.log('✅ SUCCESS: Can access Tổng hợp template');
    Logger.log('   File name: ' + file1.getName());
  } catch (e) {
    Logger.log('❌ FAILED: Cannot access Tổng hợp template');
    Logger.log('   Error: ' + e.toString());
    return;
  }
  
  // Test 2: Access Chi tiết template
  try {
    Logger.log('\n2. Testing TEMPLATE_CHI_TIET_ID: ' + TEST_TEMPLATE_CHI_TIET_ID);
    var file2 = DriveApp.getFileById(TEST_TEMPLATE_CHI_TIET_ID);
    Logger.log('✅ SUCCESS: Can access Chi tiết template');
    Logger.log('   File name: ' + file2.getName());
  } catch (e) {
    Logger.log('❌ FAILED: Cannot access Chi tiết template');
    Logger.log('   Error: ' + e.toString());
    return;
  }
  
  // Test 3: Access Temp folder
  try {
    Logger.log('\n3. Testing TEMP_FOLDER_ID: ' + TEST_TEMP_FOLDER_ID);
    var folder = DriveApp.getFolderById(TEST_TEMP_FOLDER_ID);
    Logger.log('✅ SUCCESS: Can access Temp folder');
    Logger.log('   Folder name: ' + folder.getName());
  } catch (e) {
    Logger.log('❌ FAILED: Cannot access Temp folder');
    Logger.log('   Error: ' + e.toString());
    return;
  }
  
  // Test 4: Try to copy template
  try {
    Logger.log('\n4. Testing template copy...');
    var testCopy = file1.makeCopy('TEST_COPY_DELETE_ME', folder);
    Logger.log('✅ SUCCESS: Can copy template to folder');
    Logger.log('   Test file ID: ' + testCopy.getId());
    
    // Clean up
    testCopy.setTrashed(true);
    Logger.log('✅ Test file deleted');
  } catch (e) {
    Logger.log('❌ FAILED: Cannot copy template');
    Logger.log('   Error: ' + e.toString());
    return;
  }
  
  Logger.log('\n=== ALL TESTS PASSED ✅ ===');
  Logger.log('You can now run testSendEmail()');
}
