# Setup Email Configuration

Để sử dụng tính năng gửi phiếu lương qua email, bạn cần cấu hình Gmail SMTP.

## Bước 1: Tạo App Password cho Gmail

1. Đăng nhập vào tài khoản Google Workspace: `phongnhansunak@nakvn.com`
2. Truy cập: https://myaccount.google.com/apppasswords
3. Tạo App Password mới:
   - **Select app:** Mail
   - **Select device:** Other (Custom name)
   - **Name:** NAK Salary System
4. Click **Generate** và copy 16 ký tự password

## Bước 2: Tạo file `.env.local`

Tại thư mục gốc project, tạo file `.env.local`:

```bash
# Gmail SMTP Configuration
GMAIL_USER=phongnhansunak@nakvn.com
GMAIL_APP_PASSWORD=abcdefghijklmnop  # Thay bằng app password 16 ký tự
```

**Lưu ý:** Bỏ dấu cách khi paste app password

## Bước 3: Tạo bảng email_logs

Chạy migration:

```bash
psql -h 163.223.12.189 -U nak_admin -d nak_vn -f migrations/create_email_logs.sql
```

Hoặc chạy trực tiếp SQL:

```sql
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ma_nhan_vien VARCHAR(50) NOT NULL,
  ten_nhan_vien VARCHAR(255) NOT NULL,
  email_to VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  thang INTEGER NOT NULL,
  nam INTEGER NOT NULL,
  sent_at TIMESTAMP DEFAULT NOW(),
  status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'failed')),
  error_message TEXT,
  pdf_tong_hop_generated BOOLEAN DEFAULT false,
  pdf_chi_tiet_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_email_logs_thang_nam ON email_logs(thang, nam);
CREATE INDEX idx_email_logs_ma_nv ON email_logs(ma_nhan_vien);
CREATE INDEX idx_email_logs_status ON email_logs(status);
CREATE INDEX idx_email_logs_sent_at ON email_logs(sent_at DESC);
```

## Bước 4: Test Email

Restart dev server:

```bash
npm run dev
```

Vào trang **Data lương → Tab Lương tổng hợp**, click button **"Gửi phiếu lương"**

## Giới hạn

- Gmail Workspace: **2,000 emails/ngày**
- Rate limit: **1.5 giây giữa mỗi email**
- Thời gian ước tính: 100 nhân viên = ~2.5 phút

## Troubleshooting

### Lỗi: "Username and Password not accepted"
- Kiểm tra App Password đã đúng chưa
- Kiểm tra đã bật 2-Step Verification chưa

### Lỗi: "Email configuration missing"
- File `.env.local` chưa tồn tại hoặc sai format
- Restart dev server sau khi tạo `.env.local`

### Lỗi: "Less secure app access"
- Đang dùng mật khẩu thật thay vì App Password
- Tạo lại App Password đúng cách
