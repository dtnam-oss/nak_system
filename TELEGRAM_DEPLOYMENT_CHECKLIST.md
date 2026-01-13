# ✅ Telegram Bot Deployment Checklist

**Project:** NAK Logistics Telegram Bot
**Date Started:** _____________
**Deployment URL:** _____________

---

## 📋 Phase 1: Pre-Deployment Preparation

### Environment Variables Ready
- [x] `TELEGRAM_BOT_TOKEN` - From @BotFather
- [x] `TELEGRAM_GROUP_CHAT_ID` - Group chat ID
- [x] `TELEGRAM_TOPIC_KET_QUA_XU_LY` = 169
- [ ] `TELEGRAM_TOPIC_DOI_TAC` - Get from Telegram
- [ ] `TELEGRAM_TOPIC_KHACH_HANG` - Get from Telegram
- [ ] `CRON_SECRET` - Generate random string
- [ ] `NEXT_PUBLIC_API_URL` - Will get after deploy
- [ ] `TELEGRAM_WEBHOOK_URL` - Will get after deploy

### Code & Documentation
- [x] All Telegram bot files created (25+ files)
- [x] Dependencies installed (`telegraf`, `node-cron`, etc.)
- [x] Documentation complete (4 MD files)
- [x] Scripts ready (`telegram:setup`, `telegram:test:*`)

---

## 🚀 Phase 2: Deploy to Vercel

### Option A: Vercel Dashboard (Recommended)

#### Step 2.1: Login & Import
- [ ] Go to https://vercel.com
- [ ] Login/Create account
- [ ] Click **"Add New..."** → **"Project"**
- [ ] Select **"Import Git Repository"**
- [ ] Connect GitHub (if first time)
- [ ] Select repository: `nak-logistic-system`
- [ ] Click **"Import"**

#### Step 2.2: Configure Project
- [ ] Framework Preset: **Next.js** (auto-detected)
- [ ] Root Directory: **./** (default)
- [ ] Build Command: **npm run build** (default)
- [ ] Output Directory: **.next** (default)

#### Step 2.3: Add Environment Variables

Click **"Environment Variables"** và add:

**Existing Variables (copy from .env.local):**
- [ ] `NEXT_PUBLIC_GAS_API_URL`
- [ ] `NEXT_PUBLIC_API_TIMEOUT` = 30000

**Telegram Variables:**
- [ ] `TELEGRAM_BOT_TOKEN` = `8117923437:AAE6MuWCXO-vctHzYBFU6Uz1YipRE2u9i9g`
- [ ] `TELEGRAM_GROUP_CHAT_ID` = `-1002957881731`
- [ ] `TELEGRAM_TOPIC_KET_QUA_XU_LY` = `169`
- [ ] `TELEGRAM_TOPIC_DOI_TAC` = `<your-id>`
- [ ] `TELEGRAM_TOPIC_KHACH_HANG` = `<your-id>`
- [ ] `CRON_SECRET` = `<random-string>`

**Feature Flags:**
- [ ] `TELEGRAM_ENABLE_LLM` = `false`
- [ ] `TELEGRAM_ENABLE_CHARTS` = `true`

**Important:** Select **Production**, **Preview**, AND **Development** for all variables!

#### Step 2.4: Initial Deploy
- [ ] Click **"Deploy"**
- [ ] Wait for build to complete (2-5 minutes)
- [ ] Check for build errors
- [ ] Deployment successful ✓

#### Step 2.5: Get Deployment URL
- [ ] Copy deployment URL from Vercel
- [ ] Format: `https://<project-name>.vercel.app`
- [ ] Write it here: ______________________________

### Option B: Vercel CLI (Alternative)

- [ ] Install: `npm install -g vercel`
- [ ] Login: `vercel login`
- [ ] Deploy: `vercel --prod`
- [ ] Copy deployment URL

---

## 🔄 Phase 3: Update Environment & Redeploy

### Step 3.1: Add Missing Environment Variables

Back in Vercel Dashboard → Project Settings → Environment Variables:

- [ ] Add `TELEGRAM_WEBHOOK_URL`:
  ```
  https://<your-url>.vercel.app/api/telegram/webhook
  ```

- [ ] Add `NEXT_PUBLIC_API_URL`:
  ```
  https://<your-url>.vercel.app
  ```

- [ ] Click **"Save"** for each

### Step 3.2: Redeploy with New Variables

**CRITICAL STEP - Don't skip!**

- [ ] Go to **Deployments** tab
- [ ] Find latest deployment
- [ ] Click **"..."** (three dots)
- [ ] Select **"Redeploy"**
- [ ] Wait for redeploy to complete
- [ ] Deployment successful ✓

---

## 🔗 Phase 4: Setup Telegram Webhook

### Option A: Using npm script (Recommended)

#### Step 4A.1: Update Local .env.local
- [ ] Add `TELEGRAM_WEBHOOK_URL` với deployment URL
- [ ] Add `NEXT_PUBLIC_API_URL` với deployment URL

#### Step 4A.2: Run Setup Script
```bash
npm run telegram:setup
```

- [ ] Script runs successfully
- [ ] See: "✅ Webhook set successfully!"
- [ ] See webhook info printed

### Option B: Manual curl (Alternative)

```bash
curl -X POST \
  "https://api.telegram.org/bot8117923437:AAE6MuWCXO-vctHzYBFU6Uz1YipRE2u9i9g/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://<YOUR-URL>.vercel.app/api/telegram/webhook",
    "allowed_updates": ["message", "callback_query"]
  }'
```

- [ ] Run command với actual URL
- [ ] Response: `"ok": true`

### Step 4.3: Verify Webhook

```bash
curl "https://api.telegram.org/bot8117923437:AAE6MuWCXO-vctHzYBFU6Uz1YipRE2u9i9g/getWebhookInfo"
```

**Verify:**
- [ ] `url` matches your deployment
- [ ] `has_custom_certificate`: false
- [ ] `pending_update_count`: 0
- [ ] NO `last_error_message`

---

## 🧪 Phase 5: Testing

### Test 5.1: Health Check

```bash
curl https://<your-url>.vercel.app/api/telegram/webhook
```

**Expected Response:**
```json
{
  "status": "ok",
  "config": "valid",
  "timestamp": "..."
}
```

- [ ] Status: OK
- [ ] Config: valid

### Test 5.2: Bot Commands in Telegram

**In your Telegram group:**

- [ ] Send: `/start`
  - [ ] Bot replies with welcome message
  - [ ] Inline keyboard shows

- [ ] Send: `/help`
  - [ ] Bot shows command list

- [ ] Send: `/menu`
  - [ ] Main menu appears

- [ ] Send: `/today`
  - [ ] Shows today's stats
  - [ ] Data displays correctly

- [ ] Send: `/realtime`
  - [ ] Shows realtime data

- [ ] Send: `/fuel`
  - [ ] Shows fuel inventory
  - [ ] Warnings work (if applicable)

- [ ] Send: `/trips`
  - [ ] Shows trip statistics
  - [ ] Inline menu appears

- [ ] Send: `/partners`
  - [ ] Shows partner stats

- [ ] Send: `/customers`
  - [ ] Shows customer analysis

### Test 5.3: Inline Keyboards

- [ ] Click menu buttons
- [ ] Navigation works
- [ ] "« Quay lại" works
- [ ] Data updates correctly

### Test 5.4: Natural Language

- [ ] Type: "Hôm nay có bao nhiêu chuyến?"
  - [ ] Bot shows trips data

- [ ] Type: "Nhiên liệu còn bao nhiêu?"
  - [ ] Bot shows fuel inventory

---

## 📅 Phase 6: Test Scheduled Reports

### Manual Test - Morning Report

```bash
curl "https://<your-url>.vercel.app/api/telegram/cron/send-reports?type=morning&secret=<YOUR_CRON_SECRET>"
```

- [ ] Command runs successfully
- [ ] Response: `"success": true`
- [ ] Check Telegram topic **KẾT QUẢ XỬ LÝ** (169)
  - [ ] Morning report appears
  - [ ] Format correct
  - [ ] Data shows

### Manual Test - Evening Report

```bash
curl "https://<your-url>.vercel.app/api/telegram/cron/send-reports?type=evening&secret=<YOUR_CRON_SECRET>"
```

- [ ] Command runs successfully
- [ ] Response: `"success": true`
- [ ] Check Telegram topics:
  - [ ] KẾT QUẢ XỬ LÝ - Evening report
  - [ ] ĐỐI TÁC VẬN CHUYỂN - Evening report (if topic configured)
  - [ ] KHÁCH HÀNG - Evening report (if topic configured)

### Using npm scripts (Alternative)

```bash
npm run telegram:test:morning
npm run telegram:test:evening
```

- [ ] Both scripts run successfully
- [ ] Reports appear in Telegram

---

## ⏰ Phase 7: Setup Cron Jobs

### Option A: Vercel Cron Jobs

#### Step 7A.1: Update vercel.json

- [ ] Open `vercel.json`
- [ ] Replace `YOUR_CRON_SECRET_HERE` with your actual `CRON_SECRET`
- [ ] File should look like:
  ```json
  {
    "crons": [
      {
        "path": "/api/telegram/cron/send-reports?type=morning&secret=abc123xyz...",
        "schedule": "0 6 * * *"
      },
      {
        "path": "/api/telegram/cron/send-reports?type=evening&secret=abc123xyz...",
        "schedule": "0 18 * * *"
      }
    ]
  }
  ```

#### Step 7A.2: Commit & Deploy

```bash
git add vercel.json
git commit -m "Configure Vercel cron jobs for Telegram reports"
git push
```

- [ ] Code pushed to GitHub
- [ ] Vercel auto-deploys
- [ ] Deployment successful

#### Step 7A.3: Verify in Vercel Dashboard

- [ ] Go to Project → Settings → Cron
- [ ] See 2 cron jobs listed:
  - [ ] Morning report - 0 6 * * *
  - [ ] Evening report - 0 18 * * *
- [ ] Status: Active

### Option B: External Cron Service (Free Alternative)

#### Step 7B.1: Create Account

- [ ] Go to https://cron-job.org
- [ ] Sign up / Login

#### Step 7B.2: Create Morning Report Job

- [ ] Click "Create cronjob"
- [ ] **Title:** NAK Telegram Morning Report
- [ ] **URL:**
  ```
  https://<your-url>.vercel.app/api/telegram/cron/send-reports?type=morning&secret=<YOUR_SECRET>
  ```
- [ ] **Schedule:** Custom
  - Minute: 0
  - Hour: 6
  - Day: *
  - Month: *
  - Weekday: *
- [ ] **Timezone:** Asia/Ho_Chi_Minh
- [ ] **Enabled:** Yes
- [ ] Click "Create"

#### Step 7B.3: Create Evening Report Job

- [ ] Click "Create cronjob"
- [ ] **Title:** NAK Telegram Evening Report
- [ ] **URL:**
  ```
  https://<your-url>.vercel.app/api/telegram/cron/send-reports?type=evening&secret=<YOUR_SECRET>
  ```
- [ ] **Schedule:** Custom
  - Minute: 0
  - Hour: 18
  - Day: *
  - Month: *
  - Weekday: *
- [ ] **Timezone:** Asia/Ho_Chi_Minh
- [ ] **Enabled:** Yes
- [ ] Click "Create"

#### Step 7B.4: Verify Jobs

- [ ] Both jobs show in dashboard
- [ ] Status: Active
- [ ] Next execution time shows correctly

---

## 📊 Phase 8: Monitoring & Verification

### Day 1 Checks

- [ ] **6:00 AM Next Day:** Morning report arrives
  - [ ] Check time stamp
  - [ ] Verify all 3 topics (if configured)
  - [ ] Data looks correct

- [ ] **6:00 PM Same Day:** Evening report arrives
  - [ ] Check time stamp
  - [ ] Verify all 3 topics
  - [ ] Data looks correct

### Check Vercel Logs

- [ ] Go to Vercel Dashboard → Project → Logs
- [ ] Filter by Function
- [ ] Check for errors in:
  - [ ] `/api/telegram/webhook`
  - [ ] `/api/telegram/cron/send-reports`
- [ ] No errors ✓

### Check Telegram Bot

- [ ] Bot still responds to commands
- [ ] No rate limiting errors
- [ ] Messages format correctly

---

## 🐛 Phase 9: Troubleshooting (If Needed)

### If Bot Doesn't Respond

- [ ] Check webhook info:
  ```bash
  curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
  ```
- [ ] Check Vercel Function Logs
- [ ] Verify bot is admin in group
- [ ] Test health check endpoint

### If Scheduled Reports Don't Send

- [ ] Test manual trigger
- [ ] Verify CRON_SECRET matches
- [ ] Check topic IDs correct
- [ ] Check cron service logs (cron-job.org or Vercel)
- [ ] Verify timezone settings

### If Messages Go to Wrong Topic

- [ ] Get correct topic ID:
  1. Open topic in Telegram Desktop
  2. Copy URL
  3. Extract topic ID from URL
- [ ] Update environment variable
- [ ] Redeploy

---

## ✅ Phase 10: Completion

### Final Checklist

- [ ] Bot deployed and accessible
- [ ] Webhook configured and verified
- [ ] All commands work
- [ ] Inline keyboards functional
- [ ] Scheduled reports tested manually
- [ ] Cron jobs configured
- [ ] Morning report tested (live or next day)
- [ ] Evening report tested (live or same day)
- [ ] All topics receive correct reports
- [ ] No errors in logs
- [ ] Documentation reviewed

### Post-Deployment

- [ ] Monitor for 1 week
- [ ] Collect user feedback
- [ ] Document any issues
- [ ] Consider Phase 4 features:
  - [ ] Chart generation
  - [ ] Alert system
  - [ ] LLM integration

---

## 📝 Deployment Notes

**Deployment URL:** ________________________________________

**CRON_SECRET:** ________________________________________

**Cron Service Used:** [ ] Vercel [ ] cron-job.org

**Deployment Date:** ________________________________________

**Deployed By:** ________________________________________

**Issues Encountered:**
-
-
-

**Resolutions:**
-
-
-

---

## 📚 Reference Documents

- [TELEGRAM_BOT_SETUP.md](./TELEGRAM_BOT_SETUP.md) - Detailed setup guide
- [TELEGRAM_README.md](./TELEGRAM_README.md) - Overview & features
- [TELEGRAM_QUICK_REFERENCE.md](./TELEGRAM_QUICK_REFERENCE.md) - Command reference
- [DEPLOY_GUIDE.md](./DEPLOY_GUIDE.md) - Deployment instructions
- [TELEGRAM_IMPLEMENTATION_SUMMARY.md](./TELEGRAM_IMPLEMENTATION_SUMMARY.md) - Technical summary

---

## 🎉 Success!

When all checkboxes are complete, your Telegram Bot is:

✅ Live on Vercel 24/7
✅ Sending automated reports twice daily
✅ Responding to user commands
✅ Organized by topics
✅ Fully monitored

**Congratulations! 🚀**
