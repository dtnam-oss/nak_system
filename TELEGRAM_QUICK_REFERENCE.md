# 🚀 Telegram Bot - Quick Reference Card

## 📱 Bot Commands

```
/start          - Khởi động trợ lý ảo
/help           - Hướng dẫn sử dụng
/menu           - Menu chính tương tác
/today          - Báo cáo tổng quan hôm nay
/realtime       - Số liệu realtime
/trips          - Thống kê chuyến đi
/fuel           - Tình trạng nhiên liệu
/partners       - Hiệu suất đối tác
/customers      - Phân tích khách hàng
/reconciliation - Đối soát GHN, J&T
```

## 🔧 Setup Commands

```bash
# Install dependencies
npm install

# Setup webhook
npm run telegram:setup

# Test morning report
npm run telegram:test:morning

# Test evening report
npm run telegram:test:evening
```

## 🌐 API Endpoints

```
# Webhook
POST /api/telegram/webhook

# Health check
GET /api/telegram/webhook

# Scheduled reports
GET /api/telegram/cron/send-reports?type=morning&secret=XXX
GET /api/telegram/cron/send-reports?type=evening&secret=XXX
```

## 📝 Environment Variables

```env
TELEGRAM_BOT_TOKEN=8117923437:AAE...
TELEGRAM_GROUP_CHAT_ID=-1002957881731
TELEGRAM_TOPIC_KET_QUA_XU_LY=169
TELEGRAM_WEBHOOK_URL=https://your-app.vercel.app/api/telegram/webhook
NEXT_PUBLIC_API_URL=https://your-app.vercel.app
CRON_SECRET=your-secret-here
```

## ⏰ Scheduled Reports

| Time | Type | Topics |
|------|------|--------|
| 6:00 AM | Morning | KẾT QUẢ XỬ LÝ, ĐỐI TÁC, KHÁCH HÀNG |
| 6:00 PM | Evening | KẾT QUẢ XỬ LÝ, ĐỐI TÁC, KHÁCH HÀNG |

## 🧪 Testing

```bash
# Test webhook
curl https://your-app.vercel.app/api/telegram/webhook

# Get webhook info
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"

# Test morning report
curl "https://your-app.vercel.app/api/telegram/cron/send-reports?type=morning&secret=XXX"

# Test evening report
curl "https://your-app.vercel.app/api/telegram/cron/send-reports?type=evening&secret=XXX"
```

## 🎯 Topic IDs

| Topic | ID | Description |
|-------|----|----|
| KẾT QUẢ XỬ LÝ | 169 | Báo cáo tổng quan chuyến đi |
| ĐỐI TÁC VẬN CHUYỂN | TBD | Hiệu suất đối tác |
| KHÁCH HÀNG | TBD | Phân tích khách hàng |

## 🔍 Troubleshooting

**Bot không phản hồi?**
```bash
# Check webhook
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"

# Check logs
vercel logs <deployment-url>
```

**Reports không tự động?**
```bash
# Test manual trigger
npm run telegram:test:morning

# Check vercel.json cron config
# Check CRON_SECRET matches
```

**Messages sai topic?**
1. Mở topic trong Telegram Desktop
2. Copy URL: `https://t.me/c/2957881731/169`
3. Topic ID là số cuối: `169`
4. Update `.env.local`

## 📚 Files Reference

| File | Purpose |
|------|---------|
| `app/api/telegram/webhook/route.ts` | Webhook handler |
| `app/api/telegram/cron/send-reports/route.ts` | Cron endpoint |
| `app/api/telegram/services/telegram-bot.ts` | Bot service |
| `app/api/telegram/config/topics.ts` | Topic config |
| `scripts/setup-telegram-webhook.ts` | Setup script |
| `.env.local` | Environment variables |
| `vercel.json` | Cron configuration |

## 📖 Documentation

- [TELEGRAM_BOT_SETUP.md](./TELEGRAM_BOT_SETUP.md) - Detailed setup guide
- [TELEGRAM_README.md](./TELEGRAM_README.md) - Overview & features
- [TELEGRAM_IMPLEMENTATION_SUMMARY.md](./TELEGRAM_IMPLEMENTATION_SUMMARY.md) - Technical summary

---

💡 **Pro Tips:**
- Dùng Telegram Desktop để lấy topic IDs chính xác
- Test local với ngrok trước khi deploy
- Monitor Vercel logs để debug
- Backup `.env.local` vào password manager

🆘 **Quick Links:**
- [Telegram Bot API Docs](https://core.telegram.org/bots/api)
- [Telegraf Docs](https://telegraf.js.org)
- [Vercel Cron Docs](https://vercel.com/docs/cron-jobs)
