# 🧪 TELEGRAM CHATBOT - TESTING & DEPLOYMENT GUIDE

## 📋 OVERVIEW

This guide provides step-by-step instructions to deploy and test the Telegram Interactive Chatbot for NAK Logistics System.

---

## 🚀 DEPLOYMENT STEPS

### Step 1: Install Dependencies

```bash
npm install telegraf
```

### Step 2: Set Environment Variables

Add to `.env.local`:

```bash
# Telegram Bot Token (from BotFather)
TELEGRAM_BOT_TOKEN=your_bot_token_here

# Database URL (already configured)
DATABASE_URL=your_postgres_connection_string
```

### Step 3: Deploy to Vercel

```bash
# Commit code
git add .
git commit -m "feat: Add Telegram Interactive Chatbot"

# Push to deploy
git push origin main
```

### Step 4: Set Webhook URL

After deployment, set the webhook:

```bash
# Replace <BOT_TOKEN> and <YOUR_DOMAIN>
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://<YOUR_DOMAIN>.vercel.app/api/telegram/webhook-chatbot",
    "allowed_updates": ["message", "callback_query", "inline_query"]
  }'
```

**Example:**
```bash
curl -X POST "https://api.telegram.org/bot1234567890:ABCdefGHIjklMNOpqrsTUVwxyz/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://nak-logistic-system.vercel.app/api/telegram/webhook-chatbot",
    "allowed_updates": ["message", "callback_query", "inline_query"]
  }'
```

### Step 5: Verify Webhook

```bash
curl "https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo"
```

**Expected Response:**
```json
{
  "ok": true,
  "result": {
    "url": "https://your-domain.vercel.app/api/telegram/webhook-chatbot",
    "has_custom_certificate": false,
    "pending_update_count": 0,
    "max_connections": 40
  }
}
```

---

## 🧪 TESTING CHECKLIST

### Phase 1: Authentication ✅

#### Test 1.1: Start Bot (Unregistered User)
1. Open Telegram
2. Search for your bot: `@YourBotName`
3. Send: `/start`
4. **Expected Result:**
   ```
   👋 Xin chào [Your Name]!

   ⚠️ Chat ID của bạn chưa được đăng ký trong hệ thống.
   🔑 Chat ID: 123456789

   📝 Cách đăng ký:
   Gửi lệnh: /register <mã_nhân_viên>
   Ví dụ: /register NV001
   ```

#### Test 1.2: Manual Registration
1. Send: `/register NV001` (use your actual employee code)
2. **Expected Result:**
   ```
   ✅ Đăng ký thành công!

   👤 Tên: [Your Name]
   📋 Mã NV: NV001
   🏢 Phòng ban: [Department]
   🔑 Phân quyền: [Role]

   Sử dụng /menu để bắt đầu.
   ```
3. **Database Check:**
   ```sql
   SELECT chat_id, ho_va_ten FROM nhan_vien WHERE ma_nhan_vien = 'NV001';
   ```
   Should show your chat_id updated.

#### Test 1.3: Start Bot (Registered User)
1. Send: `/start` again
2. **Expected Result:**
   ```
   🎉 Xin chào [Your Name]!

   ✅ Bạn đã được xác thực thành công.
   📋 Mã nhân viên: NV001
   ...
   [Main Menu Keyboard appears]
   ```

#### Test 1.4: Permission Check
1. **Admin user:** Should see all menu items
2. **Staff user:** Should NOT see "Thêm mới" button in Trips menu
3. **User with xem=false:** Should get error when trying to export reports

---

### Phase 2: Navigation ✅

#### Test 2.1: Main Menu
1. Send: `/menu`
2. **Expected Result:** Inline keyboard with 6 buttons:
   - 📊 Dashboard
   - 🚚 Chuyến đi
   - 👥 Nhân viên
   - ⛽ Nhiên liệu
   - 📈 Báo cáo
   - ⚙️ Cài đặt
   - ℹ️ Trợ giúp

#### Test 2.2: Dashboard Submenu
1. Click: `📊 Dashboard`
2. **Expected Result:** Message updates with 6 dashboard options
3. Click: `⬅️ Quay lại`
4. **Expected Result:** Returns to main menu

#### Test 2.3: Navigation Flow
Test all menu paths:
- Main → Dashboard → Today → Back → Back → Main ✅
- Main → Trips → Search → Back → Main ✅
- Main → Fuel → Inventory → Refresh → Back → Main ✅

---

### Phase 3: Dashboard Queries ✅

#### Test 3.1: Dashboard Today
1. Click: `📊 Dashboard` → `📅 Hôm nay`
2. **Expected Result:**
   ```
   📊 DASHBOARD - HÔM NAY
   📅 Ngày: 13/01/2026

   🚚 Tổng chuyến: 45
   💰 Doanh thu: 125,500,000 VNĐ
   📏 Quãng đường: 3,240 km
   👥 Tài xế: 28 người

   🕐 Cập nhật: 14:30:45
   ```
3. Click: `🔄 Refresh`
4. **Expected Result:** Data updates with new timestamp

#### Test 3.2: Dashboard Month
1. Click: `📆 Tháng này`
2. **Expected Result:** Shows monthly statistics
3. **Verify:** Numbers match dashboard page

#### Test 3.3: Top Routes
1. Click: `🔝 Top tuyến`
2. **Expected Result:**
   ```
   📊 TOP 10 TUYẾN ĐƯỜNG
   📅 Tháng này (01/01/2026 - 31/01/2026)

   🥇 Hà Nội - TP HCM
      💰 500,000,000 VNĐ
      🚚 120 chuyến
      📏 120,000 km
   ...
   ```

#### Test 3.4: Top Drivers
1. Click: `🚛 Top tài xế`
2. **Expected Result:** Top 10 drivers ranked by trips
3. **Verify:** Medals (🥇🥈🥉) displayed for top 3

---

### Phase 4: Trips Management ✅

#### Test 4.1: Search Trip
1. Send: `/search NAK2025010001` (use actual trip ID)
2. **Expected Result:**
   ```
   🚚 THÔNG TIN CHUYẾN ĐI

   📋 Mã: NAK2025010001
   📅 Ngày: 13/01/2026
   👤 Khách hàng: GHN
   🛣️ Tuyến: Hà Nội - TP HCM
   ...
   📍 Chi tiết lộ trình:
   1. Kho Chuyển Tiếp Hà Nội -> Bưu Cục 123
   2. Bưu Cục 123 -> Kho Chuyển Tiếp TP HCM
   ```

#### Test 4.2: Today's Trips
1. Click: `🚚 Chuyến đi` → `📋 Hôm nay`
2. **Expected Result:** List of up to 10 trips today
3. **Verify:** Shows trip ID, customer, route, driver, status, revenue

#### Test 4.3: Trips by Customer
1. Click: `📊 Theo KH`
2. **Expected Result:** Top 10 customers with trip count and revenue

#### Test 4.4: Trip Refresh
1. Search a trip: `/search NAK2025010001`
2. Click: `🔄 Refresh`
3. **Expected Result:** Data refreshes (check timestamp or status change)

---

### Phase 5: Fuel Management ✅

#### Test 5.1: Fuel Inventory
1. Click: `⛽ Nhiên liệu` → `📊 Tồn kho`
2. **Expected Result:**
   ```
   ⛽ TỒN KHO NHIÊN LIỆU

   📊 Tồn kho hiện tại: 5,000 lít
   💰 Giá bình quân: 22,500 VNĐ/lít
   📥 Tổng nhập: 50,000 lít
   📤 Tổng xuất: 45,000 lít

   🕐 Cập nhật: 14:45:30
   ```
3. **Low Stock Warning:** If inventory < 1000L, should show:
   ```
   ⚠️ CẢNH BÁO: Tồn kho thấp (< 1,000 lít)
   ```

#### Test 5.2: Fuel Efficiency
1. Click: `📈 Hiệu suất`
2. **Expected Result:**
   ```
   📈 HIỆU SUẤT NHIÊN LIỆU

   📊 Trung bình: 12.50 L/100km
   🔝 Tốt nhất: 10.20 L/100km
   🔻 Kém nhất: 18.90 L/100km
   ...
   💡 Lưu ý: Hiệu suất thấp hơn = Tốt hơn
   ```

#### Test 5.3: Efficiency by Vehicle (Pagination)
1. Click: `🚛 Theo xe`
2. **Expected Result:** Page 1 with 5 vehicles
3. **Verify:**
   - 🥇🥈🥉 medals for top 3
   - Shows efficiency, total fuel, total km, transaction count
4. Click: `Sau ▶️`
5. **Expected Result:** Page 2 loads
6. Click: `◀️ Trước`
7. **Expected Result:** Returns to Page 1

#### Test 5.4: Fuel by Date
1. Click: `📅 Theo ngày`
2. **Expected Result:** Shows last 7 days of fuel transactions

---

### Phase 6: Reports ✅

#### Test 6.1: Today Report
1. Click: `📈 Báo cáo` → `📅 Hôm nay`
2. **Expected Result:**
   ```
   📊 BÁO CÁO HÔM NAY
   📅 13/01/2026

   ━━━━━━━━━━━━━━━━━━━━
   📈 TỔNG QUAN
   🚚 Tổng chuyến: 45
   💰 Doanh thu: 125,500,000 VNĐ
   ...
   ━━━━━━━━━━━━━━━━━━━━
   👑 TOP KHÁCH HÀNG
   GHN
   🚚 20 chuyến
   💰 60,000,000 VNĐ
   ...
   ```

#### Test 6.2: Week Report
1. Click: `📆 Tuần này`
2. **Expected Result:** Shows weekly stats + daily breakdown

#### Test 6.3: Month Report
1. Click: `📊 Tháng này`
2. **Expected Result:**
   - Monthly overview
   - Top 3 customers
   - Top 3 routes
   - Average per trip

---

### Phase 7: Error Handling ✅

#### Test 7.1: Invalid Trip ID
1. Send: `/search INVALID_ID`
2. **Expected Result:**
   ```
   ❌ Không tìm thấy chuyến đi: INVALID_ID
   ```

#### Test 7.2: Rate Limiting
1. Send `/search` command 10 times rapidly
2. On 11th request:
   ```
   ⚠️ Rate limit exceeded

   Bạn đã gửi quá nhiều yêu cầu. Vui lòng đợi 60 giây.
   ```

#### Test 7.3: Permission Denied
1. As **staff** user (them=false)
2. Try to click "➕ Thêm mới" in Trips menu
3. **Expected Result:**
   ```
   ❌ Không đủ quyền hạn

   Bạn không có quyền "them" để thực hiện thao tác này.
   ```

#### Test 7.4: Database Error (Simulated)
1. Temporarily break database connection
2. Try any query
3. **Expected Result:**
   ```
   ❌ LỖI

   Không thể tải dữ liệu

   💡 Vui lòng thử lại hoặc liên hệ Admin.
   ```

---

## 🔍 DEBUGGING

### Check Bot Status

```bash
# Health check
curl https://your-domain.vercel.app/api/telegram/webhook-chatbot

# Expected:
{
  "status": "ok",
  "bot": {
    "id": 1234567890,
    "username": "YourBotName",
    "first_name": "NAK Logistics Bot"
  },
  "timestamp": "2026-01-13T14:30:00.000Z"
}
```

### Check Logs (Vercel)

```bash
vercel logs --follow
```

Look for:
- `[WEBHOOK] Received update: ...`
- `[AUTH] Error authenticating user: ...`
- `[DASHBOARD_TODAY] Error: ...`

### Common Issues

#### Issue 1: "Bot doesn't respond"
**Cause:** Webhook not set or incorrect URL
**Solution:**
```bash
# Delete webhook
curl -X POST "https://api.telegram.org/bot<TOKEN>/deleteWebhook"

# Set webhook again
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -d "url=https://your-domain.vercel.app/api/telegram/webhook-chatbot"
```

#### Issue 2: "Unauthorized" error
**Cause:** Missing or invalid TELEGRAM_BOT_TOKEN
**Solution:** Check `.env.local` and redeploy

#### Issue 3: "Database connection timeout"
**Cause:** DATABASE_URL not set in Vercel
**Solution:**
```bash
vercel env pull
# Verify DATABASE_URL exists
# Redeploy
```

#### Issue 4: "Message is not modified" error
**Cause:** Trying to edit message with same content
**Solution:** Already handled in code with try-catch

---

## 📊 PERFORMANCE TESTING

### Load Test with 10 concurrent users

```bash
# Use Apache Bench or similar tool
ab -n 100 -c 10 -p payload.json -T application/json \
   https://your-domain.vercel.app/api/telegram/webhook-chatbot
```

**Target Metrics:**
- Response time: < 2 seconds (95th percentile)
- Success rate: > 99%
- No database connection timeouts

---

## ✅ FINAL CHECKLIST

Before going to production:

- [ ] All test cases passed
- [ ] Webhook URL set correctly
- [ ] Environment variables configured in Vercel
- [ ] At least 3 users registered and tested
- [ ] Admin commands tested
- [ ] Rate limiting tested
- [ ] Error messages user-friendly
- [ ] No console errors in logs
- [ ] Database queries performant (< 500ms)
- [ ] /help command shows correct information

---

## 🎉 SUCCESS CRITERIA

The chatbot is ready for production when:

1. ✅ Users can register via `/start` or `/register`
2. ✅ All 6 main menu items work
3. ✅ Dashboard shows real-time data
4. ✅ Trip search returns correct results
5. ✅ Fuel inventory displays accurately
6. ✅ Reports generate without errors
7. ✅ Pagination works for long lists
8. ✅ Permission system enforced
9. ✅ Rate limiting prevents abuse
10. ✅ Error messages are clear and helpful

---

## 📞 SUPPORT

If you encounter issues:

1. Check logs: `vercel logs --follow`
2. Verify webhook: `curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo`
3. Test database: Run SQL queries directly
4. Check environment variables: `vercel env ls`
5. Contact support: [GitHub Issues](https://github.com/your-repo/issues)

---

**🚀 Happy Testing!**
