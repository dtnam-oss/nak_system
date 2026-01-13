# 🤖 NAK Logistics Telegram Bot

Hệ thống Telegram Bot tự động báo cáo và trợ lý ảo cho NAK Logistics System.

## ✨ Tính năng

### 📊 Báo cáo tự động
- **Báo cáo buổi sáng (6:00 AM)**: Kế hoạch ngày, tình trạng nhiên liệu, ưu tiên
- **Báo cáo buổi tối (18:00 PM)**: Tổng kết chuyến đi, hiệu suất đối tác, khách hàng
- **Gửi đến các topics riêng biệt**: KẾT QUẢ XỬ LÝ, ĐỐI TÁC VẬN CHUYỂN, KHÁCH HÀNG

### 💬 Trợ lý ảo tương tác
- **Commands nhanh**: `/today`, `/realtime`, `/trips`, `/fuel`, `/partners`, `/customers`
- **Menu tương tác**: Inline keyboards cho trải nghiệm dễ dàng
- **Truy vấn tự nhiên**: "Hôm nay có bao nhiêu chuyến?", "Nhiên liệu còn bao nhiêu?"

### 🔔 Cảnh báo thông minh
- Nhiên liệu dưới mức an toàn
- Đối soát có chênh lệch lớn
- Chuyến đi trễ hạn

## 🚀 Quick Start

### 1. Cài đặt dependencies

```bash
npm install
```

### 2. Cấu hình môi trường

Copy và cập nhật file `.env.local`:

```bash
cp .env.example .env.local
```

Cập nhật các giá trị:
```env
TELEGRAM_BOT_TOKEN=your_bot_token_from_botfather
TELEGRAM_GROUP_CHAT_ID=-1001234567890
TELEGRAM_TOPIC_KET_QUA_XU_LY=169
TELEGRAM_WEBHOOK_URL=https://your-app.vercel.app/api/telegram/webhook
NEXT_PUBLIC_API_URL=https://your-app.vercel.app
CRON_SECRET=your-random-secret
```

### 3. Setup webhook

```bash
npm run telegram:setup
```

### 4. Test bot

Trong Telegram:
1. Mở group chat
2. Gửi `/start` cho bot
3. Thử các commands: `/today`, `/realtime`, `/fuel`

### 5. Test scheduled reports

```bash
# Test báo cáo sáng
npm run telegram:test:morning

# Test báo cáo tối
npm run telegram:test:evening
```

## 📁 Cấu trúc dự án

```
app/api/telegram/
├── webhook/
│   └── route.ts              # Webhook endpoint chính
├── cron/
│   └── send-reports/
│       └── route.ts          # Scheduled reports endpoint
├── commands/                 # Command handlers
│   ├── today.ts
│   ├── realtime.ts
│   ├── trips.ts
│   ├── fuel.ts
│   ├── partners.ts
│   ├── customers.ts
│   └── reconciliation.ts
├── handlers/                 # Message & callback handlers
│   ├── message-handler.ts
│   └── callback-handler.ts
├── formatters/              # Message formatters
│   ├── report-formatter.ts
│   └── number-formatter.ts
├── services/                # Core services
│   └── telegram-bot.ts
├── config/                  # Configuration
│   ├── topics.ts
│   └── commands.ts
└── types/                   # Type definitions

scripts/
├── setup-telegram-webhook.ts  # Setup webhook script
└── test-telegram-report.ts    # Test reports script
```

## 🎯 Commands

### User Commands

| Command | Mô tả |
|---------|-------|
| `/start` | Khởi động bot và xem hướng dẫn |
| `/help` | Danh sách lệnh và cách sử dụng |
| `/menu` | Mở menu tương tác |
| `/today` | Báo cáo tổng quan hôm nay |
| `/realtime` | Số liệu realtime |
| `/trips` | Thống kê chuyến đi |
| `/fuel` | Tình trạng nhiên liệu |
| `/partners` | Hiệu suất đối tác |
| `/customers` | Phân tích khách hàng |
| `/reconciliation` | Đối soát GHN, J&T |

### Admin Scripts

```bash
# Setup webhook
npm run telegram:setup

# Test morning report
npm run telegram:test:morning

# Test evening report
npm run telegram:test:evening
```

## 🕐 Scheduled Reports

### Morning Report (6:00 AM)
Gửi đến 3 topics:

**KẾT QUẢ XỬ LÝ:**
- Kế hoạch chuyến đi
- Tình trạng nhiên liệu
- Ưu tiên hôm nay

**ĐỐI TÁC VẬN CHUYỂN:**
- Phân bổ chuyến theo đối tác
- Mục tiêu hiệu suất

**KHÁCH HÀNG:**
- Top khách hàng
- Yêu cầu đặc biệt

### Evening Report (18:00 PM)
Gửi đến 3 topics:

**KẾT QUẢ XỬ LÝ:**
- Tổng kết chuyến đi
- Chi tiết theo trạng thái
- So sánh với hôm qua

**ĐỐI TÁC VẬN CHUYỂN:**
- Hiệu suất các đối tác
- Top performers
- Vấn đề cần quan tâm

**KHÁCH HÀNG:**
- Top khách hàng
- Phân tích chuyến/KH
- Tỷ lệ hoàn thành

## ⚙️ Configuration

### Environment Variables

| Variable | Mô tả | Required |
|----------|-------|----------|
| `TELEGRAM_BOT_TOKEN` | Token từ @BotFather | ✅ |
| `TELEGRAM_GROUP_CHAT_ID` | Chat ID của group | ✅ |
| `TELEGRAM_TOPIC_KET_QUA_XU_LY` | Topic ID cho Kết quả xử lý | ✅ |
| `TELEGRAM_TOPIC_DOI_TAC` | Topic ID cho Đối tác | ⚠️ |
| `TELEGRAM_TOPIC_KHACH_HANG` | Topic ID cho Khách hàng | ⚠️ |
| `TELEGRAM_WEBHOOK_URL` | URL webhook của app | ✅ |
| `NEXT_PUBLIC_API_URL` | Base URL của app | ✅ |
| `CRON_SECRET` | Secret cho cron endpoints | ✅ |
| `TELEGRAM_ENABLE_LLM` | Enable LLM features | ❌ |
| `ANTHROPIC_API_KEY` | Claude API key (nếu dùng LLM) | ❌ |

### Vercel Cron Jobs

Thêm vào `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/telegram/cron/send-reports?type=morning&secret=YOUR_SECRET",
      "schedule": "0 6 * * *"
    },
    {
      "path": "/api/telegram/cron/send-reports?type=evening&secret=YOUR_SECRET",
      "schedule": "0 18 * * *"
    }
  ]
}
```

## 📖 Hướng dẫn chi tiết

Xem file [TELEGRAM_BOT_SETUP.md](./TELEGRAM_BOT_SETUP.md) để có hướng dẫn setup chi tiết từng bước.

## 🔧 Troubleshooting

### Bot không phản hồi

1. **Kiểm tra webhook:**
   ```bash
   curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo
   ```

2. **Kiểm tra logs:**
   - Vercel: Function Logs
   - Local: Terminal output

3. **Kiểm tra permissions:**
   - Bot phải là admin của group
   - Có quyền send messages

### Scheduled reports không chạy

1. **Test manual trigger:**
   ```bash
   curl "https://your-app.vercel.app/api/telegram/cron/send-reports?type=morning&secret=YOUR_SECRET"
   ```

2. **Kiểm tra cron configuration**
3. **Verify topic IDs**

### Messages đi sai topic

1. Mở topic trong Telegram Desktop
2. Copy URL và lấy topic ID chính xác
3. Cập nhật `.env.local`

## 🎯 Roadmap

### Phase 1: Core ✅
- [x] Telegram bot setup
- [x] Webhook integration
- [x] Basic commands
- [x] Topic message sending

### Phase 2: Reports ✅
- [x] Scheduled morning reports
- [x] Scheduled evening reports
- [x] Message formatters

### Phase 3: Interactive ✅
- [x] Inline keyboard menus
- [x] Callback handlers
- [x] Quick actions

### Phase 4: Advanced (Upcoming)
- [ ] Chart generation
- [ ] Alert system
- [ ] LLM natural language queries
- [ ] Excel exports
- [ ] Voice message support
- [ ] Image analysis

## 📚 Resources

- [Telegram Bot API Documentation](https://core.telegram.org/bots/api)
- [Telegraf Framework](https://telegraf.js.org)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)

## 🆘 Support

Nếu gặp vấn đề, vui lòng:
1. Check [TELEGRAM_BOT_SETUP.md](./TELEGRAM_BOT_SETUP.md)
2. Xem logs trong Vercel Dashboard
3. Test webhook với curl commands

---

Made with ❤️ for NAK Logistics
