# PATCH CRITICAL #1: Fix API Failure Returns 0 avg_price

## 🔴 SEVERITY: CRITICAL

## 📍 Location
File: `backend-gas/Code.gs`
Lines: 1690-1739

## 🐛 Bug Description
When `fetchLatestFuelState()` API call fails (timeout, network error, 500 response), the function returns default values `{ currentInventory: 0, currentAvgPrice: 0 }`. This causes COGS calculation to silently use 0 price:

```javascript
COGS = quantity × 0 = 0 VND  // ❌ WRONG!
```

The transaction is stored with `totalAmount = 0` with NO error notification to user.

## 💥 Impact
- **Data Corruption**: Fuel transactions stored with zero cost
- **Financial Loss**: Unable to calculate actual fuel expenses
- **Silent Failure**: Users think sync succeeded but data is incorrect
- **Inventory Chaos**: FIFO calculations become invalid

## ✅ Solution
Throw error instead of returning default values when API fails.

---

## 📝 PATCH CODE

### OLD CODE (Lines 1711-1717):
```javascript
if (statusCode !== 200) {
  logWarning(`Failed to fetch fuel state. Status: ${statusCode}. Response: ${responseBody}`);
  // Return default values if API fails
  return {
    currentInventory: 0,
    currentAvgPrice: 0
  };
}
```

### NEW CODE:
```javascript
if (statusCode !== 200) {
  const errorMsg = `Failed to fetch fuel state from backend. Status: ${statusCode}. Response: ${responseBody}`;
  logError(errorMsg);
  // ❌ DO NOT proceed with zero values - this causes COGS calculation to be wrong
  throw new Error(`Cannot calculate COGS: ${errorMsg}`);
}
```

---

### OLD CODE (Lines 1733-1739):
```javascript
} catch (error) {
  logError(`Error fetching fuel state: ${error.message}`);
  // Return default values on error
  return {
    currentInventory: 0,
    currentAvgPrice: 0
  };
}
```

### NEW CODE:
```javascript
} catch (error) {
  logError(`Error fetching fuel state: ${error.message}`);
  // ❌ DO NOT return default values - propagate error to caller
  throw new Error(`Cannot fetch fuel state from backend: ${error.message}`);
}
```

---

## 🔧 APPLY PATCH

### Step 1: Open Google Apps Script Editor
1. Go to: https://script.google.com/
2. Open your NAK Logistics project
3. Find `Code.gs`

### Step 2: Locate Line 1711
Search for:
```javascript
if (statusCode !== 200) {
```

### Step 3: Replace Block (Lines 1711-1717)
Replace the entire block with the NEW CODE above.

### Step 4: Locate Line 1733
Search for:
```javascript
} catch (error) {
  logError(`Error fetching fuel state: ${error.message}`);
```

### Step 5: Replace Block (Lines 1733-1739)
Replace the entire block with the NEW CODE above.

### Step 6: Save
- Press `Ctrl + S` (Windows) or `Cmd + S` (Mac)
- Deployment will auto-update

---

## ✅ Validation After Patch

### Test Case 1: Simulate API Failure
```javascript
// Add temporary test function to Code.gs
function testAPIFailureHandling() {
  try {
    // This will fail because we're using invalid endpoint
    const config = getConfig();
    const originalEndpoint = config.API.ENDPOINT;
    config.API.ENDPOINT = 'https://invalid-url-12345.com/api';

    const result = syncFuelTransactionToBackend('TEST-001', 'Add');
    Logger.log('Result:', result);
  } catch (error) {
    Logger.log('✓ Error correctly thrown:', error.message);
    // Expected: "Cannot fetch fuel state from backend: ..."
  }
}
```

### Expected Behavior After Patch:
- ✅ Error is thrown with descriptive message
- ✅ Transaction is NOT created with zero COGS
- ✅ User sees error in AppSheet
- ✅ No silent data corruption

### Expected Behavior Before Patch (BAD):
- ❌ Function returns success
- ❌ Transaction created with `totalAmount = 0`
- ❌ No error shown to user
- ❌ Data corrupted silently

---

## 🔗 Related Patches
- PATCH HIGH #2: Add validation after data transformation
- PATCH HIGH #3: Remove stale avg_price fallback in backend

---

## 📅 Metadata
- **Created**: 2026-01-06
- **Priority**: P0 (Critical)
- **Estimated Time**: 5 minutes
- **Risk Level**: Low (only improves error handling)
- **Rollback**: Can revert to old code if needed
