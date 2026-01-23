# 🚀 VERCEL ENVIRONMENT VARIABLES SETUP

## ⚠️ CRITICAL: Database Migration

Dự án đã migrate từ **Vercel Postgres/Neon** sang **Self-hosted PostgreSQL**. 
Bạn PHẢI cập nhật lại biến môi trường trên Vercel.

---

## 📋 REQUIRED ENVIRONMENT VARIABLES

### 1. **Database Configuration** (QUAN TRỌNG NHẤT)

```bash
POSTGRES_URL=postgresql://postgres:123@163.223.12.189:5432/nak_vn
```

⚠️ **Lưu ý:** 
- URL này trỏ tới self-hosted PostgreSQL server
- Vercel sẽ connect trực tiếp tới IP: `163.223.12.189`
- Port: `5432`
- Database: `nak_vn`

---

### 2. **Google Apps Script API**

```bash
NEXT_PUBLIC_GAS_API_URL=https://script.google.com/macros/s/AKfycbx268J5Oewi7pRC03CSaLH1n3tsnoM4MyRJUkRbGooag4OWysPolX9JbPgfYALnOrbF/exec
```

---

### 3. **Telegram Bot Configuration**

```bash
# Bot Token
TELEGRAM_BOT_TOKEN=8117923437:AAE6MuWCXO-vctHzYBFU6Uz1YipRE2u9i9g

# Group & Topics
TELEGRAM_GROUP_CHAT_ID=-1002957881731
TELEGRAM_TOPIC_KET_QUA_XU_LY=169
TELEGRAM_TOPIC_DOI_TAC=166
TELEGRAM_TOPIC_KHACH_HANG=164

# Webhook URL (change to your domain)
TELEGRAM_WEBHOOK_URL=https://nak-system.vercel.app/api/telegram/webhook
```

---

### 4. **API Configuration**

```bash
NEXT_PUBLIC_API_URL=https://nak-system.vercel.app
NEXT_PUBLIC_API_TIMEOUT=60000
```

---

### 5. **Security & Secrets**

```bash
# Cron Job Secret
CRON_SECRET=my-super-secret-key-abc123xyz

# Migration API Secret
MIGRATION_SECRET=migration-2025-secure

# Session Secret (JWT)
SESSION_SECRET=your-very-secure-random-secret-key-minimum-32-characters-long
```

⚠️ **Lưu ý:** Thay đổi các secrets thành giá trị ngẫu nhiên an toàn hơn trong production!

---

### 6. **Feature Flags** (Optional)

```bash
TELEGRAM_ENABLE_LLM=false
TELEGRAM_ENABLE_VOICE=false
TELEGRAM_ENABLE_CHARTS=true
```

---

## 🔧 CÁCH CẤU HÌNH TRÊN VERCEL

### **Bước 1: Truy cập Vercel Dashboard**
```
https://vercel.com/your-username/nak-system/settings/environment-variables
```

### **Bước 2: Xóa biến cũ (nếu có)**
- Tìm và xóa các biến liên quan đến Neon/Vercel Postgres cũ:
  - `DATABASE_URL`
  - `POSTGRES_URL` (nếu trỏ đến Neon)
  - `POSTGRES_PRISMA_URL`
  - `PGHOST`, `PGUSER`, etc. (Neon related)

### **Bước 3: Thêm biến mới**
1. Click "Add New"
2. Nhập tên biến (Key)
3. Nhập giá trị (Value)
4. Chọn Environment: **Production**, **Preview**, **Development** (hoặc chỉ Production)
5. Click "Save"

### **Bước 4: Redeploy**
Sau khi cập nhật biến môi trường:
```bash
# Option 1: Push code mới lên GitHub (tự động trigger deploy)
git push origin main

# Option 2: Redeploy manually trên Vercel Dashboard
# Deployments > Latest Deployment > ... > Redeploy
```

---

## 🔍 KIỂM TRA BIẾN MÔI TRƯỜNG

### Test Database Connection
```
GET https://nak-system.vercel.app/api/health/database
```

**Expected Response:**
```json
{
  "status": "healthy",
  "database": "connected",
  "details": {
    "host": "163.223.12.189",
    "database": "nak_vn",
    "serverTime": "2026-01-23T..."
  }
}
```

### Test Telegram Bot
```
GET https://nak-system.vercel.app/api/telegram/health
```

---

## ⚡ QUICK COPY-PASTE

Dùng script này để tạo file `.env.production` (sau đó copy từng dòng lên Vercel):

```bash
# Save to .env.production
cat > .env.production << 'EOF'
POSTGRES_URL=postgresql://postgres:123@163.223.12.189:5432/nak_vn
NEXT_PUBLIC_GAS_API_URL=https://script.google.com/macros/s/AKfycbx268J5Oewi7pRC03CSaLH1n3tsnoM4MyRJUkRbGooag4OWysPolX9JbPgfYALnOrbF/exec
TELEGRAM_BOT_TOKEN=8117923437:AAE6MuWCXO-vctHzYBFU6Uz1YipRE2u9i9g
TELEGRAM_GROUP_CHAT_ID=-1002957881731
TELEGRAM_TOPIC_KET_QUA_XU_LY=169
TELEGRAM_TOPIC_DOI_TAC=166
TELEGRAM_TOPIC_KHACH_HANG=164
TELEGRAM_WEBHOOK_URL=https://nak-system.vercel.app/api/telegram/webhook
NEXT_PUBLIC_API_URL=https://nak-system.vercel.app
NEXT_PUBLIC_API_TIMEOUT=60000
CRON_SECRET=my-super-secret-key-abc123xyz
MIGRATION_SECRET=migration-2025-secure
SESSION_SECRET=your-very-secure-random-secret-key-minimum-32-characters-long
TELEGRAM_ENABLE_LLM=false
TELEGRAM_ENABLE_VOICE=false
TELEGRAM_ENABLE_CHARTS=true
EOF
```

---

## 🚨 TROUBLESHOOTING

### Lỗi: "Failed to connect to database"
✅ **Giải pháp:**
- Kiểm tra `POSTGRES_URL` đã đúng chưa
- Đảm bảo Vercel có thể kết nối tới IP `163.223.12.189:5432`
- Kiểm tra firewall của PostgreSQL server cho phép kết nối từ Vercel IPs

### Lỗi: "Telegram webhook failed"
✅ **Giải pháp:**
- Kiểm tra `TELEGRAM_BOT_TOKEN` đúng chưa
- Cập nhật `TELEGRAM_WEBHOOK_URL` với domain Vercel thực tế
- Chạy script setup webhook: `npm run telegram:setup`

### Lỗi: "Environment variable not found"
✅ **Giải pháp:**
- Đảm bảo đã thêm biến trên Vercel Dashboard
- Redeploy sau khi thêm biến
- Kiểm tra biến có áp dụng cho đúng environment không (Production/Preview)

---

## 📚 References

- [Vercel Environment Variables](https://vercel.com/docs/environment-variables)
- [PostgreSQL Connection Strings](https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNSTRING)
- [Telegram Bot API](https://core.telegram.org/bots/api)

---

**Last Updated:** January 23, 2026  
**Maintainer:** NAK Logistics Dev Team
