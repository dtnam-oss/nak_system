# 🚀 TELEGRAM CHATBOT - IMPLEMENTATION PLAN

## OVERVIEW

Kế hoạch triển khai Telegram Chatbot Interactive cho NAK Logistics System.

**Timeline**: 2-3 days
**Priority**: HIGH
**Dependencies**: Existing database schema, Telegram bot token

---

## 📋 TASKS BREAKDOWN

### PHASE 1: SETUP & AUTHENTICATION (Day 1 - 4 hours)

#### Task 1.1: Project Setup
- [ ] Install dependencies
  ```bash
  npm install telegraf
  npm install @types/node
  ```

- [ ] Create directory structure
  ```
  /lib/telegram/
  ├── auth.ts           # Authentication functions
  ├── keyboards.ts      # Keyboard definitions
  ├── formatters.ts     # Message formatters
  ├── types.ts          # TypeScript types
  └── handlers/
      ├── dashboard.ts
      ├── trips.ts
      ├── fuel.ts
      ├── employees.ts
      └── reports.ts
  ```

#### Task 1.2: Authentication System
- [ ] Create `authenticateUser()` function ([TELEGRAM_CHATBOT_AUTHENTICATION_DESIGN.md](TELEGRAM_CHATBOT_AUTHENTICATION_DESIGN.md):50-90)
- [ ] Create `hasPermission()` helper ([TELEGRAM_CHATBOT_AUTHENTICATION_DESIGN.md](TELEGRAM_CHATBOT_AUTHENTICATION_DESIGN.md):92-105)
- [ ] Create `hasRole()` helper ([TELEGRAM_CHATBOT_AUTHENTICATION_DESIGN.md](TELEGRAM_CHATBOT_AUTHENTICATION_DESIGN.md):107-115)
- [ ] Implement `requireAuth` middleware ([TELEGRAM_CHATBOT_AUTHENTICATION_DESIGN.md](TELEGRAM_CHATBOT_AUTHENTICATION_DESIGN.md):145-165)
- [ ] Implement `requirePermission` middleware ([TELEGRAM_CHATBOT_AUTHENTICATION_DESIGN.md](TELEGRAM_CHATBOT_AUTHENTICATION_DESIGN.md):167-180)

#### Task 1.3: Basic Commands
- [ ] `/start` command with auto-authentication ([TELEGRAM_CHATBOT_AUTHENTICATION_DESIGN.md](TELEGRAM_CHATBOT_AUTHENTICATION_DESIGN.md):33-64)
- [ ] `/register` command for manual registration ([TELEGRAM_CHATBOT_AUTHENTICATION_DESIGN.md](TELEGRAM_CHATBOT_AUTHENTICATION_DESIGN.md):128-176)
- [ ] `/help` command
- [ ] `/menu` command ([TELEGRAM_CHATBOT_INLINE_KEYBOARD_DESIGN.md](TELEGRAM_CHATBOT_INLINE_KEYBOARD_DESIGN.md):68-83)

**Deliverables:**
- ✅ Authentication system working
- ✅ Users can register via `/start` or `/register`
- ✅ Role-based access control implemented

---

### PHASE 2: MAIN MENU & KEYBOARDS (Day 1 - 4 hours)

#### Task 2.1: Create Keyboard Definitions
- [ ] Main menu keyboard ([TELEGRAM_CHATBOT_INLINE_KEYBOARD_DESIGN.md](TELEGRAM_CHATBOT_INLINE_KEYBOARD_DESIGN.md):40-64)
- [ ] Dashboard submenu ([TELEGRAM_CHATBOT_INLINE_KEYBOARD_DESIGN.md](TELEGRAM_CHATBOT_INLINE_KEYBOARD_DESIGN.md):91-110)
- [ ] Trips submenu ([TELEGRAM_CHATBOT_INLINE_KEYBOARD_DESIGN.md](TELEGRAM_CHATBOT_INLINE_KEYBOARD_DESIGN.md):209-235)
- [ ] Fuel submenu ([TELEGRAM_CHATBOT_INLINE_KEYBOARD_DESIGN.md](TELEGRAM_CHATBOT_INLINE_KEYBOARD_DESIGN.md):347-361)
- [ ] Reports submenu ([TELEGRAM_CHATBOT_INLINE_KEYBOARD_DESIGN.md](TELEGRAM_CHATBOT_INLINE_KEYBOARD_DESIGN.md):467-481)

#### Task 2.2: Navigation Handlers
- [ ] `menu_dashboard` callback ([TELEGRAM_CHATBOT_INLINE_KEYBOARD_DESIGN.md](TELEGRAM_CHATBOT_INLINE_KEYBOARD_DESIGN.md):114-126)
- [ ] `menu_trips` callback
- [ ] `menu_fuel` callback
- [ ] `menu_employees` callback
- [ ] `menu_reports` callback
- [ ] `menu_main` callback (back to main menu)

**Deliverables:**
- ✅ Main menu with 6 options
- ✅ All submenus working
- ✅ Navigation between menus smooth

---

### PHASE 3: DASHBOARD QUERIES (Day 2 - 4 hours)

#### Task 3.1: Dashboard Handlers
- [ ] "Hôm nay" query ([TELEGRAM_CHATBOT_INLINE_KEYBOARD_DESIGN.md](TELEGRAM_CHATBOT_INLINE_KEYBOARD_DESIGN.md):130-183)
  - Total trips
  - Total revenue
  - Total distance
  - Total drivers
  - Refresh button

- [ ] "Tháng này" query
  - Similar to "Hôm nay" but with date range

- [ ] "Top routes" query
  - Top 5 routes by revenue
  - Display as formatted list

- [ ] "Top drivers" query
  - Top 5 drivers by trips count
  - Display with statistics

#### Task 3.2: Formatting Helpers
- [ ] Number formatter (Vietnamese format)
- [ ] Date formatter
- [ ] Currency formatter
- [ ] Status badge formatter

**Deliverables:**
- ✅ 4 dashboard queries working
- ✅ Data formatted beautifully
- ✅ Refresh functionality

---

### PHASE 4: TRIPS MANAGEMENT (Day 2 - 4 hours)

#### Task 4.1: Trip Queries
- [ ] Search by trip ID ([TELEGRAM_CHATBOT_INLINE_KEYBOARD_DESIGN.md](TELEGRAM_CHATBOT_INLINE_KEYBOARD_DESIGN.md):252-309)
- [ ] Today's trips list
- [ ] Trips by customer (with filter)
- [ ] Trips by vehicle (with filter)

#### Task 4.2: Trip Details Display
- [ ] Show master trip info
- [ ] Parse and display `data_json` (route details)
- [ ] Add action buttons (Approve, Reject, etc.) - permission-based

#### Task 4.3: Create Trip (Optional - Advanced)
- [ ] Multi-step conversation to create trip
- [ ] Validate inputs
- [ ] Send to backend API

**Deliverables:**
- ✅ Trip search working
- ✅ Trip details displayed correctly
- ✅ Route details from JSON parsed

---

### PHASE 5: FUEL MANAGEMENT (Day 3 - 3 hours)

#### Task 5.1: Fuel Queries
- [ ] Inventory status ([TELEGRAM_CHATBOT_INLINE_KEYBOARD_DESIGN.md](TELEGRAM_CHATBOT_INLINE_KEYBOARD_DESIGN.md):367-397))
  - Current stock
  - Average price
  - Total imports/exports

- [ ] Efficiency by vehicle ([TELEGRAM_CHATBOT_INLINE_KEYBOARD_DESIGN.md](TELEGRAM_CHATBOT_INLINE_KEYBOARD_DESIGN.md):401-462))
  - List vehicles with avg efficiency
  - Pagination support

- [ ] Transactions by date range
- [ ] Low stock alert (if inventory < threshold)

**Deliverables:**
- ✅ Fuel inventory query working
- ✅ Vehicle efficiency ranking
- ✅ Pagination implemented

---

### PHASE 6: REPORTS & EXPORT (Day 3 - 3 hours)

#### Task 6.1: Report Generators
- [ ] Daily report
- [ ] Weekly report
- [ ] Monthly report
- [ ] Custom date range report ([TELEGRAM_CHATBOT_INLINE_KEYBOARD_DESIGN.md](TELEGRAM_CHATBOT_INLINE_KEYBOARD_DESIGN.md):489-540))

#### Task 6.2: Export to Excel
- [ ] Generate Excel file using `exceljs`
- [ ] Send file to user ([TELEGRAM_CHATBOT_INLINE_KEYBOARD_DESIGN.md](TELEGRAM_CHATBOT_INLINE_KEYBOARD_DESIGN.md):569-609))
- [ ] Permission check (only allow xem permission)

**Deliverables:**
- ✅ 4 report types working
- ✅ Excel export functional

---

### PHASE 7: ADVANCED FEATURES (Optional - Day 4)

#### Task 7.1: Inline Query
- [ ] Search trips from any chat ([TELEGRAM_CHATBOT_INLINE_KEYBOARD_DESIGN.md](TELEGRAM_CHATBOT_INLINE_KEYBOARD_DESIGN.md):548-578))
- [ ] Auto-suggest results

#### Task 7.2: Notifications
- [ ] Alert on new trip created
- [ ] Alert on low fuel stock
- [ ] Daily summary push notification

#### Task 7.3: Admin Commands
- [ ] `/users` - List registered users ([TELEGRAM_CHATBOT_AUTHENTICATION_DESIGN.md](TELEGRAM_CHATBOT_AUTHENTICATION_DESIGN.md):286-314))
- [ ] `/grant <chat_id> <role>` - Grant role to user
- [ ] `/revoke <chat_id>` - Revoke access

**Deliverables:**
- ✅ Inline query working
- ✅ Push notifications enabled
- ✅ Admin panel functional

---

## 📂 FILE STRUCTURE

```
/app/api/telegram/
├── webhook/
│   └── route.ts              # Main webhook handler (UPDATE THIS)

/lib/telegram/
├── auth.ts                   # Authentication functions (NEW)
├── keyboards.ts              # Keyboard definitions (NEW)
├── formatters.ts             # Message formatters (NEW)
├── types.ts                  # TypeScript types (NEW)
├── utils.ts                  # Helper utilities (NEW)
└── handlers/                 # Command handlers (NEW)
    ├── dashboard.ts
    ├── trips.ts
    ├── fuel.ts
    ├── employees.ts
    ├── reports.ts
    └── admin.ts

/components/telegram/         # (Optional) React components for admin panel
└── bot-config.tsx
```

---

## 🔧 CONFIGURATION

### Environment Variables:

```bash
# .env.local
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_WEBHOOK_URL=https://your-domain.vercel.app/api/telegram/webhook
TELEGRAM_ADMIN_CHAT_IDS=123456789,987654321  # Comma-separated admin chat IDs
```

### Bot Settings (BotFather):

```
/mybots → @YourBot → Edit Bot

Commands:
start - Bắt đầu sử dụng bot
menu - Hiển thị menu chính
search - Tra cứu chuyến đi
register - Đăng ký tài khoản
help - Hướng dẫn sử dụng
users - [Admin] Danh sách người dùng

Inline Mode: ENABLED
Privacy Mode: DISABLED (to read all messages for /search command)
```

---

## 🧪 TESTING CHECKLIST

### Phase 1: Authentication
- [ ] User can start bot with `/start`
- [ ] Registered user sees welcome message with name
- [ ] Unregistered user sees registration prompt
- [ ] `/register` command updates chat_id correctly
- [ ] Permission-based access works (admin vs user)

### Phase 2: Navigation
- [ ] Main menu displays 6 buttons
- [ ] Each button navigates to correct submenu
- [ ] "Quay lại" button works from all submenus
- [ ] No errors when clicking buttons rapidly

### Phase 3: Dashboard
- [ ] "Hôm nay" shows correct data
- [ ] Numbers formatted correctly (Vietnamese format)
- [ ] Refresh button updates data
- [ ] Zero values display correctly (not "NaN")

### Phase 4: Trips
- [ ] `/search NAK2025010001` returns trip details
- [ ] Route details from JSON displayed
- [ ] Search for non-existent trip shows error
- [ ] Permission check works for "Thêm mới" button

### Phase 5: Fuel
- [ ] Inventory query shows correct stock
- [ ] Efficiency ranking displays top vehicles
- [ ] Pagination works (Next/Previous buttons)
- [ ] No crashes on empty data

### Phase 6: Reports
- [ ] Daily report generates
- [ ] Excel export downloads successfully
- [ ] File contains correct data
- [ ] Permission check prevents unauthorized export

### Phase 7: Advanced
- [ ] Inline query returns results
- [ ] Admin commands work only for admins
- [ ] Notifications sent to correct users

---

## 🚨 ERROR HANDLING

### Common Issues & Solutions:

#### 1. "AnswerCbQuery timeout"
**Cause**: Forgot to call `ctx.answerCbQuery()`
**Solution**: Always call it in callback handlers

```typescript
bot.action('menu_dashboard', async (ctx) => {
  await ctx.editMessageText('...');
  await ctx.answerCbQuery(); // ✅ DON'T FORGET THIS
});
```

#### 2. "Message is not modified"
**Cause**: Trying to edit message with same text
**Solution**: Check if content changed before editing

```typescript
if (newText !== oldText) {
  await ctx.editMessageText(newText);
}
```

#### 3. "Database connection timeout"
**Cause**: Long-running query blocking bot
**Solution**: Add timeout and show loading state

```typescript
await ctx.answerCbQuery('⏳ Đang tải dữ liệu...');
// ... run query
await ctx.answerCbQuery('✅ Hoàn tất');
```

---

## 📊 PERFORMANCE TARGETS

- **Response Time**: < 2 seconds for simple queries
- **Database Query**: < 500ms average
- **Excel Generation**: < 5 seconds for 1000 rows
- **Concurrent Users**: Support 50+ simultaneous users
- **Uptime**: 99.9%

---

## 🔐 SECURITY CHECKLIST

- [ ] Validate all user inputs
- [ ] Sanitize data before SQL queries (use parameterized queries)
- [ ] Implement rate limiting (max 10 requests/minute per user)
- [ ] Log all authentication attempts
- [ ] Check permissions before executing commands
- [ ] Never expose sensitive data (API keys, DB credentials)
- [ ] Use HTTPS for webhook endpoint
- [ ] Verify webhook requests from Telegram

---

## 📚 DOCUMENTATION

### For End Users:
- [ ] Create `/help` command with usage guide
- [ ] Add examples for each command
- [ ] Include troubleshooting tips

### For Developers:
- [ ] Document all API endpoints used
- [ ] Add JSDoc comments to all functions
- [ ] Create README for telegram module
- [ ] Add architecture diagram

---

## 🎯 SUCCESS CRITERIA

### Must Have:
- ✅ Authentication working
- ✅ Main menu and navigation
- ✅ Dashboard queries (Hôm nay, Tháng này)
- ✅ Trip search working
- ✅ Fuel inventory query

### Should Have:
- ✅ Reports with date range
- ✅ Excel export
- ✅ Pagination for long lists
- ✅ Permission-based access

### Nice to Have:
- ⏳ Inline query support
- ⏳ Push notifications
- ⏳ Admin panel commands
- ⏳ Multi-language support

---

## 🚀 DEPLOYMENT

### Step 1: Set Webhook
```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-domain.vercel.app/api/telegram/webhook",
    "allowed_updates": ["message", "callback_query", "inline_query"]
  }'
```

### Step 2: Verify Webhook
```bash
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
```

### Step 3: Test in Telegram
1. Open Telegram
2. Search for your bot: `@YourBotName`
3. Send `/start`
4. Verify authentication works
5. Test all menus

---

## 📞 SUPPORT & MAINTENANCE

### Monitoring:
- Set up logging for all errors
- Monitor webhook delivery (Telegram Bot API stats)
- Track response times

### Maintenance Tasks:
- Weekly: Review error logs
- Monthly: Update dependencies
- Quarterly: Performance audit

---

## 🎉 NEXT STEPS AFTER COMPLETION

1. Gather user feedback
2. Add more query types based on requests
3. Optimize slow queries
4. Add caching for frequently accessed data
5. Implement voice message support (optional)
6. Add image recognition for receipts (advanced)

---

**Estimated Total Time**: 2-3 days (16-24 hours)
**Risk Level**: LOW (leveraging existing database & API)
**Impact**: HIGH (improved user experience & accessibility)
