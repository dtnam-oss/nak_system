# PATCH MEDIUM #4: Convert null to null Instead of 0 for Numbers

## 🟡 SEVERITY: MEDIUM

## 📍 Location
File: `backend-gas/Code.gs`
- Function: `parseVietnameseNumber()` (Lines 1370-1383)
- Function: `transformFuelExportRow()` (Lines 1654-1655)

## 🐛 Bug Description
The `parseVietnameseNumber()` function converts `null`, `undefined`, and empty strings to `0`:

```javascript
function parseVietnameseNumber(value) {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    value = value.replace(',', '.');
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }

  return 0;  // ❌ null/undefined → 0
}
```

This causes problems:
1. **Cannot distinguish** "user entered 0" vs "field was left empty"
2. **Invalid transactions** created with `quantity = 0` (should not exist)
3. **Data quality issues** - zeros pollute the database

### Example Problem:
```javascript
// User leaves 'so_luong' (quantity) empty in AppSheet
parseVietnameseNumber(null)  // Returns 0
parseVietnameseNumber('')    // Returns 0

// Transaction created with quantity = 0 ❌
// Should have been rejected as invalid!
```

## 💥 Impact
- **Data Quality**: Invalid records with zero values
- **Business Logic Errors**: Cannot differentiate intentional zeros from missing data
- **Validation Bypass**: Zero-quantity transactions pass through
- **Reporting Issues**: Skewed averages and statistics

## ✅ Solution
Return `null` for null/undefined/empty inputs. Let validation layer handle missing required fields.

---

## 📝 PATCH CODE

### Location 1: Update parseVietnameseNumber()

**OLD CODE (Lines 1370-1383):**
```javascript
function parseVietnameseNumber(value) {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    // Replace dấu phẩy thành dấu chấm
    value = value.replace(',', '.');
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }

  return 0;
}
```

**NEW CODE:**
```javascript
/**
 * Parse số từ format Việt Nam sang number
 * Handles: "1,9" -> 1.9, "2.5" -> 2.5, "15" -> 15
 * Returns null for empty/invalid inputs (not 0)
 *
 * @param {*} value - Giá trị cần parse
 * @returns {number|null} Số đã parse, hoặc null nếu invalid/empty
 */
function parseVietnameseNumber(value) {
  // Return null for truly empty values
  if (value === null || value === undefined || value === '') {
    return null;
  }

  // If already a number, return as-is
  if (typeof value === 'number') {
    return isNaN(value) ? null : value;
  }

  // Parse string (handle Vietnamese comma decimal separator)
  if (typeof value === 'string') {
    const trimmed = value.trim();

    // Empty string after trim
    if (trimmed === '') {
      return null;
    }

    // Replace Vietnamese comma with dot
    const normalized = trimmed.replace(',', '.');
    const parsed = parseFloat(normalized);

    // Return null for invalid numbers (NaN)
    return isNaN(parsed) ? null : parsed;
  }

  // Unknown type
  return null;
}
```

---

### Location 2: Update transformFuelExportRow() to Handle Nulls Properly

**File**: `backend-gas/Code.gs`
**Lines**: 1632-1668

**FIND THIS CODE (Lines 1654-1655):**
```javascript
// Convert number fields (quantity, unitPrice, totalAmount, odoNumber)
if (['quantity', 'unitPrice', 'totalAmount', 'odoNumber'].includes(jsonKey)) {
  value = parseVietnameseNumber(value);
}
```

**REPLACE WITH:**
```javascript
// Convert number fields (quantity, unitPrice, totalAmount, odoNumber)
if (['quantity', 'unitPrice', 'totalAmount', 'odoNumber'].includes(jsonKey)) {
  value = parseVietnameseNumber(value);

  // ✅ For REQUIRED fields, keep null (validation will catch it)
  // For OPTIONAL fields like odoNumber, null is acceptable
  // NO default to 0 - let validation decide what to do
}
```

---

### Location 3: Update Validation to Handle Null Properly

**This works together with PATCH HIGH #2 (validation)**

In `validateFuelTransactionData()`, the validation already checks:
```javascript
// 3. Required field: quantity (must be > 0)
if (record.quantity === null || record.quantity === undefined) {
  errors.push('Missing required field: quantity');
} else if (typeof record.quantity !== 'number' || isNaN(record.quantity)) {
  errors.push(`Invalid quantity: "${record.quantity}" is not a number`);
} else if (record.quantity <= 0) {
  errors.push(`Invalid quantity: ${record.quantity} (must be greater than 0)`);
}
```

✅ This will now catch `null` values properly!

---

### Location 4: Update parseNumber() Function (For Consistency)

**File**: `backend-gas/Code.gs`
**Function**: `parseNumber()` (Lines 425-432)

**OLD CODE:**
```javascript
function parseNumber(value) {
  if (value === null || value === undefined || value === '') {
    return 0;
  }

  const parsed = Number(value);
  return isNaN(parsed) ? 0 : parsed;
}
```

**NEW CODE:**
```javascript
/**
 * Parse giá trị thành number
 * Returns null for empty/invalid inputs (not 0)
 *
 * @param {*} value - Giá trị cần parse
 * @returns {number|null} Số đã parse, hoặc null
 */
function parseNumber(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return isNaN(parsed) ? null : parsed;
}
```

---

## 🔧 APPLY PATCH

### Step 1: Open Google Apps Script Editor
1. Go to: https://script.google.com/
2. Open your NAK Logistics project
3. Find `Code.gs`

### Step 2: Update parseVietnameseNumber()
1. Search for: `function parseVietnameseNumber(value) {`
2. Replace entire function (Lines 1370-1383) with NEW CODE

### Step 3: Update parseNumber()
1. Search for: `function parseNumber(value) {`
2. Replace entire function (Lines 425-432) with NEW CODE

### Step 4: Save
- Press `Ctrl + S` (Windows) or `Cmd + S` (Mac)

---

## ✅ Validation After Patch

### Test Case 1: Null Input Returns Null
```javascript
function testNullHandling() {
  Logger.log('Test 1: null input');
  const result1 = parseVietnameseNumber(null);
  Logger.log(`parseVietnameseNumber(null) = ${result1}`);
  // Expected: null (not 0)

  Logger.log('Test 2: undefined input');
  const result2 = parseVietnameseNumber(undefined);
  Logger.log(`parseVietnameseNumber(undefined) = ${result2}`);
  // Expected: null (not 0)

  Logger.log('Test 3: empty string');
  const result3 = parseVietnameseNumber('');
  Logger.log(`parseVietnameseNumber('') = ${result3}`);
  // Expected: null (not 0)
}
```

### Test Case 2: Valid Numbers Still Work
```javascript
function testValidNumbers() {
  Logger.log('Test Vietnamese comma:');
  Logger.log(parseVietnameseNumber('1,9'));  // Expected: 1.9

  Logger.log('Test normal decimal:');
  Logger.log(parseVietnameseNumber('2.5'));  // Expected: 2.5

  Logger.log('Test integer:');
  Logger.log(parseVietnameseNumber('15'));   // Expected: 15

  Logger.log('Test number type:');
  Logger.log(parseVietnameseNumber(42));     // Expected: 42

  Logger.log('Test zero:');
  Logger.log(parseVietnameseNumber('0'));    // Expected: 0
  Logger.log(parseVietnameseNumber(0));      // Expected: 0
}
```

### Test Case 3: Invalid Strings Return Null
```javascript
function testInvalidStrings() {
  Logger.log('Test invalid string:');
  Logger.log(parseVietnameseNumber('abc'));    // Expected: null

  Logger.log('Test spaces only:');
  Logger.log(parseVietnameseNumber('   '));    // Expected: null

  Logger.log('Test special chars:');
  Logger.log(parseVietnameseNumber('!@#'));    // Expected: null
}
```

### Test Case 4: Validation Catches Null Quantity
```javascript
function testNullQuantityValidation() {
  const record = {
    id: 'TEST-001',
    transactionDate: '2026-01-06',
    quantity: null,  // ← Null instead of 0
    licensePlate: '29A-12345'
  };

  try {
    validateFuelTransactionData(record);
    Logger.log('❌ Test FAILED: Should have caught null quantity');
  } catch (error) {
    Logger.log('✓ Test PASSED:', error.message);
    // Expected: "Missing required field: quantity"
  }
}
```

### Expected Behavior After Patch:

| Input | Before Patch | After Patch | Notes |
|-------|--------------|-------------|-------|
| `null` | `0` | `null` | ✅ Validation will catch |
| `undefined` | `0` | `null` | ✅ Validation will catch |
| `''` (empty) | `0` | `null` | ✅ Validation will catch |
| `'0'` | `0` | `0` | ✅ Valid zero preserved |
| `0` | `0` | `0` | ✅ Valid zero preserved |
| `'1,9'` | `1.9` | `1.9` | ✅ Vietnamese format works |
| `'abc'` | `0` | `null` | ✅ Invalid string → null |

---

## 🔗 Related Patches
- PATCH HIGH #2: Add validation after data transformation (works together!)
- PATCH MEDIUM #5: Round ODO numbers to integers

---

## ⚠️ BREAKING CHANGES

This patch may cause some existing code to break if it assumes numbers are always returned. Check these areas:

### Area 1: Trip Cost Calculation
**File**: `backend-gas/Code.gs`
**Function**: `calculateTripCost()`

**Check this code:**
```javascript
const donGia = parseNumber(mappedRow.donGia);
const taiTrong = parseNumber(mappedRow.taiTrongTinhPhi || mappedRow.taiTrong);
const soChieu = parseNumber(mappedRow.soChieu || 1);

if (donGia > 0 && taiTrong > 0) {  // ← This still works
  mappedRow.thanhTien = donGia * taiTrong * soChieu;
}
```

✅ **Safe**: Null values won't match `> 0` condition.

### Area 2: Fuel Import Transformation
**File**: `backend-gas/Code.gs`
**Function**: `transformFuelImportRow()`

**Check for:**
```javascript
if (['quantity', 'unitPrice', 'totalAmount', 'avgPrice'].includes(jsonKey)) {
  value = parseVietnameseNumber(value);
}
```

✅ **Safe**: Backend handles null values properly in database.

---

## 📅 Metadata
- **Created**: 2026-01-06
- **Priority**: P2 (Medium)
- **Estimated Time**: 10 minutes
- **Risk Level**: Medium (may break assumptions in other code)
- **Breaking Change**: Yes (returns null instead of 0)
- **Testing Required**: Yes (run all test cases)
- **Rollback**: Can revert to old code if issues found
