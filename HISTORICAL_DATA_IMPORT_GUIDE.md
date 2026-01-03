# 📥 Historical Data Import Guide

## Overview

This guide explains how to import historical fuel data from Google Sheets to the PostgreSQL database using Google Apps Script.

## 🎯 Purpose

Import existing fuel data to:
1. **Create inventory base** from historical imports
2. **Trigger auto-calculations** for fuel efficiency tracking
3. **Populate database** with complete historical records

---

## ⚠️ CRITICAL: Import Order

**MUST follow this order:**

### Step 1: Import Fuel Imports (Nhập dầu) FIRST
- **Function:** `importHistoricalFuelImports()`
- **Why:** Creates the inventory base needed for calculations
- **Calculates:** Weighted Average Cost (WAC) for each import
- **Sheet:** `nhap_nhien_lieu`

### Step 2: Import Fuel Transactions (Xuất dầu) AFTER
- **Function:** `importHistoricalFuelTransactions()`
- **Why:** Needs existing inventory to calculate efficiency
- **Triggers:** Auto-calculation for full-tank records
- **Sheet:** `xuat_nhien_lieu`

---

## 📋 Prerequisites

### 1. Database Migration
Run migration script **BEFORE** importing data:

```bash
# SSH to database server or use pgAdmin
psql -U postgres -d nak_logistics -f database/009_add_fuel_calculation_columns.sql
```

Verify columns exist:
```sql
\d fuel_transactions
-- Should show: is_full_tank, km_traveled, total_fuel_period, efficiency
```

### 2. Code.gs Deployment
The new import functions are already in [Code.gs](backend-gas/Code.gs). Ensure it's deployed:

```bash
cd backend-gas
clasp push
```

### 3. API Configuration
Verify [Config.gs](backend-gas/Config.gs) has correct endpoint:

```javascript
API: {
  ENDPOINT: 'https://nak-system.vercel.app/api/webhook/appsheet',
  KEY: 'nak_logistics_2025_secure_key'
}
```

---

## 🚀 Execution Steps

### Option A: Using Custom Menu (Recommended)

1. **Open Google Sheets**
   - Navigate to your AppSheet spreadsheet

2. **Access Menu**
   - Click: **🔄 NAK System Sync** → **📥 Import Historical Data**

3. **Import Fuel Imports**
   - Click: **1️⃣ Import Fuel Imports (Nhập dầu)**
   - Wait for completion (see Logs: View > Logs)

4. **Import Fuel Transactions**
   - Click: **2️⃣ Import Fuel Transactions (Xuất dầu)**
   - Wait for completion

5. **View Guide**
   - Click: **📊 View Import Guide** for quick reference

### Option B: Using Script Editor

1. **Open Script Editor**
   - Extensions > Apps Script

2. **Run Import Functions**
   ```javascript
   // Run these in order:
   importHistoricalFuelImports()
   // Wait for completion, then:
   importHistoricalFuelTransactions()
   ```

3. **Check Logs**
   - View > Logs (Ctrl+Enter)
   - Review detailed progress and errors

---

## 📊 What Gets Imported & Calculated

### Fuel Imports (Step 1)

**Imported Fields:**
- `id` - Unique identifier
- `importDate` - Import date
- `supplier` - Supplier name
- `fuelType` - Fuel type
- `quantity` - Quantity in liters
- `unitPrice` - Unit price (VND/L)
- `totalAmount` - Total amount
- `createdBy` - Creator

**Calculated Fields:**
- `avgPrice` - **Weighted Average Price** (WAC)
  ```
  Formula: (CurrentStock × CurrentAvgPrice + ImportQty × ImportPrice) / TotalQty
  ```

### Fuel Transactions (Step 2)

**Imported Fields:**
- `id` - Unique identifier
- `transactionDate` - Transaction date
- `fuelSource` - Source (Trụ nội bộ, Trụ Quang Minh, etc.)
- `object` - Object type (Xe con, Xe đầu kéo, etc.)
- `licensePlate` - Vehicle license plate
- `driverName` - Driver name
- `fuelType` - Fuel type
- `quantity` - Quantity in liters
- `unitPrice` - Unit price
- `totalAmount` - Total amount
- `odoNumber` - Odometer reading (km)
- `status` - Status
- `category` - Category (Đổ dặm, Chốt tháng, Bàn giao, Khởi tạo)

**Auto-Calculated Fields** (for full-tank records):
- `is_full_tank` - Boolean flag
  - `TRUE` for: Chốt tháng, Bàn giao, Khởi tạo
  - `FALSE` for: Đổ dặm
- `km_traveled` - Distance from previous full-tank (km)
- `total_fuel_period` - Total fuel consumed in period (L)
- `efficiency` - Fuel efficiency (L/100km)

**Calculation Logic:**
See [FUEL_AUTO_CALCULATION_GUIDE.md](FUEL_AUTO_CALCULATION_GUIDE.md) for details.

---

## ⏱️ Processing Time Estimates

### Fuel Imports
- **Delay:** 100ms per record
- **100 records:** ~10 seconds
- **500 records:** ~50 seconds
- **1000 records:** ~1.7 minutes

### Fuel Transactions
- **Delay:** 150ms per record (longer due to calculation)
- **100 records:** ~15 seconds
- **500 records:** ~1.25 minutes
- **1000 records:** ~2.5 minutes

**Total Time Example:**
- 500 imports + 1000 transactions = ~3.75 minutes

---

## 📝 Log Output Examples

### Fuel Import Log
```
========== START HISTORICAL FUEL IMPORTS IMPORT ==========
Sheet: nhap_nhien_lieu
Headers: Id, ngay_nhap, nha_cung_cap, ...
Total records to import: 156

--- Processing Row 2 ---
  ID: FI-2024-001
  Date: 2024-01-15
  Quantity: 500L
  Unit Price: 22500 VND/L
  WAC: Stock(0L @ 0) + Import(500L @ 22500) = 22500 VND/L
  ✓ Row 2 imported successfully

--- Processing Row 3 ---
  ID: FI-2024-002
  Date: 2024-01-20
  Quantity: 300L
  Unit Price: 23000 VND/L
  WAC: Stock(500L @ 22500) + Import(300L @ 23000) = 22687.5 VND/L
  ✓ Row 3 imported successfully

...

========== IMPORT SUMMARY ==========
Total: 156
✓ Imported: 155
✗ Failed: 1

Failed rows:
  Row 78 (ID: FI-2024-077): Missing quantity

========== IMPORT COMPLETE ==========
```

### Fuel Transaction Log
```
========== START HISTORICAL FUEL TRANSACTIONS IMPORT ==========
Sheet: xuat_nhien_lieu
Total records to import: 423
Starting batch import with auto-calculation...

--- Processing Row 2 ---
  ID: FT-2024-001
  Date: 2024-01-15
  License Plate: 92C-12345
  Category: KHỞI TẠO
  Quantity: 50L
  Odo: 25000 km
  🔔 Full-tank record detected! Auto-calculation will be triggered.
  ✓ Row 2 imported successfully

--- Processing Row 3 ---
  ID: FT-2024-002
  Date: 2024-01-16
  License Plate: 92C-12345
  Category: ĐỔ DẶM
  Quantity: 30L
  Odo: 25150 km
  ✓ Row 3 imported successfully

--- Processing Row 4 ---
  ID: FT-2024-003
  Date: 2024-01-20
  License Plate: 92C-12345
  Category: CHỐT THÁNG
  Quantity: 45L
  Odo: 25800 km
  🔔 Full-tank record detected! Auto-calculation will be triggered.
  ✓ Row 4 imported successfully
  📊 Calculation Results:
     km_traveled: 800 km
     total_fuel: 75L (30L intermediate + 45L current)
     efficiency: 9.375 L/100km

...

========== IMPORT SUMMARY ==========
Total: 423
✓ Imported: 422
📊 Auto-calculated: 156 (full-tank records)
✗ Failed: 1

💡 TIP: Check database for calculated values (km_traveled, efficiency)
💡 Expected calculations for records with category: Chốt tháng, Bàn giao

========== IMPORT COMPLETE ==========
```

---

## 🔍 Verification Steps

### 1. Check Import Counts

```sql
-- Count fuel imports
SELECT COUNT(*) as total_imports FROM fuel_imports;

-- Count fuel transactions
SELECT COUNT(*) as total_transactions FROM fuel_transactions;

-- Count full-tank records
SELECT COUNT(*) as full_tank_records 
FROM fuel_transactions 
WHERE is_full_tank = TRUE;
```

### 2. Verify Weighted Average Calculation

```sql
-- Check latest weighted average price
SELECT 
  current_inventory,
  current_avg_price,
  total_import_value
FROM mv_fifo_inventory;

-- Verify calculation manually
SELECT 
  SUM(quantity) as total_qty,
  SUM(total_amount) as total_value,
  SUM(total_amount) / NULLIF(SUM(quantity), 0) as calculated_avg
FROM fuel_imports;
```

### 3. Verify Auto-Calculation Results

```sql
-- Check records with calculations
SELECT 
  id,
  license_plate,
  transaction_date,
  category,
  odo_number,
  is_full_tank,
  km_traveled,
  total_fuel_period,
  efficiency
FROM fuel_transactions
WHERE is_full_tank = TRUE
ORDER BY license_plate, transaction_date;

-- Summary statistics
SELECT 
  license_plate,
  COUNT(*) as full_tank_count,
  AVG(km_traveled) as avg_km_per_period,
  AVG(efficiency) as avg_efficiency
FROM fuel_transactions
WHERE is_full_tank = TRUE 
  AND km_traveled IS NOT NULL
GROUP BY license_plate
ORDER BY license_plate;
```

### 4. Check for Missing Calculations

```sql
-- Full-tank records without calculations (should be first record only)
SELECT 
  id,
  license_plate,
  transaction_date,
  category,
  odo_number,
  km_traveled,
  efficiency
FROM fuel_transactions
WHERE is_full_tank = TRUE 
  AND (km_traveled IS NULL OR efficiency IS NULL)
ORDER BY license_plate, transaction_date;
```

---

## 🐛 Troubleshooting

### Issue: Import Function Not Found

**Symptom:** Menu items don't appear or function gives error

**Solution:**
1. Verify Code.gs is deployed:
   ```bash
   cd backend-gas
   clasp push
   ```
2. Refresh Google Sheets
3. Check Apps Script > Logs for deployment errors

### Issue: API Key Error (401 Unauthorized)

**Symptom:** All imports fail with 401 error

**Solution:**
1. Check [Config.gs](backend-gas/Config.gs) has correct API_KEY
2. Verify Vercel environment variable matches:
   ```bash
   vercel env ls
   # Should show: APPSHEET_WEBHOOK_API_KEY
   ```
3. Redeploy if needed:
   ```bash
   vercel --prod
   ```

### Issue: Weighted Average Price is 0

**Symptom:** avgPrice = 0 for all imports

**Solution:**
1. Check if fuel_imports table is empty before import
2. Verify unitPrice is not NULL in sheet
3. Check logs for calculation errors

### Issue: No Auto-Calculations Triggered

**Symptom:** is_full_tank is NULL or efficiency is NULL

**Solution:**
1. Verify migration 009 was run:
   ```sql
   \d fuel_transactions
   -- Should show calculation columns
   ```
2. Check category values in sheet:
   ```
   Must be exactly: "Chốt tháng", "Bàn giao", or "Khởi tạo"
   Case-insensitive, but must match
   ```
3. Check logs for calculation errors

### Issue: Invalid km_traveled

**Symptom:** km_traveled is negative or unreasonably large

**Solution:**
1. Verify odoNumber is correct in sheet (monotonically increasing)
2. Check for duplicate odo readings
3. Look for data entry errors:
   ```sql
   -- Find suspicious km_traveled values
   SELECT * FROM fuel_transactions
   WHERE is_full_tank = TRUE
     AND (km_traveled < 0 OR km_traveled > 5000)
   ORDER BY transaction_date;
   ```

### Issue: Timeout on Large Import

**Symptom:** Script times out after 6 minutes

**Solution:**
1. **Batch Import:** Split into smaller batches
   ```javascript
   // Modify importHistoricalFuelImports() to process range:
   for (let i = 1; i < Math.min(values.length, 501); i++) {
     // Process first 500 records
   }
   ```
2. **Increase Delay:** Reduce API load
   ```javascript
   Utilities.sleep(200); // Increase from 100ms to 200ms
   ```
3. **Run Multiple Times:** Skip already imported records

---

## 📚 Related Documentation

- [FUEL_AUTO_CALCULATION_GUIDE.md](FUEL_AUTO_CALCULATION_GUIDE.md) - Auto-calculation logic details
- [FUEL_TRANSACTIONS_MIGRATION_GUIDE.md](FUEL_TRANSACTIONS_MIGRATION_GUIDE.md) - Database schema migration
- [SQL_FIFO_INVENTORY_GUIDE.md](SQL_FIFO_INVENTORY_GUIDE.md) - Weighted average SQL implementation
- [backend-gas/Code.gs](backend-gas/Code.gs) - Import function implementation

---

## ✅ Post-Import Checklist

- [ ] Migration 009 executed successfully
- [ ] Fuel imports imported (all records)
- [ ] Fuel transactions imported (all records)
- [ ] Weighted average price calculated correctly
- [ ] Full-tank records flagged (is_full_tank = TRUE)
- [ ] Efficiency calculated for eligible records
- [ ] Verification queries all pass
- [ ] No suspicious data in logs
- [ ] Dashboard displays correct inventory
- [ ] Fuel efficiency reports show data

---

## 🎯 Success Metrics

After successful import, you should see:

1. **Inventory Dashboard:**
   - Current inventory matches expected value
   - Weighted average price is reasonable
   - Historical trend shows imports and transactions

2. **Fuel Efficiency Reports:**
   - Efficiency values between 8-25 L/100km (typical range)
   - Consistent patterns per vehicle
   - No NULL values for recent full-tank records

3. **Database Integrity:**
   - No orphaned records
   - All foreign keys valid
   - Calculated values within expected ranges

---

## 🆘 Support

If you encounter issues:

1. **Check Logs:** View > Logs in Apps Script editor
2. **Review Documentation:** See related docs above
3. **Inspect Database:** Run verification SQL queries
4. **Test Single Record:** Try importing one record manually
5. **Contact Developer:** Provide logs and error messages

---

**Last Updated:** 2025-01-XX  
**Version:** 1.0
