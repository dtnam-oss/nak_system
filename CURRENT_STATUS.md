# Current Status & Fix Guide

## 🚨 Current Issue

**Error:** 500 Internal Server Error
**Location:** `/api/reconciliation`
**Message:** "The operation was aborted"

## 📊 Diagnosis

### What We Know:
1. ✅ Frontend code is correct
2. ✅ API route (`/app/api/reconciliation/route.ts`) is correct
3. ✅ GAS_API_URL in `.env.local` is set
4. ❌ Google Apps Script backend is returning errors

### Error Source:
The error is coming from **Google Apps Script backend**, NOT from Next.js frontend.

## 🔍 Possible Causes

### 1. Backend Not Deployed
ReconciliationService.js with latest changes hasn't been uploaded to Apps Script.

### 2. Syntax Error in Apps Script
Recent changes to ReconciliationService.js may have introduced syntax errors.

### 3. Permission Issues
Apps Script may have lost permissions or needs re-authorization.

### 4. Deployment URL Changed
New deployment created different URL than in `.env.local`.

## ✅ Fix Steps

### Step 1: Verify Apps Script Deployment

1. **Open Google Apps Script Editor:**
   ```
   https://script.google.com/home
   Find your project or open from Sheets: Extensions > Apps Script
   ```

2. **Check ReconciliationService.js:**
   - Does the file exist?
   - Does it have the latest code?
   - Are there any red error indicators?

3. **Check for Syntax Errors:**
   - Look at line numbers in editor
   - Run any function manually to test
   - Check execution logs

### Step 2: Redeploy Apps Script

1. **Open Deployment:**
   ```
   Deploy > Manage deployments
   ```

2. **Check Current Deployment:**
   - Note the Web app URL
   - Compare with `.env.local` URL
   - If different, update `.env.local`

3. **Create New Deployment:**
   ```
   Deploy > New deployment
   Type: Web app
   Description: "Fix 500 error - redeploy"
   Execute as: Me
   Who has access: Anyone
   → Deploy
   ```

4. **Copy New URL:**
   - Update `.env.local` if URL changed
   - Restart Next.js dev server

### Step 3: Test Deployment

**Test directly in browser:**
```
https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?action=getReconciliationData
```

**Expected:** JSON response with data
**If error:** Check Apps Script execution logs

### Step 4: Check Apps Script Logs

1. **View Executions:**
   ```
   Apps Script Editor > View > Executions
   ```

2. **Look for Errors:**
   - Red error icons
   - Error messages
   - Stack traces

3. **Common Errors:**
   - `ReferenceError: X is not defined` → Missing variable/function
   - `SyntaxError` → Code syntax problem
   - `Exception: Service invoked too many times` → Rate limit
   - `Authorization required` → Need to re-authorize

### Step 5: Verify ReconciliationService.js

Compare deployed version with repository version:

**Repository version:** `/backend-gas/gas/ReconciliationService.js`

**Key sections to verify:**
- Lines 100-125: `buildColumnIndexMap()`
- Lines 130-196: `parseReconciliationRecord()`
- Lines 160-192: JSON parsing logic

**Make sure these are correct:**
```javascript
// Line 167-177: Direct access (no .data wrapper)
if (dataJson.chiTietLoTrinh && Array.isArray(dataJson.chiTietLoTrinh)) {
  chiTietLoTrinh = dataJson.chiTietLoTrinh;
}

if (dataJson.thongTinChuyenDi && dataJson.thongTinChuyenDi.soXe) {
  soXe = dataJson.thongTinChuyenDi.soXe;
}

// Line 194: Return data_json field
data_json: String(rawDataJson || '')
```

## 🔧 Quick Fix (If Nothing Works)

### Option A: Use Previous Working Version

1. **Find last working commit:**
   ```bash
   git log --oneline
   # Look for commit before issues started
   ```

2. **Check out ReconciliationService.js from that commit:**
   ```bash
   git show COMMIT_HASH:backend-gas/gas/ReconciliationService.js > ReconciliationService_backup.js
   ```

3. **Deploy that version to Apps Script**

### Option B: Simplify ReconciliationService.js

Remove recent changes temporarily:
- Remove debug logs
- Remove fallback strategies
- Use simple structure

### Option C: Check .env.local

Verify environment variables:
```bash
cat .env.local
```

Make sure:
- `NEXT_PUBLIC_GAS_API_URL` is set
- URL matches current deployment
- No typos in URL

## 📝 Current Code Status

### Frontend (Next.js):
- ✅ All code up to date
- ✅ TripDetailsDialog with fallback parsing
- ✅ Debug logs in place
- ✅ API route correct

### Backend (Apps Script):
- ⚠️ May not be deployed
- ⚠️ May have syntax errors
- ⚠️ URL may have changed

## 🎯 Immediate Actions

1. **CHECK:** Apps Script deployment status
2. **VERIFY:** ReconciliationService.js has correct code
3. **TEST:** Direct API call in browser
4. **CHECK:** Apps Script execution logs
5. **REDEPLOY:** If needed

## 📞 Debug Commands

**Test API from command line:**
```bash
curl -v "https://script.google.com/macros/s/YOUR_ID/exec?action=getReconciliationData"
```

**Check Next.js server logs:**
```bash
npm run dev
# Look for errors in console
```

**Clear Next.js cache:**
```bash
rm -rf .next
npm run dev
```

## ✅ Success Criteria

When fixed, you should see:
1. ✅ No 500 errors in browser
2. ✅ Data table loads with records
3. ✅ "Chi tiết" button opens modal
4. ✅ Modal displays route details
5. ✅ Console shows debug logs (STEP 0, 1, 2)

---

**Current Status:** 🔴 BACKEND ERROR - Need to check/redeploy Apps Script

**Next Step:** Verify Apps Script deployment
