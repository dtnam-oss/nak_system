# 🚀 Quick Deployment Guide - Historical Data Import

## ✅ What Was Completed

### 1. Code Implementation ✓
- **File:** `backend-gas/Code.gs`
- **Functions Added:**
  - `importHistoricalFuelImports()` - Import fuel imports with WAC
  - `importHistoricalFuelTransactions()` - Import transactions with auto-calc
  - `onOpen()` - Custom menu integration
  - `showImportGuide()` - In-app help dialog

### 2. Documentation ✓
- **File:** `HISTORICAL_DATA_IMPORT_GUIDE.md`
- **Sections:** 30+ comprehensive sections
- **Coverage:** Prerequisites, execution, verification, troubleshooting

### 3. Git Commit ✓
- **Commit:** `4b4c498`
- **Message:** feat: Add historical data import functions
- **Files:** 2 changed, 891 insertions(+)
- **Status:** Pushed to GitHub ✓

---

## 📋 Next Steps (Deployment)

### Step 1: Deploy Code.gs to Google Apps Script
```bash
cd backend-gas
clasp push
```

Expected output:
```
└─ Code.gs
└─ Config.gs
└─ appsscript.json
Pushed 3 files.
```

### Step 2: Run Database Migration
```bash
# Connect to your PostgreSQL database
psql -U postgres -d nak_logistics -f database/009_add_fuel_calculation_columns.sql
```

Verify:
```sql
\d fuel_transactions
-- Should show: is_full_tank, km_traveled, total_fuel_period, efficiency
```

### Step 3: Test Import Functions

1. **Open Google Sheets**
   - Navigate to your AppSheet spreadsheet

2. **Refresh to Load Menu**
   - Reload the page (Cmd+R / Ctrl+R)
   - Wait for "🔄 NAK System Sync" menu to appear

3. **Test Import**
   - Click: **🔄 NAK System Sync** → **📥 Import Historical Data**
   - Click: **📊 View Import Guide** (verify dialog works)
   - Click: **1️⃣ Import Fuel Imports** (start with small test)

4. **Check Logs**
   - Extensions > Apps Script
   - View > Logs (Ctrl+Enter)
   - Verify import progress and success

### Step 4: Full Import (After Testing)

```javascript
// Run in Apps Script editor:

// 1. Import all fuel imports
importHistoricalFuelImports()
// Wait for completion (~1-2 minutes for 100-200 records)

// 2. Import all fuel transactions
importHistoricalFuelTransactions()
// Wait for completion (~2-3 minutes for 200-400 records)
```

### Step 5: Verify Results

```sql
-- Check counts
SELECT 
  (SELECT COUNT(*) FROM fuel_imports) as imports,
  (SELECT COUNT(*) FROM fuel_transactions) as transactions,
  (SELECT COUNT(*) FROM fuel_transactions WHERE is_full_tank = TRUE) as full_tanks;

-- Check calculations
SELECT 
  license_plate,
  COUNT(*) as records,
  AVG(efficiency) as avg_efficiency
FROM fuel_transactions
WHERE is_full_tank = TRUE 
  AND efficiency IS NOT NULL
GROUP BY license_plate
ORDER BY license_plate;

-- Check weighted average
SELECT * FROM mv_fifo_inventory;
```

---

## 🎯 Import Execution Checklist

- [ ] **Pre-Import**
  - [ ] Migration 009 executed
  - [ ] Code.gs deployed via clasp
  - [ ] API endpoint verified in Config.gs
  - [ ] Database backup created

- [ ] **Import Fuel Imports**
  - [ ] Menu appears in Google Sheets
  - [ ] Test with 5-10 records first
  - [ ] Review logs for errors
  - [ ] Run full import
  - [ ] Verify WAC calculations

- [ ] **Import Fuel Transactions**
  - [ ] Wait for imports to complete
  - [ ] Run full transaction import
  - [ ] Monitor logs for auto-calc triggers
  - [ ] Verify efficiency calculations

- [ ] **Post-Import Verification**
  - [ ] Run SQL verification queries
  - [ ] Check dashboard displays correctly
  - [ ] Test fuel efficiency reports
  - [ ] Review any failed records

---

## 📊 Expected Results

### Import Statistics (Example)

**Fuel Imports:**
```
Total: 156
✓ Imported: 155
✗ Failed: 1
Time: ~15 seconds
```

**Fuel Transactions:**
```
Total: 423
✓ Imported: 422
📊 Auto-calculated: 156 (full-tank records)
✗ Failed: 1
Time: ~63 seconds
```

### Database State After Import

```sql
-- Fuel Imports
total_imports: 155
current_inventory: 1,250 L
current_avg_price: 23,450 VND/L

-- Fuel Transactions
total_transactions: 422
full_tank_records: 156
calculated_records: 155 (excluding first record per vehicle)
avg_efficiency: 12.5 L/100km
```

---

## 🐛 Common Issues & Solutions

### Issue: Menu Doesn't Appear

**Solution:**
1. Redeploy Code.gs: `clasp push`
2. Reload Google Sheets (Cmd+R)
3. Wait 10-15 seconds for script to initialize
4. Check Apps Script > Logs for errors

### Issue: Import Fails with 401 Error

**Solution:**
1. Verify API key in Config.gs matches Vercel env
2. Check endpoint URL is correct
3. Test webhook manually:
   ```bash
   curl -X POST https://nak-system.vercel.app/api/webhook/appsheet \
     -H "x-api-key: nak_logistics_2025_secure_key" \
     -H "Content-Type: application/json" \
     -d '{"Action": "FuelImport_Upsert", "data": {...}}'
   ```

### Issue: No Auto-Calculation

**Solution:**
1. Verify migration 009 was run
2. Check category values match exactly:
   - "Chốt tháng" or "CHỐT THÁNG"
   - "Bàn giao" or "BÀN GIAO"
   - "Khởi tạo" or "KHỞI TẠO"
3. Review Vercel logs for calculation errors

### Issue: Timeout on Large Import

**Solution:**
1. Increase delay in Code.gs:
   ```javascript
   Utilities.sleep(200); // Increase to 200ms
   ```
2. Or split into batches manually
3. Run multiple times (skips already imported)

---

## 📚 Documentation Reference

| Document | Purpose |
|----------|---------|
| [HISTORICAL_DATA_IMPORT_GUIDE.md](HISTORICAL_DATA_IMPORT_GUIDE.md) | Complete import guide (30+ sections) |
| [FUEL_AUTO_CALCULATION_GUIDE.md](FUEL_AUTO_CALCULATION_GUIDE.md) | Auto-calculation logic details |
| [FUEL_TRANSACTIONS_MIGRATION_GUIDE.md](FUEL_TRANSACTIONS_MIGRATION_GUIDE.md) | Database migration guide |
| [backend-gas/Code.gs](backend-gas/Code.gs) | Source code implementation |

---

## 🎉 Success Criteria

Import is successful when:

1. ✅ All records imported without errors
2. ✅ Weighted average price calculated correctly
3. ✅ Full-tank records flagged (is_full_tank = TRUE)
4. ✅ Efficiency calculated for eligible records
5. ✅ Dashboard shows correct inventory
6. ✅ Reports display fuel efficiency data
7. ✅ No NULL values for recent calculations
8. ✅ Data integrity checks pass

---

## 📞 Support Contacts

**Technical Issues:**
- Check Vercel logs: https://vercel.com/your-project/logs
- Review Apps Script logs: Extensions > Apps Script > View > Logs
- Inspect database: Use provided SQL verification queries

**Data Issues:**
- Review failed rows in import logs
- Check source data in Google Sheets
- Verify column mappings in Config.gs

---

**Deployment Status:** ✅ Ready for Production  
**Last Updated:** 2025-01-XX  
**Git Commit:** 4b4c498
