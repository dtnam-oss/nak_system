# Hướng Dẫn Setup Telegram Report Cron Jobs

## Tổng Quan

Hệ thống sẽ tự động gửi báo cáo vào 2 thời điểm:
- **Báo cáo sáng**: 6:00 sáng mỗi ngày (dữ liệu ngày hôm qua)
- **Báo cáo tối**: 6:00 chiều mỗi ngày (dữ liệu ngày hôm nay)

---

## Phương Án 1: Vercel Cron Jobs (Khuyến nghị ⭐)

### Ưu điểm:
✅ Tích hợp sẵn với Vercel  
✅ Không cần service bên ngoài  
✅ Miễn phí (trong giới hạn Vercel plan)  
✅ Quản lý dễ dàng qua Vercel Dashboard

### Bước 1: Thêm Environment Variable

Vào Vercel Dashboard → Project Settings → Environment Variables:

```bash
CRON_SECRET=nak-2025-telegram-secret-abc123xyz789
```

**Lưu ý**: Thay bằng chuỗi random của riêng bạn để bảo mật!

### Bước 2: Cập nhật vercel.json

File `vercel.json` đã có sẵn cấu hình:

```json
{
  "buildCommand": "next build",
  "framework": "nextjs",
  "crons": [
    {
      "path": "/api/telegram/cron/send-reports?type=morning&secret=YOUR_CRON_SECRET_HERE",
      "schedule": "0 6 * * *"
    },
    {
      "path": "/api/telegram/cron/send-reports?type=evening&secret=YOUR_CRON_SECRET_HERE",
      "schedule": "0 18 * * *"
    }
  ]
}
```

**Cập nhật secret**:

```json
{
  "buildCommand": "next build",
  "framework": "nextjs",
  "crons": [
    {
      "path": "/api/telegram/cron/send-reports?type=morning&secret=nak-2025-telegram-secret-abc123xyz789",
      "schedule": "0 6 * * *"
    },
    {
      "path": "/api/telegram/cron/send-reports?type=evening&secret=nak-2025-telegram-secret-abc123xyz789",
      "schedule": "0 18 * * *"
    }
  ]
}
```

### Bước 3: Deploy lên Vercel

```bash
git add vercel.json
git commit -m "feat: Setup cron jobs for Telegram reports"
git push
```

### Bước 4: Kiểm tra Cron Jobs

1. Vào Vercel Dashboard
2. Chọn project: **nak-logistic-system**
3. Vào tab **Cron Jobs**
4. Bạn sẽ thấy 2 jobs:
   - Morning Report: `0 6 * * *`
   - Evening Report: `0 18 * * *`

### Bước 5: Test Manual Trigger (Tuỳ chọn)

Trên Vercel Dashboard → Cron Jobs, click nút **Run** để test ngay lập tức.

---

## Phương Án 2: GitHub Actions (Backup/Alternative)

### Ưu điểm:
✅ Miễn phí 100%  
✅ Có logs chi tiết  
✅ Không phụ thuộc Vercel  
✅ Có thể chạy cùng lúc với Vercel Cron

### Setup GitHub Actions

Tạo file `.github/workflows/telegram-reports.yml`:

```yaml
name: Telegram Reports

on:
  schedule:
    # Morning report: 6:00 AM UTC+7 = 11:00 PM UTC (previous day)
    - cron: '0 23 * * *'
    # Evening report: 6:00 PM UTC+7 = 11:00 AM UTC
    - cron: '0 11 * * *'
  workflow_dispatch: # Allow manual trigger

jobs:
  send-morning-report:
    if: github.event.schedule == '0 23 * * *' || github.event_name == 'workflow_dispatch'
    runs-on: ubuntu-latest
    steps:
      - name: Send Morning Report
        run: |
          curl -X GET "https://nak-logistic-system.vercel.app/api/telegram/cron/send-reports?type=morning&secret=${{ secrets.CRON_SECRET }}"

  send-evening-report:
    if: github.event.schedule == '0 11 * * *' || github.event_name == 'workflow_dispatch'
    runs-on: ubuntu-latest
    steps:
      - name: Send Evening Report
        run: |
          curl -X GET "https://nak-logistic-system.vercel.app/api/telegram/cron/send-reports?type=evening&secret=${{ secrets.CRON_SECRET }}"
```

### Thêm GitHub Secret

1. Vào GitHub repo: **Settings → Secrets and variables → Actions**
2. Click **New repository secret**
3. Name: `CRON_SECRET`
4. Value: `nak-2025-telegram-secret-abc123xyz789`

---

## Phương Án 3: External Cron Service

### Dịch vụ miễn phí:
- [cron-job.org](https://cron-job.org)
- [EasyCron](https://www.easycron.com)
- [cron-job.io](https://cron-job.io)

### Setup trên cron-job.org:

1. **Đăng ký tài khoản** tại https://cron-job.org

2. **Tạo Cron Job mới**:

   **Morning Report:**
   - Title: `NAK Morning Report`
   - URL: `https://nak-logistic-system.vercel.app/api/telegram/cron/send-reports?type=morning&secret=nak-2025-telegram-secret-abc123xyz789`
   - Schedule: `0 6 * * *` (Every day at 6:00 AM)
   - Timezone: `Asia/Ho_Chi_Minh`

   **Evening Report:**
   - Title: `NAK Evening Report`
   - URL: `https://nak-logistic-system.vercel.app/api/telegram/cron/send-reports?type=evening&secret=nak-2025-telegram-secret-abc123xyz789`
   - Schedule: `0 18 * * *` (Every day at 6:00 PM)
   - Timezone: `Asia/Ho_Chi_Minh`

3. **Enable notifications** để nhận email khi job fail

---

## Cron Schedule Syntax

```
┌───────────── phút (0 - 59)
│ ┌───────────── giờ (0 - 23)
│ │ ┌───────────── ngày trong tháng (1 - 31)
│ │ │ ┌───────────── tháng (1 - 12)
│ │ │ │ ┌───────────── ngày trong tuần (0 - 6) (0 = Sunday)
│ │ │ │ │
│ │ │ │ │
* * * * *
```

### Ví dụ:

| Schedule | Mô tả |
|----------|-------|
| `0 6 * * *` | 6:00 AM mỗi ngày |
| `0 18 * * *` | 6:00 PM mỗi ngày |
| `0 8 * * 1-5` | 8:00 AM thứ 2-6 |
| `*/30 * * * *` | Mỗi 30 phút |
| `0 9,12,15 * * *` | 9 AM, 12 PM, 3 PM |

---

## Testing Manual Trigger

### Test từ command line:

```bash
# Morning report
curl "http://localhost:3000/api/telegram/cron/send-reports?type=morning&secret=nak-2025-telegram-secret-abc123xyz789"

# Evening report
curl "http://localhost:3000/api/telegram/cron/send-reports?type=evening&secret=nak-2025-telegram-secret-abc123xyz789"
```

### Test production:

```bash
# Morning report
curl "https://nak-logistic-system.vercel.app/api/telegram/cron/send-reports?type=morning&secret=nak-2025-telegram-secret-abc123xyz789"

# Evening report
curl "https://nak-logistic-system.vercel.app/api/telegram/cron/send-reports?type=evening&secret=nak-2025-telegram-secret-abc123xyz789"
```

---

## Monitoring & Logs

### Vercel Dashboard
- Vào **Logs** để xem execution history
- Mỗi cron job sẽ có log riêng
- Filter by function: `/api/telegram/cron/send-reports`

### Telegram Group
- Mỗi lần gửi thành công sẽ thấy message trong group
- Nếu không thấy → check logs

### Check Cron Status

```bash
# Check morning report
curl "https://nak-logistic-system.vercel.app/api/telegram/cron/send-reports?type=morning&secret=nak-2025-telegram-secret-abc123xyz789"

# Response should be:
{
  "success": true,
  "reportType": "morning",
  "timestamp": "2026-01-13T06:00:00.000Z",
  "results": [
    {"topic": "KẾT QUẢ XỬ LÝ", "status": "sent"},
    {"topic": "ĐỐI TÁC VẬN CHUYỂN", "status": "sent"},
    {"topic": "KHÁCH HÀNG", "status": "sent"}
  ]
}
```

---

## Troubleshooting

### ❌ Cron không chạy

**Kiểm tra:**
1. CRON_SECRET trong Vercel env vars đúng chưa?
2. vercel.json có secret đúng không?
3. Đã deploy code mới nhất chưa?
4. Check Vercel Cron Jobs dashboard

### ❌ Báo cáo không gửi được

**Kiểm tra:**
1. TELEGRAM_BOT_TOKEN còn valid?
2. TELEGRAM_GROUP_CHAT_ID đúng?
3. Bot còn trong group?
4. Topic IDs còn đúng?

### ❌ Timezone sai

Vercel Cron chạy theo **UTC timezone**.

**Việt Nam (UTC+7):**
- 6:00 AM → Schedule: `0 23 * * *` (11 PM UTC ngày hôm trước)
- 6:00 PM → Schedule: `0 11 * * *` (11 AM UTC)

---

## Best Practices

### 1. Sử dụng Environment Variables
```bash
# .env.local
CRON_SECRET=your-random-secret-here
```

### 2. Monitoring
- Setup alert qua email/Slack khi cron fail
- Check logs hàng tuần

### 3. Backup Strategy
- Sử dụng cả Vercel Cron + GitHub Actions
- Nếu 1 fail thì còn 1 backup

### 4. Security
- KHÔNG commit CRON_SECRET vào git
- Thay đổi secret định kỳ (3-6 tháng)
- Sử dụng secret dài, random

---

## Timezone Reference

| Giờ Việt Nam | UTC Time | Cron Schedule |
|--------------|----------|---------------|
| 6:00 AM | 11:00 PM (previous day) | `0 23 * * *` |
| 7:00 AM | 12:00 AM | `0 0 * * *` |
| 8:00 AM | 1:00 AM | `0 1 * * *` |
| 12:00 PM | 5:00 AM | `0 5 * * *` |
| 6:00 PM | 11:00 AM | `0 11 * * *` |
| 11:00 PM | 4:00 PM | `0 16 * * *` |

---

## Commands Summary

```bash
# 1. Update .env.local
echo "CRON_SECRET=nak-2025-telegram-secret-abc123xyz789" >> .env.local

# 2. Update vercel.json with actual secret

# 3. Deploy
git add vercel.json .env.local
git commit -m "Setup cron jobs for Telegram reports"
git push

# 4. Add env to Vercel
vercel env add CRON_SECRET

# 5. Test manually
curl "https://nak-logistic-system.vercel.app/api/telegram/cron/send-reports?type=morning&secret=nak-2025-telegram-secret-abc123xyz789"
```

---

## Khuyến Nghị Cuối Cùng

✅ **Sử dụng Vercel Cron Jobs** - Đơn giản nhất, tích hợp tốt  
✅ **Setup GitHub Actions làm backup** - Miễn phí, reliable  
✅ **Monitor logs thường xuyên** - Đảm bảo cron chạy đúng  
✅ **Test trước khi deploy** - Tránh lỗi vào production

---

**Status**: Ready to deploy 🚀  
**Last Updated**: January 13, 2026
