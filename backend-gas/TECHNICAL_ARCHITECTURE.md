# 📐 KIẾN TRÚC GIẢI PHÁP & KỸ THUẬT

> **Technical Architecture & Implementation Details**

---

## 🏗️ TỔNG QUAN ARCHITECTURE

### Workflow Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER ACTION                              │
│              (Add/Edit/Delete trong AppSheet)                    │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      APPSHEET BOTS                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │   Add Bot   │  │  Edit Bot   │  │ Delete Bot  │            │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘            │
│         │ Params:        │ Params:        │ Params:            │
│         │ tripId,"Add"   │ tripId,"Edit"  │ tripId,"Delete"    │
└─────────┼────────────────┼────────────────┼────────────────────┘
          │                │                │
          └────────────────┴────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│              GOOGLE APPS SCRIPT (GAS)                            │
│  ┌──────────────────────────────────────────────────┐           │
│  │  syncTripToBackend(tripId, eventType)           │           │
│  └─────────────────┬────────────────────────────────┘           │
│                    │                                             │
│         ┌──────────┴──────────┐                                 │
│         │                     │                                 │
│         ▼                     ▼                                 │
│  ┌─────────────┐      ┌─────────────┐                          │
│  │   DELETE?   │      │  ADD/EDIT?  │                          │
│  │             │      │             │                          │
│  │ Skip Read   │      │ Read Sheets │                          │
│  │ Build JSON: │      │ ┌─────────┐ │                          │
│  │ {Action,    │      │ │ Master  │ │                          │
│  │  tripId}    │      │ │  Data   │ │                          │
│  └──────┬──────┘      │ └────┬────┘ │                          │
│         │             │      │      │                          │
│         │             │ ┌────▼────┐ │                          │
│         │             │ │ Detail  │ │                          │
│         │             │ │  Data   │ │                          │
│         │             │ └────┬────┘ │                          │
│         │             │      │      │                          │
│         │             │ ┌────▼────────────────┐                │
│         │             │ │ Map Columns         │                │
│         │             │ │ Format Data Types   │                │
│         │             │ │ Build Full JSON     │                │
│         │             │ └────┬────────────────┘                │
│         │             └──────┘                                 │
│         └────────────────┬────────────────────────              │
│                          │                                      │
│                ┌─────────▼──────────┐                           │
│                │  sendToBackendAPI  │                           │
│                │  (POST JSON)       │                           │
│                └─────────┬──────────┘                           │
└──────────────────────────┼──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                  NEXT.JS BACKEND API                             │
│                /api/webhook/appsheet                             │
│  ┌──────────────────────────────────────────────────┐           │
│  │  1. Parse JSON Request                           │           │
│  │  2. Validate Data                                │           │
│  │  3. Route by Action (Add/Edit/Delete)            │           │
│  │  4. Execute PostgreSQL Query                     │           │
│  │  5. Return Response                              │           │
│  └──────────────────────┬───────────────────────────┘           │
└─────────────────────────┼───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    POSTGRESQL DATABASE                           │
│  ┌──────────────┐     ┌──────────────────────────────┐          │
│  │ trips table  │────▶│ trip_details table           │          │
│  │ (Master)     │     │ (Detail - nested in data_json)│         │
│  └──────────────┘     └──────────────────────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔧 KỸ THUẬT TRIỂN KHAI

### 1. Dynamic Column Mapping

**Vấn đề:** Hard-coded indexes (`data[0]`, `data[1]`) không maintainable khi thay đổi cột.

**Giải pháp:** Sử dụng helper function `getColumnIndex()`:

```javascript
function getColumnIndex(headers, columnName) {
  const normalizedColumnName = String(columnName).trim().toLowerCase();
  
  for (let i = 0; i < headers.length; i++) {
    const headerName = String(headers[i]).trim().toLowerCase();
    if (headerName === normalizedColumnName) {
      return i;
    }
  }
  
  return -1; // Not found
}
```

**Cách sử dụng:**
```javascript
const headers = ['ma_chuyen_di', 'ngay_tao', 'ten_khach_hang'];
const tripIdIndex = getColumnIndex(headers, 'ma_chuyen_di'); // Returns: 0

// Lấy value:
const tripId = row[tripIdIndex];
```

**Ưu điểm:**
- ✅ Thay đổi thứ tự cột → Code vẫn chạy
- ✅ Dễ maintain
- ✅ Self-documenting code

---

### 2. Type-Safe Data Conversion

#### 2.1. Number Parsing

```javascript
function parseNumber(value) {
  if (value === null || value === undefined || value === '') {
    return 0;
  }
  
  const parsed = Number(value);
  return isNaN(parsed) ? 0 : parsed;
}
```

**Test cases:**
- `parseNumber(100)` → `100`
- `parseNumber("100")` → `100`
- `parseNumber("")` → `0`
- `parseNumber(null)` → `0`
- `parseNumber("abc")` → `0`

#### 2.2. Date Formatting

```javascript
function formatDate(value) {
  if (!value) return '';
  
  try {
    let date;
    
    if (value instanceof Date) {
      date = value;
    } else if (typeof value === 'number') {
      // Excel serial date number
      date = new Date((value - 25569) * 86400 * 1000);
    } else {
      date = new Date(value);
    }
    
    if (isNaN(date.getTime())) return '';
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    return '';
  }
}
```

**Test cases:**
- `formatDate(new Date('2025-12-30'))` → `"2025-12-30"`
- `formatDate("2025-12-30")` → `"2025-12-30"`
- `formatDate(45656)` → Excel serial → `"2025-12-30"`
- `formatDate(null)` → `""`

---

### 3. Master-Detail Data Fetching

#### 3.1. Master Data (1:1 Relationship)

```javascript
function getMasterData(tripId) {
  const sheet = getSheet(CONFIG.SHEET_NAMES.MASTER);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  
  const tripIdIndex = getColumnIndex(headers, 'ma_chuyen_di');
  
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (String(row[tripIdIndex]).trim() === String(tripId).trim()) {
      return mapMasterRow(row, headers);
    }
  }
  
  return null;
}
```

#### 3.2. Detail Data (1:N Relationship)

```javascript
function getDetailData(tripId) {
  const sheet = getSheet(CONFIG.SHEET_NAMES.DETAIL);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  
  const tripIdIndex = getColumnIndex(headers, 'ma_chuyen_di');
  
  const detailRecords = [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (String(row[tripIdIndex]).trim() === String(tripId).trim()) {
      detailRecords.push(mapDetailRow(row, headers));
    }
  }
  
  return detailRecords;
}
```

---

### 4. Mapping Strategy

#### 4.1. Configuration-Driven Mapping

**Config:**
```javascript
MASTER_COLUMNS: {
  'ma_chuyen_di': 'maChuyenDi',
  'ngay_tao': 'ngayTao',
  'ten_khach_hang': 'tenKhachHang',
  // ...
}
```

**Mapper:**
```javascript
function mapMasterRow(row, headers) {
  const mappedData = {};
  
  for (const [sheetColumn, jsonKey] of Object.entries(CONFIG.MASTER_COLUMNS)) {
    const columnIndex = getColumnIndex(headers, sheetColumn);
    if (columnIndex === -1) continue;
    
    let value = row[columnIndex];
    
    // Apply type conversion
    if (CONFIG.NUMBER_COLUMNS.includes(sheetColumn)) {
      value = parseNumber(value);
    } else if (CONFIG.DATE_COLUMNS.includes(sheetColumn)) {
      value = formatDate(value);
    } else {
      value = String(value || '').trim();
    }
    
    mappedData[jsonKey] = value;
  }
  
  return mappedData;
}
```

**Ưu điểm:**
- ✅ Single source of truth (Config.gs)
- ✅ Dễ thêm/sửa/xóa column
- ✅ Type conversion tự động

---

### 5. Event Handling Strategy

#### 5.1. Add Event
```javascript
{
  "Action": "Add",
  "maChuyenDi": "CH001",
  "ngayTao": "2025-12-30",
  "tenKhachHang": "Công ty ABC",
  // ... other master fields
  "data_json": {
    "chiTietLoTrinh": [
      { /* detail record 1 */ },
      { /* detail record 2 */ }
    ]
  }
}
```

#### 5.2. Edit Event
```javascript
{
  "Action": "Edit",
  "maChuyenDi": "CH001",
  // ... same structure as Add
}
```

#### 5.3. Delete Event
```javascript
{
  "Action": "Delete",
  "maChuyenDi": "CH001"
  // NO other fields needed
}
```

**Tại sao Delete khác?**
- Khi user xóa row trong AppSheet → Dữ liệu đã mất khỏi Sheet
- GAS KHÔNG THỂ đọc được nữa
- Chỉ cần gửi tripId để Backend xóa

---

## 🔐 ERROR HANDLING & LOGGING

### 1. Try-Catch Pattern

```javascript
function syncTripToBackend(tripId, eventType) {
  try {
    logInfo(`START SYNC: ${tripId} - ${eventType}`);
    
    // Validate inputs
    if (!tripId) throw new Error('tripId is required');
    if (!eventType) throw new Error('eventType is required');
    
    // Build payload
    const payload = buildPayload(tripId, eventType);
    
    // Send to API
    const response = sendToBackendAPI(payload);
    
    logInfo('SYNC SUCCESS');
    return { success: true, response };
    
  } catch (error) {
    logError(`SYNC FAILED: ${error.message}`);
    return { success: false, message: error.message };
  }
}
```

### 2. Logging Levels

```javascript
function logInfo(message) {
  if (CONFIG.LOGGING.ENABLED) {
    Logger.log(`[INFO] ${message}`);
  }
}

function logWarning(message) {
  if (CONFIG.LOGGING.ENABLED) {
    Logger.log(`[WARNING] ${message}`);
  }
}

function logError(message) {
  if (CONFIG.LOGGING.ENABLED) {
    Logger.log(`[ERROR] ${message}`);
  }
}
```

### 3. API Error Handling

```javascript
function sendToBackendAPI(payload) {
  const response = UrlFetchApp.fetch(CONFIG.API.ENDPOINT, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true  // Không throw exception tự động
  });
  
  const responseCode = response.getResponseCode();
  const responseBody = response.getContentText();
  
  if (responseCode >= 200 && responseCode < 300) {
    return JSON.parse(responseBody);
  } else {
    throw new Error(`API Error (${responseCode}): ${responseBody}`);
  }
}
```

---

## 📊 PERFORMANCE CONSIDERATIONS

### 1. Batch Reading (Optimize)

**Không tối ưu:**
```javascript
for (let i = 1; i <= 100; i++) {
  const value = sheet.getRange(i, 1).getValue(); // 100 API calls!
}
```

**Tối ưu:**
```javascript
const values = sheet.getDataRange().getValues(); // 1 API call
for (let i = 1; i < values.length; i++) {
  const value = values[i][0];
}
```

### 2. Early Return

```javascript
function getMasterData(tripId) {
  const values = sheet.getDataRange().getValues();
  
  for (let i = 1; i < values.length; i++) {
    if (row[tripIdIndex] === tripId) {
      return mapMasterRow(row, headers); // Early return, không duyệt hết
    }
  }
  
  return null;
}
```

### 3. Execution Time Limits

- **GAS Execution Time Limit:** 6 minutes
- **Strategy:** Nếu quá nhiều data, cần implement pagination hoặc batch processing

---

## 🧪 TESTING STRATEGY

### 1. Unit Testing (Trong GAS Editor)

```javascript
function testGetColumnIndex() {
  const headers = ['ma_chuyen_di', 'ngay_tao', 'ten_khach_hang'];
  
  assert(getColumnIndex(headers, 'ma_chuyen_di') === 0);
  assert(getColumnIndex(headers, 'ngay_tao') === 1);
  assert(getColumnIndex(headers, 'not_exist') === -1);
  
  Logger.log('testGetColumnIndex PASSED');
}

function testParseNumber() {
  assert(parseNumber(100) === 100);
  assert(parseNumber("100") === 100);
  assert(parseNumber("") === 0);
  assert(parseNumber(null) === 0);
  
  Logger.log('testParseNumber PASSED');
}
```

### 2. Integration Testing

```javascript
function testSyncAdd() {
  const tripId = 'TEST-001'; // Replace with real tripId
  const result = syncTripToBackend(tripId, 'Add');
  
  Logger.log('Result:');
  Logger.log(JSON.stringify(result, null, 2));
  
  // Kiểm tra Backend logs để confirm
}
```

### 3. End-to-End Testing

1. ✅ Add trip trong AppSheet
2. ✅ Kiểm tra Bot execution history
3. ✅ Kiểm tra GAS execution logs
4. ✅ Kiểm tra Backend API logs
5. ✅ Kiểm tra data trong PostgreSQL

---

## 📈 SCALABILITY

### Future Improvements:

1. **Caching:**
   - Cache column index maps
   - Cache config để giảm lookup time

2. **Batch Processing:**
   - Xử lý nhiều trips cùng lúc
   - Queue system nếu có spike traffic

3. **Async Processing:**
   - Dùng Google Cloud Tasks
   - Webhook callback để notify khi done

4. **Monitoring:**
   - Log vào external service (Sentry, LogRocket)
   - Alert khi có lỗi

---

## 🎯 BEST PRACTICES SUMMARY

✅ **DO:**
- Sử dụng dynamic column mapping
- Validate inputs
- Handle errors gracefully
- Log đầy đủ để debug
- Test trước khi deploy
- Document code

❌ **DON'T:**
- Hard-code column indexes
- Ignore errors
- Skip validation
- Deploy without testing
- Forget to update config khi thay đổi columns

---

## 📚 THAM KHẢO

- [Google Apps Script Documentation](https://developers.google.com/apps-script)
- [AppSheet Bots Documentation](https://help.appsheet.com/en/articles/2357317-bots-create-event-driven-actions)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
