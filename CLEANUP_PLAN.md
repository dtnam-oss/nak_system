# 🧹 Cleanup Plan - Deprecated Webhook Files

## Executive Summary

Cleaning up old AppSheet webhook integration files that are now superseded by the new **gas-sync-v2** architecture.

**Old Architecture (Deprecated):**
```
AppSheet → Direct Webhook → Google Sheets
AppSheet → Webhook → Next.js API (with JSON errors)
```

**New Architecture (Current):**
```
AppSheet Bot → Google Apps Script (gas-sync-v2) → Next.js API
```

---

## Files to DELETE

### Category 1: Old Webhook → Google Sheets Logic

These files handle the deprecated flow: **AppSheet Webhook → Google Apps Script → Google Sheets**

| File | Size | Purpose (Deprecated) | Replacement |
|------|------|----------------------|-------------|
| **backend-gas/gas/WebhookSync.js** | ~1000 lines | Old webhook handler that writes to Google Sheets | gas-sync-v2/Code-Updated.gs |
| **backend-gas/gas/AppSheetWebhookService.js** | ~300 lines | Basic webhook handler for AppSheet events | gas-sync-v2/Code-Updated.gs |

**Why delete:**
- These files implement the old pattern where webhooks write to intermediate Google Sheets
- Replaced by gas-sync-v2 which sends data directly to Next.js API
- No longer used in production
- Causes confusion having two webhook implementations

### Category 2: Old Database Import Logic

| File | Size | Purpose (Deprecated) | Status |
|------|------|----------------------|--------|
| **backend-gas/gas/ImportToPostgres.js** | ~200 lines | One-time migration script to import from Sheets → Postgres | Migration complete, no longer needed |

**Why delete:**
- Was a one-time migration tool
- Current sync uses real-time webhook flow
- No ongoing need for bulk imports

---

## Files to KEEP

These files are still actively used:

| File | Purpose | Status |
|------|---------|--------|
| **backend-gas/gas/CreateDataBase.js** | Reference implementation for data structure | ✅ KEEP - Source of truth for data format |
| **backend-gas/gas/Config.js** | Configuration constants | ✅ KEEP - May be used by other services |
| **backend-gas/gas/DataService.js** | Data access layer | ✅ KEEP - Used by other services |
| **backend-gas/gas/Utils.js** | Utility functions | ✅ KEEP - Shared utilities |
| **backend-gas/gas/Code.js** | Main entry point | ✅ KEEP - May contain other logic |
| **backend-gas/gas/ReportService.js** | Reporting functionality | ✅ KEEP - Active feature |
| **backend-gas/gas/ReconciliationService.js** | Reconciliation logic | ✅ KEEP - Active feature |
| **backend-gas/gas/UpdateService.js** | Update operations | ✅ KEEP - Active feature |
| **backend-gas/gas/RemoveDuplicates.js** | Data cleanup utility | ✅ KEEP - Maintenance tool |

---

## Files to CREATE (Backup)

Before deletion, create a backup archive:

**backend-gas/gas/deprecated-backup/**
- Move files here instead of permanent deletion
- Add README explaining why deprecated
- Keep for 30 days then delete

---

## Impact Analysis

### ✅ Zero Risk

Deleting these files has **ZERO production impact** because:

1. **WebhookSync.js** - Old webhook handler
   - Not referenced by current AppSheet bots
   - Current bots call gas-sync-v2 Web App URL instead
   - No imports/dependencies from other active files

2. **AppSheetWebhookService.js** - Basic webhook handler
   - Superseded by gas-sync-v2/Code-Updated.gs
   - No active webhook pointing to this service
   - No imports from other files

3. **ImportToPostgres.js** - Migration script
   - One-time use, migration complete
   - No scheduled triggers
   - No dependencies

### 🔍 Verification Steps

Before deletion:

1. ✅ Check AppSheet bots are pointing to gas-sync-v2 URL
2. ✅ Check no Google Apps Script triggers reference these files
3. ✅ Verify no imports in active files (grep check)
4. ✅ Confirm production has been using gas-sync-v2 successfully

---

## Cleanup Commands

### Step 1: Create Backup Directory

```bash
mkdir -p backend-gas/gas/deprecated-backup
```

### Step 2: Move Deprecated Files

```bash
# Move to backup
mv backend-gas/gas/WebhookSync.js backend-gas/gas/deprecated-backup/
mv backend-gas/gas/AppSheetWebhookService.js backend-gas/gas/deprecated-backup/
mv backend-gas/gas/ImportToPostgres.js backend-gas/gas/deprecated-backup/
```

### Step 3: Create Backup README

Create `backend-gas/gas/deprecated-backup/README.md` explaining deprecation.

### Step 4: Commit Changes

```bash
git add .
git commit -m "chore: archive deprecated webhook files

- Move old webhook handlers to deprecated-backup/
- Old: WebhookSync.js, AppSheetWebhookService.js
- Old: ImportToPostgres.js (one-time migration)
- Replaced by: gas-sync-v2/Code-Updated.gs
- Reason: New architecture uses GAS → Next.js API directly"
```

### Step 5: Future Permanent Deletion (After 30 days)

```bash
# After verifying no issues for 30 days
rm -rf backend-gas/gas/deprecated-backup/
git commit -m "chore: remove deprecated webhook backup files"
```

---

## Files Summary

### DELETE (Move to backup)
- ❌ backend-gas/gas/WebhookSync.js
- ❌ backend-gas/gas/AppSheetWebhookService.js
- ❌ backend-gas/gas/ImportToPostgres.js

### KEEP (Active)
- ✅ backend-gas/gas/CreateDataBase.js
- ✅ backend-gas/gas/Config.js
- ✅ backend-gas/gas/DataService.js
- ✅ backend-gas/gas/Utils.js
- ✅ backend-gas/gas/Code.js
- ✅ backend-gas/gas/ReportService.js
- ✅ backend-gas/gas/ReconciliationService.js
- ✅ backend-gas/gas/UpdateService.js
- ✅ backend-gas/gas/RemoveDuplicates.js

### NEW (Current system)
- ✅ backend-gas/gas-sync-v2/Code-Updated.gs
- ✅ backend-gas/gas-sync-v2/Config.gs
- ✅ backend-gas/gas-sync-v2/Code.gs (old version, replaced by Code-Updated.gs)

---

## Testing After Cleanup

1. **AppSheet Bot Test:**
   - Create new trip → Verify sync to dashboard
   - Edit trip → Verify update
   - Delete trip → Verify deletion

2. **Log Verification:**
   - Check Vercel logs for `[APPSHEET_DEBUG]` messages
   - Check GAS logs for `[GAS_SYNC_V2]` messages
   - Confirm no errors

3. **No Side Effects:**
   - Other GAS services (Reports, Reconciliation) still work
   - No import errors in remaining files

---

## Rollback Plan (If Needed)

If any issues arise:

```bash
# Restore from backup
mv backend-gas/gas/deprecated-backup/* backend-gas/gas/
```

---

**Status:** Ready to Execute
**Risk Level:** ⚪ Minimal (files not in use)
**Approval Required:** User confirmation
**Estimated Time:** 5 minutes

---

## Next Steps

1. User reviews this plan
2. User approves deletion
3. Execute cleanup commands
4. Commit changes
5. Monitor for 24 hours
6. Mark as complete ✓
