# Fix: Lỗi Test Email - "Failed to send payslip email"

## 🔍 Nguyên nhân

Lỗi xảy ra vì:
1. ✅ **Đã thêm** `GAS_WEB_APP_URL` vào `.env.local`
2. ❌ **Chưa deploy đúng script** `payslip-service.gs` lên Google Apps Script
3. ❌ Script hiện tại đang deploy là script khác (trả về "Missing action parameter")

---

## ✅ Giải pháp: Deploy lại Google Apps Script

### Bước 1: Mở Google Apps Script Project

1. Truy cập: https://script.google.com/
2. Đăng nhập bằng email: **phongnhansunak@nakvn.com**
3. Tìm project: **"NAK Payslip Email Service"** (hoặc tạo mới nếu chưa có)

### Bước 2: Paste đúng code

1. **XÓA HẾT** code hiện tại trong `Code.gs`
2. Mở file: `gas-scripts/payslip-service.gs` trong VS Code
3. **Copy TOÀN BỘ** code (289 dòng)
4. **Paste** vào `Code.gs` trong Google Apps Script

### Bước 3: Cấu hình Template IDs

Trong code vừa paste, kiểm tra dòng 7-11:

```javascript
var PAYSLIP_CONFIG = {
  TEMPLATE_TONG_HOP_ID: '1EFvSIeUZRI0r2L-cZmCuWOwvwVar3uABRYy1Y2XB4w4',
  TEMPLATE_CHI_TIET_ID: '1Xs44kf8mFEoctGoLF8-YeEoLdD5u0u2Ou8YrCtbITfF',
  TEMP_FOLDER_ID: '12Vtqd6Wd4mHr4JQ55t9cmAaffYL5XDJ'
};
```

**Các Template IDs này phải đúng và có quyền truy cập!**

### Bước 4: Test quyền truy cập Templates (Quan trọng!)

1. Trong Google Apps Script, chọn function: `verifyTemplateAccess`
2. Click **Run** (▶️)
3. Authorize khi được hỏi
4. Xem Logs: Phải thấy **✅ CÓ QUYỀN TRUY CẬP** cho cả 2 templates

**Nếu thấy ❌ KHÔNG THỂ TRUY CẬP:**
- Mở template trong Google Drive
- Click **Share** → Thêm email của GAS project
- Hoặc chọn: **"Anyone with the link can view"**

### Bước 5: Re-deploy Web App

1. Click **Deploy** > **Manage deployments**
2. Click ⚙️ **Edit** ở deployment hiện tại
3. **Tăng version lên mới** (Version: New version)
4. Điền description: `v2 - Payslip Service with PDF generation`
5. Đảm bảo:
   - ✅ **Execute as:** Me (phongnhansunak@nakvn.com)
   - ✅ **Who has access:** Anyone
6. Click **Deploy**
7. **QUAN TRỌNG:** Copy Web App URL mới (nếu khác)

### Bước 6: Cập nhật .env.local (nếu URL thay đổi)

Nếu Web App URL thay đổi, cập nhật cả 2 biến trong `.env.local`:

```env
NEXT_PUBLIC_GAS_API_URL=https://script.google.com/macros/s/NEW_DEPLOYMENT_ID/exec
GAS_WEB_APP_URL=https://script.google.com/macros/s/NEW_DEPLOYMENT_ID/exec
```

### Bước 7: Restart Next.js Dev Server

```bash
# Tắt server (Ctrl+C)
# Khởi động lại
npm run dev
```

---

## 🧪 Test lại

1. Mở trang: http://localhost:3000/salary
2. Chọn tháng có data
3. Click nút ✉️ ở một nhân viên
4. Click **"Gửi test email"**
5. Nhập email test: `dtnam@nakvn.com`
6. Click **"Gửi test email"**

**Kết quả mong đợi:**
- ✅ Console: "Email sent successfully"
- ✅ Alert: "Test email thành công!"
- ✅ Nhận được email với 2 file PDF đính kèm

---

## 🔧 Troubleshooting

### Lỗi: "Cannot access Google Drive files"

**Nguyên nhân:** GAS không có quyền truy cập templates

**Giải pháp:**
1. Run function `verifyTemplateAccess` trong GAS
2. Share templates cho email GAS project
3. Hoặc đặt templates thành "Anyone with the link"

### Lỗi: "GAS returned invalid JSON"

**Nguyên nhân:** Script chưa deploy đúng

**Giải pháp:**
1. Kiểm tra lại code trong `Code.gs` phải là `payslip-service.gs`
2. Re-deploy với version mới
3. Test bằng cách truy cập Web App URL trong browser → phải thấy:
   ```json
   {"status":"ok","message":"NAK Payslip Service is running","timestamp":"..."}
   ```

### Lỗi vẫn còn?

**Kiểm tra logs trong Google Apps Script:**
1. Mở Google Apps Script project
2. Click **Execution log** (📋)
3. Xem log khi gửi email test
4. Tìm dòng có ERROR và báo lại

---

## 📝 Tóm tắt

✅ Đã fix: Thêm `GAS_WEB_APP_URL` vào `.env.local`

⚠️ **CẦN LÀM TIẾP:**
1. Deploy đúng script `payslip-service.gs` lên Google Apps Script
2. Verify quyền truy cập templates
3. Test lại chức năng gửi email

---

## 📞 Support

Nếu gặp vấn đề, check:
1. Logs trong Google Apps Script (Execution log)
2. Console logs trong browser (F12)
3. Network tab để xem request/response

Email: dtnam@nakvn.com
