# 🚀 Hướng Dẫn Deploy Lên Vercel

## Phương án 1: Deploy qua Vercel Dashboard (Khuyến nghị)

### Bước 1: Đăng nhập Vercel

1. Truy cập: https://vercel.com
2. Đăng nhập hoặc tạo tài khoản (có thể dùng GitHub)

### Bước 2: Import Project

1. Click **"Add New..."** → **"Project"**
2. Chọn **"Import Git Repository"**
3. Nếu chưa kết nối GitHub:
   - Click **"Connect Git Provider"**
   - Chọn GitHub và authorize
4. Tìm và chọn repository: `nak-logistic-system`
5. Click **"Import"**

### Bước 3: Configure Project

**Framework Preset:** Next.js (tự động detect)

**Root Directory:** `./` (mặc định)

**Build Command:** `npm run build` (mặc định)

**Output Directory:** `.next` (mặc định)

### Bước 4: Thêm Environment Variables

Click **"Environment Variables"** và thêm các biến sau:

```
NEXT_PUBLIC_GAS_API_URL=<your-gas-api-url>
NEXT_PUBLIC_API_TIMEOUT=30000

TELEGRAM_BOT_TOKEN=8117923437:AAE6MuWCXO-vctHzYBFU6Uz1YipRE2u9i9g
TELEGRAM_GROUP_CHAT_ID=-1002957881731
TELEGRAM_TOPIC_KET_QUA_XU_LY=169
TELEGRAM_TOPIC_DOI_TAC=<your-topic-id>
TELEGRAM_TOPIC_KHACH_HANG=<your-topic-id>

CRON_SECRET=<tạo-một-chuỗi-random-dài>

TELEGRAM_ENABLE_LLM=false
TELEGRAM_ENABLE_CHARTS=true
```

**Lưu ý:**
- Chọn **"Production"**, **"Preview"**, và **"Development"** cho tất cả biến
- `CRON_SECRET`: Tạo chuỗi random, VD: `my-super-secret-key-abc123xyz`

### Bước 5: Deploy

1. Click **"Deploy"**
2. Đợi 2-3 phút cho deployment hoàn thành
3. Vercel sẽ build và deploy project

### Bước 6: Lấy Deployment URL

Sau khi deploy thành công, bạn sẽ có URL dạng:
```
https://nak-logistic-system.vercel.app
```

hoặc

```
https://nak-logistic-system-<random-id>.vercel.app
```

**Copy URL này!** Bạn cần nó cho bước tiếp theo.

---

## Phương án 2: Deploy qua Vercel CLI (Nếu cài được CLI)

### Bước 1: Cài đặt Vercel CLI

```bash
npm install -g vercel
```

### Bước 2: Login

```bash
vercel login
```

### Bước 3: Deploy

```bash
# Từ thư mục root của project
cd /Users/mac/Desktop/nak-logistic-system

# Deploy to production
vercel --prod
```

Vercel CLI sẽ:
1. Hỏi xác nhận project settings
2. Upload code
3. Build project
4. Deploy
5. Trả về deployment URL

---

## Bước Tiếp Theo: Cập nhật Environment Variables

Sau khi có deployment URL, bạn cần cập nhật 2 biến:

### Trong Vercel Dashboard:

1. Vào **Project Settings** → **Environment Variables**
2. Tìm và edit 2 biến sau:

```
TELEGRAM_WEBHOOK_URL=https://nak-logistic-system.vercel.app/api/telegram/webhook
NEXT_PUBLIC_API_URL=https://nak-logistic-system.vercel.app
```

(Thay `nak-logistic-system.vercel.app` bằng URL thực của bạn)

3. Click **"Save"**
4. **QUAN TRỌNG:** Sau khi save, phải **Redeploy**:
   - Vào tab **"Deployments"**
   - Click **"..."** ở deployment mới nhất
   - Chọn **"Redeploy"**

### Hoặc trong .env.local (nếu dùng CLI):

```bash
# Edit file .env.local
TELEGRAM_WEBHOOK_URL=https://nak-logistic-system.vercel.app/api/telegram/webhook
NEXT_PUBLIC_API_URL=https://nak-logistic-system.vercel.app

# Deploy lại
vercel --prod
```

---

## Bước Cuối: Setup Webhook

Sau khi đã redeploy với webhook URL, chạy script setup:

### Cách 1: Dùng npm script (Local)

```bash
npm run telegram:setup
```

### Cách 2: Dùng curl (Manual)

```bash
curl -X POST \
  "https://api.telegram.org/bot8117923437:AAE6MuWCXO-vctHzYBFU6Uz1YipRE2u9i9g/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://nak-logistic-system.vercel.app/api/telegram/webhook",
    "allowed_updates": ["message", "callback_query"]
  }'
```

(Thay URL bằng deployment URL thực của bạn)

### Verify Webhook:

```bash
curl "https://api.telegram.org/bot8117923437:AAE6MuWCXO-vctHzYBFU6Uz1YipRE2u9i9g/getWebhookInfo"
```

Kết quả mong muốn:
```json
{
  "ok": true,
  "result": {
    "url": "https://nak-logistic-system.vercel.app/api/telegram/webhook",
    "has_custom_certificate": false,
    "pending_update_count": 0
  }
}
```

---

## Test Bot

### Test 1: Health Check

```bash
curl https://nak-logistic-system.vercel.app/api/telegram/webhook
```

Expected:
```json
{
  "status": "ok",
  "config": "valid",
  "timestamp": "..."
}
```

### Test 2: Gửi message trong Telegram

1. Mở group chat
2. Gửi: `/start`
3. Bot sẽ reply với welcome message

### Test 3: Test Commands

```
/today
/realtime
/fuel
/trips
```

### Test 4: Test Scheduled Report

```bash
curl "https://nak-logistic-system.vercel.app/api/telegram/cron/send-reports?type=morning&secret=YOUR_CRON_SECRET"
```

Check topic **KẾT QUẢ XỬ LÝ** trong Telegram để xem báo cáo!

---

## Cấu hình Cron Jobs (Vercel)

### Cách 1: Vercel Cron (Miễn phí trên Pro plan)

File `vercel.json` đã được tạo sẵn. Bạn chỉ cần:

1. Mở file [vercel.json](./vercel.json)
2. Thay `YOUR_CRON_SECRET_HERE` bằng `CRON_SECRET` thực của bạn
3. Commit và push code
4. Vercel sẽ tự động detect và enable cron jobs

### Cách 2: External Cron Service (Miễn phí)

Sử dụng https://cron-job.org:

1. Tạo tài khoản tại cron-job.org
2. Tạo 2 cron jobs:

**Morning Report:**
- Title: NAK Telegram Morning Report
- URL: `https://nak-logistic-system.vercel.app/api/telegram/cron/send-reports?type=morning&secret=YOUR_SECRET`
- Schedule: `0 6 * * *` (Every day at 6:00 AM)
- Timezone: Asia/Ho_Chi_Minh

**Evening Report:**
- Title: NAK Telegram Evening Report
- URL: `https://nak-logistic-system.vercel.app/api/telegram/cron/send-reports?type=evening&secret=YOUR_SECRET`
- Schedule: `0 18 * * *` (Every day at 6:00 PM)
- Timezone: Asia/Ho_Chi_Minh

---

## Troubleshooting

### Deploy failed?

1. Check build logs trong Vercel Dashboard
2. Đảm bảo tất cả dependencies có trong package.json
3. Check TypeScript errors

### Webhook không hoạt động?

1. Verify webhook URL:
   ```bash
   curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
   ```

2. Check Vercel Function Logs:
   - Vào Vercel Dashboard
   - Tab **"Logs"** hoặc **"Functions"**
   - Gửi message test và xem logs

3. Test health check:
   ```bash
   curl https://your-app.vercel.app/api/telegram/webhook
   ```

### Cron jobs không chạy?

1. **Nếu dùng Vercel Cron:**
   - Check Vercel Dashboard → Cron Logs
   - Đảm bảo CRON_SECRET đúng trong vercel.json

2. **Nếu dùng External Cron:**
   - Check execution logs trong cron-job.org
   - Test manual trigger:
     ```bash
     curl "https://your-app.vercel.app/api/telegram/cron/send-reports?type=morning&secret=YOUR_SECRET"
     ```

---

## Checklist Deploy

- [ ] Tạo/Login Vercel account
- [ ] Import project từ GitHub
- [ ] Thêm Environment Variables
- [ ] Deploy lần đầu
- [ ] Copy deployment URL
- [ ] Cập nhật TELEGRAM_WEBHOOK_URL và NEXT_PUBLIC_API_URL
- [ ] Redeploy với env variables mới
- [ ] Setup Telegram webhook
- [ ] Verify webhook hoạt động
- [ ] Test bot với /start
- [ ] Test các commands
- [ ] Test scheduled report manually
- [ ] Setup cron jobs (Vercel hoặc external)
- [ ] Monitor logs trong 24h đầu

---

## 🎉 Hoàn Thành!

Sau khi hoàn thành tất cả bước trên, hệ thống của bạn sẽ:

✅ Tự động gửi báo cáo lúc 6:00 AM và 6:00 PM mỗi ngày
✅ Phản hồi commands trong Telegram
✅ Hỗ trợ interactive menus
✅ Gửi đúng topics trong group

**Next steps:**
- Monitor logs để đảm bảo stability
- Thu thập feedback từ users
- Consider implementing Phase 4 features (Charts, Alerts, LLM)

Good luck! 🚀
