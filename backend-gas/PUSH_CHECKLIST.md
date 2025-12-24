# Push Checklist - Manual Upload to Google Apps Script

## ⏱️ Estimated Time: 3-5 minutes

---

## 📁 Files to Upload

### ✅ Step 1: ReconciliationService.gs (NEW)

**File location:** `backend-gas/gas/ReconciliationService.gs`
**Lines:** 280 lines
**Action:** Create NEW file in GAS Editor

**Instructions:**
1. [ ] Open GAS Editor: https://script.google.com/home/projects/1TTS7pJuKKBuh5w7kAHr4xrGzfUwyN9Bw2IT1xd0DwskRC4Uhjd0EaLLL/edit
2. [ ] Click **+** button → Select **Script**
3. [ ] Rename to: `ReconciliationService`
4. [ ] Open `backend-gas/gas/ReconciliationService.gs` in VSCode
5. [ ] Copy ALL content (Cmd+A → Cmd+C)
6. [ ] Paste in GAS Editor (Cmd+V)
7. [ ] Click **Save** (Cmd+S)
8. [ ] Verify no syntax errors (bottom status bar)

---

### ✅ Step 2: Code.gs (UPDATE)

**File location:** `backend-gas/gas/Code.gs`
**Lines:** 141 lines
**Action:** REPLACE existing Code.gs in GAS Editor

**Instructions:**
1. [ ] In GAS Editor, click on existing `Code.gs` file
2. [ ] Open `backend-gas/gas/Code.gs` in VSCode
3. [ ] Copy ALL content (Cmd+A → Cmd+C)
4. [ ] In GAS Editor, select all (Cmd+A)
5. [ ] Paste (Cmd+V) to replace
6. [ ] Click **Save** (Cmd+S)
7. [ ] Verify no syntax errors

**What changed:**
- Added `getReconciliationData` route (lines 35-40)
- Updated `availableActions` array to include `'getReconciliationData'`

---

## 🚀 Step 3: Deploy New Version

**Instructions:**
1. [ ] Click **Deploy** button (top right)
2. [ ] Click **Manage deployments**
3. [ ] Click ✏️ **Edit** icon on your active deployment
4. [ ] Under "Version", select **New version**
5. [ ] Add description: `Add ReconciliationService for reconciliation page`
6. [ ] Click **Deploy**
7. [ ] **Important:** Copy deployment URL if shown
8. [ ] Click **Done**

**Deployment URL format:**
```
https://script.google.com/macros/s/{DEPLOYMENT_ID}/exec
```

---

## ✅ Step 4: Verify Upload

### In GAS Editor:
- [ ] ReconciliationService.gs appears in file list (left sidebar)
- [ ] Code.gs contains `getReconciliationData` route
- [ ] No red syntax errors
- [ ] Status bar shows "All changes saved"

### Run Quick Test:
1. [ ] Click **Run** → Select function `doGet`
2. [ ] Check "Execution log" tab
3. [ ] No errors should appear

---

## 🧪 Step 5: Test API Endpoints

### Test 1: Health Check
Open in browser:
```
https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
```

**Expected response:**
```json
{
  "success": true,
  "message": "NAK Logistics API - Webhook Sync",
  "availableActions": [
    "getDashboardReport",
    "getDashboardReportWithFilters",
    "getReconciliationData"  ← Should see this
  ]
}
```

- [ ] Response shows `getReconciliationData` in availableActions
- [ ] No errors

### Test 2: Reconciliation Data
Open in browser:
```
https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?action=getReconciliationData
```

**Expected response:**
```json
{
  "success": true,
  "data": {
    "records": [ ... ],
    "summary": {
      "totalOrders": 150,
      "totalAmount": 500000000,
      "totalDistance": 12500,
      "approvedOrders": 120,
      "pendingOrders": 30
    },
    "total": 150
  }
}
```

- [ ] Response has `success: true`
- [ ] Response has `data.records` array
- [ ] Response has `data.summary` object
- [ ] Response has `data.total` number

---

## 🔧 Step 6: Update Frontend Configuration

### Update .env.local (if needed)

**File:** `.env.local` in project root

If you don't have deployment URL yet or it changed:

1. [ ] Copy deployment URL from Step 3
2. [ ] Open `.env.local`
3. [ ] Replace:
   ```env
   NEXT_PUBLIC_GAS_API_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
   ```
4. [ ] Save file

### Restart Dev Server

```bash
# Terminal 1: Stop current server (Ctrl+C)
# Then restart:
npm run dev
```

- [ ] Dev server restarted
- [ ] Shows: "Ready in X ms"

---

## ✅ Step 7: Test Frontend Integration

### Test Dashboard
Open: http://localhost:3000/dashboard

- [ ] Page loads without errors
- [ ] Cards display data (or error message if .env not configured)
- [ ] No console errors (F12 → Console)

### Test Reconciliation Page
Open: http://localhost:3000/reconciliation

- [ ] Loading skeleton displays first
- [ ] Data table loads with records
- [ ] Summary bar shows metrics
- [ ] Filters work:
  - [ ] Date range
  - [ ] Customer search
  - [ ] Transport unit dropdown
  - [ ] General search
- [ ] Pagination works
- [ ] No console errors

### Check Network Tab
- [ ] Open DevTools (F12) → Network tab
- [ ] Refresh page
- [ ] See request to `/api/reconciliation`
- [ ] Status: 200 OK
- [ ] Response has valid JSON

---

## ❌ Troubleshooting

### ❌ "getReconciliationData is not defined"
**Solution:**
- Check ReconciliationService.gs was saved
- Verify new version was deployed
- Try deploying again

### ❌ "Sheet data_chuyen_di not found"
**Solution:**
- Check MAIN_SPREADSHEET has sheet named exactly `data_chuyen_di`
- Verify Config.gs has correct SPREADSHEET_ID

### ❌ Frontend shows error
**Solution:**
- Check .env.local has correct deployment URL
- Restart dev server
- Check browser Console for error details
- Test API endpoint directly in browser

### ❌ No data in table
**Solution:**
- Check Google Sheets has data in `data_chuyen_di`
- View Apps Script Execution log for errors
- Test API endpoint: add `?action=getReconciliationData` to URL

---

## 🎉 Completion Checklist

- [ ] ReconciliationService.gs uploaded to GAS
- [ ] Code.gs updated in GAS
- [ ] New version deployed
- [ ] API health check passes
- [ ] API reconciliation endpoint returns data
- [ ] .env.local configured (if needed)
- [ ] Dev server restarted
- [ ] Dashboard page works
- [ ] Reconciliation page works
- [ ] All filters work
- [ ] No console errors

---

## 📝 Notes

**Deployment ID:** ________________________________

**Deployment URL:** ________________________________

**Date:** ________________________________

**Issues encountered:**
________________________________
________________________________

---

**Time to complete:** ~5 minutes
**Next:** Follow [DEPLOYMENT_CHECKLIST.md](../DEPLOYMENT_CHECKLIST.md) for full testing
