# 🔍 Migration Debug Guide

## 🚨 Current Issue

**Problem:** `manualRunMigrationBatch()` is showing 0 imports with all records being filtered by date.

**Observed Log:**
```
22:14:59  ⏹️ KẾT THÚC BATCH.
22:14:59  - Thành công: 0
22:14:59  - Lỗi: 0
22:14:59  - Bỏ qua (No ID): 0
22:14:59  - Lọc theo ngày: 25 (trước 2026-01-07)
22:14:59  ⚠️ Đã lưu vị trí dòng: 76
```

**Analysis:**
- Batch processed rows 51-76 (25 rows)
- ALL 25 rows filtered by date (before 2026-01-07)
- 0 rows had missing IDs
- 0 rows successfully imported

**Configuration:**
```javascript
MIGRATION_OPTS = {
  BATCH_SIZE: 25,
  START_DATE: '2026-01-01',  // Only import from 2026-01-01 forward
  MANUAL_START_ROW: null
}
```

---

## 🔍 Root Cause Analysis

### Possible Causes:

1. **Date Mismatch**: All records in rows 51-76 have `ngay_tao` values BEFORE 2026-01-01
   - Data might be historical (from 2025 or earlier)
   - Filter is too restrictive for actual data

2. **Date Format Issue**: Date values not being parsed correctly
   - Could be Excel date objects with time portion
   - Could be string format that's not recognized

3. **Wrong Column**: Reading date from wrong column
   - Currently reading from `ngay_tao`
   - Need to verify this is the correct column

4. **Timezone Issue**: Date parsing affected by timezone
   - Date objects converted incorrectly
   - Time portion affecting date comparison

---

## 🛠️ Debug Tools

### 1. Check Actual Date Values

**Function:** `debugCheckDateValues(startRow, endRow)`

**Purpose:** Inspect actual date values in the sheet and see why they're being filtered.

**Usage:**
```javascript
// Check rows 51-76 (the batch that was filtered)
debugCheckDateValues(51, 76)

// Check first batch
debugCheckDateValues(2, 26)

// Check all data up to current position
debugCheckDateValues(2, 76)
```

**Output:**
```
🔍 DEBUG: KIỂM TRA GIÁ TRỊ NGÀY TRONG SHEET

📋 Cột ID: ma_chuyen_di (index: 0)
📋 Cột Ngày: ngay_tao (index: 1)
📋 Filter được cấu hình: START_DATE >= '2026-01-01'

🔍 Đang kiểm tra dòng 51 đến 76 (25 dòng)

Dòng 51:
  ID: NAK001
  Ngày raw: Fri Dec 20 2025 00:00:00 GMT+0700
  Type: object | Is Date: true
  Formatted: 2025-12-20
  Status: ❌ BỊ LỌC (< 2026-01-01)

...

📊 TỔNG KẾT
Tổng số dòng kiểm tra: 25
  ✅ Đủ điều kiện (>= 2026-01-01): 0
  ❌ Bị lọc (< 2026-01-01): 25
  ⚠️  ID trống: 0
  ⚠️  Ngày trống: 0
```

---

### 2. Check Migration Configuration

**Function:** `debugMigrationConfig()`

**Purpose:** View current migration settings and position.

**Usage:**
```javascript
debugMigrationConfig()
```

**Output:**
```
⚙️  CẤU HÌNH MIGRATION HIỆN TẠI

📍 Vị trí:
  Last processed row: 76
  Next batch will start: 77

📊 Batch Settings:
  BATCH_SIZE: 25
  Next batch: rows 77 to 101

📅 Date Filter:
  START_DATE: 2026-01-01
  ⚠️  Only records >= 2026-01-01 will be imported

🎯 Manual Start Row:
  MANUAL_START_ROW: null
  ✅ Using saved position
```

---

### 3. Test Date Formatting

**Function:** `debugTestFormatDateWithSheetData()`

**Purpose:** Test how `formatDate()` handles actual values from the sheet.

**Usage:**
```javascript
debugTestFormatDateWithSheetData()
```

**Output:**
```
🧪 TEST formatDate() VỚI DỮ LIỆU THỰC

Testing formatDate() với các giá trị thực từ sheet:

Dòng 2:
  Raw: Fri Dec 20 2025 00:00:00 GMT+0700
  Type: object
  Is Date: true
  Full datetime: Fri Dec 20 2025 00:00:00 GMT+0700 (Indochina Time)
  Formatted: 2025-12-20
  Compare: 2025-12-20 vs 2026-01-01 => BEFORE (filtered)

Dòng 50:
  Raw: Sun Jan 05 2026 00:00:00 GMT+0700
  Type: object
  Is Date: true
  Full datetime: Sun Jan 05 2026 00:00:00 GMT+0700 (Indochina Time)
  Formatted: 2026-01-05
  Compare: 2026-01-05 vs 2026-01-01 => AFTER (ok)
```

---

## ✅ Solutions

### Solution 1: Remove Date Filter (Import All Data)

**When to use:** You want to import ALL historical data, regardless of date.

**Steps:**
1. Open [backend-gas/Code.gs](backend-gas/Code.gs)
2. Find line 1358:
   ```javascript
   START_DATE: '2026-01-01',  // Current filter
   ```
3. Change to:
   ```javascript
   START_DATE: null,  // Import all data
   ```
4. Run `manualResetMigration()` to restart from beginning
5. Run `manualRunMigrationBatch()` repeatedly until complete

**Expected Result:**
- All rows will be processed (no date filtering)
- Historical data from 2025 and earlier will be imported

---

### Solution 2: Adjust Start Date to Match Data

**When to use:** You want to import from a specific date that matches your actual data.

**Steps:**
1. First, check what dates you have:
   ```javascript
   debugCheckDateValues(2, 76)  // Check your data range
   ```
2. Look at the sample dates in the output
3. Decide on appropriate start date (e.g., `'2025-12-01'`)
4. Update Code.gs line 1358:
   ```javascript
   START_DATE: '2025-12-01',  // Adjust to your data
   ```
5. Run `manualResetMigration()`
6. Run `manualRunMigrationBatch()` repeatedly

**Expected Result:**
- Records from 2025-12-01 forward will be imported
- Older records will be filtered out

---

### Solution 3: Skip to Later Rows with Recent Dates

**When to use:** You only want recent data and know it's in later rows.

**Steps:**
1. Check where recent data starts:
   ```javascript
   debugCheckDateValues(77, 150)  // Check next batch
   ```
2. If row 100+ has dates >= 2026-01-01, skip to there:
   ```javascript
   // In Code.gs line 1363:
   MANUAL_START_ROW: 100  // Skip old data
   ```
3. Run `manualResetMigration()`
4. Run `manualRunMigrationBatch()` repeatedly

**Expected Result:**
- Rows 1-99 skipped
- Import starts from row 100 forward
- Only recent data imported

---

## 🧪 Testing Workflow

### Step 1: Understand Your Data

```javascript
// Run in GAS Editor
debugCheckDateValues(2, 76)  // Check processed range
debugCheckDateValues(77, 150)  // Check upcoming range
```

**Questions to answer:**
- What date range does my data cover?
- Are there any records >= 2026-01-01?
- Are dates formatted correctly?

---

### Step 2: Choose Strategy

Based on Step 1 results:

**If all dates < 2026-01-01:**
→ Use Solution 1 (remove filter) or Solution 2 (adjust date)

**If recent dates exist in later rows:**
→ Use Solution 3 (skip to later rows)

**If dates look wrong:**
→ Investigate date column and formatting

---

### Step 3: Apply Fix

Update configuration in Code.gs:
```javascript
const MIGRATION_OPTS = {
  BATCH_SIZE: 25,
  START_DATE: null,  // or '2025-12-01', etc.
  MANUAL_START_ROW: null  // or specific row number
};
```

---

### Step 4: Reset & Run

```javascript
// Reset position
manualResetMigration()

// Check config
debugMigrationConfig()

// Run first batch
manualRunMigrationBatch()

// If successful (success > 0), continue:
manualRunMigrationBatch()  // Run repeatedly until done
```

---

## 📊 Expected Results After Fix

### Successful Import Log:
```
🚀 BẮT ĐẦU BATCH: Xử lý từ dòng 2 đến 26 (Tổng: 500)
✅ OK [NAK001]
✅ OK [NAK002]
✅ OK [NAK003]
...
🏁 KẾT THÚC BATCH.
- Thành công: 23        ← Should be > 0
- Lỗi: 0
- Bỏ qua (No ID): 2
- Lọc theo ngày: 0      ← Should be low if filter adjusted
📍 Đã lưu vị trí dòng: 26
👉 HÃY CHẠY LẠI HÀM 'manualRunMigrationBatch' ĐỂ TIẾP TỤC.
```

---

## 🔍 Understanding the Log Message

**Screenshot showed:** "Lọc theo ngày: 25 (trước 2026-01-07)"

**But code shows:** `START_DATE: '2026-01-01'`

**Explanation:**
- The log message "trước 2026-01-07" might be a display issue or Vietnamese translation
- The actual filter is `< '2026-01-01'` (line 1525 in Code.gs)
- Records with `ngay_tao < '2026-01-01'` are filtered out
- The number "2026-01-07" in log might be today's date or next target date

**To verify:** Run `debugCheckDateValues(51, 76)` to see exact comparison logic.

---

## 🚨 Common Issues

### Issue 1: "Still getting 0 imports after removing filter"

**Cause:** Missing IDs or other data validation issues

**Debug:**
```javascript
debugCheckDateValues(51, 76)  // Check for empty IDs
```

**Look for:** "⚠️ ID trống" messages

---

### Issue 2: "Dates look wrong"

**Cause:** Wrong column or date format issue

**Debug:**
```javascript
debugTestFormatDateWithSheetData()  // See actual values
```

**Check:**
- Is `ngay_tao` the correct column?
- Are dates being parsed as Date objects?
- Do formatted dates match raw values?

---

### Issue 3: "Import stopped halfway"

**Cause:** Error in specific record or API timeout

**Debug:**
```javascript
manualCheckStatus()  // See where it stopped
debugCheckDateValues(77, 101)  // Check next batch
```

**Fix:** Look for error messages in logs, fix data, then continue.

---

## 📁 Files Reference

### Debug Files:
- [backend-gas/DebugMigration.gs](backend-gas/DebugMigration.gs) - Debug functions

### Core Migration Files:
- [backend-gas/Code.gs](backend-gas/Code.gs) - Main logic (lines 1347-1568)
  - Line 1358: `START_DATE` configuration
  - Line 1363: `MANUAL_START_ROW` configuration
  - Line 1522-1528: Date filter logic

### Configuration:
- [backend-gas/Config.gs](backend-gas/Config.gs) - Column mappings

---

## 🎯 Quick Commands Reference

```javascript
// === DEBUGGING ===
debugMigrationConfig()              // View current config
debugCheckDateValues(51, 76)        // Check specific rows
debugTestFormatDateWithSheetData()  // Test date formatting

// === MIGRATION CONTROL ===
manualResetMigration()              // Reset to start
manualCheckStatus()                 // Check current position
manualRunMigrationBatch()           // Run one batch

// === CONFIGURATION (in Code.gs) ===
MIGRATION_OPTS.START_DATE = null    // Import all
MIGRATION_OPTS.START_DATE = '2025-12-01'  // Import from date
MIGRATION_OPTS.MANUAL_START_ROW = 100     // Skip to row
```

---

## ✅ Recommended Next Steps

1. **Run debug to understand data:**
   ```javascript
   debugCheckDateValues(51, 76)
   ```

2. **Based on output, choose fix:**
   - Remove date filter: `START_DATE: null`
   - Adjust date filter: `START_DATE: '2025-12-01'`
   - Skip rows: `MANUAL_START_ROW: 100`

3. **Apply fix and test:**
   ```javascript
   manualResetMigration()
   manualRunMigrationBatch()
   ```

4. **Monitor results:**
   - Look for "Thành công: X" where X > 0
   - Check "Lọc theo ngày" count is reasonable
   - Continue running until "HOÀN THÀNH"

---

**Created:** 2026-01-13
**Issue:** Migration showing 0 imports, all records filtered by date
**Status:** ⚠️ Debug tools created, awaiting data inspection
**Next:** Run `debugCheckDateValues(51, 76)` to inspect actual dates
