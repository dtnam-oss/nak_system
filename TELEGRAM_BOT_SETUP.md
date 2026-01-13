# 📱 Telegram Bot Setup Guide

Hướng dẫn cài đặt và triển khai Telegram Bot cho NAK Logistics System.

## 📋 Mục lục

1. [Tạo Telegram Bot](#1-tạo-telegram-bot)
2. [Cấu hình Group và Topics](#2-cấu-hình-group-và-topics)
3. [Cấu hình Environment Variables](#3-cấu-hình-environment-variables)
4. [Setup Webhook](#4-setup-webhook)
5. [Setup Scheduled Reports](#5-setup-scheduled-reports)
6. [Testing](#6-testing)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. Tạo Telegram Bot

### Bước 1: Tạo bot với BotFather

1. Mở Telegram và tìm kiếm `@BotFather`
2. Gửi lệnh `/newbot`
3. Đặt tên cho bot: `NAK Logistics Assistant`
4. Đặt username: `nak_logistics_bot` (hoặc tên khác)
5. BotFather sẽ trả về **Bot Token** - lưu lại token này

```
Example:
8117923437:AAE6MuWCXO-vctHzYBFU6Uz1YipRE2u9i9g
```

### Bước 2: Cấu hình bot commands

Gửi các lệnh sau cho @BotFather:

```
/setcommands
```

Sau đó paste danh sách commands:

```
start - 🚀 Khởi động trợ lý ảo
help - ❓ Hướng dẫn sử dụng
menu - 📱 Menu chính
today - 📊 Báo cáo hôm nay
realtime - ⚡ Số liệu realtime
trips - 🚛 Thống kê chuyến đi
partners - 🤝 Hiệu suất đối tác
customers - 💼 Phân tích khách hàng
fuel - ⛽ Tình trạng nhiên liệu
reconciliation - 💰 Đối soát
```

### Bước 3: Bật inline mode (optional)

```
/setinline
(chọn bot của bạn)
(nhập placeholder text: "Tìm kiếm thông tin...")
```

---

## 2. Cấu hình Group và Topics

### Bước 1: Tạo Supergroup

1. Tạo một group mới trong Telegram
2. Thêm ít nhất 1 thành viên khác (có thể xóa sau)
3. Vào Settings → Convert to Supergroup
4. Đặt tên: `[NAK] - SUMMARY REPORT`

### Bước 2: Bật Topics

1. Vào Group Settings
2. Bật **Topics** / **Forum Mode**

### Bước 3: Tạo các Topics

Tạo các topics sau:

1. **General** (có sẵn)
2. **KẾT QUẢ XỬ LÝ**
   - Icon: 📊
3. **ĐỐI TÁC VẬN CHUYỂN**
   - Icon: 🚚
4. **KHÁCH HÀNG**
   - Icon: 💼

### Bước 4: Thêm Bot vào Group

1. Vào Group Settings → Add Members
2. Tìm và thêm bot của bạn
3. Promote bot thành Admin với quyền:
   - ✅ Send Messages
   - ✅ Send Photos
   - ✅ Send Documents

### Bước 5: Lấy Chat ID và Topic IDs

#### Lấy Chat ID:

**Cách 1: Dùng userinfobot**
1. Add `@userinfobot` vào group
2. Bot sẽ reply với Chat ID
3. Xóa bot ra khỏi group

**Cách 2: Dùng API**
```bash
curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates
```

Chat ID của supergroup sẽ có dạng: `-1001234567890` (âm và 13 chữ số)

#### Lấy Topic IDs:

1. Mở topic trong Telegram Web hoặc Desktop
2. Copy URL, ví dụ:
   ```
   https://t.me/c/2957881731/169
   ```
3. Topic ID là số cuối cùng: `169`

Hoặc reply một message trong topic, rồi check `message_thread_id` trong `/getUpdates`

---

## 3. Cấu hình Environment Variables

### Bước 1: Copy file .env.example

```bash
cp .env.example .env.local
```

### Bước 2: Cập nhật các giá trị

```env
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=8117923437:AAE6MuWCXO-vctHzYBFU6Uz1YipRE2u9i9g

# Chat ID của group (có dấu - ở đầu)
TELEGRAM_GROUP_CHAT_ID=-1002957881731

# Topic IDs
TELEGRAM_TOPIC_KET_QUA_XU_LY=169
TELEGRAM_TOPIC_DOI_TAC=<topic_id_cua_ban>
TELEGRAM_TOPIC_KHACH_HANG=<topic_id_cua_ban>

# Webhook URL (điền sau khi deploy)
TELEGRAM_WEBHOOK_URL=https://your-app.vercel.app/api/telegram/webhook

# Application URL
NEXT_PUBLIC_API_URL=https://your-app.vercel.app

# Secret cho cron jobs
CRON_SECRET=<random-secret-string>

# Feature flags
TELEGRAM_ENABLE_LLM=false
TELEGRAM_ENABLE_CHARTS=true
```

---

## 4. Setup Webhook

### Option A: Automatic (Recommended)

Tạo file `/scripts/setup-telegram-webhook.ts`:

```typescript
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_URL = process.env.TELEGRAM_WEBHOOK_URL;

async function setupWebhook() {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: WEBHOOK_URL,
      allowed_updates: ['message', 'callback_query'],
    }),
  });

  const result = await response.json();
  console.log('Webhook setup result:', result);
}

setupWebhook();
```

Chạy:
```bash
npx tsx scripts/setup-telegram-webhook.ts
```

### Option B: Manual (Using curl)

```bash
curl -X POST \
  "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-app.vercel.app/api/telegram/webhook",
    "allowed_updates": ["message", "callback_query"]
  }'
```

### Verify webhook:

```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
```

Kết quả mong muốn:
```json
{
  "ok": true,
  "result": {
    "url": "https://your-app.vercel.app/api/telegram/webhook",
    "has_custom_certificate": false,
    "pending_update_count": 0
  }
}
```

---

## 5. Setup Scheduled Reports

### Option A: Vercel Cron (Recommended nếu dùng Vercel)

Tạo file `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/telegram/cron/send-reports?type=morning&secret=YOUR_CRON_SECRET",
      "schedule": "0 6 * * *"
    },
    {
      "path": "/api/telegram/cron/send-reports?type=evening&secret=YOUR_CRON_SECRET",
      "schedule": "0 18 * * *"
    }
  ]
}
```

### Option B: External Cron Service

Dùng service như [cron-job.org](https://cron-job.org):

1. Tạo tài khoản
2. Tạo 2 cron jobs:

**Morning Report:**
- URL: `https://your-app.vercel.app/api/telegram/cron/send-reports?type=morning&secret=YOUR_SECRET`
- Schedule: `0 6 * * *` (6:00 AM mỗi ngày)

**Evening Report:**
- URL: `https://your-app.vercel.app/api/telegram/cron/send-reports?type=evening&secret=YOUR_SECRET`
- Schedule: `0 18 * * *` (6:00 PM mỗi ngày)

### Option C: GitHub Actions

Tạo `.github/workflows/telegram-reports.yml`:

```yaml
name: Send Telegram Reports

on:
  schedule:
    - cron: '0 6 * * *'  # 6:00 AM UTC
    - cron: '0 18 * * *' # 6:00 PM UTC

jobs:
  send-reports:
    runs-on: ubuntu-latest
    steps:
      - name: Send morning report
        if: github.event.schedule == '0 6 * * *'
        run: |
          curl "${{ secrets.APP_URL }}/api/telegram/cron/send-reports?type=morning&secret=${{ secrets.CRON_SECRET }}"

      - name: Send evening report
        if: github.event.schedule == '0 18 * * *'
        run: |
          curl "${{ secrets.APP_URL }}/api/telegram/cron/send-reports?type=evening&secret=${{ secrets.CRON_SECRET }}"
```

---

## 6. Testing

### Test 1: Webhook Health Check

```bash
curl https://your-app.vercel.app/api/telegram/webhook
```

Expected response:
```json
{
  "status": "ok",
  "config": "valid",
  "timestamp": "2026-01-12T..."
}
```

### Test 2: Send Manual Message

Gửi message `/start` cho bot trong group.

Bot sẽ reply với welcome message.

### Test 3: Test Commands

Thử các commands:
- `/today`
- `/realtime`
- `/fuel`
- `/trips`

### Test 4: Test Scheduled Reports

Trigger manual:

```bash
curl "https://your-app.vercel.app/api/telegram/cron/send-reports?type=morning&secret=YOUR_SECRET"
```

Check topic **KẾT QUẢ XỬ LÝ** để xem báo cáo.

---

## 7. Troubleshooting

### Bot không phản hồi

**Check 1: Webhook status**
```bash
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
```

**Check 2: Logs**
- Vercel: Check Function Logs
- Local: Check terminal output

**Check 3: Bot permissions**
- Đảm bảo bot là admin
- Có quyền send messages

### Không nhận được scheduled reports

**Check 1: Cron đã chạy?**
- Vercel: Check Deployment Logs
- External: Check cron service logs

**Check 2: Topic IDs đúng?**
- Verify trong `.env.local`

**Check 3: Test manual trigger**
```bash
curl "https://your-app.vercel.app/api/telegram/cron/send-reports?type=morning&secret=YOUR_SECRET"
```

### Messages gửi sai topic

- Kiểm tra lại Topic IDs
- Dùng Telegram Desktop để lấy chính xác URL

---

## 📚 Tài liệu tham khảo

- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Telegraf Documentation](https://telegraf.js.org)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)

---

## 🆘 Hỗ trợ

Nếu gặp vấn đề, check:
1. Environment variables
2. Webhook configuration
3. Bot permissions
4. API logs

Happy botting! 🤖
