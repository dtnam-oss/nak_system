# AppSheet Bot Configuration Guide
## Step-by-Step Setup for NAK Logistics Sync

---

## Overview

Bạn sẽ tạo **3 bots** để xử lý 3 sự kiện:

| Bot | Trigger | Event Type | Parameter |
|-----|---------|------------|-----------|
| **Bot 1** | Adds only | "Add" | `[_THISROW].[maChuyenDi]` |
| **Bot 2** | Updates only | "Edit" | `[_THISROW].[maChuyenDi]` |
| **Bot 3** | Deletes only | "Delete" | `[_THISROW_BEFORE].[maChuyenDi]` ⚠️ |

⚠️ **CRITICAL:** Delete bot MUST use `_THISROW_BEFORE` because row is already deleted!

---

## Bot 1: Add Event Handler

### Step 1: Create New Bot

1. Open AppSheet app editor
2. Click **Automation** tab (left sidebar)
3. Click **Bots** section
4. Click **+ New Bot** button

### Step 2: Configure Event

```yaml
┌─────────────────────────────────────────────────┐
│ Event Configuration                             │
├─────────────────────────────────────────────────┤
│ Name: Sync Trip Add                             │
│                                                  │
│ Event:                                           │
│   ☑ Data change                                 │
│   ↳ Table: ChuyenDi                             │
│   ↳ Type: Adds only ◀── Select this            │
│                                                  │
│ When:                                            │
│   Condition: TRUE                                │
│   (Leave as TRUE to always run)                 │
└─────────────────────────────────────────────────┘
```

### Step 3: Configure Process (Action)

```yaml
┌─────────────────────────────────────────────────┐
│ Process Configuration                           │
├─────────────────────────────────────────────────┤
│ + Add a step                                    │
│                                                  │
│ Step 1:                                          │
│   Type: Call a Script ◀── Select this          │
│   Name: Sync to Backend                         │
│                                                  │
│   Script details:                                │
│   ┌───────────────────────────────────────────┐ │
│   │ Script URL:                               │ │
│   │ [Paste your GAS Web App URL here]        │ │
│   │                                           │ │
│   │ Function name:                            │ │
│   │ syncTripToBackend                         │ │
│   └───────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

**How to get Script URL:**

1. In Google Apps Script editor
2. Click **Deploy** → **Manage deployments**
3. Copy the **Web app URL**
4. Example: `https://script.google.com/macros/s/AKfy...xyz/exec`

### Step 4: Configure Parameters

Click **+ Add parameter** twice to add 2 parameters:

```yaml
┌─────────────────────────────────────────────────┐
│ Parameters                                      │
├─────────────────────────────────────────────────┤
│ Parameter 1:                                    │
│   Name: tripId                                  │
│   Value: [_THISROW].[maChuyenDi]               │
│   Type: Text                                    │
│                                                  │
│ Parameter 2:                                    │
│   Name: eventType                               │
│   Value: "Add"  ◀── Hardcoded string           │
│   Type: Text                                    │
└─────────────────────────────────────────────────┘
```

**Parameter Details:**

| Field | Value | Explanation |
|-------|-------|-------------|
| **tripId** | `[_THISROW].[maChuyenDi]` | Lấy ID của row vừa được thêm |
| **eventType** | `"Add"` | Hardcode string "Add" (có dấu ngoặc kép!) |

### Step 5: Save and Test

1. Click **Save** (top right)
2. Click **Test** button
3. Select a sample row from your ChuyenDi table
4. Click **Run test**
5. Check results in test output

**Expected Test Output:**

```json
{
  "success": true,
  "tripId": "NAK_001",
  "eventType": "Add",
  "duration": 1234,
  "response": {
    "success": true,
    "action": "upsert",
    "orderId": "NAK_001"
  }
}
```

---

## Bot 2: Edit Event Handler

### Step 1: Create New Bot

Same as Bot 1, click **+ New Bot**

### Step 2: Configure Event

```yaml
┌─────────────────────────────────────────────────┐
│ Event Configuration                             │
├─────────────────────────────────────────────────┤
│ Name: Sync Trip Edit                            │
│                                                  │
│ Event:                                           │
│   ☑ Data change                                 │
│   ↳ Table: ChuyenDi                             │
│   ↳ Type: Updates only ◀── Select this         │
│                                                  │
│ When:                                            │
│   Condition: TRUE                                │
└─────────────────────────────────────────────────┘
```

### Step 3: Configure Process

```yaml
┌─────────────────────────────────────────────────┐
│ Process Configuration                           │
├─────────────────────────────────────────────────┤
│ Step 1:                                          │
│   Type: Call a Script                           │
│   Name: Sync to Backend                         │
│                                                  │
│   Script URL: [Same URL as Bot 1]              │
│   Function: syncTripToBackend                   │
└─────────────────────────────────────────────────┘
```

### Step 4: Configure Parameters

```yaml
┌─────────────────────────────────────────────────┐
│ Parameters                                      │
├─────────────────────────────────────────────────┤
│ Parameter 1:                                    │
│   Name: tripId                                  │
│   Value: [_THISROW].[maChuyenDi]               │
│                                                  │
│ Parameter 2:                                    │
│   Name: eventType                               │
│   Value: "Edit"  ◀── Change to "Edit"          │
└─────────────────────────────────────────────────┘
```

**Only Difference:** `eventType = "Edit"` instead of "Add"

### Step 5: Save and Test

1. Save bot
2. Edit an existing trip in AppSheet
3. Check Monitor → Automation logs
4. Verify backend received update

---

## Bot 3: Delete Event Handler

⚠️ **CRITICAL DIFFERENCE:** Use `_THISROW_BEFORE` for delete events!

### Step 1: Create New Bot

Click **+ New Bot**

### Step 2: Configure Event

```yaml
┌─────────────────────────────────────────────────┐
│ Event Configuration                             │
├─────────────────────────────────────────────────┤
│ Name: Sync Trip Delete                          │
│                                                  │
│ Event:                                           │
│   ☑ Data change                                 │
│   ↳ Table: ChuyenDi                             │
│   ↳ Type: Deletes only ◀── Select this         │
│                                                  │
│ When:                                            │
│   Condition: TRUE                                │
└─────────────────────────────────────────────────┘
```

### Step 3: Configure Process

```yaml
┌─────────────────────────────────────────────────┐
│ Process Configuration                           │
├─────────────────────────────────────────────────┤
│ Step 1:                                          │
│   Type: Call a Script                           │
│   Name: Sync to Backend                         │
│                                                  │
│   Script URL: [Same URL as Bot 1 & 2]          │
│   Function: syncTripToBackend                   │
└─────────────────────────────────────────────────┘
```

### Step 4: Configure Parameters

⚠️ **USE `_THISROW_BEFORE` NOT `_THISROW`!**

```yaml
┌─────────────────────────────────────────────────┐
│ Parameters                                      │
├─────────────────────────────────────────────────┤
│ Parameter 1:                                    │
│   Name: tripId                                  │
│   Value: [_THISROW_BEFORE].[maChuyenDi]        │
│         ^^^^^^^^^^^^^^^^                        │
│         BEFORE keyword required!                │
│                                                  │
│ Parameter 2:                                    │
│   Name: eventType                               │
│   Value: "Delete"                               │
└─────────────────────────────────────────────────┘
```

**Why `_THISROW_BEFORE`?**

- When delete event fires, row is ALREADY deleted from table
- `[_THISROW]` would return null/empty
- `[_THISROW_BEFORE]` captures row data before deletion

### Step 5: Save and Test

1. Save bot
2. Delete a test trip in AppSheet
3. Check logs
4. Verify backend deleted the record

---

## Comparison Table: All 3 Bots

| Property | Bot 1: Add | Bot 2: Edit | Bot 3: Delete |
|----------|------------|-------------|---------------|
| **Name** | Sync Trip Add | Sync Trip Edit | Sync Trip Delete |
| **Event Type** | Adds only | Updates only | Deletes only |
| **Condition** | TRUE | TRUE | TRUE |
| **Script URL** | [Same for all] | [Same for all] | [Same for all] |
| **Function** | syncTripToBackend | syncTripToBackend | syncTripToBackend |
| **Param 1** | tripId = `[_THISROW].[maChuyenDi]` | tripId = `[_THISROW].[maChuyenDi]` | tripId = `[_THISROW_BEFORE].[maChuyenDi]` |
| **Param 2** | eventType = `"Add"` | eventType = `"Edit"` | eventType = `"Delete"` |

---

## Testing All Bots

### End-to-End Test Checklist

#### Test 1: Add Event

- [ ] Open AppSheet app
- [ ] Create new trip:
  ```
  maChuyenDi: TEST_001
  tenKhachHang: Test Customer
  donViVanChuyen: NAK
  trangThai: Mới
  ```
- [ ] Save
- [ ] Check AppSheet Monitor → Automation
  - Bot "Sync Trip Add" should show success
- [ ] Check GAS Execution logs
  - Should see `[GAS_SYNC_V2] Event Type: Add`
- [ ] Check Vercel logs
  - Should see `[APPSHEET_DEBUG] Webhook Action: Add`
- [ ] Check database
  - Record TEST_001 should exist

#### Test 2: Edit Event

- [ ] Edit trip TEST_001
- [ ] Change `trangThai` to "Hoàn tất"
- [ ] Save
- [ ] Check all logs (AppSheet → GAS → Vercel)
  - Bot "Sync Trip Edit" should trigger
  - GAS log: `Event Type: Edit`
  - Vercel log: `Action: Edit`
- [ ] Check database
  - TEST_001 status should be "approved"

#### Test 3: Delete Event

- [ ] Delete trip TEST_001
- [ ] Check all logs
  - Bot "Sync Trip Delete" should trigger
  - GAS log: `Event Type: Delete`
  - Vercel log: `Action: Delete`
- [ ] Check database
  - TEST_001 should NOT exist

---

## Common Issues

### Issue 1: Bot Not Triggering

**Symptoms:**
- Save data in AppSheet
- Bot doesn't run (no log in Monitor)

**Causes & Fixes:**

1. **Bot is disabled**
   - Fix: AppSheet Editor → Automation → Bots → Toggle ON

2. **Condition is FALSE**
   - Fix: Set condition to `TRUE`

3. **Wrong table selected**
   - Fix: Verify Event → Table = "ChuyenDi"

4. **Wrong event type**
   - Add bot should be "Adds only", not "Updates only"

---

### Issue 2: Bot Triggers But Fails

**Symptoms:**
- Bot shows in Monitor logs
- Status: Failed with error

**Causes & Fixes:**

1. **Script URL wrong**
   - Fix: Copy correct URL from GAS → Deploy → Manage deployments

2. **Function name typo**
   - Fix: Must be exactly `syncTripToBackend` (case-sensitive)

3. **Parameters missing**
   - Fix: Both `tripId` and `eventType` required

4. **Delete bot using `_THISROW` instead of `_THISROW_BEFORE`**
   - Fix: Change to `[_THISROW_BEFORE].[maChuyenDi]`

---

### Issue 3: Bot Runs But Backend Not Updated

**Symptoms:**
- Bot shows success in AppSheet
- GAS shows success
- But database not updated

**Causes & Fixes:**

1. **Check Vercel logs**
   ```
   Filter: [APPSHEET_DEBUG]
   Look for: HTTP status code
   ```

2. **API key mismatch**
   ```javascript
   // In GAS, log the key
   Logger.log('API Key: ' + CONFIG.API_SECRET_KEY.substring(0, 10));
   ```

3. **Backend endpoint down**
   ```bash
   # Test directly
   curl -X POST https://your-app.vercel.app/api/webhook/appsheet \
     -H "x-api-key: your-key" \
     -d '{"Action":"Add","maChuyenDi":"TEST"}'
   ```

---

### Issue 4: Duplicate Triggers

**Symptoms:**
- One action triggers bot multiple times
- Same trip synced 2-3 times

**Causes & Fixes:**

1. **Multiple bots with same event type**
   - Fix: Only ONE bot per event type (Add/Edit/Delete)

2. **Condition always TRUE for all events**
   - This is actually OK - backend has UPSERT (idempotent)

3. **AppSheet bug (known issue)**
   - Workaround: Add duplicate check in GAS or backend

---

### Issue 5: Delete Bot Using Wrong Parameter

**Symptoms:**
- Delete bot runs
- Error: "Trip not found"

**Root Cause:**
Using `[_THISROW]` instead of `[_THISROW_BEFORE]`

**Fix:**
```yaml
# WRONG ❌
tripId: [_THISROW].[maChuyenDi]  # Returns null for delete!

# CORRECT ✅
tripId: [_THISROW_BEFORE].[maChuyenDi]  # Captures ID before delete
```

---

## Advanced Configuration

### Conditional Triggers

Instead of `TRUE`, use conditions:

**Example: Only sync approved trips**

```yaml
Condition: [trangThai] = "Hoàn tất"
```

**Example: Only sync NAK trips**

```yaml
Condition: [donViVanChuyen] = "NAK"
```

**Example: Only sync high-value trips**

```yaml
Condition: [tongDoanhThu] > 5000000
```

---

### Custom Error Handling

Add a second step to send notification on failure:

```yaml
Step 1: Call a Script (sync)

Step 2: Send an email
  Condition: NOT([Step 1 Result].[success])
  To: admin@nak-logistics.com
  Subject: "Sync failed for trip [_THISROW].[maChuyenDi]"
  Body: [Step 1 Result].[error]
```

---

### Rate Limiting

If syncing too many records at once:

```yaml
Event:
  Condition: TRUE

Process:
  Run this process: Only if this row
  Frequency: At most once every 5 seconds
```

---

## Monitoring Dashboard

### AppSheet Monitor

1. Go to **Monitor** → **Automation**
2. Filter by bot name
3. View metrics:
   - Total runs
   - Success rate
   - Average duration
   - Recent failures

### Create Alert Rules

1. Monitor → **Alerts**
2. Click **+ New alert**
3. Configuration:
   ```yaml
   Alert: Bot failure rate > 5%
   Notification: Email to dev@nak-logistics.com
   Check: Every 1 hour
   ```

---

## Rollback Plan

If bots cause issues:

### Quick Disable (1 minute)

1. AppSheet Editor → Automation → Bots
2. Toggle OFF all 3 bots
3. Changes take effect immediately

### Re-enable Old Webhook (5 minutes)

If you had old direct webhook:

1. Data → ChuyenDi table → Webhooks
2. Toggle ON old webhook
3. Verify it's pointing to correct endpoint

---

## Best Practices

### ✅ DO:

- Use descriptive bot names ("Sync Trip Add", not "Bot 1")
- Add comments in bot description
- Test each bot individually before production
- Monitor logs regularly
- Keep GAS and AppSheet in sync (same event types)

### ❌ DON'T:

- Create multiple bots for same event type
- Use complex conditions without testing
- Hardcode trip IDs in parameters
- Forget to use `_THISROW_BEFORE` for delete
- Deploy without testing in sandbox first

---

## Success Criteria

After setup, verify:

- [ ] All 3 bots created and enabled
- [ ] Add bot triggers on new record
- [ ] Edit bot triggers on update
- [ ] Delete bot triggers on deletion
- [ ] All bots pass test runs
- [ ] Backend receives correct data
- [ ] Database updates correctly
- [ ] No errors in logs
- [ ] Sync completes in < 3 seconds

---

**Last Updated:** 2024-12-30
**Version:** 2.0.0
**Author:** NAK Logistics Development Team
