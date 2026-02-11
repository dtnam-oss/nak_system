# Hướng dẫn Setup Google Apps Script để gửi Email

## ✅ Ưu điểm của phương pháp này
- **Không cần App Password**
- **Không cần bật xác thực 2 bước**
- Sử dụng trực tiếp email công ty (phongnhansunak@nakvn.com)
- Giới hạn 1500 emails/ngày (Google Workspace)
- Miễn phí hoàn toàn

---

## 📋 Các bước thực hiện

### Bước 1: Tạo Google Apps Script Project

1. Truy cập: https://script.google.com/
2. Đăng nhập bằng email **phongnhansunak@nakvn.com**
3. Click **New Project** (Dự án mới)
4. Đặt tên project: `NAK Payslip Email Service`

### Bước 2: Paste Code

1. Xóa hết code mặc định trong file `Code.gs`
2. Mở file `gas-scripts/send-payslip-email.gs` trong project
3. Copy toàn bộ code
4. Paste vào `Code.gs` trong Google Apps Script

### Bước 3: Deploy Web App

1. Click **Deploy** > **New deployment**
2. Chọn type: **Web app**
3. Điền thông tin:
   ```
   Description: NAK Payslip Email Service v1
   Execute as: Me (phongnhansunak@nakvn.com)
   Who has access: Anyone
   ```
4. Click **Deploy**
5. **Quan trọng:** Authorize app:
   - Click **Authorize access**
   - Chọn account **phongnhansunak@nakvn.com**
   - Click **Advanced** nếu thấy warning
   - Click **Go to NAK Payslip Email Service (unsafe)**
   - Click **Allow**

### Bước 4: Lấy Web App URL

Sau khi deploy, bạn sẽ thấy:
```
Web app URL: https://script.google.com/macros/s/AKfycbxxxxxxxxxxxxx/exec
```

**Copy URL này!**

### Bước 5: Cấu hình trong Next.js

1. Mở file `.env.local` (hoặc tạo mới từ `.env.local.example`)
2. Thêm dòng:
   ```env
   GAS_WEB_APP_URL=https://script.google.com/macros/s/AKfycbxxxxxxxxxxxxx/exec
   ```
3. Restart dev server:
   ```bash
   npm run dev
   ```

---

## 🧪 Test thử

### Test 1: Test trong Google Apps Script

1. Trong Apps Script editor, chọn function `testSendEmail`
2. Sửa email test trong code:
   ```javascript
   recipientEmail: 'your-test-email@gmail.com',
   recipientName: 'Test User',
   ```
3. Click **Run** (▶️)
4. Xem logs: **View** > **Logs**
5. Check email

### Test 2: Test từ Next.js

1. Vào trang Lương tổng hợp
2. Chọn tháng có data
3. Click nút **"Gửi phiếu lương"** (màu xanh)
4. Confirm trong dialog
5. Chờ kết quả

---

## 🔍 Troubleshooting

### Lỗi: "Authorization required"
**Giải pháp:**
- Deploy lại Web App
- Đảm bảo chọn **Execute as: Me**
- Authorize lại khi deploy

### Lỗi: "Script function not found: doPost"
**Giải pháp:**
- Kiểm tra code đã paste đúng chưa
- Function phải tên là `doPost` (không phải `doGet`)

### Lỗi: "GAS_WEB_APP_URL not configured"
**Giải pháp:**
- Kiểm tra file `.env.local` đã có GAS_WEB_APP_URL chưa
- Restart dev server

### Email không gửi được
**Kiểm tra:**
1. Mở Apps Script logs: **View** > **Execution history**
2. Xem error message
3. Kiểm tra email recipient có hợp lệ không
4. Kiểm tra size PDF (max 25MB/email)

---

## 📊 Giới hạn Gmail API

| Loại | Giới hạn |
|------|---------|
| Emails/ngày | 1,500 (Workspace) |
| Emails/phút | ~30 |
| Attachment size | 25MB/email |
| Recipients/email | 100 |

**Lưu ý:** Nếu gửi quá nhiều email cùng lúc, nên thêm delay 1-2 giây giữa các email (đã implement sẵn trong code).

---

## 🔄 Update Code

Nếu cần sửa code GAS:

1. Sửa file `gas-scripts/send-payslip-email.gs`
2. Copy code mới
3. Paste vào Apps Script editor
4. **Save** (Ctrl+S)
5. **Deploy** > **Manage deployments**
6. Click ⚙️ > **Edit**
7. **Version: New version**
8. Click **Deploy**

**Không cần đổi URL!**

---

## 📝 Logs và Monitoring

### Xem logs gửi email:

**Trong Database:**
```sql
SELECT * FROM email_logs
WHERE thang = 1 AND nam = 2026
ORDER BY sent_at DESC;
```

**Trong Google Apps Script:**
1. Mở project Apps Script
2. **View** > **Execution history**
3. Click vào execution để xem details

---

## 🚀 Deploy lên Production (Vercel)

1. Thêm Environment Variable trong Vercel:
   - Key: `GAS_WEB_APP_URL`
   - Value: URL của Web App
2. Redeploy

**Lưu ý:** GAS Web App URL giữ nguyên kể cả khi code thay đổi (chỉ cần Deploy new version).

---

## ⚙️ Advanced: Customize Email Template

Email template được tạo trong GAS (không phải Next.js). Để thay đổi:

1. Mở `gas-scripts/send-payslip-email.gs`
2. Tìm phần `htmlBody` trong function `doPost()`
3. Sửa HTML/CSS
4. Deploy new version

---

## ❓ FAQ

**Q: Có cần bật 2FA không?**
A: Không! Đây là ưu điểm lớn nhất của GAS.

**Q: Có tốn phí không?**
A: Hoàn toàn miễn phí.

**Q: Có thể dùng nhiều email khác nhau không?**
A: Có, deploy từ account nào thì sẽ gửi từ email đó.

**Q: Có thể gửi CC/BCC không?**
A: Có, thêm `cc` và `bcc` trong `GmailApp.sendEmail()` options.

**Q: Làm sao biết email đã gửi thành công?**
A: Check table `email_logs` hoặc xem Execution history trong Apps Script.

---

## 📞 Support

Nếu gặp vấn đề:
1. Check logs trong Apps Script Execution history
2. Check logs trong console Next.js
3. Check table `email_logs` trong database
