# 🎯 VEHICLES SYNC MODULE - Implementation Summary

## ✅ Completed Tasks

### 1. Backend (Google Apps Script)

#### Config.gs Updates
- ✅ Added `VEHICLES: 'phuong_tien'` to `SHEET_NAMES`
- ✅ Created `VEHICLES_COLUMNS` mapping (10 columns)
- ✅ Added `dinh_muc_d` to `NUMBER_COLUMNS` array

#### Code.gs New Functions
- ✅ `syncVehiclesToDB()` - Main sync function
- ✅ `readVehiclesFromSheet()` - Read & transform data
- ✅ `buildVehicleColumnMap()` - Build column index map
- ✅ `transformVehicleRow()` - Transform single row
- ✅ `parseVietnameseNumber()` - Parse "1,9" → 1.9

**Total Lines Added:** ~230 lines

### 2. Frontend (Next.js API)

#### route.ts Updates
- ✅ Added `VehiclePayload` interface (10 fields)
- ✅ Updated `GASPayload` to include `UpsertVehicles` action
- ✅ Added `vehicles?: VehiclePayload[]` to payload
- ✅ Implemented `UpsertVehicles` handler (section 3)
- ✅ Batch upsert logic with error handling
- ✅ Fixed TypeScript error (orderId fallback)

**Total Lines Added:** ~90 lines

### 3. Database

#### Migration SQL
- ✅ Created `005_create_vehicles_table.sql`
- ✅ 10 columns matching sheet structure
- ✅ 4 indexes for performance
- ✅ Comments for documentation
- ✅ Verification query

### 4. Documentation

- ✅ `VEHICLES_SYNC_GUIDE.md` - Comprehensive 300+ lines guide
- ✅ `VEHICLES_SYNC_SUMMARY.md` - This file

---

## 📋 Files Modified/Created

```
✏️  Modified Files:
- backend-gas/Config.gs           (+25 lines)
- backend-gas/Code.gs              (+230 lines)
- app/api/webhook/appsheet/route.ts (+95 lines)

🆕 New Files:
- database/005_create_vehicles_table.sql
- VEHICLES_SYNC_GUIDE.md
- VEHICLES_SYNC_SUMMARY.md
```

---

## 🔄 Data Flow

```
┌─────────────────────────────────────────────────────────┐
│  Google Sheet: phuong_tien                              │
│  ┌─────────────────────────────────────────────────┐   │
│  │ bien_kiem_soat | tai_trong | dinh_muc_d | ...  │   │
│  │ 51C-12345     | 1,9       | 25         | ...   │   │
│  │ 59A-67890     | 3.5       | 28.5       | ...   │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  GAS: syncVehiclesToDB()                                │
│  - Read all rows                                        │
│  - Transform: "1,9" → 1.9                              │
│  - Trim whitespace                                      │
│  - Handle nulls                                         │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  HTTP POST                                              │
│  URL: /api/webhook/appsheet                            │
│  Header: x-api-key                                      │
│  Body: {                                                │
│    "Action": "UpsertVehicles",                         │
│    "vehicles": [...]                                    │
│  }                                                      │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  Next.js API: route.ts                                  │
│  - Authenticate                                         │
│  - Validate payload                                     │
│  - Loop through vehicles array                          │
│  - Execute UPSERT SQL                                   │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  Vercel Postgres: vehicles table                        │
│  ┌─────────────────────────────────────────────────┐   │
│  │ license_plate | weight_capacity | fuel_norm |..│   │
│  │ 51C-12345    | 1.9             | 25         |..│   │
│  │ 59A-67890    | 3.5             | 28.5       |..│   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## 🗂️ Column Mapping

| Sheet Column      | DB Column              | Type    | Transform          |
|-------------------|------------------------|---------|-------------------|
| bien_kiem_soat    | license_plate          | TEXT    | trim()            |
| tai_trong         | weight_capacity        | DECIMAL | "1,9" → 1.9       |
| don_vi            | weight_unit            | TEXT    | -                 |
| tai_trong_chu     | weight_text            | TEXT    | -                 |
| hieu_xe           | brand                  | TEXT    | -                 |
| loai_xe           | body_type              | TEXT    | -                 |
| tinh_trang        | current_status         | TEXT    | -                 |
| dinh_muc_d        | fuel_norm              | DECIMAL | "" → 0            |
| tai_xe_theo_      | assigned_driver_codes  | TEXT    | -                 |
| loai_hinh         | provider               | TEXT    | -                 |

---

## 🧪 Testing Steps

### 1. Database Setup
```sql
-- Run migration
\i database/005_create_vehicles_table.sql

-- Verify table
SELECT * FROM vehicles LIMIT 5;
```

### 2. GAS Test
```javascript
// In Apps Script Editor
function testVehiclesSync() {
  const result = syncVehiclesToDB();
  Logger.log(result);
}
```

### 3. API Test
```bash
curl -X POST https://nak-system.vercel.app/api/webhook/appsheet \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-secret-key" \
  -d '{
    "Action": "UpsertVehicles",
    "vehicles": [{
      "licensePlate": "TEST-001",
      "weightCapacity": 1.5,
      "brand": "Hino",
      "fuelNorm": 25
    }]
  }'
```

### 4. Verify Result
```sql
SELECT 
  license_plate,
  brand,
  weight_capacity,
  fuel_norm,
  updated_at
FROM vehicles
WHERE license_plate = 'TEST-001';
```

---

## ⚙️ Configuration

### Config.gs
```javascript
SHEET_NAMES: {
  VEHICLES: 'phuong_tien'
},

VEHICLES_COLUMNS: {
  'bien_kiem_soat': 'licensePlate',
  'tai_trong': 'weightCapacity',
  // ... 8 more mappings
}
```

### Environment Variables
```env
APPSHEET_SECRET_KEY=nak_logistics_2025_secure_key
```

---

## 🔐 Security Features

- ✅ API key authentication required
- ✅ Parameterized SQL queries (no injection risk)
- ✅ Input validation (license_plate required)
- ✅ Error handling per vehicle (batch doesn't fail completely)
- ✅ HTTPS only communication

---

## 📊 Performance

**Estimated Sync Time:**
- 100 vehicles: ~5-10 seconds
- 500 vehicles: ~20-30 seconds
- 1000 vehicles: ~40-60 seconds

**Database Operations:**
- UPSERT per vehicle (efficient with ON CONFLICT)
- 4 indexes for fast queries
- Timestamp tracking (created_at, updated_at)

---

## 🎯 Usage Examples

### Manual Sync (GAS Editor)
```javascript
syncVehiclesToDB()
```

### Scheduled Sync (Trigger)
```
Function: syncVehiclesToDB
Event: Time-driven
Frequency: Daily 2AM-3AM
```

### Query Vehicles (SQL)
```sql
-- All active vehicles
SELECT * FROM vehicles 
WHERE current_status = 'Đang hoạt động';

-- Vehicles by brand
SELECT brand, COUNT(*) as count
FROM vehicles
GROUP BY brand
ORDER BY count DESC;

-- High fuel consumption
SELECT license_plate, fuel_norm
FROM vehicles
WHERE fuel_norm > 30
ORDER BY fuel_norm DESC;
```

---

## ⚠️ Important Notes

1. **Sheet Name Must Be Exact:** `phuong_tien` (case-sensitive)
2. **License Plate is Required:** Rows without it are skipped
3. **Number Format:** Both "1,9" and "1.9" work
4. **Upsert Logic:** Safe to run multiple times
5. **Error Handling:** Individual vehicle errors don't stop batch

---

## 🚨 Common Errors & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| "Sheet not found" | Wrong name | Check SHEET_NAMES.VEHICLES |
| "Unauthorized" | Wrong API key | Verify x-api-key header |
| "Table doesn't exist" | No migration | Run 005_create_vehicles_table.sql |
| "licensePlate required" | Empty cell | Fill bien_kiem_soat column |

---

## 📈 Monitoring

### Success Response
```json
{
  "success": true,
  "action": "upsert_vehicles",
  "total": 25,
  "successCount": 25,
  "errorCount": 0
}
```

### Partial Success Response
```json
{
  "success": true,
  "action": "upsert_vehicles",
  "total": 25,
  "successCount": 23,
  "errorCount": 2,
  "errors": [
    "BLANK-PLATE: licensePlate is required",
    "BAD-FORMAT: invalid number"
  ]
}
```

---

## 🔄 Future Enhancements

- [ ] Incremental sync (only changed rows)
- [ ] Webhook from sheet changes (real-time)
- [ ] Dashboard UI for vehicle management
- [ ] Vehicle history tracking
- [ ] Image upload support
- [ ] Advanced reporting

---

## 📚 Documentation Links

- **Detailed Guide:** [VEHICLES_SYNC_GUIDE.md](./VEHICLES_SYNC_GUIDE.md)
- **Migration SQL:** [database/005_create_vehicles_table.sql](./database/005_create_vehicles_table.sql)
- **Code Implementation:** 
  - [backend-gas/Config.gs](./backend-gas/Config.gs)
  - [backend-gas/Code.gs](./backend-gas/Code.gs)
  - [app/api/webhook/appsheet/route.ts](./app/api/webhook/appsheet/route.ts)

---

## ✨ Summary

**Module đã hoàn thành 100%:**

✅ Google Apps Script functions  
✅ Next.js API endpoints  
✅ Database schema  
✅ Data transformations  
✅ Error handling  
✅ Documentation  
✅ TypeScript types  

**Ready for testing and deployment!**

---

**Implementation Date:** December 31, 2025  
**Version:** 1.0.0  
**Status:** ✅ Complete & Ready
