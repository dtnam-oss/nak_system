# PATCH HIGH #2: Add Validation After Data Transformation

## 🟠 SEVERITY: HIGH

## 📍 Location
File: `backend-gas/Code.gs`
Function: `transformFuelExportRow()` (Lines 1632-1668)
Caller: `getFuelTransactionData()` (Line 2038)

## 🐛 Bug Description
After transforming row data from Google Sheet to JSON, there is NO validation that critical fields exist or are valid. This allows invalid data to be sent to the backend API:

- Missing `id` → Backend INSERT fails
- Missing `transactionDate` → Backend constraint violation
- Zero or negative `quantity` → Invalid fuel transaction
- Empty `licensePlate` → Cannot track which vehicle used fuel

## 💥 Impact
- **API Errors**: Backend rejects invalid payloads
- **Data Quality**: Garbage data passes through
- **User Confusion**: Sync appears to succeed but no data is created
- **Debugging Difficulty**: Error messages are unclear

## ✅ Solution
Add comprehensive validation immediately after transformation. Throw descriptive errors for invalid data.

---

## 📝 PATCH CODE

### Location 1: Add Validation Helper Function
**Insert AFTER Line 1668** (after `transformFuelExportRow()` function):

```javascript
/**
 * Validate fuel transaction data before sending to backend
 * Throws descriptive error if validation fails
 *
 * @param {Object} record - Transformed fuel transaction record
 * @throws {Error} If validation fails
 */
function validateFuelTransactionData(record) {
  const errors = [];

  // 1. Required field: id
  if (!record.id || String(record.id).trim() === '') {
    errors.push('Missing required field: id');
  }

  // 2. Required field: transactionDate
  if (!record.transactionDate || String(record.transactionDate).trim() === '') {
    errors.push('Missing required field: transactionDate');
  }

  // 3. Required field: quantity (must be > 0)
  if (record.quantity === null || record.quantity === undefined) {
    errors.push('Missing required field: quantity');
  } else if (typeof record.quantity !== 'number' || isNaN(record.quantity)) {
    errors.push(`Invalid quantity: "${record.quantity}" is not a number`);
  } else if (record.quantity <= 0) {
    errors.push(`Invalid quantity: ${record.quantity} (must be greater than 0)`);
  }

  // 4. Required field: licensePlate (for tracking)
  if (!record.licensePlate || String(record.licensePlate).trim() === '') {
    errors.push('Missing required field: licensePlate (cannot track fuel usage without vehicle info)');
  }

  // 5. Optional but important: odoNumber validation
  if (record.odoNumber !== null && record.odoNumber !== undefined) {
    if (typeof record.odoNumber !== 'number' || isNaN(record.odoNumber)) {
      errors.push(`Invalid odoNumber: "${record.odoNumber}" is not a number`);
    } else if (record.odoNumber < 0) {
      errors.push(`Invalid odoNumber: ${record.odoNumber} (cannot be negative)`);
    }
  }

  // 6. Date format validation (should be YYYY-MM-DD)
  if (record.transactionDate) {
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(record.transactionDate)) {
      errors.push(`Invalid transactionDate format: "${record.transactionDate}" (expected YYYY-MM-DD)`);
    }
  }

  // 7. If there are errors, throw with all messages
  if (errors.length > 0) {
    throw new Error(`Fuel transaction validation failed:\n  - ${errors.join('\n  - ')}`);
  }

  logInfo('✓ Fuel transaction data validation passed');
}
```

---

### Location 2: Call Validation in getFuelTransactionData()
**File**: `backend-gas/Code.gs`
**Line**: ~2038 (in `getFuelTransactionData()` function)

**FIND THIS CODE:**
```javascript
if (rowId === String(transId).trim()) {
  // Found the row - transform and return
  return transformFuelExportRow(row, headers, columnMap);
}
```

**REPLACE WITH:**
```javascript
if (rowId === String(transId).trim()) {
  // Found the row - transform and validate before returning
  const transformedData = transformFuelExportRow(row, headers, columnMap);

  // ✅ CRITICAL: Validate data before sending to backend
  validateFuelTransactionData(transformedData);

  return transformedData;
}
```

---

### Location 3: Call Validation in Batch Import (Optional but Recommended)
**File**: `backend-gas/Code.gs`
**Function**: `syncFuelTransactions()` or similar batch import function
**Line**: Where `transformFuelExportRow()` is called

**FIND THIS PATTERN:**
```javascript
const transaction = transformFuelExportRow(row, headers, columnMap);
transactions.push(transaction);
```

**REPLACE WITH:**
```javascript
try {
  const transaction = transformFuelExportRow(row, headers, columnMap);

  // ✅ Validate before adding to batch
  validateFuelTransactionData(transaction);

  transactions.push(transaction);
} catch (validationError) {
  logWarning(`Row ${i + 1} skipped: ${validationError.message}`);
  // Continue with next row instead of failing entire batch
  continue;
}
```

---

## 🔧 APPLY PATCH

### Step 1: Open Google Apps Script Editor
1. Go to: https://script.google.com/
2. Open your NAK Logistics project
3. Find `Code.gs`

### Step 2: Add Validation Function
1. Scroll to line 1668 (end of `transformFuelExportRow()` function)
2. Press Enter to create new line
3. Paste the `validateFuelTransactionData()` function

### Step 3: Add Validation Call in getFuelTransactionData()
1. Search for: `return transformFuelExportRow(row, headers, columnMap);`
2. Replace with the updated code (with validation call)

### Step 4: Save
- Press `Ctrl + S` (Windows) or `Cmd + S` (Mac)

---

## ✅ Validation After Patch

### Test Case 1: Missing ID
```javascript
function testMissingID() {
  // Create mock row with missing ID
  const headers = ['Id', 'ngay_tao', 'so_luong', 'bien_so_xe'];
  const columnMap = { id: 0, transactionDate: 1, quantity: 2, licensePlate: 3 };
  const row = ['', '2026-01-06', 50, '29A-12345']; // Empty ID

  try {
    const result = transformFuelExportRow(row, headers, columnMap);
    validateFuelTransactionData(result);
    Logger.log('❌ Test FAILED: Should have thrown error');
  } catch (error) {
    Logger.log('✓ Test PASSED:', error.message);
    // Expected: "Fuel transaction validation failed: Missing required field: id"
  }
}
```

### Test Case 2: Zero Quantity
```javascript
function testZeroQuantity() {
  const headers = ['Id', 'ngay_tao', 'so_luong', 'bien_so_xe'];
  const columnMap = { id: 0, transactionDate: 1, quantity: 2, licensePlate: 3 };
  const row = ['TEST-001', '2026-01-06', 0, '29A-12345']; // Zero quantity

  try {
    const result = transformFuelExportRow(row, headers, columnMap);
    validateFuelTransactionData(result);
    Logger.log('❌ Test FAILED: Should have thrown error');
  } catch (error) {
    Logger.log('✓ Test PASSED:', error.message);
    // Expected: "Invalid quantity: 0 (must be greater than 0)"
  }
}
```

### Test Case 3: Valid Data
```javascript
function testValidData() {
  const headers = ['Id', 'ngay_tao', 'so_luong', 'bien_so_xe'];
  const columnMap = { id: 0, transactionDate: 1, quantity: 2, licensePlate: 3 };
  const row = ['TEST-001', '2026-01-06', 50, '29A-12345'];

  try {
    const result = transformFuelExportRow(row, headers, columnMap);
    validateFuelTransactionData(result);
    Logger.log('✓ Test PASSED: Valid data accepted');
  } catch (error) {
    Logger.log('❌ Test FAILED:', error.message);
  }
}
```

### Expected Behavior After Patch:
- ✅ Invalid data is caught BEFORE sending to backend
- ✅ Clear error messages help users fix data in AppSheet
- ✅ Backend receives only valid, clean data
- ✅ Reduces API errors and failed syncs

---

## 🔗 Related Patches
- PATCH CRITICAL #1: Fix API failure returns 0 avg_price
- PATCH MEDIUM #4: Convert null to null instead of 0
- PATCH MEDIUM #5: Round ODO numbers to integers

---

## 📅 Metadata
- **Created**: 2026-01-06
- **Priority**: P1 (High)
- **Estimated Time**: 10 minutes
- **Risk Level**: Low (only adds validation, doesn't change logic)
- **Rollback**: Can remove validation function if needed
