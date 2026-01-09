# PATCH HIGH #3: Remove Stale avg_price Fallback in Backend

## 🟠 SEVERITY: HIGH

## 📍 Location
File: `/app/api/fuel/stats/route.ts`
Lines: 56-84

## 🐛 Bug Description
When the FIFO inventory calculation API fails, the `/fuel/stats` endpoint falls back to getting `avg_price` from the latest record in `fuel_imports` table:

```typescript
// Lines 75-82
const avgPriceResult = await sql`
  SELECT COALESCE(avg_price, 0) as avg_price
  FROM fuel_imports
  WHERE avg_price IS NOT NULL
  ORDER BY import_date DESC, updated_at DESC
  LIMIT 1
`;
currentAvgPrice = parseFloat(avgPriceResult.rows[0]?.avg_price || '0');
```

**Problem**: This `avg_price` is the Weighted Average Cost (WAC) **at the time of that specific import**, NOT the current average price after subsequent exports.

### Example of How This Causes Wrong COGS:

```
Day 1: Import 1000L @ 20,000 VND/L
  → avg_price = 20,000 (stored in fuel_imports)

Day 2: Import 500L @ 24,000 VND/L
  → avg_price = 21,333 (WAC calculation, stored in fuel_imports)

Day 3: Export 200L
  → COGS should use 20,000 (FIFO first batch)
  → But if FIFO fails, fallback uses 21,333 ❌ WRONG

Day 4: Export 900L
  → COGS should use blended price from remaining stock
  → But fallback still uses 21,333 from last import ❌ STALE DATA
```

## 💥 Impact
- **Wrong COGS Calculations**: Fuel export costs are calculated with outdated prices
- **Inventory Valuation Errors**: Current stock value is incorrect
- **Financial Reports Invalid**: P&L statements show wrong fuel expenses
- **FIFO Violations**: System doesn't follow proper inventory accounting

## ✅ Solution
**Option A (Recommended)**: Remove fallback entirely. If FIFO fails, return error.
**Option B**: Calculate current WAC from full transaction history (expensive query).

We'll implement **Option A** because:
1. FIFO should always work (or be fixed if broken)
2. Returning wrong data is worse than returning error
3. Forces proper error handling and monitoring

---

## 📝 PATCH CODE

### OLD CODE (Lines 56-84):
```typescript
try {
  // Try to use FIFO calculation
  const fifoResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/fuel/inventory/fifo`);
  if (fifoResponse.ok) {
    const fifoData = await fifoResponse.json();
    if (fifoData.success && fifoData.data.summary) {
      currentInventory = fifoData.data.summary.total_remaining;
      currentAvgPrice = fifoData.data.summary.current_avg_price;
      inventoryValue = fifoData.data.summary.total_value;
      console.log('✓ Using FIFO Inventory Calculation');
      console.log(`  - FIFO Inventory: ${currentInventory}L`);
      console.log(`  - FIFO Avg Price: ${currentAvgPrice} VND/L`);
    }
  }
} catch (fifoError) {
  console.warn('⚠️ FIFO API call failed, using simple calculation');
  console.warn('Error:', fifoError);

  // Fallback: Get avg price from latest import
  const avgPriceResult = await sql`
    SELECT COALESCE(avg_price, 0) as avg_price
    FROM fuel_imports
    WHERE avg_price IS NOT NULL
    ORDER BY import_date DESC, updated_at DESC
    LIMIT 1
  `;
  currentAvgPrice = parseFloat(avgPriceResult.rows[0]?.avg_price || '0');
  inventoryValue = currentInventory * currentAvgPrice;
}
```

### NEW CODE:
```typescript
try {
  // Try to use FIFO calculation
  const fifoResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/fuel/inventory/fifo`);

  if (!fifoResponse.ok) {
    const errorText = await fifoResponse.text();
    throw new Error(`FIFO API returned ${fifoResponse.status}: ${errorText}`);
  }

  const fifoData = await fifoResponse.json();

  if (!fifoData.success || !fifoData.data.summary) {
    throw new Error('FIFO API response missing summary data');
  }

  // ✅ Use FIFO results
  currentInventory = fifoData.data.summary.total_remaining;
  currentAvgPrice = fifoData.data.summary.current_avg_price;
  inventoryValue = fifoData.data.summary.total_value;

  console.log('✓ Using FIFO Inventory Calculation');
  console.log(`  - FIFO Inventory: ${currentInventory}L`);
  console.log(`  - FIFO Avg Price: ${currentAvgPrice} VND/L`);
  console.log(`  - FIFO Inventory Value: ${inventoryValue} VND`);

} catch (fifoError) {
  // ❌ DO NOT use stale avg_price from fuel_imports as fallback
  // This causes wrong COGS calculations and inventory valuation errors
  console.error('❌ FIFO calculation failed - Cannot calculate accurate fuel stats');
  console.error('Error:', fifoError);

  // Return error response instead of wrong data
  return NextResponse.json({
    success: false,
    error: 'FIFO inventory calculation unavailable',
    message: 'Cannot calculate accurate fuel statistics. Please check FIFO endpoint.',
    details: fifoError instanceof Error ? fifoError.message : String(fifoError)
  }, { status: 503 }); // 503 Service Unavailable
}
```

---

## 🔧 APPLY PATCH

### Step 1: Open File
Navigate to:
```
/app/api/fuel/stats/route.ts
```

### Step 2: Locate Lines 56-84
Search for:
```typescript
try {
  // Try to use FIFO calculation
  const fifoResponse = await fetch(
```

### Step 3: Replace Entire try-catch Block
Replace lines 56-84 with the NEW CODE above.

### Step 4: Test FIFO Endpoint First
Before deploying, verify FIFO endpoint works:

```bash
curl http://localhost:3000/api/fuel/inventory/fifo
```

Expected response:
```json
{
  "success": true,
  "data": {
    "summary": {
      "total_remaining": 12500.5,
      "current_avg_price": 21450.75,
      "total_value": 268134375
    }
  }
}
```

### Step 5: Deploy
```bash
# If using Vercel
vercel --prod

# Or commit to git
git add app/api/fuel/stats/route.ts
git commit -m "fix: Remove stale avg_price fallback in fuel stats API

- FIFO calculation is now required for accurate pricing
- Return 503 error if FIFO fails instead of using stale import prices
- Prevents COGS calculation with outdated WAC values"
git push
```

---

## ✅ Validation After Patch

### Test Case 1: FIFO Works (Happy Path)
```bash
# Should return 200 with correct data
curl http://localhost:3000/api/fuel/stats
```

Expected:
```json
{
  "success": true,
  "data": {
    "current_inventory": 12500.5,
    "current_avg_price": 21450.75,
    ...
  }
}
```

### Test Case 2: FIFO Fails (Error Handling)
Temporarily break FIFO endpoint:
```bash
# Should return 503 error
curl http://localhost:3000/api/fuel/stats
```

Expected:
```json
{
  "success": false,
  "error": "FIFO inventory calculation unavailable",
  "message": "Cannot calculate accurate fuel statistics...",
  "details": "..."
}
```

### Test Case 3: GAS Script Handling
After patch, GAS script should properly handle 503 error:

```javascript
// In fetchLatestFuelState() (after applying PATCH CRITICAL #1)
if (statusCode !== 200) {
  // This will now trigger for 503 from backend
  throw new Error('Cannot fetch fuel state from backend');
}
```

Result:
- ✅ Fuel transaction sync FAILS (good!)
- ✅ User sees error message
- ✅ NO transaction created with wrong COGS
- ✅ Admin is notified to fix FIFO endpoint

---

## 🚨 IMPORTANT: Fix FIFO Endpoint First

Before deploying this patch, ensure your FIFO endpoint is stable:

### Check 1: FIFO Endpoint Exists
```bash
ls app/api/fuel/inventory/fifo/route.ts
```

### Check 2: FIFO Logic is Correct
Review the FIFO calculation logic to ensure it:
1. Properly tracks batch imports with timestamps
2. Deducts exports from oldest batches first
3. Calculates weighted average of remaining stock
4. Handles edge cases (empty inventory, negative stock)

### Check 3: Add Monitoring
Consider adding health check:
```typescript
// app/api/fuel/inventory/fifo/health/route.ts
export async function GET() {
  try {
    // Quick validation query
    const result = await sql`SELECT COUNT(*) FROM fuel_imports`;
    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }
}
```

---

## 🔄 Rollback Plan

If FIFO endpoint is unstable and you need to rollback:

1. Revert to OLD CODE (lines 56-84)
2. Add temporary logging:
   ```typescript
   console.warn('⚠️ Using stale avg_price fallback - THIS IS TEMPORARY');
   console.warn('⚠️ TODO: Fix FIFO endpoint to remove this fallback');
   ```
3. Set up monitoring alert for FIFO failures
4. Fix FIFO endpoint ASAP
5. Re-apply this patch

---

## 🔗 Related Patches
- PATCH CRITICAL #1: Fix API failure returns 0 avg_price in GAS
- Future: Implement robust FIFO calculation with retry logic

---

## 📅 Metadata
- **Created**: 2026-01-06
- **Priority**: P1 (High)
- **Estimated Time**: 15 minutes (+ FIFO endpoint validation)
- **Risk Level**: Medium (requires FIFO endpoint to be stable)
- **Rollback**: Can revert to fallback if FIFO unstable
- **Testing Required**: Yes (verify FIFO endpoint works)
