# Deploy New Version - Add ReconciliationService

## ⚠️ Current Status

**API URL:** `https://script.google.com/macros/s/AKfycbx268J5Oewi7pRC03CSaLH1n3tsnoM4MyRJUkRbGooag4OWysPolX9JbPgfYALnOrbF/exec`

**Current Response:**
```json
{
  "availableActions": [
    "getDashboardReport",
    "getDashboardReportWithFilters"
  ]
}
```

**Expected After Deploy:**
```json
{
  "availableActions": [
    "getDashboardReport",
    "getDashboardReportWithFilters",
    "getReconciliationData"  ← Missing!
  ]
}
```

---

## 🚀 Deploy New Version (3 minutes)

### Step 1: Open Google Apps Script Editor

**URL:** https://script.google.com/home/projects/1TTS7pJuKKBuh5w7kAHr4xrGzfUwyN9Bw2IT1xd0DwskRC4Uhjd0EaLLL/edit

### Step 2: Verify Files

**Check left sidebar:**
- [x] ReconciliationService file exists
- [x] Code.gs has `getReconciliationData` route (line ~36)

**If ReconciliationService is missing:**
1. File already pushed via `clasp push` ✅
2. Refresh browser (F5)
3. Check file list again

### Step 3: Deploy New Version

1. Click **Deploy** button (top right)
2. Click **Manage deployments**
3. You should see your active deployment
4. Click ✏️ **Edit** icon on the deployment
5. Under "Version", click dropdown
6. Select **New version**
7. Description: `Add ReconciliationService endpoint`
8. Click **Deploy**
9. Click **Done**

**Important:** You MUST select "New version" for changes to take effect!

---

## ✅ Verify Deployment

### Test 1: Health Check

Open in browser:
```
https://script.google.com/macros/s/AKfycbx268J5Oewi7pRC03CSaLH1n3tsnoM4MyRJUkRbGooag4OWysPolX9JbPgfYALnOrbF/exec
```

**Expected response:**
```json
{
  "success": true,
  "availableActions": [
    "getDashboardReport",
    "getDashboardReportWithFilters",
    "getReconciliationData"  ← Should appear!
  ]
}
```

### Test 2: Reconciliation Endpoint

Open in browser:
```
https://script.google.com/macros/s/AKfycbx268J5Oewi7pRC03CSaLH1n3tsnoM4MyRJUkRbGooag4OWysPolX9JbPgfYALnOrbF/exec?action=getReconciliationData
```

**Expected response:**
```json
{
  "success": true,
  "data": {
    "records": [...],
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

**Or if no data:**
```json
{
  "success": true,
  "data": {
    "records": [],
    "summary": {
      "totalOrders": 0,
      "totalAmount": 0,
      "totalDistance": 0,
      "approvedOrders": 0,
      "pendingOrders": 0
    },
    "total": 0
  }
}
```

---

## 🔧 Frontend Configuration

### .env.local is Already Updated ✅

File: `.env.local`
```env
NEXT_PUBLIC_GAS_API_URL=https://script.google.com/macros/s/AKfycbx268J5Oewi7pRC03CSaLH1n3tsnoM4MyRJUkRbGooag4OWysPolX9JbPgfYALnOrbF/exec
```

### Restart Dev Server

```bash
# Stop current server (Ctrl+C in terminal where npm run dev is running)

# Restart
npm run dev
```

**Why restart?**
- Load new environment variable
- Clear any cached API responses

---

## 🧪 Test Frontend Integration

### Test 1: Dashboard Page

Open: http://localhost:3000/dashboard

**Expected:**
- [x] Loading skeleton appears first
- [x] Cards display real data:
  - Tổng doanh thu (VND)
  - Tổng chuyến đi
  - Xe NAK
  - Xe Vendor
- [x] Charts display:
  - Doanh thu theo tuyến
  - Top khách hàng
- [x] "Cập nhật lần cuối" timestamp
- [x] No errors in Console (F12)

### Test 2: Reconciliation Page

Open: http://localhost:3000/reconciliation

**Expected:**
- [x] Loading skeleton displays
- [x] Data table loads with records
- [x] Summary bar shows metrics:
  - Total orders
  - Total amount (VND)
  - Total distance (km)
  - Approved/Pending counts
- [x] Filters work:
  - Date range (fromDate, toDate)
  - Customer search
  - Route type
  - Transport unit (NAK/VENDOR)
  - Status
  - General search
- [x] Pagination works (20 records/page)
- [x] No errors in Console

### Test 3: Network Tab

**Open DevTools (F12) → Network tab:**

1. Refresh reconciliation page
2. Look for request to `/api/reconciliation`
3. Check:
   - [x] Status: 200 OK
   - [x] Response has valid JSON
   - [x] Response time < 3 seconds
   - [x] No CORS errors

---

## ❌ Troubleshooting

### Issue 1: "availableActions" still missing "getReconciliationData"

**Possible causes:**
1. Didn't select "New version" when deploying
2. Cached response in browser

**Solutions:**
1. Deploy again, ensure "New version" selected
2. Clear browser cache (Cmd+Shift+R)
3. Test in incognito window
4. Wait 1-2 minutes for deployment to propagate

### Issue 2: "getReconciliationData is not defined"

**Cause:** ReconciliationService.js not in deployment

**Solutions:**
1. Open GAS Editor
2. Verify ReconciliationService file exists
3. If missing, run `clasp push` again from terminal:
   ```bash
   cd backend-gas
   clasp push
   ```
4. Refresh GAS Editor browser
5. Deploy new version

### Issue 3: Frontend shows "Failed to fetch"

**Possible causes:**
1. .env.local has wrong URL
2. Dev server not restarted
3. CORS issue

**Solutions:**
1. Check .env.local:
   ```bash
   cat .env.local | grep GAS_API_URL
   ```
2. Restart dev server:
   ```bash
   npm run dev
   ```
3. Test API directly in browser first

### Issue 4: "Sheet data_chuyen_di not found"

**Cause:** Google Sheets missing or wrong name

**Solutions:**
1. Open MAIN_SPREADSHEET: https://docs.google.com/spreadsheets/d/18pS9YMZSwZCVBt_anIGn3GN4qFoPpMtALQm4YvMDd-g
2. Verify sheet named exactly `data_chuyen_di`
3. Check Config.gs has correct SPREADSHEET_ID

### Issue 5: Empty data in table

**Possible causes:**
1. No data in Google Sheets
2. Filters too strict
3. Data format issues

**Solutions:**
1. Check Google Sheets has data
2. Reset all filters in UI
3. Test API without filters:
   ```
   ?action=getReconciliationData
   ```
4. Check Apps Script execution logs

---

## 📊 Deployment Checklist

### Pre-deployment
- [x] ReconciliationService.js pushed via clasp
- [x] Code.js updated with route
- [x] Files verified in GAS Editor

### Deployment
- [ ] Open GAS Editor
- [ ] Click Deploy → Manage deployments
- [ ] Click Edit on active deployment
- [ ] Select "New version"
- [ ] Add description
- [ ] Click Deploy
- [ ] Click Done

### Verification
- [ ] Test health endpoint (see availableActions)
- [ ] Test reconciliation endpoint
- [ ] No errors in response
- [ ] Data structure correct

### Frontend
- [ ] .env.local updated ✅
- [ ] Dev server restarted
- [ ] Dashboard page works
- [ ] Reconciliation page works
- [ ] Filters work
- [ ] No console errors

---

## 🎯 Quick Actions

**1. Deploy:**
https://script.google.com/home/projects/1TTS7pJuKKBuh5w7kAHr4xrGzfUwyN9Bw2IT1xd0DwskRC4Uhjd0EaLLL/edit
→ Deploy → Manage deployments → Edit → New version → Deploy

**2. Test Health:**
```
https://script.google.com/macros/s/AKfycbx268J5Oewi7pRC03CSaLH1n3tsnoM4MyRJUkRbGooag4OWysPolX9JbPgfYALnOrbF/exec
```

**3. Test Reconciliation:**
```
https://script.google.com/macros/s/AKfycbx268J5Oewi7pRC03CSaLH1n3tsnoM4MyRJUkRbGooag4OWysPolX9JbPgfYALnOrbF/exec?action=getReconciliationData
```

**4. Test Frontend:**
```
http://localhost:3000/reconciliation
```

---

## 📝 Notes

**Deployment URL:** Already configured in .env.local ✅

**Files Status:**
- ✅ ReconciliationService.js pushed
- ✅ Code.js updated
- ⏳ Waiting for deployment

**Next Step:** Deploy new version in Google Apps Script Editor

---

**Time required:** 3-5 minutes
**Status:** Ready to deploy
