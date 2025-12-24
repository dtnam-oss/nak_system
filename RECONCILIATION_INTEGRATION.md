# Tích hợp Trang Đối Soát với Google Apps Script

## Tổng quan

Đã hoàn thành việc tích hợp trang Đối soát vận chuyển với backend Google Apps Script, cho phép:
- Fetch dữ liệu thực từ Google Sheets
- Filter dữ liệu theo nhiều tiêu chí
- Hiển thị dashboard với summary statistics
- Pagination và high-performance table rendering

## Files đã tạo/cập nhật

### Frontend - Next.js

#### 1. Types
**File:** `types/reconciliation.ts`
- ✅ Cập nhật interface `ReconciliationRecord` để map với schema Google Sheets
- ✅ Thêm interface `ChiTietLoTrinh` cho nested data
- ✅ Cập nhật `ReconciliationFilters` với các fields mới
- ✅ Thêm `ReconciliationApiResponse` type

**Các fields chính:**
- `maChuyenDi`, `ngayTao`, `tenKhachHang`
- `loaiChuyen`, `loaiTuyen`, `tenTuyen`
- `tenTaiXe`, `donViVanChuyen`, `trangThai`
- `tongQuangDuong`, `tongDoanhThu`
- `soXe` (từ nested JSON)
- `chiTietLoTrinh[]` (array of detail records)

#### 2. Service Layer
**File:** `lib/services/gas-api.ts`
- ✅ Thêm function `getReconciliationData(filters?)`
- ✅ Support optional filters qua URL params
- ✅ Timeout handling (30s default)
- ✅ Error handling và logging

#### 3. API Route
**File:** `app/api/reconciliation/route.ts`
- ✅ GET endpoint với edge runtime
- ✅ Parse query params thành filters object
- ✅ Call Google Apps Script API
- ✅ Return JSON response với proper cache headers

**Query Params:**
- `fromDate`, `toDate` - Date range
- `khachHang` - Customer name search
- `donViVanChuyen` - NAK/VENDOR
- `loaiTuyen` - Route type
- `trangThai` - Status
- `searchQuery` - General search

#### 4. React Hook
**File:** `hooks/use-reconciliation-data.ts`
- ✅ TanStack Query integration
- ✅ Auto-refetch every 5 minutes
- ✅ 2-minute stale time
- ✅ Reactive filters support
- ✅ Loading, error, data states

#### 5. Page Component
**File:** `app/reconciliation/page.tsx`
- ✅ Sử dụng `useReconciliationData` hook
- ✅ Loading skeleton states
- ✅ Error handling với user-friendly messages
- ✅ Display summary bar và data table
- ✅ Filter integration

#### 6. Data Table Component
**File:** `components/reconciliation/data-table.tsx`
- ✅ Cập nhật columns để hiển thị fields từ backend
- ✅ Vietnamese number/currency formatting
- ✅ Badge variants cho đơn vị vận chuyển (NAK=green, VENDOR=secondary)
- ✅ Zebra striping
- ✅ Pagination (20 records/page)

**Columns:**
1. Mã chuyến đi
2. Ngày
3. Biển số xe
4. Tuyến đường
5. Khách hàng
6. Quãng đường (km)
7. Doanh thu (VND)
8. Đơn vị (NAK/VENDOR)
9. Trạng thái

#### 7. Filter Sidebar
**File:** `components/reconciliation/filter-sidebar.tsx`
- ✅ Date range inputs (fromDate, toDate)
- ✅ Customer search input
- ✅ Route type input
- ✅ Transport unit dropdown (NAK/VENDOR)
- ✅ Status input
- ✅ General search input
- ✅ Reset button

### Backend - Google Apps Script

#### 1. Reconciliation Service
**File:** `backend-gas/gas/ReconciliationService.gs`

**Main Function:**
```javascript
getReconciliationData(filters)
```

**Features:**
- ✅ Read from `data_chuyen_di` sheet
- ✅ Parse nested `data_json` field
- ✅ Extract `soXe` from nested JSON
- ✅ Extract `chiTietLoTrinh` array
- ✅ Apply comprehensive filters:
  - Date range (fromDate, toDate)
  - Customer text search (case-insensitive)
  - Transport unit exact match
  - Route type text search
  - Status text search
  - General search (across multiple fields)
- ✅ Calculate summary statistics:
  - Total orders
  - Total amount
  - Total distance
  - Approved orders
  - Pending orders

**Helper Functions:**
- `buildColumnIndexMap()` - Map headers to indices
- `parseReconciliationRecord()` - Parse row to object
- `formatDateValue()` - Handle multiple date formats
- `applyReconciliationFilters()` - Apply filter logic
- `calculateReconciliationSummary()` - Aggregate metrics

#### 2. Main Entry Point
**File:** `backend-gas/gas/Code.gs`
- ✅ Thêm route `getReconciliationData` trong `doGet()`
- ✅ Parse filters từ query params
- ✅ Call ReconciliationService
- ✅ Return JSON response

**New Available Action:**
```
GET ?action=getReconciliationData&filters={...}
```

### Documentation

**File:** `SETUP_GOOGLE_APPS_SCRIPT.md`
- ✅ Thêm test endpoint cho reconciliation
- ✅ Thêm test với filters example
- ✅ Cập nhật checklist cho reconciliation page
- ✅ Thêm network tab verification steps

## Data Flow

```
User selects filters
  ↓
ReconciliationPage (filters state)
  ↓
useReconciliationData hook (TanStack Query)
  ↓
/api/reconciliation (Next.js API Route)
  ↓
gas-api.ts service (fetch with timeout)
  ↓
Google Apps Script doGet(e)
  ↓
ReconciliationService.getReconciliationData(filters)
  ↓
Read data_chuyen_di sheet
  ↓
Parse data_json for nested fields
  ↓
Apply filters
  ↓
Calculate summary
  ↓
Return JSON response
  ↓
Display in DataTable + SummaryBar
```

## API Response Structure

```typescript
{
  success: boolean
  data?: {
    records: ReconciliationRecord[]  // Filtered records
    summary: {
      totalOrders: number
      totalAmount: number           // VND
      totalDistance: number         // km
      approvedOrders: number
      pendingOrders: number
    }
    total: number                   // Record count
  }
  error?: string
}
```

## Filter Examples

### 1. Date Range
```
GET /api/reconciliation?fromDate=2024-01-01&toDate=2024-12-31
```

### 2. Customer Search
```
GET /api/reconciliation?khachHang=ABC
```

### 3. Transport Unit
```
GET /api/reconciliation?donViVanChuyen=NAK
```

### 4. Combined Filters
```
GET /api/reconciliation?fromDate=2024-01-01&donViVanChuyen=NAK&khachHang=ABC
```

### 5. General Search
```
GET /api/reconciliation?searchQuery=nak_123
```

## Performance Optimizations

1. **TanStack Query Caching**
   - 2-minute stale time
   - 5-minute auto-refetch
   - Query key includes filters for granular caching

2. **Backend Optimization**
   - Single sheet read operation
   - In-memory filtering
   - Efficient JSON parsing

3. **Frontend Rendering**
   - TanStack Table v8 virtualization
   - Pagination (20 rows/page)
   - Memoized columns

## Testing Checklist

### Backend (Google Apps Script)
- [ ] Deploy script as Web App
- [ ] Test health endpoint: `?action=getReconciliationData`
- [ ] Test with filters: `?action=getReconciliationData&filters={"donViVanChuyen":"NAK"}`
- [ ] Verify response structure
- [ ] Check execution logs

### Frontend (Next.js)
- [ ] Visit `/reconciliation` page
- [ ] Verify loading skeleton displays
- [ ] Check data loads successfully
- [ ] Test each filter individually:
  - [ ] Date range filter
  - [ ] Customer filter
  - [ ] Route type filter
  - [ ] Transport unit dropdown
  - [ ] Status filter
  - [ ] General search
- [ ] Test filter combinations
- [ ] Test pagination controls
- [ ] Verify summary statistics update with filters
- [ ] Check responsive design
- [ ] Test error states (disconnect backend)

### Integration
- [ ] Check DevTools Network tab
- [ ] Verify API calls: `/api/reconciliation`
- [ ] Check response times (< 3s expected)
- [ ] Verify cache headers
- [ ] Test with real data from Google Sheets

## Known Limitations

1. **Client-side Pagination**: All records fetched at once, pagination done client-side
   - **Future**: Implement server-side pagination with `offset` and `limit` params

2. **No Real-time Updates**: Relies on 5-minute auto-refetch
   - **Future**: Implement WebSocket for real-time sync

3. **Status Field**: Currently just text search, not standardized enum
   - **Future**: Standardize status values and use dropdown

4. **Sorting**: Currently done client-side via TanStack Table
   - **Future**: Implement server-side sorting

## Next Steps

1. **Upload ReconciliationService.gs to Google Apps Script**
   - Copy `backend-gas/gas/ReconciliationService.gs`
   - Paste into Apps Script Editor
   - Save

2. **Update Code.gs**
   - Copy updated `backend-gas/gas/Code.gs`
   - Replace existing Code.gs in Apps Script
   - Save

3. **Deploy/Redeploy Web App**
   - If already deployed: Create new deployment or manage existing
   - Test new endpoint

4. **Update .env.local** (if not done yet)
   - Add actual deployment URL

5. **Test End-to-End**
   - Follow testing checklist above

## Troubleshooting

### Error: "Failed to fetch reconciliation data"
- Check .env.local has correct GAS deployment URL
- Verify ReconciliationService.gs is uploaded
- Check Code.gs includes getReconciliationData route
- View Apps Script execution logs

### Error: "Sheet data_chuyen_di not found"
- Verify MAIN_SPREADSHEET has sheet named exactly `data_chuyen_di`
- Check Config.gs SPREADSHEET_ID is correct

### Data not filtering
- Check filter values match data format
- Date filters expect YYYY-MM-DD format
- Text searches are case-insensitive
- Check Apps Script execution logs

### Empty data_json fields
- Verify CreateDataBase.gs was run to populate data_json
- Check data_json column has valid JSON
- Review parsing errors in Apps Script logs

---

**Status**: ✅ Ready for deployment and testing
**Date**: 2024-12-24
**Version**: 1.0
