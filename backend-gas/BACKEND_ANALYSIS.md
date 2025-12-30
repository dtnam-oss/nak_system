# NAK Logistics Backend - Google Apps Script Analysis

## Tổng quan kiến trúc hiện tại

**Workflow**: AppSheet → Webhook → Google Apps Script → Google Sheets → Dashboard

### Spreadsheets
1. **VEHICLE_SPREADSHEET** (`1fzepYrS-o5zc01h7nQFzJSOwagoTvOgoiDQHrTLB12E`)
   - Nguồn dữ liệu chính từ AppSheet
   - Sheets: `chuyen_di`, `chi_tiet_chuyen_di`, `phuong_tien`, `doi_xe`

2. **MAIN_SPREADSHEET** (`18pS9YMZSwZCVBt_anIGn3GN4qFoPpMtALQm4YvMDd-g`)
   - Database cho web dashboard
   - Sheet chính: `data_chuyen_di` (JSON structure)

## Cấu trúc Code

### 1. **Code.gs** - Main Entry Point
- `doGet(e)` - GET endpoint cho dashboard reports
- `doPost(e)` - POST endpoint (deprecated, logic moved to WebhookSync.gs)
- `createJsonResponse()` - Helper tạo JSON response

**API Endpoints:**
```javascript
GET ?action=getDashboardReport
GET ?action=getDashboardReportWithFilters&filters={...}
```

### 2. **Config.gs** - Configuration Service
**Spreadsheet IDs:**
- SPREADSHEET_ID: `18pS9YMZSwZCVBt_anIGn3GN4qFoPpMtALQm4YvMDd-g`
- VEHICLE_SPREADSHEET_ID: `1fzepYrS-o5zc01h7nQFzJSOwagoTvOgoiDQHrTLB12E`


**Actions:**
- GET_DATA, GET_REPORT_DATA, GET_VEHICLE_DATA
- GET_JNT_REPORT, GET_GHN_REPORT
- UPDATE_STATUS, UPDATE_ACTIVITY

### 3. **ReportService.gs** - Dashboard Reports
**Main Functions:**
- `getDashboardReport()` - Lấy toàn bộ báo cáo
- `getDashboardReportWithFilters(filters)` - Báo cáo có filter

**Data Structure:**
```javascript
{
  success: true,
  data: {
    cards: {
      tongDoanhThu: number,
      soChuyen: number,
      soXeNAK: number,
      soXeVendor: number
    },
    charts: {
      doanhThuTheoNgay: [{date, value}],
      doanhThuTheoTuyen: [{label, value}],
      doanhThuTheoKhachHang: [{label, value}],
      doanhThuTheoDonVi: [{label, value}]
    }
  }
}
```

**Filters:**
- fromDate, toDate
- khachHang (text search)
- loaiTuyen

### 4. **AppSheetWebhookService.gs** - Webhook Handler
**Event Types:**
- ADD: Thêm mới chuyến đi
- UPDATE/EDIT: Cập nhật chuyến đi
- DELETE: Xóa chuyến đi
- UPSERT: Thêm/cập nhật tự động

**Logic:**
1. Parse payload từ AppSheet
2. Validate data
3. Route theo eventType
4. Thực hiện operation trên Google Sheets
5. Return success/error response

**Helpers:**
- `findRowByMaChuyenDi()` - Tìm row theo ID
- `createRowFromData()` - Tạo row từ object
- `updateRowFromData()` - Update row từ object
- `buildColumnIndexMap()` - Map column names to indices

### 5. **WebhookSync.gs** - Advanced Webhook (1000+ lines)
**Main Webhook Endpoint:**
```javascript
function doPost(e) {
  const requestData = JSON.parse(e.postData.contents);

  // Routes:
  // 1. syncFullDatabase - Rebuild toàn bộ
  // 2. eventType: 'add' - Thêm mới
  // 3. eventType: 'edit' - Cập nhật
  // 4. eventType: 'delete' - Xóa
  // 5. eventType: 'chitiet_add' - Thêm chi tiết
  // 6. eventType: 'chitiet_edit' - Sửa chi tiết
  // 7. eventType: 'chitiet_delete' - Xóa chi tiết
}
```

**Chi Tiết Events:**
- Chi tiết events update parent record's `data_json` field
- Query chi tiết từ VEHICLE_SPREADSHEET mỗi lần
- Không dựa vào webhook payload (AppSheet REF_ROWS issues)

**Duplicate Prevention:**
- Check existing maChuyenDi before ADD
- Convert duplicate ADD to EDIT

### 6. **UpdateService.gs** - Update Operations
**Functions:**
- `updateVehicleStatus(maTaiXe, trangThai)` - Cập nhật trạng thái xe
- `updateVehicleActivity(bienKiemSoat, ngayTao, soLuongChuyen)` - Cập nhật hoạt động
- `updateCell()` - Generic update
- `updateCellBatch()` - Batch update
- `updateJsonField()` - Update JSON field trong cell

### 7. **Utils.gs** - Utilities
**Date Helpers:**
- `formatDateToDMY(date)` - DD/MM/YYYY
- `formatDateToYMD(date)` - YYYY-MM-DD
- `convertDateFormat(dateString)` - Convert formats

**JSON Helpers:**
- `parseJSON(jsonString, defaultValue)`
- `stringifyJSON(obj)`

**Array Helpers:**
- `getColumnIndex(headers, columnName)`
- `getColumnIndexes(headers, columnNames)`
- `arrayToJsonResponse(headers, dataArray, transformFn)`

**Response Helpers:**
- `createSuccessResponse(data, message)`
- `createErrorResponse(message, error)`

### 8. **CreateDataBase.gs** - Database Builder
**Purpose:** Đọc từ VEHICLE_SPREADSHEET, transform sang JSON, ghi vào MAIN_SPREADSHEET

**Process:**
1. Read `chuyen_di` + `chi_tiet_chuyen_di`
2. Build chi tiết map by `ma_chuyen_di`
3. Transform to JSON structure
4. Write to `data_chuyen_di` sheet

**JSON Structure:**
```javascript
{
  maChuyenDi, ngayTao, tenKhachHang, loaiChuyen,
  loaiTuyen, tenTuyen, tenTaiXe, donViVanChuyen,
  trangThai, tongQuangDuong, tongDoanhThu,

  data: {
    thongTinChuyenDi: { soXe, khCap1 },
    chiTietLoTrinh: [
      {
        thuTu, id, loaiTuyenKH, maTuyen, loTrinh,
        maTem, quangDuong, taiTrong, taiTrongTinhPhi,
        hinhThucTinhGia, soChieu, donGia, thanhTien
      }
    ]
  }
}
```

### 9. **RemoveDuplicates.gs** - Cleanup Utility
**Problem:** Webhook triggers multiple times → duplicate rows

**Functions:**
- `removeDuplicates()` - Xóa tất cả duplicates (keep first)
- `reportDuplicates()` - Dry run, chỉ báo cáo
- `removeDuplicatesForSpecificRecord(maChuyenDi)` - Xóa cho 1 record

### 10. **DataService.gs** - Deprecated
Đã migrate sang PostgreSQL backend (2025-12-20)

## Data Flow

### 1. AppSheet → Google Sheets (Real-time Sync)
```
AppSheet (User Input)
  ↓ Webhook
Google Apps Script
  ↓ Query chi_tiet from VEHICLE_SPREADSHEET
  ↓ Build JSON
Google Sheets (MAIN_SPREADSHEET/data_chuyen_di)
```

### 2. Dashboard → Reports
```
Frontend (Next.js)
  ↓ HTTP GET
Google Apps Script (doGet)
  ↓ ReportService.getDashboardReport()
  ↓ Read data_chuyen_di sheet
  ↓ Calculate metrics
Frontend (Display charts)
```

## Schema - data_chuyen_di Sheet

| Column | Type | Description |
|--------|------|-------------|
| maChuyenDi | String | Mã chuyến đi (PK) |
| ngayTao | Date | Ngày tạo (YYYY-MM-DD) |
| tenKhachHang | String | Tên khách hàng |
| loaiChuyen | String | Loại chuyến |
| loaiTuyen | String | Loại tuyến |
| tenTuyen | String | Tên tuyến |
| tenTaiXe | String | Tên tài xế |
| donViVanChuyen | String | NAK/VENDOR |
| trangThai | String | Trạng thái chuyến đi |
| tongQuangDuong | Number | Tổng km |
| tongDoanhThu | Number | Tổng doanh thu (VND) |
| data_json | JSON String | Nested data (thông tin + chi tiết) |

## Performance Considerations

1. **Batch Operations**: Use `getRange().setValues()` instead of individual `setValue()`
2. **Caching**: ReportService reads entire sheet once, calculates in memory
3. **Duplicate Prevention**: Check before INSERT to avoid webhook duplication
4. **Query Optimization**: Chi tiết được query 1 lần, không loop

## Known Issues

### 1. Webhook Duplication
- **Problem**: AppSheet webhook triggers 4 times
- **Solution**: Duplicate check in `handleAddEvent()` + `RemoveDuplicates.gs`

### 2. REF_ROWS in Webhook
- **Problem**: AppSheet REF_ROWS cause JSON parsing errors
- **Solution**: Query chi_tiet from VEHICLE_SPREADSHEET directly

### 3. Date Format Inconsistency
- **Problem**: Multiple date formats (ISO 8601, DD/MM/YYYY, YYYY-MM-DD)
- **Solution**: `formatDateValue()` handles all formats

## Migration Path to Next.js

### Phase 1: API Layer (Next.js API Routes)
- [ ] Migrate ReportService → `/api/reports/dashboard`
- [ ] Migrate Webhook → `/api/webhooks/appsheet`
- [ ] Keep Google Sheets as data source initially

### Phase 2: Database Migration
- [ ] Export Google Sheets → PostgreSQL/MySQL
- [ ] Update API to read from database
- [ ] Maintain webhook sync to database

### Phase 3: Real-time Features
- [ ] WebSocket for live updates
- [ ] Optimistic UI updates
- [ ] Background sync jobs

## API Endpoints to Build

### GET Endpoints
```
GET /api/reports/dashboard
GET /api/reports/dashboard?fromDate=2024-01-01&toDate=2024-12-31
GET /api/reports/revenue-by-route
GET /api/reports/revenue-by-customer
```

### POST Endpoints (Webhooks)
```
POST /api/webhooks/appsheet
  - Handle ADD/EDIT/DELETE events
  - Handle chi_tiet events
  - Sync to database
```

### Utility Endpoints
```
POST /api/sync/full-database
GET /api/health
POST /api/duplicates/remove
```

## Security Considerations

1. **Webhook Authentication**
   - Validate AppSheet signature
   - API key/secret verification

2. **CORS Configuration**
   - Allow specific origins only
   - Implement rate limiting

3. **Data Validation**
   - Validate all webhook payloads
   - Sanitize inputs

4. **Error Handling**
   - Graceful degradation
   - Comprehensive logging
   - Alert on failures
