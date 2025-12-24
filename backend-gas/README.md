# NAK Logistics - Google Apps Script Backend

Backend code được clone từ Google Apps Script project cho hệ thống NAK Logistics.

## 📁 Cấu trúc thư mục

```
backend-gas/
├── gas/                          # Google Apps Script files
│   ├── Code.gs                   # Main entry point (doGet, doPost)
│   ├── Config.gs                 # Configuration service
│   ├── ReportService.gs          # Dashboard reports logic
│   ├── ReconciliationService.gs  # Reconciliation data service (NEW)
│   ├── AppSheetWebhookService.gs # Basic webhook handler
│   ├── WebhookSync.gs            # Advanced webhook sync (1000+ lines)
│   ├── UpdateService.gs          # Update operations
│   ├── Utils.gs                  # Utility functions
│   ├── CreateDataBase.gs         # Database builder
│   ├── RemoveDuplicates.gs       # Cleanup utility
│   └── DataService.gs            # Deprecated (migrated to PostgreSQL)
│
├── .clasp.json                   # Clasp configuration
├── .claspignore                  # Files to ignore when pushing
├── appsscript.json               # Apps Script manifest
├── BACKEND_ANALYSIS.md           # Phân tích chi tiết backend
├── CLASP_SETUP.md                # Hướng dẫn sử dụng Clasp
└── README.md                     # File này
```

## 🔗 Google Apps Script Project

- **Script ID**: `1TTS7pJuKKBuh5w7kAHr4xrGzfUwyN9Bw2IT1xd0DwskRC4Uhjd0EaLLL`
- **Project Name**: NAK Bang Ke API
- **Editor URL**: https://script.google.com/home/projects/1TTS7pJuKKBuh5w7kAHr4xrGzfUwyN9Bw2IT1xd0DwskRC4Uhjd0EaLLL/edit

## 📊 Google Sheets

### 1. VEHICLE_SPREADSHEET (AppSheet Data Source)
- **ID**: `1fzepYrS-o5zc01h7nQFzJSOwagoTvOgoiDQHrTLB12E`
- **Sheets**: `chuyen_di`, `chi_tiet_chuyen_di`, `phuong_tien`, `doi_xe`
- **Purpose**: Nguồn dữ liệu từ AppSheet

### 2. MAIN_SPREADSHEET (Dashboard Data)
- **ID**: `18pS9YMZSwZCVBt_anIGn3GN4qFoPpMtALQm4YvMDd-g`
- **Sheet**: `data_chuyen_di` (JSON structure)
- **Purpose**: Database cho web dashboard

## 🔄 Data Flow

```
AppSheet (Mobile/Web)
    ↓ Webhook
Google Apps Script (WebhookSync.gs)
    ↓ Query chi_tiet from VEHICLE_SPREADSHEET
    ↓ Build JSON structure
Google Sheets (MAIN_SPREADSHEET)
    ↓ HTTP GET
Dashboard Frontend (Next.js)
```

## 📦 Key Features

### 1. Webhook Sync (WebhookSync.gs)
- ✅ ADD Event - Thêm mới chuyến đi
- ✅ EDIT Event - Cập nhật chuyến đi
- ✅ DELETE Event - Xóa chuyến đi
- ✅ CHI_TIET Events - Sync chi tiết lộ trình
- ✅ Duplicate Prevention
- ✅ Full Database Rebuild

### 2. Dashboard Reports (ReportService.gs)
- ✅ Summary Cards (doanh thu, số chuyến, số xe)
- ✅ Charts:
  - Doanh thu theo ngày (trend line)
  - Doanh thu theo tuyến
  - Doanh thu theo khách hàng (top 10)
  - Doanh thu theo đơn vị (NAK vs Vendor)
- ✅ Filters (date range, customer, route type)

### 3. Database Builder (CreateDataBase.gs)
- ✅ Read from VEHICLE_SPREADSHEET
- ✅ Transform to JSON structure
- ✅ Write to data_chuyen_di sheet
- ✅ Batch processing (500 records/batch)

### 4. Utilities
- ✅ UpdateService - Generic update operations
- ✅ RemoveDuplicates - Cleanup duplicate records
- ✅ Utils - Date formatting, JSON parsing, array helpers

## 🎯 API Endpoints

### GET Endpoints
```bash
# Get dashboard report
GET https://script.google.com/macros/s/{SCRIPT_ID}/exec?action=getDashboardReport

# Get dashboard with filters
GET https://script.google.com/macros/s/{SCRIPT_ID}/exec?action=getDashboardReportWithFilters&filters={"fromDate":"2024-01-01","toDate":"2024-12-31"}

# Get reconciliation data (NEW)
GET https://script.google.com/macros/s/{SCRIPT_ID}/exec?action=getReconciliationData

# Get reconciliation with filters (NEW)
GET https://script.google.com/macros/s/{SCRIPT_ID}/exec?action=getReconciliationData&filters={"fromDate":"2024-01-01","donViVanChuyen":"NAK"}
```

### POST Endpoint (Webhook)
```bash
# AppSheet webhook
POST https://script.google.com/macros/s/{SCRIPT_ID}/exec

Body:
{
  "eventType": "add",
  "ma_chuyen_di": "nak_123",
  "ngay_tao": "2024-12-24",
  ...
}
```

## 📖 Documentation

Xem [BACKEND_ANALYSIS.md](BACKEND_ANALYSIS.md) để có:
- Chi tiết từng file
- Data schema
- Known issues
- Migration path
- Security considerations

## ⚠️ Known Issues

### 1. Webhook Duplication
**Problem**: AppSheet webhook triggers 4 times → tạo 4 bản ghi duplicate

**Solutions**:
- Duplicate check trong `handleAddEvent()`
- Use `RemoveDuplicates.gs` để cleanup
- Convert duplicate ADD → EDIT

### 2. AppSheet REF_ROWS Issue
**Problem**: REF_ROWS trong webhook payload gây lỗi JSON parsing

**Solution**: Query chi_tiet trực tiếp từ VEHICLE_SPREADSHEET thay vì dùng webhook payload

### 3. Date Format Inconsistency
**Problem**: Nhiều format khác nhau (ISO 8601, DD/MM/YYYY, YYYY-MM-DD)

**Solution**: `formatDateValue()` xử lý tất cả formats

## 🚀 Migration to Next.js

Backend này sẽ được migrate sang Next.js API routes:

### Phase 1: API Layer
- [ ] `/api/reports/dashboard` (từ ReportService.gs)
- [ ] `/api/webhooks/appsheet` (từ WebhookSync.gs)
- [ ] Keep Google Sheets as data source

### Phase 2: Database
- [ ] Export Google Sheets → PostgreSQL
- [ ] Update API để đọc từ database
- [ ] Maintain webhook sync

### Phase 3: Real-time
- [ ] WebSocket for live updates
- [ ] Optimistic UI
- [ ] Background sync jobs

## 📝 Development Notes

### Development với Clasp (Recommended)

**Quick Start:**
```bash
# 1. Cài đặt Clasp
npm install -g @google/clasp

# 2. Login
cd backend-gas
clasp login

# 3. Pull code từ Google Apps Script
clasp pull

# 4. Edit code trong VSCode
# ... make changes ...

# 5. Push lên Google Apps Script
clasp push

# 6. Open trong browser để test
clasp open
```

**Xem chi tiết:** [CLASP_SETUP.md](CLASP_SETUP.md)

### Testing
```javascript
// Test CreateDataBase
testCreateDatabase() // Process 5 records only

// Test Duplicates
reportDuplicates() // Dry run
removeDuplicates() // Actual cleanup

// Test ReconciliationService
getReconciliationData(null) // Get all
getReconciliationData({donViVanChuyen: "NAK"}) // Filter by NAK
```

### Debugging
- View logs: Apps Script Editor → Execution log
- Check webhook: Apps Script → Deployments → Web app URL
- Monitor sheets: Open MAIN_SPREADSHEET → data_chuyen_di
- Use `Logger.log()` for debugging
- Check execution history: Apps Script → Executions

### Performance Tips
1. Use batch operations (`getRange().setValues()`)
2. Cache column maps instead of searching each time
3. Query chi_tiet once, not in loops
4. Delete rows in reverse order (bottom → top)
5. Use `SpreadsheetApp.flush()` to force writes

## 🔐 Security

⚠️ **IMPORTANT**: Script có quyền truy cập Google Sheets

**Current State**:
- No authentication on webhook endpoint
- Public GET endpoints
- No rate limiting

**Recommended**:
- Implement webhook signature verification
- Add API key authentication
- Use CORS properly
- Rate limit requests

## 📞 Contact

Dự án: NAK Logistics System
Backend: Google Apps Script + Google Sheets
Frontend: Next.js 14 + TypeScript

---

*Cloned from Google Apps Script on 2025-12-24*
