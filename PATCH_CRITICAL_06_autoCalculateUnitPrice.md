# PATCH CRITICAL #6: Auto-Calculate Unit Price Using WAC

## 🔴 SEVERITY: CRITICAL

## 📍 Location
File: `/app/api/webhook/appsheet/route.ts`
Lines: 507-675 (FuelTransaction_Upsert action)

## 🐛 Bug Description
Currently, when a fuel transaction is created/updated, the `unit_price` and `total_amount` are accepted directly from AppSheet without validation or recalculation:

```typescript
// Lines 554-555
unit_price: ${transData.unitPrice || 0},      // ❌ Trusts AppSheet value
total_amount: ${transData.totalAmount || 0},  // ❌ Trusts AppSheet value
```

**Problem**: This causes COGS (Cost of Goods Sold) to be incorrect because:
1. AppSheet might send outdated price (before new import changes WAC)
2. User could manually edit price in AppSheet
3. Price doesn't reflect actual weighted average cost at time of transaction
4. Financial reports show wrong fuel expenses

### Example of Wrong COGS:

```
Timeline:
Day 1: Import 1000L @ 18,000đ/L
  → WAC = 18,000đ/L

Day 2: User creates export transaction in AppSheet
  → AppSheet sends: quantity=100L, unit_price=18,000đ
  → Backend stores: unit_price=18,000, total_amount=1,800,000

Day 3: Import 500L @ 24,000đ/L
  → WAC = (18M + 12M) / 1500 = 20,000đ/L

Day 4: User creates another export in AppSheet
  → AppSheet sends: quantity=100L, unit_price=18,000 (STALE!)
  → Backend stores: unit_price=18,000, total_amount=1,800,000

  CORRECT COGS should be: 100L × 20,000 = 2,000,000đ
  ACTUAL COGS recorded: 100L × 18,000 = 1,800,000đ
  ERROR: -200,000đ per transaction (-10% undervaluation)
```

## 💥 Impact
- **Financial Reports Invalid**: P&L shows wrong fuel expenses
- **Inventory Valuation Wrong**: Stock value calculated incorrectly
- **COGS Mismatch**: Actual cost ≠ recorded cost
- **Audit Issues**: Cannot trace correct fuel costs
- **Tax Implications**: Wrong expense deductions

## ✅ Solution
Auto-calculate `unit_price` and `total_amount` using current WAC from FIFO endpoint before inserting into database.

---

## 📝 PATCH CODE

### Step 1: Add Helper Function to Fetch Current WAC

**Location**: Insert BEFORE the `FuelTransaction_Upsert` handler (around line 506)

```typescript
/**
 * Fetch current Weighted Average Cost (WAC) from FIFO inventory
 * Returns the current average price per liter
 *
 * @returns {Promise<number>} Current WAC in VND per liter
 * @throws {Error} If unable to fetch WAC
 */
async function getCurrentWAC(): Promise<number> {
  try {
    console.log('🔍 Fetching current WAC from FIFO endpoint...');

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const fifoResponse = await fetch(`${baseUrl}/api/fuel/inventory/fifo`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Add timeout to prevent hanging
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    if (!fifoResponse.ok) {
      const errorText = await fifoResponse.text();
      throw new Error(`FIFO endpoint failed: ${fifoResponse.status} - ${errorText}`);
    }

    const fifoData = await fifoResponse.json();

    if (!fifoData.success || !fifoData.data?.summary?.current_avg_price) {
      throw new Error('FIFO response missing current_avg_price');
    }

    const currentWAC = parseFloat(fifoData.data.summary.current_avg_price);

    if (isNaN(currentWAC) || currentWAC <= 0) {
      throw new Error(`Invalid WAC value: ${currentWAC}`);
    }

    console.log(`✓ Current WAC: ${currentWAC.toLocaleString('vi-VN')} VND/L`);
    return currentWAC;

  } catch (error: any) {
    console.error('❌ Failed to fetch current WAC:', error.message);

    // ❌ DO NOT return default value - throw error to prevent wrong COGS
    throw new Error(`Cannot calculate COGS: Unable to fetch current WAC. ${error.message}`);
  }
}
```

---

### Step 2: Update FuelTransaction_Upsert Handler

**Location**: Lines 507-675

**FIND THIS CODE (around lines 517-527):**
```typescript
const transData = payload.data as FuelTransactionPayload;

try {
  // Step 1: Map category to is_full_tank flag
  const categoryUpper = (transData.category || '').trim();
  const isFullTank = ['CHỐT THÁNG', 'BÀN GIAO', 'KHỞI TẠO'].includes(categoryUpper.toUpperCase());
  const isInitialization = categoryUpper.toUpperCase() === 'KHỞI TẠO';

  console.log(`📊 Category: "${categoryUpper}" → is_full_tank: ${isFullTank}, is_init: ${isInitialization}`);
```

**INSERT AFTER (new Step 1.5):**
```typescript
  console.log(`📊 Category: "${categoryUpper}" → is_full_tank: ${isFullTank}, is_init: ${isInitialization}`);

  // Step 1.5: Auto-calculate unit_price and total_amount using WAC
  let calculatedUnitPrice = transData.unitPrice || 0;
  let calculatedTotalAmount = transData.totalAmount || 0;

  // Only auto-calculate for "Trụ nội bộ" (internal fuel source)
  const fuelSourceLower = (transData.fuelSource || '').trim().toLowerCase();
  const isInternalSource = fuelSourceLower === 'trụ nội bộ';

  if (isInternalSource) {
    console.log('🔄 Auto-calculating COGS using current WAC...');

    try {
      // Fetch current Weighted Average Cost
      const currentWAC = await getCurrentWAC();
      const quantity = parseFloat(String(transData.quantity || 0));

      // Calculate COGS
      calculatedUnitPrice = currentWAC;
      calculatedTotalAmount = quantity * currentWAC;

      console.log(`💰 COGS Calculation:`);
      console.log(`   Quantity: ${quantity}L`);
      console.log(`   WAC: ${currentWAC.toLocaleString('vi-VN')} VND/L`);
      console.log(`   Total: ${calculatedTotalAmount.toLocaleString('vi-VN')} VND`);

      // Log if AppSheet value differs from WAC
      if (transData.unitPrice && Math.abs(transData.unitPrice - currentWAC) > 100) {
        const variance = transData.unitPrice - currentWAC;
        console.log(`⚠️  Unit price variance detected:`);
        console.log(`   AppSheet sent: ${transData.unitPrice.toLocaleString('vi-VN')} VND/L`);
        console.log(`   Current WAC: ${currentWAC.toLocaleString('vi-VN')} VND/L`);
        console.log(`   Difference: ${variance.toLocaleString('vi-VN')} VND/L (${((variance/currentWAC)*100).toFixed(2)}%)`);
        console.log(`   ✅ Using WAC value for accuracy`);
      }

    } catch (wacError: any) {
      console.error('❌ WAC calculation failed:', wacError.message);

      // ❌ CRITICAL: Do not proceed with wrong COGS
      return NextResponse.json({
        error: 'COGS calculation failed',
        message: `Cannot calculate accurate fuel cost: ${wacError.message}`,
        details: 'Please ensure FIFO inventory endpoint is operational'
      }, { status: 503 });
    }
  } else {
    // External fuel source (e.g., "Nhà xe khác") - use AppSheet value
    console.log(`ℹ️  External fuel source ("${transData.fuelSource}") - using AppSheet unit_price`);
  }
```

---

**FIND THIS CODE (around lines 554-555):**
```typescript
${transData.quantity || 0},
${transData.unitPrice || 0},
${transData.totalAmount || 0},
${transData.odoNumber || 0},
```

**REPLACE WITH:**
```typescript
${transData.quantity || 0},
${calculatedUnitPrice},        // ✅ Use calculated WAC
${calculatedTotalAmount},      // ✅ Use calculated COGS
${transData.odoNumber || 0},
```

---

**FIND THIS CODE (around lines 570-571):**
```typescript
quantity = EXCLUDED.quantity,
unit_price = EXCLUDED.unit_price,
total_amount = EXCLUDED.total_amount,
odo_number = EXCLUDED.odo_number,
```

**REPLACE WITH:**
```typescript
quantity = EXCLUDED.quantity,
unit_price = EXCLUDED.unit_price,      -- ✅ Will update with new WAC on edit
total_amount = EXCLUDED.total_amount,  -- ✅ Will recalculate COGS
odo_number = EXCLUDED.odo_number,
```

---

## 🔧 APPLY PATCH

### Prerequisites:
1. ✅ **Verify FIFO endpoint works**:
   ```bash
   curl http://localhost:3000/api/fuel/inventory/fifo
   ```

   Expected response:
   ```json
   {
     "success": true,
     "data": {
       "summary": {
         "current_avg_price": 20500.50
       }
     }
   }
   ```

2. ✅ **Apply PATCH HIGH #3 first** (Remove stale fallback) to ensure FIFO is reliable

---

### Step 1: Open File
Navigate to:
```
/app/api/webhook/appsheet/route.ts
```

### Step 2: Add getCurrentWAC() Helper Function
1. Locate line 506 (before `FuelTransaction_Upsert` handler)
2. Insert the `getCurrentWAC()` function

### Step 3: Update Transaction Handler
1. Find line 527 (after category mapping)
2. Insert the auto-calculation logic (Step 1.5)

### Step 4: Update INSERT Statement
1. Find lines 554-555 (`unit_price`, `total_amount`)
2. Replace with `calculatedUnitPrice` and `calculatedTotalAmount`

### Step 5: Test Locally
```bash
# Start dev server
npm run dev

# Test with curl
curl -X POST http://localhost:3000/api/webhook/appsheet \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{
    "Action": "FuelTransaction_Upsert",
    "data": {
      "id": "TEST-001",
      "transactionDate": "2026-01-06",
      "fuelSource": "Trụ nội bộ",
      "quantity": 100,
      "unitPrice": 18000,
      "licensePlate": "29A-12345"
    }
  }'
```

Expected behavior:
- Console logs: "🔄 Auto-calculating COGS using current WAC..."
- Console shows: WAC value and calculated COGS
- Database stores: WAC price (not 18000)

### Step 6: Deploy
```bash
git add app/api/webhook/appsheet/route.ts
git commit -m "fix: Auto-calculate fuel transaction COGS using WAC

- Fetch current weighted average cost from FIFO endpoint
- Calculate unit_price and total_amount automatically
- Prevent COGS mismatch from stale AppSheet prices
- Only apply to 'Trụ nội bộ' (internal fuel source)
- Throw error if WAC unavailable (no silent failures)"

git push
```

---

## ✅ Validation After Patch

### Test Case 1: Normal Transaction (Internal Source)
```bash
# Create transaction with intentionally wrong unit_price
curl -X POST http://localhost:3000/api/webhook/appsheet \
  -H "x-api-key: your-key" \
  -d '{
    "Action": "FuelTransaction_Upsert",
    "data": {
      "id": "TEST-WAC-001",
      "transactionDate": "2026-01-06",
      "fuelSource": "Trụ nội bộ",
      "quantity": 100,
      "unitPrice": 10000,
      "totalAmount": 1000000,
      "licensePlate": "29A-12345"
    }
  }'
```

**Expected**:
```
✓ Console shows: "⚠️ Unit price variance detected"
✓ Console shows: "AppSheet sent: 10,000 VND/L"
✓ Console shows: "Current WAC: 20,500 VND/L"
✓ Console shows: "✅ Using WAC value for accuracy"
✓ Database stores: unit_price=20500, total_amount=2050000
```

### Test Case 2: External Source (Should Use AppSheet Value)
```bash
curl -X POST http://localhost:3000/api/webhook/appsheet \
  -H "x-api-key: your-key" \
  -d '{
    "Action": "FuelTransaction_Upsert",
    "data": {
      "id": "TEST-EXTERNAL-001",
      "transactionDate": "2026-01-06",
      "fuelSource": "Nhà xe ABC",
      "quantity": 50,
      "unitPrice": 25000,
      "totalAmount": 1250000,
      "licensePlate": "29A-12345"
    }
  }'
```

**Expected**:
```
✓ Console shows: "ℹ️ External fuel source - using AppSheet unit_price"
✓ Database stores: unit_price=25000, total_amount=1250000
✓ No WAC calculation (external source uses contract price)
```

### Test Case 3: FIFO Endpoint Fails
```bash
# Temporarily break FIFO endpoint (stop server or wrong URL)
# Then create transaction
```

**Expected**:
```
✓ Console shows: "❌ WAC calculation failed"
✓ Response: 503 Service Unavailable
✓ Error message: "Cannot calculate accurate fuel cost"
✓ Transaction NOT created (no silent failure)
```

### Test Case 4: Edit Existing Transaction
```bash
# Update transaction quantity
curl -X POST http://localhost:3000/api/webhook/appsheet \
  -H "x-api-key: your-key" \
  -d '{
    "Action": "FuelTransaction_Upsert",
    "data": {
      "id": "TEST-WAC-001",
      "quantity": 150
    }
  }'
```

**Expected**:
```
✓ Fetches current WAC again
✓ Recalculates: total_amount = 150 × current_WAC
✓ Database updates with new COGS
```

---

## 🔄 Behavior Changes

### Before Patch:
```typescript
AppSheet → Backend
unit_price: 18,000 (manual/stale) → Stored as-is
total_amount: 1,800,000 → Stored as-is

Result: Wrong COGS if WAC changed
```

### After Patch:
```typescript
AppSheet → Backend → FIFO API → Calculate
unit_price: 18,000 (ignored) → Fetch WAC: 20,500 → Store: 20,500
total_amount: 1,800,000 (ignored) → Calculate: 100×20,500 → Store: 2,050,000

Result: Accurate COGS always
```

---

## 📊 Expected Outcomes

### Financial Accuracy:
- ✅ COGS always reflects actual weighted average cost
- ✅ Inventory valuation matches accounting standards
- ✅ P&L reports show correct fuel expenses
- ✅ No manual price entry errors

### Data Integrity:
- ✅ Unit price auto-synced with current WAC
- ✅ Total amount calculated consistently
- ✅ Audit trail shows WAC at transaction time
- ✅ No variance between inventory cost and transaction cost

### User Experience:
- ⚠️ **Warning**: Users can no longer manually set fuel price (internal source)
- ✅ **Benefit**: No need to check current price before creating transaction
- ✅ **Benefit**: System ensures accuracy automatically
- ℹ️ External fuel sources still allow manual pricing

---

## ⚠️ IMPORTANT NOTES

### 1. External Fuel Sources
This patch **only** auto-calculates for `fuel_source = "Trụ nội bộ"`.

External sources (e.g., "Nhà xe ABC", "Đại lý X") will continue using AppSheet's `unit_price` because:
- External prices are contract-based, not WAC-based
- Different vendors have different prices
- Need flexibility for manual entry

### 2. Performance Impact
Each fuel transaction insert now calls FIFO endpoint:
- Adds ~100-500ms latency per transaction
- FIFO endpoint recalculates from scratch (expensive)

**Mitigation**: Consider implementing Redis cache for WAC (future enhancement)

### 3. Dependency on FIFO Endpoint
Transaction creation **requires** FIFO endpoint to be operational:
- If FIFO down → Transaction fails (503 error)
- No silent failures with wrong COGS
- Monitor FIFO endpoint health closely

---

## 🔗 Related Patches
- **PATCH HIGH #3**: Remove stale avg_price fallback (apply FIRST)
- **PATCH CRITICAL #1**: Fix API failure returns 0 avg_price
- **Future**: Implement Redis cache for WAC

---

## 🚨 ROLLBACK PLAN

If issues occur:

### Quick Rollback:
```typescript
// Revert to old code
${transData.unitPrice || 0},
${transData.totalAmount || 0},

// Remove getCurrentWAC() function
// Remove auto-calculation logic
```

### Partial Rollback (Fallback Mode):
```typescript
// Keep auto-calculation but fallback to AppSheet on error
try {
  const currentWAC = await getCurrentWAC();
  calculatedUnitPrice = currentWAC;
} catch (error) {
  console.warn('⚠️ WAC calculation failed, using AppSheet value');
  calculatedUnitPrice = transData.unitPrice || 0;  // Fallback
}
```

---

## 📅 Metadata
- **Created**: 2026-01-06
- **Priority**: P0 (Critical)
- **Estimated Time**: 20 minutes
- **Risk Level**: Medium (depends on FIFO endpoint stability)
- **Breaking Change**: Yes (unit_price no longer user-editable for internal source)
- **Testing Required**: Yes (comprehensive testing needed)
- **Rollback**: Easy (can revert to old behavior)
