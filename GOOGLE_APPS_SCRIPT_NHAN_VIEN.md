# Google Apps Script - Export Nhân Viên

Thêm function này vào Google Apps Script để export dữ liệu nhân viên:

## Code để thêm vào Apps Script

```javascript
/**
 * Get all employees (nhan_vien)
 * Called from: /api/employees/import
 */
function getNhanVien() {
  const ss = SpreadsheetApp.openById(MAIN_SPREADSHEET_ID);
  const sheet = ss.getSheetByName('nhan_vien');
  
  if (!sheet) {
    return [];
  }
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);
  
  // Map headers to indices
  const headerMap = {};
  headers.forEach((header, index) => {
    headerMap[header] = index;
  });
  
  // Convert rows to objects
  const employees = rows.map(row => {
    const employee = {};
    
    // Map all columns
    Object.keys(headerMap).forEach(header => {
      const index = headerMap[header];
      let value = row[index];
      
      // Handle dates (convert to ISO format)
      if (header.includes('ngay_') && value instanceof Date) {
        value = Utilities.formatDate(value, 'GMT+7', 'yyyy-MM-dd');
      }
      
      // Handle empty strings
      if (value === '') {
        value = null;
      }
      
      employee[header] = value;
    });
    
    return employee;
  }).filter(emp => emp.ma_nhan_vien); // Filter out empty rows
  
  return employees;
}

/**
 * Main doGet handler - add this case
 */
function doGet(e) {
  const action = e.parameter.action;
  
  // ... existing actions ...
  
  if (action === 'getNhanVien') {
    const employees = getNhanVien();
    return ContentService
      .createTextOutput(JSON.stringify(employees))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  // ... rest of code ...
}
```

## Test URL

Sau khi deploy, test bằng URL:
```
https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec?action=getNhanVien
```

## Expected Response Format

```json
[
  {
    "ma_nhan_vien": "NAK001",
    "ho_va_ten": "Đặng Thành Nam",
    "phong_ban": "Quản lý",
    "chuc_vu": "Admin",
    "hinh_anh": "https://...",
    "so_dien_thoai": "0901234567",
    "email": "nam@nak.com",
    "chat_id": null,
    "tinh_trang_cong_tac": "Đang làm việc",
    "ngay_vao_lam": "2020-01-01",
    "ngay_ky_hdld": "2020-01-01",
    "phan_quyen": "Admin",
    "xem": 1,
    "them": 1,
    "sua": 1,
    "xoa": 1
  }
]
```
