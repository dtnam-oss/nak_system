# Google Apps Script Deployment Guide
## NAK Logistics - AppSheet Sync Service v2.0

---

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Installation Steps](#installation-steps)
4. [Configuration](#configuration)
5. [AppSheet Bot Setup](#appsheet-bot-setup)
6. [Testing](#testing)
7. [Monitoring](#monitoring)
8. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│  STEP 1: User Action in AppSheet                           │
│  - Creates new trip                                         │
│  - Edits existing trip                                      │
│  - Deletes trip                                             │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 2: AppSheet Bot Triggered                            │
│  - Event: "Adds only", "Updates only", or "Deletes only"   │
│  - Action: Call a Script                                   │
│  - Parameters: tripId=[_THISROW].[ID], eventType="Add"     │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 3: Google Apps Script Processing                     │
│                                                             │
│  A. Input Validation                                        │
│     ✓ Check tripId not empty                               │
│     ✓ Check eventType is valid (Add/Edit/Delete)           │
│                                                             │
│  B. Data Reading (Skip for Delete)                         │
│     ✓ Read from "chuyen_di" sheet (main trip data)         │
│     ✓ Read from "chi_tiet_lo_trinh" sheet (route details)  │
│     ✓ Batch reading for performance                        │
│                                                             │
│  C. Data Cleaning & Transformation                         │
│     ✓ Convert numbers: null → 0 (never null!)              │
│     ✓ Format dates: DD/MM/YYYY → YYYY-MM-DD                │
│     ✓ Normalize status: Vietnamese → English enum          │
│     ✓ Trim strings, handle empty values                    │
│                                                             │
│  D. JSON Construction                                       │
│     ✓ Build nested data_json structure                     │
│     ✓ Validate JSON syntax (100% valid guaranteed)         │
│                                                             │
│  E. HTTP Request with Retry                                │
│     ✓ POST to Next.js API endpoint                         │
│     ✓ Headers: Content-Type, x-api-key                     │
│     ✓ Retry up to 3 times on failure                       │
│     ✓ Log all requests and responses                       │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 4: Next.js API Processing                            │
│  - Receives clean, validated JSON                          │
│  - Performs UPSERT/DELETE on PostgreSQL                    │
│  - Returns success/error response                          │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 5: Frontend Auto-Refresh                             │
│  - React Query detects data change                         │
│  - Refetches reconciliation data                           │
│  - Updates UI automatically                                │
└─────────────────────────────────────────────────────────────┘
```

### Key Improvements vs Direct Webhook

| Aspect | Old (Direct Webhook) | New (GAS Intermediary) |
|--------|---------------------|------------------------|
| **Data Validation** | ❌ No validation | ✅ Strict validation before sending |
| **Null Handling** | ❌ Null values cause errors | ✅ Null → 0 conversion guaranteed |
| **Date Format** | ❌ Inconsistent formats | ✅ Always YYYY-MM-DD |
| **JSON Validity** | ❌ Can be invalid | ✅ 100% valid JSON guarantee |
| **Error Handling** | ❌ Silent failures | ✅ Retry logic + detailed logging |
| **Debugging** | ❌ Hard to debug | ✅ Full execution logs in GAS |
| **Status Mapping** | ❌ Backend must handle | ✅ Vietnamese → English at GAS |

---

## Prerequisites

### 1. Access Requirements

- [ ] Google Account with access to NAK Logistics spreadsheet
- [ ] Editor permissions on the spreadsheet
- [ ] AppSheet account with bot creation permissions
- [ ] Vercel deployment URL for Next.js backend

### 2. Required Information

Gather these before starting:

```
1. Spreadsheet ID: 18pS9YMZSwZCVBt_anIGn3GN4qFoPpMtALQm4YvMDd-g
2. Sheet Names:
   - Main trip data: "chuyen_di"
   - Route details: "chi_tiet_lo_trinh"

3. Backend API:
   - URL: https://your-app.vercel.app/api/webhook/appsheet
   - Secret Key: (from Vercel environment variables)

4. Column Structure:
   - Trip ID column: "maChuyenDi" (Column A)
   - Foreign key in chi_tiet: "maChuyenDi" (Column A)
```

---

## Installation Steps

### Step 1: Create New Apps Script Project

1. Open your Google Spreadsheet
2. Click **Extensions** → **Apps Script**
3. Delete default `Code.gs` content
4. Project name: "NAK Sync Service v2"

### Step 2: Add Script Files

**File 1: Code.gs**

1. Click **+** → **Script**
2. Name it `Code.gs`
3. Copy entire content from `backend-gas/gas-sync-v2/Code.gs`
4. Paste and save (Ctrl+S)

**File 2: Config.gs**

1. Click **+** → **Script**
2. Name it `Config.gs`
3. Copy entire content from `backend-gas/gas-sync-v2/Config.gs`
4. Paste and save

### Step 3: Update Configuration

**In Code.gs, update CONFIG object (lines 18-32):**

```javascript
const CONFIG = {
  // Update your actual Spreadsheet ID
  MAIN_SPREADSHEET_ID: 'YOUR_ACTUAL_SPREADSHEET_ID',

  // Update sheet names if different
  SHEET_CHUYEN_DI: 'chuyen_di',
  SHEET_CHI_TIET: 'chi_tiet_lo_trinh',

  // Update your Vercel deployment URL
  BACKEND_API_URL: 'https://your-app.vercel.app/api/webhook/appsheet',

  // Update your API secret key (from .env.local)
  API_SECRET_KEY: 'your-actual-secret-key-here',

  // Keep these as-is
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000,
  DEBUG_MODE: true,
  LOG_PREFIX: '[GAS_SYNC_V2]'
};
```

**IMPORTANT:** For production, use Script Properties instead:

```javascript
// In Code.gs, run once:
function setupConfig() {
  PropertiesService.getScriptProperties().setProperties({
    'BACKEND_API_URL': 'https://your-app.vercel.app/api/webhook/appsheet',
    'API_SECRET_KEY': 'your-actual-secret-key',
    'DEBUG_MODE': 'true'
  });
}
```

### Step 4: Update Column Indexes

**In Code.gs, update COLUMNS object (lines 35-58) to match your sheet structure:**

```javascript
const COLUMNS = {
  CHUYEN_DI: {
    MA_CHUYEN_DI: 0,      // Column A (0-based index)
    NGAY_TAO: 1,          // Column B
    BIEN_SO_XE: 2,        // Column C
    // ... update all indexes to match YOUR sheet
  },
  CHI_TIET: {
    MA_CHUYEN_DI_REF: 0,  // Column A
    DIEM_DI: 1,           // Column B
    // ... update all indexes to match YOUR sheet
  }
};
```

**How to find column indexes:**

1. Open your sheet
2. Count columns from left (A=0, B=1, C=2, etc.)
3. Update indexes accordingly

### Step 5: Deploy as Web App

1. Click **Deploy** → **New deployment**
2. Click gear icon ⚙️ → Select **Web app**
3. Configuration:
   - **Description:** "NAK Sync Service v2.0"
   - **Execute as:** Me (your email)
   - **Who has access:** Only myself
4. Click **Deploy**
5. **IMPORTANT:** Copy the deployment URL (you'll need it later)
6. Click **Authorize access** → Allow permissions

---

## Configuration

### Method 1: Hardcoded (Quick Setup)

Update `CONFIG` object in `Code.gs` directly (already done in Step 3).

**Pros:** Quick and simple
**Cons:** API key visible in code (security risk)

### Method 2: Script Properties (Recommended for Production)

1. In Apps Script editor, click **Project Settings** (⚙️ icon)
2. Scroll to **Script Properties**
3. Click **Add script property**
4. Add these properties:

```
Property Name            | Value
-------------------------|------------------------------------------
BACKEND_API_URL          | https://your-app.vercel.app/api/webhook/appsheet
API_SECRET_KEY           | your-actual-secret-key
MAIN_SPREADSHEET_ID      | 18pS9YMZSwZCVBt_anIGn3GN4qFoPpMtALQm4YvMDd-g
DEBUG_MODE               | true
```

5. Then in `Code.gs`, replace CONFIG values:

```javascript
const CONFIG = {
  MAIN_SPREADSHEET_ID: getConfig('MAIN_SPREADSHEET_ID', '18pS9YMZ...'),
  BACKEND_API_URL: getConfig('BACKEND_API_URL', 'https://...'),
  API_SECRET_KEY: getConfig('API_SECRET_KEY', 'fallback-key'),
  DEBUG_MODE: getConfig('DEBUG_MODE', 'true') === 'true',
  // ... rest stays the same
};
```

**Pros:** Secure, API key not in code
**Cons:** Extra setup step

---

## AppSheet Bot Setup

### Bot 1: Add Event Handler

1. Open AppSheet app editor
2. Go to **Automation** → **Bots**
3. Click **+ New Bot**

**Configuration:**

```yaml
Name: "Sync Trip Add"
Event: Data change → Adds only
Table: ChuyenDi (your trips table)

Condition: TRUE (always run)

Actions:
  - Type: Call a Script
  - Name: "Sync to Backend"
  - Script URL: [Your GAS Web App URL from Step 5]
  - Function: syncTripToBackend
  - Parameters:
      - tripId: [_THISROW].[maChuyenDi]
      - eventType: "Add"
```

**Screenshot of Parameters:**

```
┌─────────────────────────────────────────┐
│ Parameter Name    | Value               │
├───────────────────┼─────────────────────┤
│ tripId            │ [_THISROW].[maChuyenDi] │
│ eventType         │ "Add"               │
└─────────────────────────────────────────┘
```

4. Click **Save**

---

### Bot 2: Edit Event Handler

1. Click **+ New Bot** again

**Configuration:**

```yaml
Name: "Sync Trip Edit"
Event: Data change → Updates only
Table: ChuyenDi

Condition: TRUE

Actions:
  - Type: Call a Script
  - Script URL: [Same GAS URL]
  - Function: syncTripToBackend
  - Parameters:
      - tripId: [_THISROW].[maChuyenDi]
      - eventType: "Edit"
```

---

### Bot 3: Delete Event Handler

1. Click **+ New Bot** again

**Configuration:**

```yaml
Name: "Sync Trip Delete"
Event: Data change → Deletes only
Table: ChuyenDi

Condition: TRUE

Actions:
  - Type: Call a Script
  - Script URL: [Same GAS URL]
  - Function: syncTripToBackend
  - Parameters:
      - tripId: [_THISROW_BEFORE].[maChuyenDi]  # Note: _BEFORE for delete!
      - eventType: "Delete"
```

**CRITICAL:** For Delete bot, use `[_THISROW_BEFORE]` because row no longer exists!

---

## Testing

### Test 1: Manual Function Call (GAS Editor)

1. In Apps Script editor, select function `testSyncAdd` from dropdown
2. Click **Run** (▶️)
3. Check **Execution log** (View → Logs)
4. Expected output:

```
[GAS_SYNC_V2] [2024-12-30T10:00:00Z] ========== SYNC START ==========
[GAS_SYNC_V2] [2024-12-30T10:00:00Z] Trip ID: TEST_ADD_001
[GAS_SYNC_V2] [2024-12-30T10:00:00Z] Event Type: Add
[GAS_SYNC_V2] [2024-12-30T10:00:00Z] Input validation passed
[GAS_SYNC_V2] [2024-12-30T10:00:00Z] Building Add payload for: TEST_ADD_001
...
[GAS_SYNC_V2] [2024-12-30T10:00:00Z] Sync successful in 1234ms
```

5. Repeat with `testSyncEdit` and `testSyncDelete`

---

### Test 2: AppSheet End-to-End

**Test Add:**

1. Open AppSheet app
2. Create a new trip with test data:
   ```
   maChuyenDi: TEST_APPSHEET_001
   tenKhachHang: Test Customer
   donViVanChuyen: NAK
   trangThai: Mới
   ```
3. Save
4. Check AppSheet Automation logs (Monitor → Automation)
5. Check GAS execution logs
6. Check Vercel logs for `[APPSHEET_DEBUG]`
7. Verify data in database

**Test Edit:**

1. Edit the test trip created above
2. Change `trangThai` to "Hoàn tất"
3. Save
4. Check logs (AppSheet → GAS → Vercel)
5. Verify update in database

**Test Delete:**

1. Delete the test trip
2. Check logs
3. Verify deletion in database

---

### Test 3: Data Cleaning Functions

Run in GAS editor:

```javascript
function testDataCleaning() {
  Logger.log('=== Testing Data Cleaning ===');

  // Test cleanNumber
  Logger.log('cleanNumber(null): ' + cleanNumber(null)); // → 0
  Logger.log('cleanNumber(""): ' + cleanNumber('')); // → 0
  Logger.log('cleanNumber("1,234.56"): ' + cleanNumber('1,234.56')); // → 1234.56

  // Test formatDate
  Logger.log('formatDate("25/12/2024"): ' + formatDate('25/12/2024')); // → 2024-12-25

  // Test normalizeStatus
  Logger.log('normalizeStatus("Hoàn tất"): ' + normalizeStatus('Hoàn tất')); // → approved
}
```

---

## Monitoring

### GAS Execution Logs

**View Logs:**

1. Apps Script editor → **Executions** (clock icon)
2. Click on any execution to see full log
3. Filter by status: Success / Error

**What to Monitor:**

- Execution count (should match AppSheet actions)
- Error rate (should be < 1%)
- Average duration (should be < 3 seconds)

---

### AppSheet Automation Logs

**View Logs:**

1. AppSheet editor → **Monitor** → **Automation**
2. Filter by bot name
3. Click on execution to see details

**What to Monitor:**

- Bot trigger count
- Success rate
- Failed executions with error messages

---

### Vercel Backend Logs

**View Logs:**

1. Vercel Dashboard → Your project → **Logs**
2. Filter: `[APPSHEET_DEBUG]`
3. Look for:
   - Request headers
   - Raw body
   - Parsed JSON
   - Database result

---

### Log Correlation

For any trip sync, you should see 3 log entries:

```
1. AppSheet Automation Log
   ↓
2. GAS Execution Log
   ↓
3. Vercel Function Log
```

If missing any, investigate that layer.

---

## Troubleshooting

### Issue 1: "Trip not found" Error

**Symptom:**
```
Error: Trip not found: ABC123
```

**Causes:**
- Trip ID doesn't exist in sheet
- Column index wrong
- Sheet name wrong

**Fix:**
1. Verify trip exists: Open sheet, Ctrl+F for trip ID
2. Check COLUMNS.CHUYEN_DI.MA_CHUYEN_DI index
3. Check CONFIG.SHEET_CHUYEN_DI name

---

### Issue 2: "Invalid JSON format" from Backend

**Symptom:**
```
HTTP 400: Invalid JSON format
```

**Causes:**
- Missing required field
- Null values in numbers
- Invalid date format

**Fix:**
1. Enable DEBUG_MODE in CONFIG
2. Check GAS log for payload sent
3. Copy payload, paste in jsonlint.com
4. Fix data cleaning logic

---

### Issue 3: "Unauthorized" (HTTP 401)

**Symptom:**
```
HTTP 401: Unauthorized
```

**Causes:**
- API key mismatch
- Missing x-api-key header

**Fix:**
1. Compare keys:
   ```javascript
   // In GAS
   Logger.log('GAS API Key: ' + CONFIG.API_SECRET_KEY.substring(0, 10) + '...');
   ```

   ```bash
   # In Vercel
   vercel env ls
   ```

2. Ensure they match exactly

---

### Issue 4: Delete Not Working

**Symptom:**
Delete bot runs but data not deleted in backend

**Causes:**
- Using `[_THISROW]` instead of `[_THISROW_BEFORE]`
- Backend not handling Delete action

**Fix:**
1. In AppSheet Delete bot, change parameter to:
   ```
   tripId: [_THISROW_BEFORE].[maChuyenDi]
   ```

2. Verify backend handles `Action: "Delete"`

---

### Issue 5: High Error Rate

**Symptom:**
Many failed executions in GAS logs

**Causes:**
- Backend endpoint down
- Network issues
- Rate limiting

**Fix:**
1. Test backend directly:
   ```bash
   ./test-webhook.sh production
   ```

2. Increase retry delay:
   ```javascript
   RETRY_DELAY_MS: 2000, // 2 seconds
   MAX_RETRIES: 5
   ```

3. Check Vercel function logs for errors

---

## Advanced Configuration

### Custom Column Mapping

If your sheet structure is different, update COLUMNS object:

```javascript
const COLUMNS = {
  CHUYEN_DI: {
    MA_CHUYEN_DI: 2,  // If ID is in Column C
    NGAY_TAO: 5,       // If Date is in Column F
    // ... update all
  }
};
```

### Custom Status Mapping

Add more status mappings in `normalizeStatus()`:

```javascript
const statusMap = {
  'đang xử lý': 'processing',
  'tạm hoãn': 'on_hold',
  // ... add your custom statuses
};
```

### Disable Retry for Specific Errors

```javascript
function sendToBackendWithRetry(payload) {
  // Don't retry on 4xx client errors (bad data)
  if (statusCode >= 400 && statusCode < 500) {
    throw new Error(`Client error ${statusCode}: ${responseText}`);
  }

  // Retry on 5xx server errors
  // ... existing retry logic
}
```

---

## Security Best Practices

### 1. Use Script Properties

✅ **DO:**
```javascript
const API_KEY = PropertiesService.getScriptProperties().getProperty('API_SECRET_KEY');
```

❌ **DON'T:**
```javascript
const API_KEY = 'hardcoded-key-123';
```

### 2. Restrict Script Access

In deployment settings:
- **Who has access:** Only myself
- **Never:** Anyone, even anonymous

### 3. Rotate API Keys Regularly

```bash
# Generate new key
openssl rand -base64 32

# Update in:
1. Vercel env vars
2. GAS Script Properties
```

### 4. Monitor for Suspicious Activity

Check for:
- Unusual execution count spikes
- Failed auth attempts
- Unexpected IP addresses (if logged)

---

## Performance Optimization

### 1. Batch Sheet Reads

✅ Current implementation (efficient):
```javascript
const data = sheet.getDataRange().getValues(); // Read once
for (let row of data) { /* process */ }
```

❌ Inefficient (avoid):
```javascript
for (let i = 1; i <= sheet.getLastRow(); i++) {
  const row = sheet.getRange(i, 1, 1, 10).getValues()[0]; // Read N times!
}
```

### 2. Reduce Logging in Production

```javascript
const CONFIG = {
  DEBUG_MODE: false, // Set to false in production
};
```

### 3. Cache Spreadsheet Instance

For multiple functions:
```javascript
let cachedSheet = null;

function getSheet(sheetName) {
  if (!cachedSheet) {
    const ss = SpreadsheetApp.openById(CONFIG.MAIN_SPREADSHEET_ID);
    cachedSheet = ss.getSheetByName(sheetName);
  }
  return cachedSheet;
}
```

---

## Rollback Plan

If new system causes issues:

### Quick Rollback (5 minutes)

1. Disable all AppSheet bots:
   - AppSheet Editor → Automation → Bots
   - Toggle OFF all 3 sync bots

2. Re-enable old webhook (if exists):
   - AppSheet Editor → Data → Table → Webhooks
   - Toggle ON old webhook

### Full Rollback (30 minutes)

1. Restore backend to previous version:
   ```bash
   vercel rollback [previous-deployment-url]
   ```

2. Archive GAS project (don't delete):
   - Apps Script → File → Make a copy
   - Rename: "NAK Sync v2 - ARCHIVED"

3. Update documentation

---

## Success Metrics

After deployment, monitor these KPIs:

| Metric | Target | Current |
|--------|--------|---------|
| Sync success rate | > 99% | - |
| Average sync duration | < 3s | - |
| Data accuracy | 100% | - |
| Error rate | < 1% | - |
| Null value errors | 0 | - |

---

## Support & Escalation

### Level 1: Check Logs

1. GAS execution logs
2. AppSheet automation logs
3. Vercel function logs

### Level 2: Run Tests

1. `testSyncAdd()`
2. `testDataCleaning()`
3. `test-webhook.sh`

### Level 3: Debug Mode

1. Set `DEBUG_MODE: true`
2. Trigger sync
3. Copy full logs
4. Analyze step-by-step

### Level 4: Contact Support

- Email: dev@nak-logistics.com
- Include: Logs, trip ID, timestamp, error message

---

**Last Updated:** 2024-12-30
**Version:** 2.0.0
**Author:** NAK Logistics Development Team
