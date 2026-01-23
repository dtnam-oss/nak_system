# ✅ VERCEL DEPLOYMENT CHECKLIST

## 🎯 Mục đích
Sau khi migrate từ Vercel Postgres sang Self-hosted PostgreSQL, bạn cần cấu hình lại các biến môi trường trên Vercel.

---

## 📝 CHECKLIST - Làm theo từng bước

### ☐ **1. Truy cập Vercel Dashboard**
```
URL: https://vercel.com/dtnam-oss/nak-system/settings/environment-variables
```

### ☐ **2. XÓA các biến môi trường cũ (Neon Database)**
Tìm và xóa các biến sau (nếu có):
- [ ] `DATABASE_URL` (Neon)
- [ ] `DATABASE_URL_UNPOOLED`
- [ ] `POSTGRES_PRISMA_URL`
- [ ] `PGHOST` (ep-nameless-term...)
- [ ] `PGHOST_UNPOOLED`
- [ ] `PGUSER` (neondb_owner)
- [ ] `PGDATABASE` (neondb)
- [ ] `PGPASSWORD` (npg_...)
- [ ] `POSTGRES_HOST` (Neon)
- [ ] `POSTGRES_USER` (Neon)
- [ ] `POSTGRES_PASSWORD` (Neon)
- [ ] `POSTGRES_DATABASE` (Neon)

### ☐ **3. THÊM biến môi trường mới**

#### 🗄️ Database (QUAN TRỌNG NHẤT)
- [ ] `POSTGRES_URL` = `postgresql://postgres:123@163.223.12.189:5432/nak_vn`
  - Environment: ✅ Production, ✅ Preview, ✅ Development

#### 🌐 Google Apps Script
- [ ] `NEXT_PUBLIC_GAS_API_URL` = `https://script.google.com/macros/s/AKfycbx268J5Oewi7pRC03CSaLH1n3tsnoM4MyRJUkRbGooag4OWysPolX9JbPgfYALnOrbF/exec`
  - Environment: ✅ Production, ✅ Preview, ✅ Development

#### 🤖 Telegram Bot
- [ ] `TELEGRAM_BOT_TOKEN` = `8117923437:AAE6MuWCXO-vctHzYBFU6Uz1YipRE2u9i9g`
- [ ] `TELEGRAM_GROUP_CHAT_ID` = `-1002957881731`
- [ ] `TELEGRAM_TOPIC_KET_QUA_XU_LY` = `169`
- [ ] `TELEGRAM_TOPIC_DOI_TAC` = `166`
- [ ] `TELEGRAM_TOPIC_KHACH_HANG` = `164`
- [ ] `TELEGRAM_WEBHOOK_URL` = `https://nak-system.vercel.app/api/telegram/webhook`
  - ⚠️ Thay `nak-system` bằng tên domain thực tế của bạn

#### ⚙️ API Configuration
- [ ] `NEXT_PUBLIC_API_URL` = `https://nak-system.vercel.app`
  - ⚠️ Thay `nak-system` bằng tên domain thực tế
- [ ] `NEXT_PUBLIC_API_TIMEOUT` = `60000`

#### 🔒 Security & Secrets
- [ ] `CRON_SECRET` = `my-super-secret-key-abc123xyz`
  - ⚠️ Đề xuất: Thay bằng random string an toàn hơn
- [ ] `MIGRATION_SECRET` = `migration-2025-secure`
  - ⚠️ Đề xuất: Thay bằng random string an toàn hơn
- [ ] `SESSION_SECRET` = Generate random string (ít nhất 32 ký tự)
  - Dùng: `openssl rand -base64 32` để tạo

#### 🎛️ Feature Flags (Optional)
- [ ] `TELEGRAM_ENABLE_LLM` = `false`
- [ ] `TELEGRAM_ENABLE_VOICE` = `false`
- [ ] `TELEGRAM_ENABLE_CHARTS` = `true`

### ☐ **4. GENERATE SESSION_SECRET**
Mở terminal và chạy:
```bash
openssl rand -base64 32
```
Copy output và paste vào biến `SESSION_SECRET` trên Vercel.

### ☐ **5. KIỂM TRA lại danh sách biến**
Đảm bảo có đủ **17 biến** sau trên Vercel:
1. POSTGRES_URL
2. NEXT_PUBLIC_GAS_API_URL
3. TELEGRAM_BOT_TOKEN
4. TELEGRAM_GROUP_CHAT_ID
5. TELEGRAM_TOPIC_KET_QUA_XU_LY
6. TELEGRAM_TOPIC_DOI_TAC
7. TELEGRAM_TOPIC_KHACH_HANG
8. TELEGRAM_WEBHOOK_URL
9. NEXT_PUBLIC_API_URL
10. NEXT_PUBLIC_API_TIMEOUT
11. CRON_SECRET
12. MIGRATION_SECRET
13. SESSION_SECRET
14. TELEGRAM_ENABLE_LLM
15. TELEGRAM_ENABLE_VOICE
16. TELEGRAM_ENABLE_CHARTS
17. VEHICLE_SPREADSHEET_ID (optional)
18. MAIN_SPREADSHEET_ID (optional)

### ☐ **6. REDEPLOY application**
Option 1: Automatic (Recommended)
```bash
git push origin main
```

Option 2: Manual
- Vào Vercel Dashboard
- Deployments tab
- Click "..." trên latest deployment
- Click "Redeploy"
- ✅ Use existing Build Cache: NO (để force rebuild)

### ☐ **7. KIỂM TRA deployment**

#### Test Database Connection
```bash
curl https://nak-system.vercel.app/api/health/database
```
Expected: `{"status":"healthy","database":"connected",...}`

#### Test Dashboard
```bash
curl https://nak-system.vercel.app/api/dashboard/stats
```
Expected: JSON data with statistics

#### Test Reconciliation API
```bash
curl https://nak-system.vercel.app/api/reconciliation?limit=10
```
Expected: JSON data with records

#### Test Telegram Health
```bash
curl https://nak-system.vercel.app/api/telegram/health
```
Expected: `{"status":"ok"}`

### ☐ **8. SETUP Telegram Webhook** (if not done)
```bash
cd /Users/mac/Desktop/nak-logistic-system
npm run telegram:setup
```

### ☐ **9. TEST Telegram Bot**
- Mở Telegram
- Tìm bot của bạn
- Gửi `/start`
- Gửi `/menu`
- Kiểm tra các commands hoạt động

---

## 🚨 TROUBLESHOOTING

### ❌ Lỗi: "Failed to connect to database"
**Nguyên nhân:** 
- Vercel không thể connect tới PostgreSQL server
- `POSTGRES_URL` sai

**Giải pháp:**
1. Kiểm tra PostgreSQL server có đang chạy không:
   ```bash
   psql -h 163.223.12.189 -U postgres -d nak_vn -c "SELECT 1;"
   ```
2. Kiểm tra firewall cho phép Vercel IPs
3. Double check `POSTGRES_URL` trên Vercel Dashboard

### ❌ Lỗi: Build failed với TypeScript errors
**Giải pháp:**
- Code đã được fix trong commit gần nhất
- Đảm bảo đang deploy từ branch `main` mới nhất
- Force rebuild without cache

### ❌ Lỗi: Telegram bot không response
**Giải pháp:**
1. Check `TELEGRAM_BOT_TOKEN` đúng không
2. Chạy lại webhook setup: `npm run telegram:setup`
3. Kiểm tra webhook URL đúng domain Vercel

### ❌ Lỗi: 500 Internal Server Error
**Giải pháp:**
1. Check Vercel Function Logs:
   - Vercel Dashboard > Deployments > Latest > Functions
2. Xem log để tìm lỗi cụ thể
3. Kiểm tra biến môi trường đã đủ chưa

---

## 📚 RESOURCES

- 📖 [VERCEL_ENV_SETUP.md](./VERCEL_ENV_SETUP.md) - Chi tiết về từng biến
- 🔗 [Vercel Dashboard](https://vercel.com/dtnam-oss/nak-system)
- 📊 [Database Schema](./DATABASE_SCHEMA_MAPPING.md)
- 🤖 [Telegram Bot Guide](./TELEGRAM_CHATBOT_README.md)

---

## ✅ HOÀN THÀNH!

Sau khi làm xong checklist trên:
- ✅ Database connection hoạt động
- ✅ API endpoints trả về data
- ✅ Telegram bot response
- ✅ Dashboard hiển thị chính xác

**Next steps:**
- Monitor Vercel Function Logs
- Test các tính năng chính
- Setup monitoring/alerts (optional)

---

**Created:** January 23, 2026  
**Last Updated:** January 23, 2026  
**Version:** 1.0.0
