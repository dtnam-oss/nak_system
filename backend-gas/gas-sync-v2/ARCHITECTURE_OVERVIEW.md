# NAK Logistics Sync Architecture v2.0
## From Direct Webhook to GAS-Mediated Integration

---

## Executive Summary

### Problem Statement (Old Architecture)

**AppSheet Direct Webhook → Next.js API:**

```
┌──────────┐                    ┌──────────────┐
│ AppSheet │ ─── Webhook ────> │  Next.js API │
└──────────┘                    └──────────────┘
                                        ↓
                                    ❌ Failures:
                                    - Invalid JSON
                                    - Null values in numbers
                                    - Inconsistent date formats
                                    - Vietnamese status not mapped
                                    - No retry logic
```

**Root Causes:**

1. **Data Quality Issues**
   - AppSheet sends null for empty numeric fields
   - Backend expects numbers, gets null → Type mismatch error
   - No validation before sending

2. **Format Inconsistencies**
   - Dates: DD/MM/YYYY vs YYYY-MM-DD
   - Numbers: "1,234.56" vs 1234.56
   - Status: "Hoàn tất" vs "approved"

3. **JSON Reliability**
   - Complex nested structures from AppSheet
   - REF_ROWS causing <<REF_ROWS('table')>> strings
   - Invalid JSON syntax occasionally

4. **No Error Recovery**
   - AppSheet webhook fires once, no retry
   - Silent failures common
   - Debugging very difficult

---

### Solution (New Architecture)

**AppSheet Bot → Google Apps Script → Next.js API:**

```
┌──────────┐          ┌─────────────────┐          ┌──────────────┐
│ AppSheet │          │  Google Apps    │          │  Next.js API │
│   Bot    │ ─────> │    Script       │ ─────> │   (Clean    │
│          │          │                 │          │    Data)     │
└──────────┘          └─────────────────┘          └──────────────┘
                             │
                             ├─ Data Reading
                             ├─ Data Cleaning
                             ├─ Type Conversion
                             ├─ Validation
                             ├─ JSON Construction
                             └─ Retry Logic (3x)
```

**Key Benefits:**

| Aspect | Old | New |
|--------|-----|-----|
| **Data Quality** | ❌ Raw from AppSheet | ✅ Cleaned & validated |
| **Type Safety** | ❌ Nulls everywhere | ✅ Guaranteed types (null → 0) |
| **JSON Validity** | ❌ 70% success rate | ✅ 100% valid JSON |
| **Error Handling** | ❌ No retry | ✅ 3x retry with backoff |
| **Debugging** | ❌ Black box | ✅ Full GAS execution logs |
| **Status Mapping** | ❌ Backend must handle | ✅ Vietnamese → English at GAS |
| **Maintenance** | ❌ Hard to debug | ✅ Easy to trace & fix |

---

## Detailed Architecture

### Layer 1: AppSheet Bot Triggers

**3 Separate Bots (Event-Driven):**

```javascript
// Bot 1: Add Event
Event: "Adds only" on table "ChuyenDi"
Action: Call syncTripToBackend(tripId=[_THISROW].[maChuyenDi], eventType="Add")

// Bot 2: Edit Event
Event: "Updates only" on table "ChuyenDi"
Action: Call syncTripToBackend(tripId=[_THISROW].[maChuyenDi], eventType="Edit")

// Bot 3: Delete Event
Event: "Deletes only" on table "ChuyenDi"
Action: Call syncTripToBackend(tripId=[_THISROW_BEFORE].[maChuyenDi], eventType="Delete")
```

**Why Separate Bots?**

- Clear separation of concerns
- Each bot handles ONE event type
- Easy to debug specific event issues
- Can disable individual bots without affecting others

---

### Layer 2: Google Apps Script Processing

#### 2.1 Entry Point

```javascript
function syncTripToBackend(tripId, eventType) {
  // 1. Validate inputs
  // 2. Branch by eventType
  // 3. Build payload
  // 4. Send to backend
  // 5. Handle errors & retry
  // 6. Return result
}
```

#### 2.2 Data Flow for Add/Edit Events

```
┌─────────────────────────────────────────────────────────┐
│ 1. READ FROM SHEETS (Batch Optimization)               │
├─────────────────────────────────────────────────────────┤
│ • Read "chuyen_di" sheet → Find row with tripId        │
│ • Read "chi_tiet_lo_trinh" sheet → Find all refs      │
│ • Single getDataRange() call per sheet (fast!)         │
└──────────────────┬──────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────┐
│ 2. DATA CLEANING (Critical Step)                       │
├─────────────────────────────────────────────────────────┤
│ Numbers:                                                │
│   null → 0                                              │
│   "" → 0                                                │
│   "1,234.56" → 1234.56                                  │
│                                                          │
│ Dates:                                                   │
│   DD/MM/YYYY → YYYY-MM-DD                               │
│   Date object → YYYY-MM-DD                              │
│   Invalid → Today's date                                │
│                                                          │
│ Status:                                                  │
│   "Hoàn tất" → "approved"                               │
│   "Mới" → "new"                                         │
│   "Huỷ" → "rejected"                                    │
│   (Full mapping table in code)                          │
│                                                          │
│ Strings:                                                 │
│   null → ""                                              │
│   Trim whitespace                                        │
└──────────────────┬──────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────┐
│ 3. JSON CONSTRUCTION                                    │
├─────────────────────────────────────────────────────────┤
│ {                                                        │
│   "Action": "Add" | "Edit",                             │
│   "maChuyenDi": "NAK_001",  // String                   │
│   "ngayTao": "2024-12-30",  // YYYY-MM-DD               │
│   "tongDoanhThu": 5000000,  // Number (never null!)     │
│   "trangThai": "approved",  // English enum             │
│   "data_json": {                                         │
│     "thongTinChuyenDi": { ... },                        │
│     "chiTietLoTrinh": [                                 │
│       {                                                  │
│         "khoangCach": 35,   // Number (never null!)     │
│         "doanhThu": 500000  // Number (never null!)     │
│       }                                                  │
│     ]                                                    │
│   }                                                      │
│ }                                                        │
└──────────────────┬──────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────┐
│ 4. JSON VALIDATION                                      │
├─────────────────────────────────────────────────────────┤
│ • Try JSON.stringify(payload)                           │
│ • Try JSON.parse(JSON.stringify(payload))               │
│ • Check required fields exist                           │
│ • Throws error if invalid                               │
└──────────────────┬──────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────┐
│ 5. HTTP REQUEST WITH RETRY                              │
├─────────────────────────────────────────────────────────┤
│ Attempt 1: POST to Next.js API                          │
│   ↓ Fail                                                 │
│ Wait 1 second                                            │
│ Attempt 2: Retry                                         │
│   ↓ Fail                                                 │
│ Wait 1 second                                            │
│ Attempt 3: Final retry                                   │
│   ↓ Success → Return                                     │
│   ↓ Fail → Throw error                                  │
└─────────────────────────────────────────────────────────┘
```

#### 2.3 Data Flow for Delete Events

```
┌─────────────────────────────────────────────────────────┐
│ 1. NO SHEET READ (Row already deleted!)                │
├─────────────────────────────────────────────────────────┤
│ • Row doesn't exist in sheet anymore                    │
│ • Only have tripId from [_THISROW_BEFORE]              │
└──────────────────┬──────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────┐
│ 2. BUILD MINIMAL PAYLOAD                                │
├─────────────────────────────────────────────────────────┤
│ {                                                        │
│   "Action": "Delete",                                    │
│   "maChuyenDi": "NAK_001"                               │
│ }                                                        │
│                                                          │
│ That's it! No other data needed.                        │
└──────────────────┬──────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────┐
│ 3. SEND TO BACKEND                                      │
└─────────────────────────────────────────────────────────┘
```

---

### Layer 3: Next.js API (Enhanced Debug)

**Receives clean, validated data:**

```javascript
POST /api/webhook/appsheet
Headers:
  Content-Type: application/json; charset=utf-8
  x-api-key: [SECRET]

Body: (Guaranteed valid JSON)
{
  "Action": "Add",  // Always one of: Add, Edit, Delete
  "maChuyenDi": "NAK_001",  // Always string, never null
  "tongDoanhThu": 5000000,  // Always number, never null (0 if empty)
  "ngayTao": "2024-12-30",  // Always YYYY-MM-DD format
  "trangThai": "approved",  // Always English enum
  ...
}
```

**Backend processing (existing code):**

```javascript
// app/api/webhook/appsheet/route.ts

1. [APPSHEET_DEBUG] Log headers
2. [APPSHEET_DEBUG] Log raw body
3. Parse JSON (already valid, won't fail!)
4. Authenticate via x-api-key
5. Branch by Action:
   - Delete → DELETE FROM reconciliation_orders
   - Add/Edit → UPSERT into reconciliation_orders
6. Return success response
```

**Key Improvement:**

- ✅ No more JSON parse errors
- ✅ No more null value errors
- ✅ No more type mismatch errors
- ✅ Debugging via [APPSHEET_DEBUG] logs still works
- ✅ All existing backend logic preserved

---

## Data Type Guarantees

### Number Fields

```javascript
// GAS cleanNumber() function guarantees:

Input         →  Output
─────────────────────────
null          →  0
undefined     →  0
""            →  0
"123"         →  123
"1,234.56"    →  1234.56
"1.234,56"    →  1234.56  (European format)
NaN           →  0
Infinity      →  0
```

**Never returns:** `null`, `undefined`, `NaN`, `Infinity`

### Date Fields

```javascript
// GAS formatDate() function guarantees:

Input                  →  Output
────────────────────────────────────
"25/12/2024"          →  "2024-12-25"
"2024-12-25"          →  "2024-12-25"
Date object           →  "2024-12-25"
Invalid string        →  Today's date (YYYY-MM-DD)
null                  →  Today's date
```

**Never returns:** `null`, `undefined`, invalid format

### String Fields

```javascript
// GAS cleanString() function guarantees:

Input         →  Output
─────────────────────────
null          →  ""
undefined     →  ""
"  test  "    →  "test"  (trimmed)
123           →  "123"   (converted)
```

**Never returns:** `null`, `undefined`

### Status Fields

```javascript
// GAS normalizeStatus() function guarantees:

Input (Vietnamese)  →  Output (English Enum)
──────────────────────────────────────────────
"Khởi tạo"         →  "draft"
"Mới"              →  "new"
"Chờ giao"         →  "pending_delivery"
"Đang giao"        →  "in_progress"
"Kết thúc"         →  "completed"
"Hoàn tất"         →  "approved"
"Đã duyệt"         →  "approved"
"Huỷ"              →  "rejected"
null               →  "pending" (default)
```

**Never returns:** Vietnamese strings, `null`, `undefined`

---

## Performance Characteristics

### Latency Breakdown

```
Total Sync Time: ~2-3 seconds

┌────────────────────────────────────────────┐
│ AppSheet Bot Trigger         ~100ms  (3%)  │
├────────────────────────────────────────────┤
│ GAS Execution                ~1500ms (50%) │
│   ├─ Sheet reads             ~800ms        │
│   ├─ Data cleaning           ~200ms        │
│   ├─ JSON construction       ~100ms        │
│   └─ HTTP request            ~400ms        │
├────────────────────────────────────────────┤
│ Next.js API Processing       ~1000ms (33%) │
│   ├─ Request parsing         ~50ms         │
│   ├─ Authentication          ~20ms         │
│   ├─ Database UPSERT         ~900ms        │
│   └─ Response generation     ~30ms         │
├────────────────────────────────────────────┤
│ Network overhead             ~400ms  (14%) │
└────────────────────────────────────────────┘
```

### Throughput

```
Single sync:      ~2.5 seconds
Concurrent syncs: 10 syncs/second (GAS quota limit)
Daily limit:      20,000 syncs/day (GAS quota)
```

### Optimization Opportunities

1. **Reduce Sheet Reads**
   - Current: 2 reads (chuyen_di + chi_tiet)
   - Optimization: Cache sheet data for 30 seconds
   - Savings: ~400ms per sync

2. **Batch Processing**
   - Current: 1 sync per event
   - Optimization: Queue events, send batch every 5 seconds
   - Savings: 70% reduction in HTTP overhead

3. **Database Indexing**
   - Already optimized with 15+ indexes
   - UPSERT takes ~900ms (acceptable)

---

## Error Handling Strategy

### Error Recovery Flow

```
┌────────────────────────────────────────────────────────┐
│ Error occurs at any layer                             │
└───────────────┬────────────────────────────────────────┘
                ↓
┌────────────────────────────────────────────────────────┐
│ Layer 1: AppSheet Bot                                  │
├────────────────────────────────────────────────────────┤
│ • Captures error from GAS                              │
│ • Logs to Monitor → Automation                         │
│ • Can send email notification (optional)               │
│ • Does NOT retry (relies on GAS retry)                 │
└───────────────┬────────────────────────────────────────┘
                ↓
┌────────────────────────────────────────────────────────┐
│ Layer 2: Google Apps Script                            │
├────────────────────────────────────────────────────────┤
│ • Logs full error to Execution log                     │
│ • Retries HTTP request 3 times (1s delay)              │
│ • Returns error object to AppSheet:                    │
│   {                                                     │
│     "success": false,                                   │
│     "tripId": "NAK_001",                               │
│     "error": "HTTP 500: Database error",               │
│     "stack": "..."                                      │
│   }                                                     │
└───────────────┬────────────────────────────────────────┘
                ↓
┌────────────────────────────────────────────────────────┐
│ Layer 3: Next.js API                                   │
├────────────────────────────────────────────────────────┤
│ • Logs error with [APPSHEET_DEBUG] prefix              │
│ • Returns detailed error response:                     │
│   {                                                     │
│     "error": "Database error",                         │
│     "message": "null value in column 'date'",          │
│     "code": "23502",                                    │
│     "orderId": "NAK_001"                               │
│   }                                                     │
└────────────────────────────────────────────────────────┘
```

### Error Categories & Responses

| Error Type | Layer | Retry? | Action |
|-----------|-------|--------|--------|
| **Invalid Input** | GAS | ❌ No | Return error immediately |
| **Trip Not Found** | GAS | ❌ No | Return error (data issue) |
| **JSON Invalid** | GAS | ❌ No | Should never happen (validation) |
| **Network Timeout** | GAS | ✅ Yes | Retry 3x with backoff |
| **HTTP 401** | Backend | ❌ No | Config error, don't retry |
| **HTTP 500** | Backend | ✅ Yes | Server error, retry |
| **Database Error** | Backend | ✅ Yes | Transient issue, retry |

---

## Security Model

### Authentication Flow

```
┌────────────────────────────────────────────────────────┐
│ 1. AppSheet → GAS                                      │
├────────────────────────────────────────────────────────┤
│ • GAS Web App deployed with "Execute as: Me"          │
│ • Only callable by AppSheet (check User-Agent?)       │
│ • No additional auth needed (Google OAuth handles it) │
└───────────────┬────────────────────────────────────────┘
                ↓
┌────────────────────────────────────────────────────────┐
│ 2. GAS → Next.js API                                   │
├────────────────────────────────────────────────────────┤
│ • Header: x-api-key: [SECRET_KEY]                     │
│ • Backend validates:                                    │
│   if (apiKey !== process.env.APPSHEET_SECRET_KEY) {   │
│     return 401 Unauthorized                            │
│   }                                                     │
└────────────────────────────────────────────────────────┘
```

### Secret Management

**GAS Side:**

```javascript
// Option 1: Script Properties (Recommended)
const API_KEY = PropertiesService.getScriptProperties().getProperty('API_SECRET_KEY');

// Option 2: Hardcoded (Quick setup, less secure)
const CONFIG = {
  API_SECRET_KEY: 'your-key-here'
};
```

**Backend Side:**

```bash
# Vercel Environment Variables
APPSHEET_SECRET_KEY=same-key-as-gas
```

**Rotation Procedure:**

1. Generate new key: `openssl rand -base64 32`
2. Update Vercel env var
3. Update GAS Script Properties
4. Test with old key (should fail)
5. Test with new key (should succeed)
6. Deploy

---

## Monitoring & Observability

### 3-Layer Logging

```
┌────────────────────────────────────────────────────────┐
│ Layer 1: AppSheet Monitor                              │
├────────────────────────────────────────────────────────┤
│ View: AppSheet Editor → Monitor → Automation          │
│                                                         │
│ Metrics:                                                │
│ • Bot execution count                                   │
│ • Success rate                                          │
│ • Failure details                                       │
│ • Return values from GAS                                │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│ Layer 2: GAS Execution Logs                            │
├────────────────────────────────────────────────────────┤
│ View: Apps Script Editor → Executions                 │
│                                                         │
│ Logs (prefix [GAS_SYNC_V2]):                          │
│ • Input parameters (tripId, eventType)                 │
│ • Data read from sheets                                 │
│ • Cleaned data values                                   │
│ • JSON payload sent                                     │
│ • HTTP response from backend                            │
│ • Execution duration                                    │
│ • Errors with stack traces                              │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│ Layer 3: Vercel Function Logs                          │
├────────────────────────────────────────────────────────┤
│ View: Vercel Dashboard → Project → Logs               │
│                                                         │
│ Logs (prefix [APPSHEET_DEBUG]):                       │
│ • Request headers                                       │
│ • Raw body                                              │
│ • Parsed JSON                                           │
│ • Authentication result                                 │
│ • Data normalization steps                              │
│ • Database operation result                             │
│ • Response returned                                     │
└────────────────────────────────────────────────────────┘
```

### Tracing a Single Sync

```
User creates trip "NAK_123" at 10:30:00

10:30:00.100 - AppSheet Bot "Sync Trip Add" triggers
10:30:00.200 - GAS receives call: tripId=NAK_123, eventType=Add
10:30:00.300 - GAS reads sheets (800ms)
10:30:01.100 - GAS cleans data (200ms)
10:30:01.300 - GAS builds JSON (100ms)
10:30:01.400 - GAS sends HTTP POST (400ms)
10:30:01.800 - Next.js receives request
10:30:01.820 - Next.js validates API key ✓
10:30:01.840 - Next.js parses JSON ✓
10:30:01.860 - Next.js normalizes data ✓
10:30:02.760 - Next.js database UPSERT ✓ (900ms)
10:30:02.790 - Next.js returns 200 OK
10:30:02.800 - GAS receives response ✓
10:30:02.810 - GAS returns success to AppSheet
10:30:02.900 - AppSheet logs success

Total: 2.8 seconds
```

**To trace in logs:**

1. Note timestamp of user action
2. Search AppSheet logs for that time ± 5 seconds
3. Get tripId from AppSheet log
4. Search GAS logs for `tripId=NAK_123`
5. Search Vercel logs for `maChuyenDi: NAK_123`
6. Correlate all 3 logs

---

## Migration Strategy

### Phase 1: Parallel Running (Week 1)

```
┌──────────────────────────────────────────────┐
│ OLD SYSTEM (Keep running)                   │
│ AppSheet Webhook ───────> Next.js API       │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│ NEW SYSTEM (Deploy alongside)               │
│ AppSheet Bot ─> GAS ─> Next.js API          │
│ (Test with 10% of traffic)                  │
└──────────────────────────────────────────────┘
```

**Actions:**

1. Deploy GAS scripts
2. Create AppSheet bots (disabled)
3. Enable bots for 1 test table only
4. Monitor for 1 week
5. Compare sync success rates

**Success Criteria:**

- New system: > 99% success rate
- Old system: < 90% success rate (current)

---

### Phase 2: Full Migration (Week 2)

```
┌──────────────────────────────────────────────┐
│ OLD SYSTEM (Disable)                         │
│ AppSheet Webhook ─X─> (Disabled)            │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│ NEW SYSTEM (100% traffic)                   │
│ AppSheet Bot ─> GAS ─> Next.js API          │
│ (All tables)                                 │
└──────────────────────────────────────────────┘
```

**Actions:**

1. Enable bots for all tables
2. Disable old webhook
3. Monitor closely for 3 days
4. Fix any issues immediately

---

### Phase 3: Cleanup (Week 3)

1. Remove old webhook code from backend (optional)
2. Archive old GAS scripts
3. Update documentation
4. Train team on new system
5. Document lessons learned

---

## Rollback Plan

If new system fails:

### Quick Rollback (5 minutes)

1. Disable all AppSheet bots
2. Re-enable old webhook
3. Monitor recovery

### Full Rollback (30 minutes)

1. Revert backend to previous deployment
2. Delete GAS project
3. Restore old AppSheet configuration
4. Post-mortem analysis

---

## Success Metrics

### KPIs to Track

| Metric | Target | Current (Old) | Current (New) |
|--------|--------|---------------|---------------|
| **Sync Success Rate** | > 99% | ~70% | - |
| **Average Sync Time** | < 3s | ~5s | - |
| **Null Value Errors** | 0 | ~20/day | - |
| **JSON Parse Errors** | 0 | ~15/day | - |
| **Manual Retries** | 0 | ~10/day | - |
| **Data Accuracy** | 100% | ~95% | - |

---

**Last Updated:** 2024-12-30
**Version:** 2.0.0
**Author:** NAK Logistics Development Team
