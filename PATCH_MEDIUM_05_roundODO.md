# PATCH MEDIUM #5: Round ODO Numbers to Integers

## 🟡 SEVERITY: MEDIUM

## 📍 Location
File: `backend-gas/Code.gs`
- Function: `transformFuelExportRow()` (Lines 1654-1655)
- Database: `fuel_transactions.odo_number` (DECIMAL(10,2))

## 🐛 Bug Description
The `odoNumber` (odometer reading) field is parsed as a float, allowing decimal values like `10000.50 km`. This is problematic because:

1. **Odometer readings are integers** - Vehicles measure kilometers as whole numbers (10000 km, not 10000.50 km)
2. **Efficiency calculation breaks** - Auto-calculation uses `km_traveled = current_odo - previous_odo`, which can result in fractional kilometers
3. **Data entry errors** - Users might accidentally enter comma decimals (e.g., "10,000" meaning ten thousand, but parsed as 10.0)

### Example Problem:
```javascript
// User enters ODO readings
Transaction 1: odoNumber = 10000.30 km
Transaction 2: odoNumber = 10500.80 km

// Backend calculates km_traveled
kmTraveled = 10500.80 - 10000.30 = 500.50 km  // ❌ Fractional km!

// Efficiency calculation
efficiency = (total_fuel / 500.50) * 100  // ❌ Wrong divisor
```

### Vietnamese Number Format Confusion:
```javascript
// User types "10,000" (meaning 10 thousand)
parseVietnameseNumber("10,000")
  → "10.000" (after comma→dot replacement)
  → 10.0  // ❌ WRONG! Should be 10000

// User types "10.500" (meaning 10 thousand 500)
parseVietnameseNumber("10.500")
  → 10.5  // ❌ WRONG! Should be 10500
```

## 💥 Impact
- **Efficiency Calculations Wrong**: Fractional kilometers distort fuel efficiency
- **Data Quality Issues**: Invalid ODO readings stored
- **User Confusion**: Large numbers misinterpreted (10,000 vs 10.0)
- **Reporting Errors**: km_traveled statistics are incorrect

## ✅ Solution
1. Round `odoNumber` to nearest integer
2. Add special handling for large numbers with thousand separators
3. Validate that ODO increases monotonically (optional future enhancement)

---

## 📝 PATCH CODE

### Location 1: Add Smart ODO Parser Function

**Insert AFTER parseVietnameseNumber() function** (~Line 1383):

```javascript
/**
 * Parse ODO (odometer) number with special handling for large numbers
 * ODO readings should always be integers (whole kilometers)
 *
 * Handles Vietnamese number formats:
 * - "10.000" (ten thousand) → 10000
 * - "10,000" (ten thousand) → 10000
 * - "10000.5" (typo) → 10001 (rounded)
 *
 * @param {*} value - ODO reading value
 * @returns {number|null} Integer ODO value, or null if invalid
 */
function parseODONumber(value) {
  // Return null for empty values
  if (value === null || value === undefined || value === '') {
    return null;
  }

  // If already a number, round it
  if (typeof value === 'number') {
    return isNaN(value) ? null : Math.round(value);
  }

  // Parse string
  if (typeof value === 'string') {
    const trimmed = value.trim();

    // Empty string after trim
    if (trimmed === '') {
      return null;
    }

    // Detect large numbers with separators
    // Pattern: digits with dots or commas as thousand separators
    // Examples: "10.000", "10,000", "1.234.567"

    // Count dots and commas
    const dotCount = (trimmed.match(/\./g) || []).length;
    const commaCount = (trimmed.match(/,/g) || []).length;

    let normalized = trimmed;

    // Case 1: Multiple dots (e.g., "1.234.567") → Thousand separator
    if (dotCount > 1) {
      normalized = trimmed.replace(/\./g, ''); // Remove all dots
    }
    // Case 2: Multiple commas (e.g., "1,234,567") → Thousand separator
    else if (commaCount > 1) {
      normalized = trimmed.replace(/,/g, ''); // Remove all commas
    }
    // Case 3: Single dot in middle (e.g., "10.000") → Check if thousand separator
    else if (dotCount === 1) {
      const parts = trimmed.split('.');
      // If last part is exactly 3 digits, likely a thousand separator
      if (parts.length === 2 && parts[1].length === 3) {
        normalized = trimmed.replace('.', ''); // Remove dot
      } else {
        // Likely a decimal (e.g., "10000.5")
        normalized = trimmed; // Keep as-is, will be rounded later
      }
    }
    // Case 4: Single comma in middle (e.g., "10,000") → Check if thousand separator
    else if (commaCount === 1) {
      const parts = trimmed.split(',');
      // If last part is exactly 3 digits, likely a thousand separator
      if (parts.length === 2 && parts[1].length === 3) {
        normalized = trimmed.replace(',', ''); // Remove comma
      } else {
        // Likely a decimal (e.g., "10000,5" Vietnamese style)
        normalized = trimmed.replace(',', '.'); // Replace comma with dot
      }
    }

    // Parse the normalized string
    const parsed = parseFloat(normalized);

    if (isNaN(parsed)) {
      return null;
    }

    // Round to nearest integer (ODO is always whole km)
    return Math.round(parsed);
  }

  // Unknown type
  return null;
}
```

---

### Location 2: Update transformFuelExportRow() to Use parseODONumber()

**File**: `backend-gas/Code.gs`
**Lines**: ~1654-1655

**FIND THIS CODE:**
```javascript
// Convert number fields (quantity, unitPrice, totalAmount, odoNumber)
if (['quantity', 'unitPrice', 'totalAmount', 'odoNumber'].includes(jsonKey)) {
  value = parseVietnameseNumber(value);
}
```

**REPLACE WITH:**
```javascript
// Convert number fields
if (['quantity', 'unitPrice', 'totalAmount'].includes(jsonKey)) {
  value = parseVietnameseNumber(value);
}

// ✅ Special handling for ODO: always integer
if (jsonKey === 'odoNumber') {
  value = parseODONumber(value);
}
```

---

### Location 3: Add ODO Validation (Optional but Recommended)

In `validateFuelTransactionData()` (from PATCH HIGH #2), update the ODO validation:

**FIND:**
```javascript
// 5. Optional but important: odoNumber validation
if (record.odoNumber !== null && record.odoNumber !== undefined) {
  if (typeof record.odoNumber !== 'number' || isNaN(record.odoNumber)) {
    errors.push(`Invalid odoNumber: "${record.odoNumber}" is not a number`);
  } else if (record.odoNumber < 0) {
    errors.push(`Invalid odoNumber: ${record.odoNumber} (cannot be negative)`);
  }
}
```

**REPLACE WITH:**
```javascript
// 5. Optional but important: odoNumber validation
if (record.odoNumber !== null && record.odoNumber !== undefined) {
  if (typeof record.odoNumber !== 'number' || isNaN(record.odoNumber)) {
    errors.push(`Invalid odoNumber: "${record.odoNumber}" is not a number`);
  } else if (record.odoNumber < 0) {
    errors.push(`Invalid odoNumber: ${record.odoNumber} (cannot be negative)`);
  } else if (!Number.isInteger(record.odoNumber)) {
    // ✅ After parseODONumber(), this should never trigger
    // But good defensive check
    errors.push(`Invalid odoNumber: ${record.odoNumber} (must be integer kilometers)`);
  } else if (record.odoNumber > 9999999) {
    // Max realistic ODO: 9,999,999 km (validate against overflow)
    errors.push(`Invalid odoNumber: ${record.odoNumber} (unrealistically high - check for data entry error)`);
  }
}
```

---

## 🔧 APPLY PATCH

### Step 1: Open Google Apps Script Editor
1. Go to: https://script.google.com/
2. Open your NAK Logistics project
3. Find `Code.gs`

### Step 2: Add parseODONumber() Function
1. Scroll to line 1383 (after `parseVietnameseNumber()`)
2. Press Enter to create new lines
3. Paste the `parseODONumber()` function

### Step 3: Update transformFuelExportRow()
1. Search for: `if (['quantity', 'unitPrice', 'totalAmount', 'odoNumber'].includes(jsonKey))`
2. Replace with the updated code (separate handling for ODO)

### Step 4: Update Validation (If PATCH HIGH #2 Applied)
1. In `validateFuelTransactionData()`, find ODO validation section
2. Replace with enhanced validation

### Step 5: Save
- Press `Ctrl + S` (Windows) or `Cmd + S` (Mac)

---

## ✅ Validation After Patch

### Test Case 1: Large Numbers with Thousand Separators
```javascript
function testODOParsing() {
  Logger.log('=== ODO Number Parsing Tests ===');

  // Vietnamese dot separator (10 thousand)
  Logger.log('Test "10.000":', parseODONumber('10.000'));
  // Expected: 10000

  // US comma separator (10 thousand)
  Logger.log('Test "10,000":', parseODONumber('10,000'));
  // Expected: 10000

  // Large number with multiple separators
  Logger.log('Test "1.234.567":', parseODONumber('1.234.567'));
  // Expected: 1234567

  Logger.log('Test "1,234,567":', parseODONumber('1,234,567'));
  // Expected: 1234567

  // Decimal that should be rounded
  Logger.log('Test "10000.5":', parseODONumber('10000.5'));
  // Expected: 10001

  Logger.log('Test "10000.3":', parseODONumber('10000.3'));
  // Expected: 10000

  // Vietnamese decimal (comma as decimal separator)
  Logger.log('Test "10000,5":', parseODONumber('10000,5'));
  // Expected: 10001

  // Already a number
  Logger.log('Test 15000:', parseODONumber(15000));
  // Expected: 15000

  Logger.log('Test 15000.7:', parseODONumber(15000.7));
  // Expected: 15001

  // Null/empty
  Logger.log('Test null:', parseODONumber(null));
  // Expected: null

  Logger.log('Test "":', parseODONumber(''));
  // Expected: null

  // Invalid
  Logger.log('Test "abc":', parseODONumber('abc'));
  // Expected: null
}
```

### Test Case 2: Integration Test with Full Transformation
```javascript
function testFullODOTransformation() {
  const headers = ['Id', 'ngay_tao', 'so_luong', 'bien_so_xe', 'so_odo'];
  const columnMap = {
    id: 0,
    transactionDate: 1,
    quantity: 2,
    licensePlate: 3,
    odoNumber: 4
  };

  // Test case: Vietnamese number format "10.500" (10 thousand 500)
  const row1 = ['TEST-001', '2026-01-06', 50, '29A-12345', '10.500'];
  const result1 = transformFuelExportRow(row1, headers, columnMap);

  Logger.log('Input ODO: "10.500"');
  Logger.log('Parsed ODO:', result1.odoNumber);
  Logger.log('Type:', typeof result1.odoNumber);
  Logger.log('Is Integer:', Number.isInteger(result1.odoNumber));
  // Expected: 10500, type: number, isInteger: true

  // Test case: Decimal value (should be rounded)
  const row2 = ['TEST-002', '2026-01-06', 50, '29A-12345', '15000.8'];
  const result2 = transformFuelExportRow(row2, headers, columnMap);

  Logger.log('Input ODO: "15000.8"');
  Logger.log('Parsed ODO:', result2.odoNumber);
  // Expected: 15001
}
```

### Test Case 3: Efficiency Calculation (Backend)
After applying patch, test auto-calculation logic:

```sql
-- Insert two transactions with integer ODO
INSERT INTO fuel_transactions (id, transaction_date, license_plate, odo_number, quantity, category)
VALUES
  ('TEST-ODO-1', '2026-01-01', '29A-12345', 10000, 50, 'Chốt tháng'),
  ('TEST-ODO-2', '2026-01-15', '29A-12345', 10500, 75, 'Chốt tháng');

-- Check km_traveled calculation
SELECT
  id,
  odo_number,
  km_traveled,
  total_fuel_period,
  efficiency
FROM fuel_transactions
WHERE id LIKE 'TEST-ODO-%'
ORDER BY transaction_date;

-- Expected:
-- TEST-ODO-1: km_traveled = null (first record)
-- TEST-ODO-2: km_traveled = 500 (integer!)
--             total_fuel_period = 75
--             efficiency = (75 / 500) * 100 = 15.0
```

### Expected Behavior Comparison:

| Input | Before Patch | After Patch | Notes |
|-------|--------------|-------------|-------|
| `"10.000"` | `10.0` | `10000` | ✅ Thousand separator handled |
| `"10,000"` | `10.0` | `10000` | ✅ US format works |
| `"1.234.567"` | `1.234567` | `1234567` | ✅ Multiple separators |
| `"10000.5"` | `10000.5` | `10001` | ✅ Rounded to integer |
| `"10000,8"` | `10000.8` | `10001` | ✅ Vietnamese decimal rounded |
| `15000` | `15000` | `15000` | ✅ Integer preserved |
| `15000.3` | `15000.3` | `15000` | ✅ Rounded down |
| `null` | `null` | `null` | ✅ Null preserved |
| `"abc"` | `null` | `null` | ✅ Invalid → null |

---

## 🔗 Related Patches
- PATCH MEDIUM #4: Convert null to null instead of 0 (works together)
- PATCH HIGH #2: Add validation after data transformation

---

## ⚠️ Edge Cases to Consider

### Edge Case 1: Very Large ODO Numbers
Some vehicles might have ODO > 1,000,000 km (rare but possible):
```javascript
parseODONumber("1.234.567")  // → 1234567 ✅
```

### Edge Case 2: User Types "0" (Reset ODO)
```javascript
parseODONumber("0")  // → 0 ✅
parseODONumber(0)    // → 0 ✅
```

### Edge Case 3: Ambiguous Format
```javascript
// Is "10,5" → 10.5 (decimal) or 105 (typo)?
parseODONumber("10,5")  // → 11 (treats as decimal, rounds)

// If user meant 105, they should type "105" without separator
```

**Recommendation**: Add user guidance in AppSheet:
- "Enter ODO as whole number (e.g., 10500, not 10.500)"
- Or use number input with integer validation

---

## 📅 Metadata
- **Created**: 2026-01-06
- **Priority**: P2 (Medium)
- **Estimated Time**: 15 minutes
- **Risk Level**: Low (only affects ODO field)
- **Breaking Change**: Minor (fractional ODO values will be rounded)
- **Testing Required**: Yes (test with various number formats)
- **User Impact**: Positive (more accurate efficiency calculations)
