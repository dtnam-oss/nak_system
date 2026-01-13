# 🤖 NAK LOGISTICS - TELEGRAM INTERACTIVE CHATBOT

## 📋 OVERVIEW

Telegram Interactive Chatbot cho phép nhân viên NAK Logistics truy vấn dữ liệu và quản lý hệ thống thông qua Telegram App.

**Key Features:**
- 🔐 User authentication via employee code
- 📊 Real-time dashboard statistics
- 🚚 Trip search and management
- ⛽ Fuel inventory and efficiency tracking
- 📈 Comprehensive reports
- 👥 Role-based access control (RBAC)

---

## 🏗️ ARCHITECTURE

```
Telegram User
    ↓
Telegram Bot API (Webhook)
    ↓
/api/telegram/webhook-chatbot (Next.js)
    ↓
Authentication Middleware → Handlers → Database Queries
    ↓
PostgreSQL Database
    ↓
Formatted Response → Telegram User
```

---

## 📂 FILE STRUCTURE

```
/lib/telegram/
├── types.ts                      # TypeScript interfaces
├── auth.ts                       # Authentication & RBAC
├── keyboards.ts                  # Inline keyboard layouts
├── formatters.ts                 # Message formatters
└── handlers/
    ├── index.ts                  # Central export
    ├── dashboard.ts              # Dashboard queries
    ├── trips.ts                  # Trip management
    ├── fuel.ts                   # Fuel management
    └── reports.ts                # Report generation

/app/api/telegram/
└── webhook-chatbot/
    └── route.ts                  # Main webhook handler

Documentation:
├── TELEGRAM_CHATBOT_AUTHENTICATION_DESIGN.md    # Auth system
├── TELEGRAM_CHATBOT_INLINE_KEYBOARD_DESIGN.md   # Keyboard layouts
├── TELEGRAM_CHATBOT_IMPLEMENTATION_PLAN.md      # Implementation guide
├── TELEGRAM_CHATBOT_TESTING_GUIDE.md            # Testing guide
└── TELEGRAM_CHATBOT_README.md                   # This file
```

---

## 🚀 QUICK START

### 1. Prerequisites

- Telegram Bot Token (from [@BotFather](https://t.me/BotFather))
- Vercel account (or any Node.js hosting)
- PostgreSQL database (already configured)

### 2. Install Dependencies

```bash
npm install telegraf
```

### 3. Configure Environment Variables

Add to `.env.local`:

```bash
TELEGRAM_BOT_TOKEN=your_bot_token_here
DATABASE_URL=your_postgres_url
```

### 4. Deploy

```bash
git add .
git commit -m "feat: Add Telegram Interactive Chatbot"
git push origin main
```

### 5. Set Webhook

```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-domain.vercel.app/api/telegram/webhook-chatbot"}'
```

### 6. Test

Open Telegram → Search for `@YourBotName` → Send `/start`

---

## 📱 USER GUIDE

### Getting Started

1. **Find the bot:**
   - Open Telegram
   - Search: `@NAKLogisticsBot` (replace with your bot username)

2. **Register:**
   - Send: `/start`
   - If not registered, send: `/register <your_employee_code>`
   - Example: `/register NV001`

3. **Access menu:**
   - Send: `/menu`
   - Or click buttons after `/start`

### Available Commands

| Command | Description | Example |
|---------|-------------|---------|
| `/start` | Initialize bot and authenticate | `/start` |
| `/menu` | Show main menu | `/menu` |
| `/search <trip_id>` | Search trip by ID | `/search NAK2025010001` |
| `/register <employee_code>` | Register your account | `/register NV001` |
| `/help` | Show help message | `/help` |
| `/users` | [Admin] List registered users | `/users` |

### Main Menu Options

#### 📊 Dashboard
- **Hôm nay:** Today's statistics (trips, revenue, distance)
- **Tháng này:** Monthly overview
- **Top tuyến:** Top 10 routes by revenue
- **Top tài xế:** Top 10 drivers by trip count
- **Doanh thu:** Revenue breakdown (last 7 days)
- **Quãng đường:** Distance statistics

#### 🚚 Chuyến đi (Trips)
- **Tra cứu:** Search trip by ID
- **Hôm nay:** Today's trips (up to 10)
- **Theo KH:** Trips grouped by customer
- **Theo xe:** Trips grouped by vehicle
- **Thêm mới:** Create new trip (requires `them` permission)

#### ⛽ Nhiên liệu (Fuel)
- **Tồn kho:** Current inventory status
- **Hiệu suất:** Overall fuel efficiency
- **Theo xe:** Vehicle efficiency ranking (with pagination)
- **Theo ngày:** Fuel transactions (last 7 days)

#### 📈 Báo cáo (Reports)
- **Hôm nay:** Daily comprehensive report
- **Tuần này:** Weekly report with daily breakdown
- **Tháng này:** Monthly report with top customers & routes
- **Tùy chỉnh:** Custom date range report (coming soon)
- **Export Excel:** Download report as Excel (requires `xem` permission)

---

## 🔐 PERMISSION SYSTEM

### Roles

| Role | Description | Access Level |
|------|-------------|--------------|
| `admin` | Full access + user management | All features |
| `manager` | Reports, analytics, approvals | Read + Some write |
| `staff` | Basic operations | Read + Create |
| `user` | View-only | Read-only |

### Permissions Matrix

| Permission | Description | Example |
|------------|-------------|---------|
| `xem` (View) | View data and reports | Dashboard, Search |
| `them` (Add) | Create new records | Create trip |
| `sua` (Edit) | Modify existing records | Edit trip |
| `xoa` (Delete) | Delete records | Delete trip |

**Example:**
- Admin: `xem=true, them=true, sua=true, xoa=true`
- Staff: `xem=true, them=true, sua=false, xoa=false`
- User: `xem=true, them=false, sua=false, xoa=false`

---

## 🎯 FEATURES

### ✅ Implemented

- [x] User authentication (auto + manual)
- [x] Role-based access control (RBAC)
- [x] Dashboard statistics (today, month)
- [x] Top routes and drivers ranking
- [x] Trip search by ID
- [x] Trip listings (today, by customer, by vehicle)
- [x] Fuel inventory tracking
- [x] Vehicle fuel efficiency ranking
- [x] Pagination for long lists
- [x] Comprehensive reports (day, week, month)
- [x] Rate limiting (10 req/min per user)
- [x] Error handling and user-friendly messages
- [x] Admin user management commands

### ⏳ Planned (Future Enhancements)

- [ ] Export to Excel (with formatting)
- [ ] Custom date range reports
- [ ] Trip creation via chatbot
- [ ] Trip editing/deletion
- [ ] Push notifications (low stock, new trips)
- [ ] Inline query support (search from any chat)
- [ ] Multi-language support (EN/VI)
- [ ] Voice message support
- [ ] Image recognition for receipts

---

## 🧪 TESTING

See [TELEGRAM_CHATBOT_TESTING_GUIDE.md](TELEGRAM_CHATBOT_TESTING_GUIDE.md) for detailed testing instructions.

**Quick Test:**
```bash
# 1. Start bot
/start

# 2. Check authentication
/register NV001

# 3. Open menu
/menu

# 4. Test dashboard
Click: 📊 Dashboard → 📅 Hôm nay

# 5. Test search
/search NAK2025010001

# 6. Test fuel
Click: ⛽ Nhiên liệu → 📊 Tồn kho
```

---

## 🔧 TROUBLESHOOTING

### Bot doesn't respond

**Solution:**
```bash
# 1. Check webhook status
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"

# 2. Delete and reset webhook
curl -X POST "https://api.telegram.org/bot<TOKEN>/deleteWebhook"
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -d "url=https://your-domain.vercel.app/api/telegram/webhook-chatbot"

# 3. Check logs
vercel logs --follow
```

### "Unauthorized" error

**Solution:** Verify `TELEGRAM_BOT_TOKEN` in `.env.local` and redeploy

### Database connection timeout

**Solution:** Check `DATABASE_URL` environment variable in Vercel dashboard

### Permission denied

**Solution:** Verify user permissions in `nhan_vien` table:
```sql
SELECT ma_nhan_vien, phan_quyen, xem, them, sua, xoa
FROM nhan_vien
WHERE chat_id = 'your_chat_id';
```

---

## 📊 PERFORMANCE

**Target Metrics:**
- Response time: < 2 seconds (95th percentile)
- Database query: < 500ms average
- Concurrent users: 50+
- Rate limit: 10 requests/minute per user
- Uptime: 99.9%

**Optimization:**
- Indexed database queries
- Pagination for large datasets (5-10 items per page)
- Rate limiting to prevent abuse
- Caching for frequently accessed data (future)

---

## 🔒 SECURITY

### Authentication
- Users must register with valid employee code
- `chat_id` stored in database for persistent sessions
- No plaintext passwords or tokens stored

### Authorization
- Role-based access control (RBAC)
- Permission checks before every sensitive operation
- Admin-only commands protected

### Rate Limiting
- 10 requests/minute per user
- Prevents spam and abuse
- Auto-resets after window

### Input Validation
- All inputs sanitized
- SQL injection prevention (parameterized queries)
- No eval() or dangerous functions

---

## 📚 DOCUMENTATION

| File | Description |
|------|-------------|
| [TELEGRAM_CHATBOT_AUTHENTICATION_DESIGN.md](TELEGRAM_CHATBOT_AUTHENTICATION_DESIGN.md) | Auth system design |
| [TELEGRAM_CHATBOT_INLINE_KEYBOARD_DESIGN.md](TELEGRAM_CHATBOT_INLINE_KEYBOARD_DESIGN.md) | Keyboard layouts |
| [TELEGRAM_CHATBOT_IMPLEMENTATION_PLAN.md](TELEGRAM_CHATBOT_IMPLEMENTATION_PLAN.md) | Implementation guide |
| [TELEGRAM_CHATBOT_TESTING_GUIDE.md](TELEGRAM_CHATBOT_TESTING_GUIDE.md) | Testing guide |

---

## 🤝 CONTRIBUTING

### Adding New Features

1. **Create handler function** in `/lib/telegram/handlers/`
2. **Add keyboard button** in `/lib/telegram/keyboards.ts`
3. **Register callback** in `/app/api/telegram/webhook-chatbot/route.ts`
4. **Test thoroughly** using testing guide
5. **Update documentation**

**Example: Add "Drivers" menu**

```typescript
// 1. Create handler (/lib/telegram/handlers/drivers.ts)
export async function handleDriversMenu(ctx: BotContext) {
  // ... implementation
}

// 2. Add keyboard (/lib/telegram/keyboards.ts)
export function getDriversMenuKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('📋 Danh sách', 'drivers_list')],
    [Markup.button.callback('⬅️ Quay lại', 'menu_main')]
  ]);
}

// 3. Register callback (route.ts)
bot.action('menu_drivers', requireAuth, handleDriversMenu);
bot.action('drivers_list', requireAuth, handleDriversList);
```

---

## 📞 SUPPORT

- **GitHub Issues:** [Report bugs](https://github.com/your-repo/issues)
- **Email:** support@naklogistics.com
- **Telegram:** Contact @AdminUsername

---

## 📝 LICENSE

Copyright © 2026 NAK Logistics. All rights reserved.

---

## 🎉 CREDITS

**Developed by:** Senior Full-Stack Team
**Framework:** Next.js 16 + Telegraf
**Database:** PostgreSQL (Neon)
**Hosting:** Vercel

---

**🚀 Enjoy using NAK Logistics Telegram Bot!**
