# ⚡ Quick Fix: Migration Not Importing Data

## 🚨 Problem

`manualRunMigrationBatch()` showing **0 imports**, all records filtered by date.

---

## ✅ Quick Solution (Choose One)

### Option 1: Import ALL Data (Recommended)

**If you want all historical data:**

1. Open [backend-gas/Code.gs](backend-gas/Code.gs)
2. Go to line **1358**
3. Change:
   ```javascript
   START_DATE: '2026-01-01',
   ```
   To:
   ```javascript
   START_DATE: null,
   ```
4. Run in GAS Editor:
   ```javascript
   manualResetMigration()
   manualRunMigrationBatch()
   ```
5. Keep running `manualRunMigrationBatch()` until done

---

### Option 2: Import from Earlier Date

**If you want data from December 2025 forward:**

1. Open [backend-gas/Code.gs](backend-gas/Code.gs)
2. Go to line **1358**
3. Change:
   ```javascript
   START_DATE: '2026-01-01',
   ```
   To:
   ```javascript
   START_DATE: '2025-12-01',  // Or your preferred date
   ```
4. Run in GAS Editor:
   ```javascript
   manualResetMigration()
   manualRunMigrationBatch()
   ```

---

## 🔍 Want to Check Data First?

**Before making changes, inspect your actual dates:**

```javascript
// Run in GAS Editor
debugCheckDateValues(51, 76)
```

**This will show:**
- Actual date values in rows 51-76
- Why they're being filtered
- How many records meet the criteria

---

## 📊 How to Know It's Working

**Before (Not Working):**
```
🏁 KẾT THÚC BATCH.
- Thành công: 0          ← BAD
- Lỗi: 0
- Lọc theo ngày: 25      ← All filtered
```

**After (Working):**
```
🏁 KẾT THÚC BATCH.
- Thành công: 23         ← GOOD (> 0)
- Lỗi: 0
- Lọc theo ngày: 0       ← None filtered
```

---

## 🎯 Complete Workflow

### Step 1: Choose Fix
Pick Option 1 or Option 2 above

### Step 2: Update Code
Edit `START_DATE` in Code.gs line 1358

### Step 3: Reset & Run
```javascript
manualResetMigration()      // Reset to start
manualRunMigrationBatch()   // Run first batch
```

### Step 4: Continue
Keep running until you see:
```
🎉 CHÚC MỪNG! ĐÃ HOÀN THÀNH TOÀN BỘ DỮ LIỆU.
```

---

## 🛠️ Debug Tools Available

If you need more investigation:

```javascript
debugMigrationConfig()              // View current settings
debugCheckDateValues(2, 76)         // Check date values
debugTestFormatDateWithSheetData()  // Test date parsing
```

**Full guide:** [MIGRATION_DEBUG_GUIDE.md](MIGRATION_DEBUG_GUIDE.md)

---

## 🔗 Files to Edit

- **Configuration:** [backend-gas/Code.gs](backend-gas/Code.gs) - Line 1358
- **Debug Tools:** [backend-gas/DebugMigration.gs](backend-gas/DebugMigration.gs)
- **Full Guide:** [MIGRATION_DEBUG_GUIDE.md](MIGRATION_DEBUG_GUIDE.md)

---

**Created:** 2026-01-13
**Issue:** 0 imports, all filtered by date
**Root Cause:** `START_DATE: '2026-01-01'` but data is from 2025
**Quick Fix:** Set `START_DATE: null` or `'2025-12-01'`
