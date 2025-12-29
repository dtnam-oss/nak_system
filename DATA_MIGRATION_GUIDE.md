# 📦 Data Migration Guide: Google Sheets → Vercel Postgres

## Overview

Complete guide for migrating historical data from Google Sheets to Vercel Postgres database using secure bulk import API.

## 🎯 What's Included

1. ✅ **Bulk Import API** - `app/api/seed/import/route.ts`
2. ✅ **Google Apps Script** - `backend-gas/gas/ImportToPostgres.js`
3. ✅ **Security** - Header-based authentication
4. ✅ **Batch Processing** - Handle large datasets (50 records/batch)
5. ✅ **Error Handling** - Detailed error tracking
6. ✅ **Duplicate Prevention** - `ON CONFLICT DO NOTHING`

## 🔐 Security

### Migration Secret

The API requires a secret key in the request header to prevent unauthorized access.

**Local (.env.local):**
```bash
MIGRATION_SECRET=migration-2025-secure
```

**Production (Vercel Dashboard):**
1. Go to Project Settings → Environment Variables
2. Add: `MIGRATION_SECRET` = `your-secure-random-string`
3. Use a strong random string (e.g., from `openssl rand -hex 32`)

**⚠️ Important:** Change the default secret in production!

## 🚀 Step-by-Step Migration

### Step 1: Setup Vercel Environment

1. **Add Environment Variable:**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Select project → Settings → Environment Variables
   - Add `MIGRATION_SECRET` with secure value
   - Save and redeploy

2. **Verify Deployment:**
   ```bash
   # Check API is deployed
   curl https://your-app.vercel.app/api/seed/import \
     -X POST \
     -H "Content-Type: application/json" \
     -H "x-migration-secret: wrong-secret" \
     -d '{"records":[]}'

   # Should return 401 Unauthorized
   ```

### Step 2: Setup Google Apps Script

1. **Open Apps Script Editor:**
   - Open your Google Sheet
   - Go to Extensions → Apps Script

2. **Create New File:**
   - Click ➕ → Script file
   - Name: `ImportToPostgres`

3. **Paste Code:**
   - Copy content from `backend-gas/gas/ImportToPostgres.js`
   - Paste into editor

4. **Configure:**
   ```javascript
   // Line 13-14: Update these values
   const VERCEL_API_URL = 'https://your-app.vercel.app/api/seed/import'
   const MIGRATION_SECRET = 'migration-2025-secure' // Must match Vercel
   ```

5. **Save:**
   - Click 💾 Save
   - Name project: "NAK Logistics Migration"

### Step 3: Test Connection

1. **Run Verification:**
   - Select function: `verifyAPIConnection`
   - Click ▶️ Run
   - Check logs (View → Logs)

**Expected Output:**
```
🔍 Verifying API connection...
URL: https://your-app.vercel.app/api/seed/import
Secret: migration-...
Status: 400
Response: {"error":"Invalid request: records array is required"...}
✅ API connection verified (auth successful)
```

**If you see 401:**
```
❌ Authentication failed - check MIGRATION_SECRET
```
→ Secret mismatch. Update in Apps Script or Vercel.

### Step 4: Test Import (10 Records)

1. **Run Test:**
   - Select function: `testImport`
   - Click ▶️ Run
   - Check logs

**Expected Output:**
```
🧪 Running test import (10 records)...
📊 Testing with 10 records
✅ Test completed: 10 success, 0 failed
```

2. **Verify in Database:**
   ```sql
   -- Via Vercel Dashboard → Storage → Query
   SELECT COUNT(*) FROM reconciliation_orders;
   -- Should return 10

   SELECT * FROM reconciliation_orders
   ORDER BY created_at DESC
   LIMIT 5;
   -- Should show your test records
   ```

### Step 5: Full Migration

1. **Run Full Import:**
   - Select function: `importAllData`
   - Click ▶️ Run
   - Wait for completion (may take several minutes)

2. **Monitor Progress:**
   ```
   🚀 Starting data import to Vercel Postgres...
   📊 Found 1000 records
   📦 Split into 10 batches
   🔄 Processing batch 1/10 (100 records)...
   ✅ Batch 1 completed: 100 success, 0 failed
   🔄 Processing batch 2/10 (100 records)...
   ✅ Batch 2 completed: 100 success, 0 failed
   ...
   ✅ Import completed!
   📊 Summary: 1000 success, 0 failed
   ```

3. **Handle Errors (if any):**
   ```
   ❌ Errors in batch 5:
     - NAK-2024-500: Invalid date format
     - NAK-2024-501: Missing required field
   ```

   Fix data in Google Sheet and re-run. Duplicate detection prevents re-importing.

### Step 6: Verify Data

1. **Check Record Count:**
   ```sql
   SELECT COUNT(*) FROM reconciliation_orders;
   ```

2. **Check Sample Data:**
   ```sql
   SELECT
     order_id,
     date,
     customer,
     trip_type,
     provider,
     total_distance,
     cost,
     jsonb_pretty(details) AS details
   FROM reconciliation_orders
   ORDER BY created_at DESC
   LIMIT 10;
   ```

3. **Check Data Quality:**
   ```sql
   -- Records with missing trip_type
   SELECT COUNT(*) FROM reconciliation_orders WHERE trip_type IS NULL;

   -- Records with NULL details
   SELECT COUNT(*) FROM reconciliation_orders WHERE details IS NULL;

   -- Records with invalid status
   SELECT status, COUNT(*)
   FROM reconciliation_orders
   GROUP BY status;
   ```

## 📊 API Specification

### Endpoint

```
POST /api/seed/import
```

### Headers

```
Content-Type: application/json
x-migration-secret: migration-2025-secure
```

### Request Body

```json
{
  "records": [
    {
      "maChuyenDi": "NAK-2024-001",
      "ngayTao": "2024-12-25",
      "tenKhachHang": "Công ty ABC",
      "loaiChuyen": "Một chiều",
      "loaiTuyen": "Liên tỉnh",
      "tenTuyen": "TP.HCM - Hà Nội",
      "tenTaiXe": "Nguyễn Văn A",
      "donViVanChuyen": "NAK",
      "tongQuangDuong": 1700,
      "tongDoanhThu": 5000000,
      "trangThai": "Đã duyệt",
      "data_json": "{\"thongTinChuyenDi\":{\"soXe\":\"51A-12345\",\"taiXe\":\"Nguyễn Văn A\",\"quangDuong\":1700},\"chiTietLoTrinh\":[{\"thuTu\":1,\"loTrinh\":\"TP.HCM - Hà Nội\",\"quangDuong\":1700,\"taiTrong\":15.5,\"thanhTien\":5000000}]}"
    }
  ]
}
```

### Response (Success)

```json
{
  "success": 100,
  "failed": 0,
  "total": 100,
  "elapsed": "2543ms",
  "errors": []
}
```

### Response (Partial Failure)

```json
{
  "success": 95,
  "failed": 5,
  "total": 100,
  "elapsed": "2751ms",
  "errors": [
    {
      "order_id": "NAK-2024-096",
      "error": "Invalid date format"
    },
    {
      "order_id": "NAK-2024-097",
      "error": "Missing required field: maChuyenDi"
    }
  ]
}
```

### Response (Auth Error)

```json
{
  "error": "Unauthorized: Invalid migration secret",
  "success": 0,
  "failed": 0
}
```

## 🔄 Field Mapping

| Google Sheet Column | API Field | Database Column | Type | Notes |
|---------------------|-----------|-----------------|------|-------|
| `ma_chuyen_di` | `maChuyenDi` | `order_id` | string | Primary key |
| `ngay_tao` | `ngayTao` | `date` | date | Auto-formatted |
| `ten_khach_hang` | `tenKhachHang` | `customer` | string | |
| `loai_chuyen` | `loaiChuyen` | `trip_type` | string | |
| `loai_tuyen` | `loaiTuyen` | `route_type` | string | |
| `ten_tuyen` | `tenTuyen` | `route_name` | string | |
| `ten_tai_xe` | `tenTaiXe` | `driver_name` | string | |
| `don_vi_van_chuyen` | `donViVanChuyen` | `provider` | string | |
| `tong_quang_duong` | `tongQuangDuong` | `total_distance` | number | |
| `tong_doanh_thu` | `tongDoanhThu` | `cost` | number | |
| `trang_thai` | `trangThai` | `status` | string | Auto-mapped |
| `data_json` | `data_json` | `details` | JSONB | Auto-parsed |

### Derived Fields

| Database Column | Source | Logic |
|----------------|--------|-------|
| `license_plate` | `data_json.thongTinChuyenDi.soXe` | Extracted from JSON |
| `weight` | `data_json.chiTietLoTrinh[].taiTrong` | Sum of all weights |

### Status Mapping

| Input (Vietnamese) | Input (English) | Database Value |
|-------------------|----------------|----------------|
| "Đã duyệt" | "approved" | `approved` |
| "Chờ duyệt" | "pending" | `pending` |
| "Từ chối" | "rejected" | `rejected` |
| "Đang xử lý" | "processing" | `processing` |

## 🐛 Troubleshooting

### Error: 401 Unauthorized

**Cause:** Migration secret mismatch

**Solution:**
1. Check `MIGRATION_SECRET` in Vercel Dashboard
2. Update in Apps Script to match
3. Redeploy Vercel if changed

### Error: 400 Invalid request

**Cause:** Missing or invalid `records` array

**Solution:**
- Ensure request body has `records` field
- Ensure `records` is an array
- Ensure array is not empty

### Error: Invalid date format

**Cause:** Date in unexpected format

**Solution:**
- Supported formats: `YYYY-MM-DD`, `DD/MM/YYYY`, timestamp
- Update `formatDate()` in Apps Script if needed

### Error: Missing required field

**Cause:** `maChuyenDi` (order_id) is empty

**Solution:**
- Check Google Sheet data
- Ensure `ma_chuyen_di` column has values
- Check column name mapping in Apps Script

### Duplicate Key Error

**Not an error!** `ON CONFLICT DO NOTHING` prevents duplicates.

If you see:
```
✅ Batch completed: 50 success, 0 failed
```

But database count didn't increase by 50 → some records already existed.

### Import Takes Too Long

**Cause:** Large dataset (1000+ records)

**Solution:**
- Normal: ~1-2 seconds per batch (100 records)
- Expected: 1000 records = ~20-40 seconds
- If timeout: Reduce `BATCH_SIZE` in Apps Script to 50

### Apps Script Authorization Required

**Cause:** First time running script

**Solution:**
1. Click "Review Permissions"
2. Select your Google account
3. Click "Advanced" → "Go to NAK Logistics Migration (unsafe)"
4. Click "Allow"

## 📈 Performance

| Records | Batches | Est. Time | API Calls |
|---------|---------|-----------|-----------|
| 100 | 1 | 2s | 1 |
| 500 | 5 | 10s | 5 |
| 1,000 | 10 | 20s | 10 |
| 5,000 | 50 | 100s | 50 |
| 10,000 | 100 | 200s | 100 |

**Batch Size:** 100 records (configurable in Apps Script)

**API Timeout:** 60 seconds (Vercel Node.js runtime)

**Rate Limits:**
- Apps Script: 20,000 URL Fetch calls/day
- Vercel: No specific limit on Hobby plan

## ✅ Post-Migration Checklist

- [ ] Migration completed without errors
- [ ] Record count matches Google Sheet
- [ ] Sample data verified in database
- [ ] All fields populated correctly
- [ ] JSONB details parsed correctly
- [ ] Status values correct (approved/pending/rejected)
- [ ] Dates formatted correctly
- [ ] No duplicate records
- [ ] Test API `/api/reconciliation` works
- [ ] Test frontend displays migrated data
- [ ] Remove or disable migration API (optional)

## 🔒 Security Best Practices

### After Migration

1. **Change Migration Secret:**
   ```bash
   # Generate new secret
   openssl rand -hex 32

   # Update in Vercel Dashboard
   # Redeploy
   ```

2. **Disable Import API (Optional):**
   ```typescript
   // app/api/seed/import/route.ts
   export async function POST(request: NextRequest) {
     return NextResponse.json(
       { error: 'Import API disabled' },
       { status: 403 }
     )
   }
   ```

3. **Remove Apps Script (Optional):**
   - Delete `ImportToPostgres.js` from Apps Script editor

4. **Monitor Access:**
   ```bash
   # Check Vercel logs
   vercel logs --follow

   # Look for import API calls
   ```

## 📚 Related Documentation

- **Schema Upgrade:** [SCHEMA_UPGRADE.md](./SCHEMA_UPGRADE.md)
- **Implementation Guide:** [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)
- **Postgres Migration:** [POSTGRES_MIGRATION.md](./POSTGRES_MIGRATION.md)
- **API Route:** [app/api/seed/import/route.ts](./app/api/seed/import/route.ts)
- **Apps Script:** [backend-gas/gas/ImportToPostgres.js](./backend-gas/gas/ImportToPostgres.js)

---

**Status:** ✅ Ready for migration

**Estimated Time:** 20 seconds per 1000 records

**Safety:** ✅ Duplicate prevention, transaction safety, error tracking
