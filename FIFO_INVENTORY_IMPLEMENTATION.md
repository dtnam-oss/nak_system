# FIFO INVENTORY IMPLEMENTATION

## 📋 Overview

Đã nâng cấp hệ thống tính tồn kho từ phương pháp **Simple Aggregation** sang **FIFO (First In First Out)**.

**Ngày thực hiện**: January 3, 2026  
**Status**: ✅ **IMPLEMENTED**

---

## 🎯 Requirements

### 1. Tab "Nhật ký cấp dầu" với sub-tabs
Chia nhật ký cấp dầu thành 4 tabs theo fuel_source:
- **Tất cả**: Hiển thị tất cả transactions
- **Trụ nội bộ**: Chỉ hiển thị fuel_source = "Trụ nội bộ"
- **Trụ Quang Minh**: Chỉ hiển thị fuel_source chứa "Quang Minh"
- **Trụ vãng lai**: Hiển thị các fuel_source khác (loại trừ nội bộ và Quang Minh)

### 2. Logic tính tồn kho FIFO
**Nguyên tắc**: Chỉ trừ các phiếu xuất **SAU** thời điểm nhập kho

**Ví dụ**:
```
Timeline:
├─ 31/12/2025 23:59 → Xuất 50L (Transaction A)
├─ 01/01/2026 00:00 → Nhập 1000L (PO#1)
├─ 01/01/2026 08:00 → Xuất 100L (Transaction B)
└─ 01/01/2026 15:00 → Xuất 200L (Transaction C)

Kết quả:
- PO#1 (1000L):
  - Transaction A (50L): KHÔNG trừ (trước thời điểm nhập)
  - Transaction B (100L): TRỪ vào PO#1 → Còn 900L
  - Transaction C (200L): TRỪ vào PO#1 → Còn 700L
  
- Tồn kho cuối: 700L
```

---

## 🔧 Implementation

### 1. Frontend: Fuel Transactions Tabs

**File**: `app/fuel/page.tsx`

**Changes**:
- Added `fuelSourceTab` state to track active sub-tab
- Created nested Tabs component with 4 tabs
- Filter transactions based on fuel_source for each tab

```tsx
// State
const [fuelSourceTab, setFuelSourceTab] = useState<string>('all');

// Sub-tabs
<Tabs value={fuelSourceTab} onValueChange={setFuelSourceTab}>
  <TabsList>
    <TabsTrigger value="all">Tất cả</TabsTrigger>
    <TabsTrigger value="internal">Trụ nội bộ</TabsTrigger>
    <TabsTrigger value="quangminh">Trụ Quang Minh</TabsTrigger>
    <TabsTrigger value="vanglai">Trụ vãng lai</TabsTrigger>
  </TabsList>
  
  {/* Filter logic for each tab */}
  <TabsContent value="internal">
    <FuelTransactionsTable 
      transactions={transactions.filter(t => 
        t.fuel_source?.toLowerCase().includes('nội bộ')
      )} 
    />
  </TabsContent>
</Tabs>
```

**Benefits**:
- ✅ Dễ dàng theo dõi transactions theo từng loại trụ
- ✅ Phân biệt rõ giữa xuất nội bộ và xuất bên ngoài
- ✅ Hỗ trợ phân tích tiêu thụ theo nguồn

---

### 2. Backend: FIFO Inventory API

**File**: `app/api/fuel/inventory/fifo/route.ts`

**Endpoint**: `GET /api/fuel/inventory/fifo`

**Algorithm**:

```typescript
// Step 1: Load all imports (sorted ASC by import_date)
const imports = await loadImports() // FIFO order

// Step 2: Load all transactions at "Trụ nội bộ" (sorted ASC by transaction_date)
const transactions = await loadTransactions()

// Step 3: Initialize remaining quantity for each import
const importRemaining = new Map()
imports.forEach(imp => importRemaining.set(imp.id, imp.quantity))

// Step 4: Process each transaction
for (const transaction of transactions) {
  let transactionRemaining = transaction.quantity
  
  // Deduct from oldest imports first (FIFO)
  for (const importRecord of imports) {
    if (transactionRemaining <= 0) break
    
    const importTimestamp = new Date(importRecord.import_date)
    const transactionTimestamp = new Date(transaction.transaction_date)
    
    // Only deduct if import came BEFORE or AT SAME TIME as transaction
    if (importTimestamp <= transactionTimestamp) {
      const currentRemaining = importRemaining.get(importRecord.id)
      
      if (currentRemaining > 0) {
        const consumed = Math.min(currentRemaining, transactionRemaining)
        importRemaining.set(importRecord.id, currentRemaining - consumed)
        transactionRemaining -= consumed
      }
    }
  }
}

// Step 5: Calculate totals
const totalRemaining = sum(importRemaining.values())
const totalValue = sum(remaining * avgPrice for each import)
const currentAvgPrice = totalValue / totalRemaining
```

**Response Format**:
```json
{
  "success": true,
  "data": {
    "inventory": [
      {
        "import_id": "PO-001",
        "import_date": "2026-01-01T00:00:00Z",
        "original_quantity": 1000,
        "consumed_quantity": 300,
        "remaining_quantity": 700,
        "avg_price": 22500,
        "unit_price": 23000
      }
    ],
    "summary": {
      "total_remaining": 5420.5,
      "total_value": 121961250,
      "current_avg_price": 22500.23,
      "total_imports": 15,
      "total_transactions": 120,
      "items_with_stock": 8
    }
  },
  "timestamp": "2026-01-03T10:30:00Z"
}
```

**Key Features**:
- ✅ Timestamp-based matching (import BEFORE transaction)
- ✅ FIFO ordering (oldest import consumed first)
- ✅ Detailed logging for debugging
- ✅ Handles negative inventory (warns if transaction > available stock)
- ✅ Returns only imports with remaining stock

---

### 3. Backend: Updated Fuel Stats API

**File**: `app/api/fuel/stats/route.ts`

**Changes**:
- Calls FIFO API internally to get accurate inventory
- Fallback to simple calculation if FIFO API fails
- Uses FIFO-calculated avg_price for inventory value

```typescript
// Try FIFO calculation
try {
  const fifoResponse = await fetch('/api/fuel/inventory/fifo')
  if (fifoResponse.ok) {
    const fifoData = await fifoResponse.json()
    currentInventory = fifoData.data.summary.total_remaining
    currentAvgPrice = fifoData.data.summary.current_avg_price
    inventoryValue = fifoData.data.summary.total_value
    console.log('✓ Using FIFO Inventory Calculation')
  }
} catch (error) {
  console.warn('⚠️ FIFO API failed, using simple calculation')
  // Fallback: totalImport - totalExport
  currentInventory = totalImport - totalExportInternal
  // Get avgPrice from latest import
  currentAvgPrice = await getLatestAvgPrice()
  inventoryValue = currentInventory * currentAvgPrice
}
```

**Benefits**:
- ✅ Accurate inventory based on FIFO
- ✅ Graceful degradation if FIFO API fails
- ✅ Consistent with FIFO logic across dashboard and fuel page

---

## 📊 FIFO vs Simple Calculation Comparison

### Simple Calculation (Old)
```
Tồn kho = Tổng nhập - Tổng xuất (Trụ nội bộ)
        = 10,000L - 4,500L
        = 5,500L
```

**Vấn đề**:
- ❌ Không xét đến timestamp
- ❌ Trừ cả transactions trước khi nhập kho
- ❌ Không phân biệt PO nào được xuất

### FIFO Calculation (New)
```
Timeline:
├─ 31/12 23:00 → Xuất 500L (KHÔNG tính vào PO#1)
├─ 01/01 00:00 → Nhập 5,000L (PO#1)
├─ 01/01 08:00 → Xuất 2,000L (Trừ vào PO#1)
├─ 02/01 00:00 → Nhập 5,000L (PO#2)
└─ 02/01 15:00 → Xuất 2,500L (Trừ hết PO#1, còn 500L trừ vào PO#2)

Kết quả:
- PO#1: 5,000 - 2,000 - 500 = 2,500L còn
- PO#2: 5,000 - 2,000 = 3,000L còn
- Tổng tồn: 5,500L

Simple method sẽ tính:
- Tổng nhập: 10,000L
- Tổng xuất: 500 + 2,000 + 2,500 = 5,000L
- Tồn kho: 10,000 - 5,000 = 5,000L (SAI 500L vì tính cả xuất trước nhập)
```

**Ưu điểm FIFO**:
- ✅ Chính xác theo thời gian thực
- ✅ Phân biệt rõ PO nào đã xuất hết, PO nào còn
- ✅ Phù hợp với nguyên tắc kế toán (WAC + FIFO)

---

## 🧪 Testing Scenarios

### Test Case 1: Normal FIFO Flow
```
Input:
  - PO#1: 1000L at 2026-01-01 00:00
  - Transaction A: 300L at 2026-01-01 08:00 (after import)
  - Transaction B: 200L at 2026-01-01 15:00 (after import)

Expected:
  - PO#1 remaining: 1000 - 300 - 200 = 500L
  - Total inventory: 500L
```

### Test Case 2: Transaction Before Import
```
Input:
  - Transaction A: 100L at 2025-12-31 23:59
  - PO#1: 1000L at 2026-01-01 00:00
  - Transaction B: 200L at 2026-01-01 08:00

Expected:
  - PO#1 remaining: 1000 - 200 = 800L (Transaction A không trừ)
  - Total inventory: 800L
```

### Test Case 3: Multiple Imports FIFO
```
Input:
  - PO#1: 500L at 2026-01-01 00:00
  - PO#2: 500L at 2026-01-02 00:00
  - Transaction A: 600L at 2026-01-02 08:00

Expected:
  - PO#1 remaining: 0L (consumed full 500L)
  - PO#2 remaining: 400L (consumed 100L from 500L)
  - Total inventory: 400L
```

### Test Case 4: Negative Inventory (Over-consumption)
```
Input:
  - PO#1: 500L at 2026-01-01 00:00
  - Transaction A: 700L at 2026-01-01 08:00

Expected:
  - PO#1 remaining: 0L (consumed full 500L)
  - Warning log: "Transaction has 200L not matched to any import"
  - Total inventory: 0L (not negative, clamped to 0)
```

---

## 📈 Impact on Dashboard & Reports

### KPI Cards
- **Tồn kho hiện tại**: Uses FIFO calculation
- **Giá trị tồn kho**: Based on FIFO avg_price
- **% Bồn chứa**: Calculated from FIFO inventory

### Dashboard Fuel Tank Widget
- Updated to use FIFO inventory from `/api/fuel/stats`
- Consistent with Fuel Management page

### Fuel Imports Table
- Shows `avg_price` calculated by WAC (unchanged)
- FIFO only affects consumption tracking, not import pricing

---

## ⚠️ Important Notes

### 1. Timestamp Precision
- Uses full datetime comparison (not just date)
- Import at 00:00:00 and Export at 00:00:01 → Export IS deducted
- Millisecond precision supported

### 2. Fuel Source Filtering
- Only transactions with `fuel_source = 'Trụ nội bộ'` affect inventory
- Purchases at external stations (Petrolimex, PV Oil) don't deduct stock
- Case-insensitive matching: `LOWER(TRIM(fuel_source)) = 'trụ nội bộ'`

### 3. Performance Considerations
- FIFO calculation is CPU-intensive (nested loops)
- Recommended: Cache results for 5-10 minutes
- Future optimization: Move to stored procedure or materialized view

### 4. Data Integrity
- Ensure `import_date` and `transaction_date` are NOT NULL
- Ensure `fuel_source` is properly populated in AppSheet sync
- Validate timestamps are in correct timezone (UTC recommended)

---

## 🔍 Verification Queries

### Check FIFO Inventory
```sql
-- Call API
GET /api/fuel/inventory/fifo

-- Expected response
{
  "summary": {
    "total_remaining": 5420.5,
    "current_avg_price": 22500.23,
    "items_with_stock": 8
  }
}
```

### Compare with Simple Method
```sql
SELECT 
  (SELECT COALESCE(SUM(quantity), 0) FROM fuel_imports) as simple_import,
  (SELECT COALESCE(SUM(quantity), 0) FROM fuel_transactions WHERE fuel_source = 'Trụ nội bộ') as simple_export,
  (SELECT COALESCE(SUM(quantity), 0) FROM fuel_imports) - 
  (SELECT COALESCE(SUM(quantity), 0) FROM fuel_transactions WHERE fuel_source = 'Trụ nội bộ') as simple_inventory;

-- Compare with FIFO total_remaining
```

### Verify Timestamp Logic
```sql
-- Find transactions BEFORE earliest import (should not affect inventory)
SELECT t.id, t.transaction_date, t.quantity
FROM fuel_transactions t
WHERE t.transaction_date < (
  SELECT MIN(import_date) FROM fuel_imports
)
AND LOWER(TRIM(t.fuel_source)) = 'trụ nội bộ';
```

---

## 🚀 Deployment Checklist

- [x] Frontend: Updated Fuel page with sub-tabs
- [x] Backend: Created FIFO inventory API
- [x] Backend: Updated fuel stats API to use FIFO
- [x] Testing: Verified FIFO logic with sample data
- [ ] Database: Add indexes on `import_date` and `transaction_date` for performance
- [ ] Monitoring: Set up alerts for FIFO API errors
- [ ] Documentation: Update user manual with new tabs
- [ ] Training: Brief team on FIFO logic and new UI

---

## 📞 Troubleshooting

### Issue 1: FIFO API returns negative inventory
**Cause**: More transactions than imports (data integrity issue)  
**Fix**: Run verification query to find unmatched transactions, fix source data

### Issue 2: FIFO inventory differs significantly from simple method
**Cause**: Many transactions before earliest import  
**Fix**: Expected behavior, verify timestamp logic is correct

### Issue 3: Performance slow on FIFO endpoint
**Cause**: Large number of imports/transactions  
**Fix**: Implement caching or move calculation to database stored procedure

---

**Implementation Date**: January 3, 2026  
**Version**: 2.0.0  
**Status**: ✅ Ready for Testing
