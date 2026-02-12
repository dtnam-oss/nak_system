# ❌ FIX: GAS doPost không hoạt động

## 🔍 Vấn đề phát hiện

**Triệu chứng:**
- ✅ GET request hoạt động: `{"status":"ok","message":"NAK Payslip Service is running"}`
- ❌ POST request thất bại: "Không thể mở tệp tại thời điểm này"
- ❌ GAS execution logs: KHÔNG thấy `doPost` được gọi

**Deployment URL hiện tại:**
```
https://script.google.com/macros/s/AKfycbzncuSMQeber-W7sWZPATcNNPj3pfLxOlXpMGHnjrstMXWcC3fR17xbWkONS5Vn7qGqJg/exec
```

**Deployment ID:** `AKfycbzncuSMQeber-W7sWZPATcNNPj3pfLxOlXpMGHnjrstMXWcC3fR17xbWkONS5Vn7qGqJg`

---

## 🎯 Nguyên nhân

GAS deployment này **chưa có hàm `doPost()`** hoặc chưa được authorize đúng!

Có thể:
1. Script hiện tại chỉ có `doGet()` mà không có `doPost()`
2. Deployment chưa được authorize để nhận POST requests
3. Code bị lỗi khi handle POST data

---

## ✅ Giải pháp

### Bước 1: Mở Google Apps Script Project

1. Truy cập: https://script.google.com/home/my
2. Tìm project có deployment URL: `AKfycbzncuSMQeber-W7sWZPATcNNPj3pfLxOlXpMGHnjrstMXWcC3fR17xbWkONS5Vn7qGqJg`
   - Hoặc tìm project tên: "NAK Payslip Email Service" / "Dự án không có tiêu đề"
3. Click vào project để mở

### Bước 2: Kiểm tra Code

Xem trong Code.gs có những function nào:
- ✅ Cần có: `doGet()` và `doPost()`
- ❌ Nếu chỉ có `doGet()` → Thiếu `doPost()`

### Bước 3: Thay thế Code

1. **XÓA HẾT** code hiện tại trong `Code.gs`
2. Mở file `gas-scripts/payslip-service.gs` trong VS Code
3. **Copy TOÀN BỘ** code (289 dòng)
4. **Paste** vào `Code.gs` trong Google Apps Script

Code phải có:
```javascript
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
```

### Bước 4: Cấu hình Template IDs

Kiểm tra dòng 7-11 trong code có đúng Template IDs không:

```javascript
var PAYSLIP_CONFIG = {
  TEMPLATE_TONG_HOP_ID: '1EFvSIeUZRI0r2L-cZmCuWOwvwVar3uABRYy1Y2XB4w4',
  TEMPLATE_CHI_TIET_ID: '1Xs44kf8mFEoctGoLF8-YeEoLdD5u0u2Ou8YrCtbITfF',
  TEMP_FOLDER_ID: '12Vtqd6Wd4mHr4JQ55t9cmAaffYL5XDJ'
};
```

Nếu chưa đúng, cập nhật lại IDs của templates bạn đang dùng.

### Bước 5: Save Code

1. Click **💾 Save project** (hoặc Ctrl+S / Cmd+S)
2. Đợi save xong

### Bước 6: Re-deploy (QUAN TRỌNG!)

**KHÔNG CẦN tạo deployment mới!** Chỉ cần re-deploy version hiện tại:

1. Click **Deploy** > **Manage deployments**
2. Tìm deployment với ID: `AKfycbzncuSMQeber...`
3. Click ⚙️ icon **Edit** bên cạnh deployment đó
4. Trong dialog "Edit deployment":
   - **Version:** Chọn **"New version"**
   - **Description:** Nhập `v2 - Added doPost for payslip email`
5. Click **Deploy**
6. ✅ **URL sẽ KHÔNG ĐỔI** - vẫn là `AKfycbzncuSMQeber...`

**LƯU Ý:** 
- ❌ KHÔNG tạo deployment mới (New deployment)
- ✅ Chỉ Edit deployment hiện tại và tăng version

### Bước 7: Authorize (nếu cần)

Nếu được hỏi authorize:
1. Click **Authorize access**
2. Chọn account **phongnhansunak@nakvn.com**
3. Click **Advanced** → **Go to [project name] (unsafe)**
4. Click **Allow**

### Bước 8: Test lại

**Test GET (phải OK như trước):**
```bash
curl https://script.google.com/macros/s/AKfycbzncuSMQeber-W7sWZPATcNNPj3pfLxOlXpMGHnjrstMXWcC3fR17xbWkONS5Vn7qGqJg/exec

# Kết quả mong đợi:
{"status":"ok","message":"NAK Payslip Service is running","timestamp":"..."}
```

**Test POST (lần này phải thành công):**
```bash
curl -X POST \
  https://script.google.com/macros/s/AKfycbzncuSMQeber-W7sWZPATcNNPj3pfLxOlXpMGHnjrstMXWcC3fR17xbWkONS5Vn7qGqJg/exec \
  -H "Content-Type: application/json" \
  -d '{
    "recipientEmail": "dtnam@nakvn.com",
    "recipientName": "Test User",
    "month": 2,
    "year": 2026,
    "ma_nhan_vien": "TEST001",
    "ten_nhan_vien": "Test User",
    "thang": 2,
    "nam": 2026,
    "luong_bat_dau": 10000000,
    "tong_thu_nhap": 10000000,
    "tong_khau_tru": 0,
    "luong_thuc_lanh": 10000000,
    "tong_luong_chuyen": 0,
    "luongChuyen": []
  }'

# Kết quả mong đợi:
{"success":true}
```

**Test trên production:**
1. Truy cập: https://nak-logistic-system.vercel.app/salary
2. Chọn tháng 1/2026
3. Click ✉️ ở nhân viên Bùi Văn Thành
4. Nhập email test: `dtnam@nakvn.com`
5. Click "Gửi test email"

### Bước 9: Kiểm tra GAS Execution Logs

1. Mở: https://script.google.com/home/executions
2. Filter: **Function = doPost**
3. Phải thấy entry mới với status **Completed**
4. Click vào để xem logs chi tiết

---

## 🔧 Troubleshooting

### Vẫn lỗi "Không thể mở tệp" sau khi re-deploy?

**1. Kiểm tra deployment có đúng không:**
- Vào Deploy > Manage deployments
- Xem URL có đúng là `AKfycbzncuSMQeber...` không
- Xem Version có tăng lên chưa (v2, v3...)

**2. Kiểm tra authorization:**
- Run bất kỳ function nào trong script (ví dụ: `testDriveAccess`)
- Xem có popup authorize không
- Authorize lại nếu cần

**3. Test function doPost trực tiếp:**
- Trong GAS editor, chọn function: `doPost`
- KHÔNG thể run trực tiếp (cần e.postData)
- Thay vào đó, run `testSendEmail` để test

**4. Xem Execution logs:**
```
1. Click biểu tượng ⚙️ bên trái
2. Click "Executions"
3. Tìm entry gần nhất
4. Xem có error gì không
```

### Lỗi: "Cannot access Google Drive files"

Script không có quyền truy cập templates:
1. Run function `verifyTemplateAccess` trong GAS
2. Xem logs → tìm template nào bị lỗi
3. Mở template đó → Share với email GAS project

---

## 📋 Checklist

Sau khi fix, verify:

- [ ] Code có cả `doGet()` và `doPost()` functions
- [ ] Save code trong GAS
- [ ] Re-deploy với version mới (Edit deployment, KHÔNG tạo mới)
- [ ] URL không đổi: `AKfycbzncuSMQeber...`
- [ ] GET test thành công
- [ ] POST test thành công (không còn "Không thể mở tệp")
- [ ] Test email trên production thành công
- [ ] GAS execution logs thấy `doPost` entry
- [ ] Nhận được email với 2 PDF đính kèm

---

## 🎯 Reference

**GAS Web App URL:**
```
https://script.google.com/macros/s/AKfycbzncuSMQeber-W7sWZPATcNNPj3pfLxOlXpMGHnjrstMXWcC3fR17xbWkONS5Vn7qGqJg/exec
```

**Template IDs cần kiểm tra:**
- Tổng hợp: `1EFvSIeUZRI0r2L-cZmCuWOwvwVar3uABRYy1Y2XB4w4`
- Chi tiết: `1Xs44kf8mFEoctGoLF8-YeEoLdD5u0u2Ou8YrCtbITfF`
- Temp folder: `12Vtqd6Wd4mHr4JQ55t9cmAaffYL5XDJ`

**Files liên quan:**
- `gas-scripts/payslip-service.gs` - Code đầy đủ
- `gas-scripts/verify-template-access.gs` - Script kiểm tra quyền

---

## 📞 Support

Nếu vẫn không work:
1. Screenshot GAS code (function doGet và doPost)
2. Screenshot Manage deployments (URL và version)
3. Screenshot execution logs khi POST
4. Share để debug

Email: dtnam@nakvn.com
