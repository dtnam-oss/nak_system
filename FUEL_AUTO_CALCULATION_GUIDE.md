# FUEL TRANSACTION AUTO-CALCULATION LOGIC

## 📋 Tổng Quan

Logic tính toán tự động cho module quản lý nhiên liệu, áp dụng thuật toán **"Look-back"** để tính quãng đường và hiệu suất tiêu thụ nhiên liệu.

**Date:** 03/01/2026  
**Developer:** Senior Backend Developer  
**Technology:** Node.js, TypeScript, PostgreSQL

---

## 🎯 Business Logic

### 1. Category Mapping

| AppSheet Category | Ý nghĩa | `is_full_tank` | Hành động Backend |
|:---|:---|:---:|:---|
| **Đổ dặm** | Đổ thêm khi đang chạy | `FALSE` | Chỉ lưu, không tính toán |
| **Chốt tháng** | Cuối tháng đổ đầy | `TRUE` | ✅ Lưu + Kích hoạt tính toán |
| **Bàn giao** | Đổi tài/Nghỉ việc | `TRUE` | ✅ Lưu + Kích hoạt tính toán |
| **Khởi tạo** | Nhập xe lần đầu | `TRUE` | Lưu làm mốc. Skip tính toán |

---

## 🔄 Look-back Algorithm

### Flow Diagram

```
Current Transaction (Chốt tháng)
         ↓
   Query Previous (is_full_tank=TRUE)
         ↓
   Found? ───NO───> Skip calculation
         ↓ YES
   Calculate km_traveled = Current.odo - Previous.odo
         ↓
   km_traveled > 0? ───NO───> Skip
         ↓ YES
   Query SUM(quantity) WHERE is_full_tank=FALSE
         ↓
   total_fuel = Intermediate + Current.quantity
         ↓
   efficiency = (total_fuel / km_traveled) * 100
         ↓
   UPDATE Current SET km_traveled, total_fuel_period, efficiency
```

### Step-by-Step Execution

**Step 1: Map Category → is_full_tank**
```typescript
const isFullTank = ['CHỐT THÁNG', 'BÀN GIAO', 'KHỞI TẠO']
  .includes(category.toUpperCase());
const isInitialization = category.toUpperCase() === 'KHỞI TẠO';
```

**Step 2: Insert/Update Record**
```sql
INSERT INTO fuel_transactions (...)
VALUES (...)
ON CONFLICT (id) DO UPDATE SET ...;
```

**Step 3: Find Previous Full-Tank (if applicable)**
```sql
SELECT id, odo_number, transaction_date
FROM fuel_transactions
WHERE license_plate = ${plate}
  AND is_full_tank = TRUE
  AND transaction_date < ${currentDate}
ORDER BY transaction_date DESC
LIMIT 1;
```

**Step 4: Calculate km_traveled**
```typescript
const kmTraveled = currentOdo - previousOdo;

if (kmTraveled <= 0) {
  console.log('Invalid distance, skip calculation');
  return;
}
```

**Step 5: Sum Intermediate "Đổ dặm" Transactions**
```sql
SELECT COALESCE(SUM(quantity), 0) as total_intermediate
FROM fuel_transactions
WHERE license_plate = ${plate}
  AND is_full_tank = FALSE
  AND transaction_date > ${previousDate}
  AND transaction_date < ${currentDate};
```

**Step 6: Calculate Total Fuel & Efficiency**
```typescript
const totalFuelPeriod = totalIntermediate + currentQuantity;
const efficiency = (totalFuelPeriod / kmTraveled) * 100;
```

**Step 7: Update Current Record**
```sql
UPDATE fuel_transactions
SET 
  km_traveled = ${kmTraveled},
  total_fuel_period = ${totalFuelPeriod},
  efficiency = ${efficiency}
WHERE id = ${currentId};
```

---

## 📊 Database Schema

### New Columns Added

| Column | Type | Nullable | Description |
|:---|:---|:---:|:---|
| `is_full_tank` | BOOLEAN | NO | Cờ đánh dấu đổ đầy bình (TRUE/FALSE) |
| `km_traveled` | DECIMAL(10,2) | YES | Quãng đường từ lần đổ đầy trước (km) |
| `total_fuel_period` | DECIMAL(10,2) | YES | Tổng nhiên liệu tiêu thụ trong khoảng (lít) |
| `efficiency` | DECIMAL(10,4) | YES | Hiệu suất tiêu thụ (lít/100km) |

### Indexes Created

```sql
CREATE INDEX idx_fuel_trans_full_tank 
ON fuel_transactions(is_full_tank) WHERE is_full_tank = TRUE;

CREATE INDEX idx_fuel_trans_plate_date 
ON fuel_transactions(license_plate, transaction_date);

CREATE INDEX idx_fuel_trans_efficiency 
ON fuel_transactions(efficiency) WHERE efficiency IS NOT NULL;
```

---

## 🧪 Testing Scenarios

### Scenario 1: Khởi tạo (First Record)

**Input:**
```json
{
  "category": "Khởi tạo",
  "licensePlate": "51H-12345",
  "odoNumber": 10000,
  "quantity": 50
}
```

**Expected:**
- ✅ Record saved
- ✅ `is_full_tank = TRUE`
- ⏭️ Calculation skipped
- ✅ Response: `{ calculated: false }`

---

### Scenario 2: Đổ dặm (Intermediate)

**Input:**
```json
{
  "category": "Đổ dặm",
  "licensePlate": "51H-12345",
  "odoNumber": 10150,
  "quantity": 30
}
```

**Expected:**
- ✅ Record saved
- ✅ `is_full_tank = FALSE`
- ⏭️ Calculation skipped
- ✅ Response: `{ calculated: false }`

---

### Scenario 3: Chốt tháng (Full Tank - Trigger Calculation)

**Setup:**
```sql
-- Previous: Khởi tạo at ODO 10000
-- Intermediate: Đổ dặm 30L at ODO 10150
-- Current: Chốt tháng 40L at ODO 10500
```

**Input:**
```json
{
  "category": "Chốt tháng",
  "licensePlate": "51H-12345",
  "odoNumber": 10500,
  "quantity": 40
}
```

**Expected Calculation:**
```typescript
km_traveled = 10500 - 10000 = 500 km
total_fuel_period = 30 + 40 = 70 L
efficiency = (70 / 500) * 100 = 14.0000 L/100km
```

**Database Result:**
```sql
SELECT * FROM fuel_transactions WHERE category = 'Chốt tháng';
```
```
| id   | category   | km_traveled | total_fuel_period | efficiency |
|------|------------|-------------|-------------------|------------|
| TX03 | Chốt tháng | 500.00      | 70.00             | 14.0000    |
```

**Response:**
```json
{
  "success": true,
  "calculated": true,
  "id": "TX03"
}
```

---

### Scenario 4: Edge Case - No Previous Record

**Input:**
```json
{
  "category": "Chốt tháng",
  "licensePlate": "51H-99999", // New vehicle, no history
  "odoNumber": 5000,
  "quantity": 45
}
```

**Expected:**
- ✅ Record saved
- ⚠️ Query finds no previous record
- ⏭️ Calculation skipped
- ✅ Log: `"No previous full-tank record found"`
- ✅ Response: `{ calculated: false }`

---

### Scenario 5: Edge Case - Invalid km_traveled

**Setup:**
```sql
-- Previous: ODO 10000
-- Current: ODO 9500 (đi lùi?!)
```

**Expected:**
- ✅ Record saved
- ⚠️ `km_traveled = -500` (invalid)
- ⏭️ Calculation skipped
- ✅ Log: `"Invalid km_traveled (-500)"`

---

## 🔧 Error Handling

### Try-Catch Isolation

```typescript
try {
  // Main insert/update
  await sql`INSERT INTO ...`;
  
  // Auto-calculation logic
  if (isFullTank && !isInit) {
    try {
      // Calculation queries
    } catch (calcError) {
      console.error('Calculation error:', calcError);
      // Don't fail the entire request
    }
  }
  
  return NextResponse.json({ success: true });
  
} catch (dbError) {
  // Critical error - fail the request
  return NextResponse.json({ error }, { status: 500 });
}
```

**Design Philosophy:**
- ✅ Insert/Update is **critical** → Fail on error
- ⚠️ Calculation is **non-critical** → Log error, continue
- 📝 User still gets success response even if calculation fails

---

## 📈 Performance Considerations

### Query Optimization

1. **Index Usage:**
   - `idx_fuel_trans_plate_date` → Fast lookup of previous record
   - `idx_fuel_trans_full_tank` → Filter only full-tank records
   - `license_plate + transaction_date` → Composite index for range scan

2. **Query Complexity:**
   - Previous lookup: O(log n) with index
   - Intermediate sum: O(m) where m = records between dates
   - Total time: ~10-50ms for typical dataset

3. **Database Load:**
   - 3 queries per calculation (Previous, Sum, Update)
   - Non-blocking (calculation failure doesn't block insert)
   - Can add **async queue** for heavy load

---

## 🚀 Deployment Checklist

### Pre-Deployment

- [x] Create migration script: `009_add_fuel_calculation_columns.sql`
- [x] Test locally with sample data
- [x] Verify index creation
- [x] Update interface: `FuelTransactionPayload`
- [x] Implement auto-calculation logic
- [x] Add comprehensive logging
- [x] Write documentation

### Deployment Steps

1. **Run Migration (Neon Console):**
```bash
# Copy content from database/009_add_fuel_calculation_columns.sql
# Paste into Neon SQL Editor
# Click Run
```

2. **Verify Schema:**
```sql
\d fuel_transactions

-- Expected:
-- is_full_tank     | boolean
-- km_traveled      | numeric(10,2)
-- total_fuel_period| numeric(10,2)
-- efficiency       | numeric(10,4)
```

3. **Deploy Code (Git Push):**
```bash
git add .
git commit -m "feat: Add fuel auto-calculation logic"
git push origin main
```

4. **Verify Vercel Deployment:**
- Check deployment logs
- Test webhook endpoint
- Monitor logs for calculation messages

### Post-Deployment Testing

```bash
# Test case 1: Khởi tạo
curl -X POST https://your-domain/api/webhook/appsheet \
  -H "Content-Type: application/json" \
  -d '{
    "Action": "FuelTransaction_Upsert",
    "data": {
      "id": "TEST01",
      "transactionDate": "2026-01-03",
      "category": "Khởi tạo",
      "licensePlate": "51H-TEST",
      "odoNumber": 10000,
      "quantity": 50
    }
  }'

# Test case 2: Đổ dặm
curl -X POST ... "category": "Đổ dặm" ...

# Test case 3: Chốt tháng (trigger calculation)
curl -X POST ... "category": "Chốt tháng" ...
```

---

## 📞 Support & Troubleshooting

### Common Issues

**Issue 1: Calculation not triggered**
```
Check: Is category exactly "Chốt tháng" or "Bàn giao"?
Fix: Category comparison is case-insensitive (.toUpperCase())
```

**Issue 2: efficiency = NaN**
```
Check: km_traveled = 0 or NULL?
Fix: Algorithm skips if km_traveled <= 0
```

**Issue 3: No previous record found**
```
Check: Is this the first full-tank record for this vehicle?
Fix: Expected behavior - calculation skipped
```

### Debug Logs

Enable verbose logging:
```typescript
console.log('📊 Category:', category);
console.log('📍 Previous:', previous);
console.log('⛽ Intermediate:', totalIntermediate);
console.log('📊 Results:', { kmTraveled, totalFuelPeriod, efficiency });
```

---

## 🎓 Future Enhancements

1. **Async Queue Processing:**
   - Move calculation to background job
   - Use Redis/Bull queue
   - Non-blocking insert

2. **Historical Recalculation:**
   - Batch recalculate all existing records
   - Fill missing efficiency data

3. **Advanced Analytics:**
   - Monthly efficiency reports
   - Driver performance comparison
   - Vehicle efficiency ranking

4. **Alerts & Notifications:**
   - Notify when efficiency > threshold
   - Flag abnormal consumption patterns

---

**Implemented by:** Senior Backend Developer  
**Date:** January 3, 2026  
**Status:** ✅ Production Ready
