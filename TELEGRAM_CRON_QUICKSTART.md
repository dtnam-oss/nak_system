# Quick Start: Deploy Telegram Cron Jobs

## Các Bước Setup (5 phút)

### Bước 1: Kiểm tra files đã cập nhật

```bash
# Kiểm tra vercel.json
cat vercel.json

# Kiểm tra .env.local
grep CRON_SECRET .env.local
```

### Bước 2: Deploy lên Vercel

```bash
git add .
git commit -m "feat: Setup Telegram cron jobs với schedule 6AM & 6PM"
git push
```

### Bước 3: Thêm Environment Variable trên Vercel

1. Vào https://vercel.com/dashboard
2. Chọn project: **nak-logistic-system**
3. Settings → Environment Variables
4. Add new:
   - Name: `CRON_SECRET`
   - Value: `nak-2025-telegram-secret-abc123xyz789`
   - Environments: ✅ Production, ✅ Preview, ✅ Development
5. Click **Save**

### Bước 4: Redeploy (để apply env vars)

```bash
# Trigger redeploy
git commit --allow-empty -m "Trigger redeploy for CRON_SECRET"
git push
```

### Bước 5: Kiểm tra Cron Jobs

1. Vào Vercel Dashboard
2. Project → **Cron Jobs** tab
3. Bạn sẽ thấy:
   - ✅ Morning Report: `0 23 * * *` (6:00 AM Vietnam)
   - ✅ Evening Report: `0 11 * * *` (6:00 PM Vietnam)

### Bước 6: Test Manual

Click **Run** trên Vercel Dashboard hoặc:

```bash
curl "https://nak-logistic-system.vercel.app/api/telegram/cron/send-reports?type=morning&secret=nak-2025-telegram-secret-abc123xyz789"
```

---

## Schedule Times (Vietnam Timezone)

| Report | Vietnam Time | UTC Time | Cron Expression |
|--------|--------------|----------|-----------------|
| Morning | 6:00 AM | 11:00 PM (previous day) | `0 23 * * *` |
| Evening | 6:00 PM | 11:00 AM | `0 11 * * *` |

---

## Troubleshooting

### Cron không xuất hiện trong Vercel Dashboard?

```bash
# Kiểm tra vercel.json format
cat vercel.json | jq '.'

# Redeploy
git push
```

### Cron chạy nhưng không gửi báo cáo?

```bash
# Check logs trên Vercel
# → Functions → /api/telegram/cron/send-reports

# Test API endpoint
curl "https://nak-logistic-system.vercel.app/api/telegram/cron/send-reports?type=morning&secret=nak-2025-telegram-secret-abc123xyz789"
```

### Wrong timezone?

Đã fix! Schedule sử dụng UTC time:
- 6:00 AM Vietnam = 11:00 PM UTC (ngày hôm trước)
- 6:00 PM Vietnam = 11:00 AM UTC

---

## Xong! 🎉

Hệ thống sẽ tự động gửi báo cáo:
- ✅ **Sáng 6:00** - Báo cáo ngày hôm qua
- ✅ **Tối 6:00** - Báo cáo ngày hôm nay

Kiểm tra Telegram group để xem báo cáo!
