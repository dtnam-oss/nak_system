# NAK Logistics System - Complete Workflow Documentation

> Comprehensive guide to all workflows, processes, and integrations in the NAK Logistics Management Dashboard

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture & Data Flow](#architecture--data-flow)
3. [Core Workflows](#core-workflows)
4. [API Integration](#api-integration)
5. [Database Schema](#database-schema)
6. [Key Business Logic](#key-business-logic)
7. [Technology Stack](#technology-stack)
8. [Performance Features](#performance-features)
9. [Known Issues & Solutions](#known-issues--solutions)
10. [Future Roadmap](#future-roadmap)

---

## System Overview

The NAK Logistics Management Dashboard is a high-performance enterprise logistics platform that manages:

- **Reconciliation**: Trip reconciliation with multi-level filtering and real-time sync
- **Dashboard**: KPI metrics, revenue analytics, and trend visualization
- **Vehicle Management**: Fleet tracking and assignment (placeholder)
- **Fuel Management**: Fuel consumption tracking (placeholder)
- **Reports**: Custom report generation and export (placeholder)

### Key Features

- Real-time data synchronization from AppSheet via webhooks
- PostgreSQL database for reliable data storage
- High-performance data tables handling 1000+ records
- Vietnamese-localized business processes
- Enterprise white design with high information density
- Advanced filtering and search capabilities

---

## Architecture & Data Flow

### High-Level Architecture

```
┌─────────────────┐
│   AppSheet      │ Mobile/Web data entry
│   (Mobile/Web)  │
└────────┬────────┘
         │ Webhook POST
         ↓
┌─────────────────────────────────────────┐
│   Next.js API Routes                    │
│   /api/webhook/appsheet                 │
│   - Data validation                     │
│   - Normalization (status, dates, etc.) │
│   - Business logic                      │
└────────┬────────────────────────────────┘
         │ SQL Insert/Update
         ↓
┌─────────────────────────────────────────┐
│   Vercel Postgres Database              │
│   - reconciliation_orders table         │
│   - 15+ indexes for performance         │
│   - JSONB for complex nested data       │
└────────┬────────────────────────────────┘
         │ Query via API
         ↓
┌─────────────────────────────────────────┐
│   Next.js Frontend                      │
│   - React Query caching (2-5 min)       │
│   - TanStack Table rendering            │
│   - Real-time updates                   │
└─────────────────────────────────────────┘
```

### Dual Backend System

1. **Next.js API Routes** (Primary - Current)
   - Webhook ingestion from AppSheet
   - PostgreSQL database management
   - RESTful API for frontend
   - Deployed on Vercel

2. **Google Apps Script** (Legacy - Backup)
   - Dashboard report generation
   - Historical data processing
   - Google Sheets as backup storage
   - Deprecated webhook sync logic

---

## Core Workflows

### 1. Reconciliation Workflow

**Purpose**: Manage and reconcile logistics trips with comprehensive filtering and analysis.

**File**: [app/reconciliation/page.tsx](app/reconciliation/page.tsx)

#### Features

- **High-Performance Data Table**
  - TanStack Table v8 implementation
  - Handles 1000+ records smoothly
  - Pagination (20 rows per page)
  - Zebra striping for readability
  - Sticky header for long scrolls

- **Multi-Level Filtering**
  - **Date Range**: From/To date picker
  - **Customer**: Partial name search
  - **Transport Unit**: NAK / VENDOR / OTHER
  - **Trip Type**: Một chiều / Hai chiều / Nhiều điểm
  - **Route Type**: Nội thành / Liên tỉnh / Đường dài
  - **Status**: Approved / Pending / Rejected
  - **Search Query**: Cross-field search (order_id, customer, license_plate, route_name, driver_name)

- **Real-Time Summary Bar**
  - Total Orders count
  - Total Amount (VND)
  - Total Distance (km)
  - Approved Orders count
  - Pending Orders count

- **Trip Details Modal**
  - General information (vehicle, driver, customer)
  - Metrics (revenue, distance, weight)
  - Nested route details (pickup/delivery points)
  - JSON data visualization

#### User Flow

```
User opens Reconciliation page
    ↓
Frontend queries /api/reconciliation
    ↓
PostgreSQL returns filtered data + summary
    ↓
TanStack Table renders 20 rows
    ↓
User applies filters/search
    ↓
Debounced API call (500ms delay)
    ↓
Table updates with new data
    ↓
User clicks row → Trip Details Modal opens
```

#### Technical Implementation

**Components**:
- [components/reconciliation/data-table.tsx](components/reconciliation/data-table.tsx) - Table rendering
- [components/reconciliation/toolbar.tsx](components/reconciliation/toolbar.tsx) - Filters & search
- [components/reconciliation/summary-bar.tsx](components/reconciliation/summary-bar.tsx) - KPI cards
- [components/reconciliation/TripDetailsDialog.tsx](components/reconciliation/TripDetailsDialog.tsx) - Details modal
- [components/reconciliation/columns.tsx](components/reconciliation/columns.tsx) - Column definitions

**API Endpoint**: `GET /api/reconciliation`

**Database Query**:
```sql
SELECT * FROM reconciliation_orders
WHERE date >= ? AND date <= ?
  AND customer ILIKE ?
  AND provider = ?
  AND trip_type = ?
  AND route_type = ?
  AND status = ?
  AND (
    order_id ILIKE ? OR
    customer ILIKE ? OR
    license_plate ILIKE ? OR
    route_name ILIKE ? OR
    driver_name ILIKE ?
  )
ORDER BY date DESC
LIMIT 20;
```

---

### 2. Dashboard Workflow

**Purpose**: Provide high-level KPIs and analytics for business decision-making.

**File**: [app/dashboard/page.tsx](app/dashboard/page.tsx)

#### Features

- **KPI Cards**
  - Total Revenue (VND)
  - Total Trips count
  - NAK Vehicles count
  - Vendor Vehicles count

- **Analytics Charts** (Planned)
  - Revenue by route (top 5)
  - Revenue by customer (top 5)
  - Daily/monthly trends
  - Provider comparison

- **Quick Access**
  - Link to Reconciliation module
  - Link to Reports module

#### User Flow

```
User opens Dashboard
    ↓
Frontend queries /api/reports/dashboard
    ↓
PostgreSQL aggregates data
    ↓
API returns metrics + chart data
    ↓
Dashboard renders KPI cards
    ↓
User clicks "View Reconciliation" → Navigate to /reconciliation
```

#### Technical Implementation

**API Endpoint**: `GET /api/reports/dashboard`

**Database Queries**:
```sql
-- Total revenue
SELECT SUM(cost) FROM reconciliation_orders WHERE date >= ? AND date <= ?;

-- Total trips
SELECT COUNT(*) FROM reconciliation_orders WHERE date >= ? AND date <= ?;

-- NAK vehicles
SELECT COUNT(DISTINCT license_plate) FROM reconciliation_orders
WHERE provider = 'NAK' AND date >= ? AND date <= ?;

-- Vendor vehicles
SELECT COUNT(DISTINCT license_plate) FROM reconciliation_orders
WHERE provider = 'VENDOR' AND date >= ? AND date <= ?;

-- Revenue by route (top 5)
SELECT route_name, SUM(cost) as total FROM reconciliation_orders
GROUP BY route_name
ORDER BY total DESC
LIMIT 5;
```

---

### 3. AppSheet Webhook Sync Workflow

**Purpose**: Real-time synchronization of trip data from AppSheet to PostgreSQL.

**File**: [app/api/webhook/appsheet/route.ts](app/api/webhook/appsheet/route.ts)

#### Webhook Events

AppSheet triggers webhooks on:
- **Add**: New trip created
- **Update**: Trip data modified
- **Delete**: Trip cancelled/removed

#### Data Flow

```
AppSheet user creates/updates trip
    ↓
AppSheet fires webhook (POST to /api/webhook/appsheet)
    ↓
API validates x-api-key header
    ↓
Extract payload data
    ↓
Normalize data (status, dates, provider, etc.)
    ↓
UPSERT into reconciliation_orders table
    ↓
Return success response
    ↓
Frontend auto-refetches via React Query
```

#### Data Normalization Process

**1. Status Normalization**
```javascript
// Vietnamese → Database enum
"khởi tạo" → "draft"
"mới" → "new"
"chờ giao" → "pending_delivery"
"đang giao" → "in_progress"
"kết thúc" → "completed"
"hoàn tất" / "đã duyệt" → "approved"
"huỷ" / "rejected" → "rejected"
```

**2. Provider Normalization**
```javascript
"NAK" → "NAK"
"VENDOR" / "XE NGOÀI" / "ĐỐI TÁC" → "VENDOR"
Other → "OTHER"
```

**3. Date Format Conversion**
```javascript
// Input formats:
// - DD/MM/YYYY (25/12/2024)
// - YYYY-MM-DD (2024-12-25)
// - ISO 8601 (2024-12-25T00:00:00.000Z)

// Output: YYYY-MM-DD (2024-12-25)
```

**4. Route Type Normalization**
```javascript
"nội thành" → "Nội thành"
"liên tỉnh" → "Liên tỉnh"
"đường dài" → "Đường dài"
"cố định" → "Cố định"
"tăng cường" → "Tăng cường"
```

**5. Trip Type Normalization**
```javascript
"một chiều" / "1 chiều" → "Một chiều"
"hai chiều" / "2 chiều" / "khứ hồi" → "Hai chiều"
"nhiều điểm" → "Nhiều điểm"
"theo tuyến" → "Theo tuyến"
"theo ca" → "Theo ca"
```

**6. Weight Calculation**
```javascript
// Priority order:
1. Sum from chiTietLoTrinh array
2. Direct trongLuong field
3. thongTinChuyenDi.taiTrong
4. Default: 0
```

#### Webhook Payload Structure

```json
{
  "Action": "Add|Update|Delete",
  "maChuyenDi": "NAK_20241225_001",
  "ngayTao": "25/12/2024",

  "bienSoXe": "51A-12345",
  "tenTaiXe": "Nguyen Van A",

  "tenKhachHang": "ABC Company Ltd",
  "donViVanChuyen": "NAK",
  "loaiChuyen": "Một chiều",
  "loaiTuyen": "Liên tỉnh",
  "tenTuyen": "TP.HCM - Bình Dương",

  "tongQuangDuong": 1700,
  "tongDoanhThu": 5000000,
  "trongLuong": 25.5,
  "trangThai": "Hoàn tất",

  "data_json": {
    "thongTinChuyenDi": {
      "bienSoXe": "51A-12345",
      "tenTaiXe": "Nguyen Van A",
      "loaiXe": "Tải thùng",
      "taiTrong": 25.5
    },
    "chiTietLoTrinh": [
      {
        "diemDi": "TP.HCM",
        "diemDen": "Bình Dương",
        "khoangCach": 35,
        "trongLuong": 25.5,
        "doanhThu": 5000000
      }
    ]
  }
}
```

#### Response Format

```json
{
  "success": true,
  "action": "upsert",
  "orderId": "NAK_20241225_001",
  "normalized": {
    "status": "approved",
    "provider": "NAK",
    "date": "2024-12-25",
    "tripType": "Một chiều",
    "routeType": "Liên tỉnh"
  }
}
```

---

### 4. Fuel Management Workflow (Placeholder)

**Status**: Planned for Phase 3

**Planned Features**:
- Fuel consumption tracking per trip
- Fuel cost analysis
- Fuel efficiency metrics by vehicle
- Monthly fuel reports

**File**: [app/fuel/page.tsx](app/fuel/page.tsx)

---

### 5. Vehicle Management Workflow (Placeholder)

**Status**: Planned for Phase 3

**Planned Features**:
- Vehicle fleet tracking
- Maintenance schedule
- Vehicle assignment to trips
- Performance metrics

**File**: [app/vehicles/page.tsx](app/vehicles/page.tsx)

---

## API Integration

### Next.js API Routes

#### 1. AppSheet Webhook API

**Endpoint**: `POST /api/webhook/appsheet`

**Headers**:
```
x-api-key: [APPSHEET_SECRET_KEY]
Content-Type: application/json
```

**Request Body**: See [Webhook Payload Structure](#webhook-payload-structure)

**Response**:
```json
{
  "success": true,
  "action": "upsert|delete",
  "orderId": "NAK_123",
  "normalized": { /* normalized fields */ }
}
```

**Error Response**:
```json
{
  "error": "Unauthorized",
  "message": "Invalid API key"
}
```

---

#### 2. Reconciliation Data API

**Endpoint**: `GET /api/reconciliation`

**Query Parameters**:
- `limit` (number, 1-1000, default: 100)
- `fromDate` (string, YYYY-MM-DD)
- `toDate` (string, YYYY-MM-DD)
- `khachHang` (string, partial match)
- `donViVanChuyen` (enum: NAK|VENDOR|OTHER)
- `loaiChuyen` (string, trip type)
- `loaiTuyen` (string, route type)
- `searchQuery` (string, multi-field search)
- `status` (enum: approved|pending|rejected)

**Example Request**:
```
GET /api/reconciliation?fromDate=2024-12-01&toDate=2024-12-31&donViVanChuyen=NAK&status=approved&limit=100
```

**Response**:
```json
{
  "records": [
    {
      "id": 1,
      "order_id": "NAK_20241225_001",
      "date": "2024-12-25",
      "license_plate": "51A-12345",
      "route_name": "TP.HCM - Bình Dương",
      "customer": "ABC Company Ltd",
      "weight": 25.5,
      "cost": 5000000,
      "status": "approved",
      "trip_type": "Một chiều",
      "route_type": "Liên tỉnh",
      "driver_name": "Nguyen Van A",
      "provider": "NAK",
      "total_distance": 35,
      "details": { /* JSONB data */ },
      "created_at": "2024-12-25T10:00:00Z",
      "updated_at": "2024-12-25T10:00:00Z"
    }
  ],
  "summary": {
    "totalOrders": 150,
    "totalAmount": 750000000,
    "totalDistance": 5250,
    "approvedOrders": 120,
    "pendingOrders": 30
  },
  "total": 150,
  "count": 100
}
```

---

#### 3. Dashboard Report API

**Endpoint**: `GET /api/reports/dashboard`

**Query Parameters**:
- `fromDate` (string, YYYY-MM-DD)
- `toDate` (string, YYYY-MM-DD)
- `khachHang` (string, optional)
- `loaiTuyen` (string, optional)

**Example Request**:
```
GET /api/reports/dashboard?fromDate=2024-12-01&toDate=2024-12-31
```

**Response**:
```json
{
  "cards": {
    "tongDoanhThu": 750000000,
    "soChuyen": 150,
    "soXeNAK": 12,
    "soXeVendor": 8
  },
  "charts": {
    "doanhThuTheoNgay": [
      { "date": "2024-12-25", "value": 25000000 },
      { "date": "2024-12-26", "value": 30000000 }
    ],
    "doanhThuTheoTuyen": [
      { "label": "TP.HCM - Bình Dương", "value": 150000000 },
      { "label": "TP.HCM - Đồng Nai", "value": 120000000 }
    ],
    "doanhThuTheoKhachHang": [
      { "label": "ABC Company", "value": 200000000 },
      { "label": "XYZ Corp", "value": 150000000 }
    ],
    "doanhThuTheoDonVi": [
      { "label": "NAK", "value": 500000000 },
      { "label": "VENDOR", "value": 250000000 }
    ]
  },
  "lastUpdated": "2024-12-30T10:00:00Z"
}
```

---

#### 4. Data Import API

**Endpoint**: `POST /api/seed/import`

**Purpose**: Bulk import data from Google Sheets or CSV files

**Headers**:
```
Content-Type: application/json
```

**Request Body**:
```json
{
  "source": "google_sheets|csv",
  "data": [ /* array of records */ ]
}
```

---

### Google Apps Script API (Legacy)

**Base URL**: `https://script.google.com/macros/s/[DEPLOYMENT_ID]/exec`

#### Endpoints

**1. Dashboard Report**
```
GET {BASE_URL}?action=getDashboardReport
```

**2. Dashboard with Filters**
```
GET {BASE_URL}?action=getDashboardReportWithFilters&filters={JSON}
```

**3. Reconciliation Data**
```
GET {BASE_URL}?action=getReconciliationData&filters={JSON}
```

**Files**:
- [backend-gas/gas/Code.gs](backend-gas/gas/Code.gs) - Main entry point
- [backend-gas/gas/ReportService.gs](backend-gas/gas/ReportService.gs) - Dashboard logic
- [backend-gas/gas/ReconciliationService.gs](backend-gas/gas/ReconciliationService.gs) - Reconciliation logic

---

## Database Schema

### Reconciliation Orders Table

**Table Name**: `reconciliation_orders`

**Schema**:
```sql
CREATE TABLE reconciliation_orders (
  id SERIAL PRIMARY KEY,
  order_id VARCHAR(50) UNIQUE NOT NULL,
  date DATE NOT NULL,
  license_plate VARCHAR(20),
  route_name VARCHAR(255),
  customer VARCHAR(100),
  weight NUMERIC(10,2),
  cost NUMERIC(15,0),
  status VARCHAR(20) DEFAULT 'pending',
  trip_type VARCHAR(50),
  route_type VARCHAR(50),
  driver_name VARCHAR(100),
  provider VARCHAR(50),
  total_distance NUMERIC(10,2),
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Indexes**:
```sql
CREATE INDEX idx_reconciliation_date ON reconciliation_orders(date DESC);
CREATE INDEX idx_reconciliation_customer ON reconciliation_orders(customer);
CREATE INDEX idx_reconciliation_status ON reconciliation_orders(status);
CREATE INDEX idx_reconciliation_order_id ON reconciliation_orders(order_id);
CREATE INDEX idx_reconciliation_license_plate ON reconciliation_orders(license_plate);
CREATE INDEX idx_reconciliation_date_status ON reconciliation_orders(date DESC, status);
CREATE INDEX idx_reconciliation_trip_type ON reconciliation_orders(trip_type);
CREATE INDEX idx_reconciliation_route_type ON reconciliation_orders(route_type);
CREATE INDEX idx_reconciliation_provider ON reconciliation_orders(provider);
CREATE INDEX idx_reconciliation_driver ON reconciliation_orders(driver_name);
CREATE INDEX idx_reconciliation_details ON reconciliation_orders USING GIN (details);
CREATE INDEX idx_reconciliation_date_provider_status ON reconciliation_orders(date DESC, provider, status);
```

**Triggers**:
```sql
CREATE TRIGGER update_reconciliation_orders_updated_at
BEFORE UPDATE ON reconciliation_orders
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

**Migration Files**:
- [database/001_create_reconciliation_orders.sql](database/001_create_reconciliation_orders.sql)
- [database/002_upgrade_reconciliation_schema.sql](database/002_upgrade_reconciliation_schema.sql)

---

## Key Business Logic

### 1. Date Handling

**Function**: `formatDate(dateString: string): string`

**Location**: [app/api/webhook/appsheet/route.ts](app/api/webhook/appsheet/route.ts:50-80)

**Purpose**: Convert various date formats to YYYY-MM-DD

**Supported Formats**:
- `DD/MM/YYYY` (25/12/2024)
- `YYYY-MM-DD` (2024-12-25)
- ISO 8601 (2024-12-25T00:00:00.000Z)

**Logic**:
```typescript
function formatDate(dateString: string): string {
  if (!dateString) return new Date().toISOString().split('T')[0];

  // Check if DD/MM/YYYY format
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
    const [day, month, year] = dateString.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // Try to parse as ISO or YYYY-MM-DD
  const date = new Date(dateString);
  return date.toISOString().split('T')[0];
}
```

---

### 2. Status Normalization

**Function**: `normalizeStatus(status: string): string`

**Location**: [app/api/webhook/appsheet/route.ts](app/api/webhook/appsheet/route.ts:85-120)

**Purpose**: Convert Vietnamese status labels to database enums

**Mapping Table**:

| Input (Vietnamese) | Input (English) | Output (Enum) |
|-------------------|-----------------|---------------|
| khởi tạo | draft | draft |
| mới | new | new |
| chờ giao | pending | pending_delivery |
| đang giao | delivery | in_progress |
| kết thúc | finished | completed |
| hoàn tất / đã duyệt | approved | approved |
| huỷ / rejected | cancel | rejected |

---

### 3. Provider Normalization

**Function**: `normalizeProvider(provider: string): string`

**Location**: [app/api/webhook/appsheet/route.ts](app/api/webhook/appsheet/route.ts:125-140)

**Logic**:
```typescript
function normalizeProvider(provider: string): string {
  const normalized = provider?.toUpperCase().trim() || '';

  if (normalized === 'NAK') return 'NAK';
  if (['VENDOR', 'XE NGOÀI', 'ĐỐI TÁC'].includes(normalized)) return 'VENDOR';

  return 'OTHER';
}
```

---

### 4. Weight Calculation

**Function**: `calculateWeight(payload: any): number`

**Location**: [app/api/webhook/appsheet/route.ts](app/api/webhook/appsheet/route.ts:145-180)

**Priority Order**:
1. Sum from `chiTietLoTrinh` array
2. Direct `trongLuong` field
3. `thongTinChuyenDi.taiTrong`
4. Default: 0

**Logic**:
```typescript
function calculateWeight(payload: any): number {
  // Try to sum from chiTietLoTrinh
  if (payload.data_json?.chiTietLoTrinh?.length > 0) {
    const total = payload.data_json.chiTietLoTrinh.reduce(
      (sum, item) => sum + (parseFloat(item.trongLuong) || 0),
      0
    );
    if (total > 0) return total;
  }

  // Try direct field
  if (payload.trongLuong) return parseFloat(payload.trongLuong) || 0;

  // Try nested field
  if (payload.data_json?.thongTinChuyenDi?.taiTrong) {
    return parseFloat(payload.data_json.thongTinChuyenDi.taiTrong) || 0;
  }

  return 0;
}
```

---

### 5. License Plate Extraction

**Function**: `extractLicensePlate(payload: any): string`

**Location**: [app/api/webhook/appsheet/route.ts](app/api/webhook/appsheet/route.ts:185-210)

**Priority Order**:
1. Direct `bienSoXe` field
2. `thongTinChuyenDi.bienSoXe`
3. `data_json.bienSoXe`
4. Default: null

---

### 6. Debounced Search

**Hook**: `useDebounce(value: string, delay: number)`

**Location**: [components/reconciliation/toolbar.tsx](components/reconciliation/toolbar.tsx:10-25)

**Purpose**: Prevent excessive API calls during user typing

**Logic**:
```typescript
function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}
```

**Usage**:
```typescript
const [searchQuery, setSearchQuery] = useState('');
const debouncedSearch = useDebounce(searchQuery, 500); // 500ms delay

// API call only triggers after 500ms of no typing
```

---

## Technology Stack

### Frontend

| Technology | Version | Purpose |
|-----------|---------|---------|
| Next.js | 14.x | React framework with App Router |
| React | 19.x | UI library |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 4.x | Utility-first styling |
| Shadcn/UI | Latest | Component library (Radix UI primitives) |
| TanStack Table | 8.x | High-performance data tables |
| TanStack Query | 5.x | Data fetching & caching |
| Lucide React | Latest | Icon library |
| date-fns | Latest | Date utilities |

### Backend

| Technology | Purpose |
|-----------|---------|
| Next.js API Routes | RESTful API endpoints |
| Vercel Postgres | PostgreSQL database (primary) |
| Google Apps Script | Legacy backend (backup) |
| Google Sheets | Backup data storage |

### DevOps

| Technology | Purpose |
|-----------|---------|
| Vercel | Hosting & deployment |
| GitHub | Version control |
| Clasp | Google Apps Script deployment |

---

## Performance Features

### 1. Database Optimization

**Composite Indexes**:
```sql
-- Common filter patterns
CREATE INDEX idx_reconciliation_date_provider_status
ON reconciliation_orders(date DESC, provider, status);

-- Multi-field queries
CREATE INDEX idx_reconciliation_date_status
ON reconciliation_orders(date DESC, status);
```

**JSONB Indexing**:
```sql
-- Fast JSONB queries
CREATE INDEX idx_reconciliation_details
ON reconciliation_orders USING GIN (details);
```

**Query Optimization**:
- ILIKE for case-insensitive search
- Date DESC for latest-first sorting
- LIMIT for pagination

---

### 2. Frontend Caching

**React Query Configuration**:
```typescript
// Dashboard data
{
  staleTime: 5 * 60 * 1000, // 5 minutes
  gcTime: 10 * 60 * 1000,   // 10 minutes
  refetchOnWindowFocus: true
}

// Reconciliation data
{
  staleTime: 2 * 60 * 1000, // 2 minutes
  gcTime: 5 * 60 * 1000,    // 5 minutes
  refetchOnWindowFocus: true
}
```

**API Route Caching**:
```typescript
export const revalidate = 60; // 60 seconds
export const dynamic = 'force-dynamic'; // Prevent static generation
```

---

### 3. Search Optimization

**Debounced Input**:
- 500ms delay before API call
- Prevents excessive server requests
- Improves UX with loading states

**Multi-Field Search**:
```sql
WHERE (
  order_id ILIKE '%query%' OR
  customer ILIKE '%query%' OR
  license_plate ILIKE '%query%' OR
  route_name ILIKE '%query%' OR
  driver_name ILIKE '%query%'
)
```

---

### 4. Pagination

**TanStack Table**:
- 20 rows per page (default)
- Client-side pagination for < 1000 records
- Server-side pagination for > 1000 records (via LIMIT/OFFSET)

**API Limit**:
```typescript
const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 1000);
```

---

## Known Issues & Solutions

### Issue 1: AppSheet Webhook Duplication

**Problem**: AppSheet fires webhook 4 times for a single change

**Impact**: Duplicate database entries, wasted API calls

**Root Cause**: AppSheet behavior with related tables (chi_tiet references)

**Solutions**:
1. **Duplicate Check** in `handleAddEvent()`:
   ```javascript
   // Check if order_id already exists
   const existing = findExistingOrder(orderId);
   if (existing) {
     Logger.log(`Duplicate prevented: ${orderId}`);
     return;
   }
   ```

2. **Cleanup Script** (`RemoveDuplicates.gs`):
   ```javascript
   function removeDuplicates() {
     // Find duplicate order_ids
     // Keep latest created_at
     // Delete older duplicates
   }
   ```

3. **Database Constraint**:
   ```sql
   order_id VARCHAR(50) UNIQUE NOT NULL
   ```

**Status**: ✅ Resolved

---

### Issue 2: AppSheet REF_ROWS in Payload

**Problem**: REF_ROWS in webhook payload causes JSON parsing errors

**Impact**: `chiTietLoTrinh` data not accessible

**Root Cause**: AppSheet sends `<<REF_ROWS('related_table')>>` instead of actual data

**Solution**: Query `chi_tiet` directly from VEHICLE_SPREADSHEET
```javascript
// Don't use payload.data_json.chiTietLoTrinh
// Instead:
const chiTiet = getChiTietFromSpreadsheet(orderId);
```

**Status**: ✅ Resolved

---

### Issue 3: Date Format Inconsistency

**Problem**: Multiple date formats from different sources
- AppSheet: DD/MM/YYYY
- Database: YYYY-MM-DD
- ISO: 2024-12-25T00:00:00.000Z

**Impact**: Date comparison failures, query errors

**Solution**: Universal `formatDate()` function
```typescript
function formatDate(dateString: string): string {
  // Handles all formats
  // Returns: YYYY-MM-DD
}
```

**Status**: ✅ Resolved

---

### Issue 4: GAS API Timeout

**Problem**: Google Apps Script API sometimes takes 30-40 seconds

**Impact**: Poor UX, frontend hangs

**Root Cause**: Google Sheets API rate limits, complex calculations

**Solutions**:
1. **Frontend Timeout**:
   ```typescript
   const controller = new AbortController();
   const timeout = setTimeout(() => controller.abort(), 30000);

   fetch(url, { signal: controller.signal });
   ```

2. **Graceful Fallback**:
   ```typescript
   try {
     const data = await fetchGASAPI();
   } catch (error) {
     // Show cached data or error message
   }
   ```

3. **Caching Strategy**:
   ```typescript
   {
     staleTime: 5 * 60 * 1000,
     retry: 2,
     retryDelay: 1000
   }
   ```

**Status**: ⚠️ Partially resolved (migrate to Next.js API recommended)

---

### Issue 5: Vietnamese Character Encoding

**Problem**: Vietnamese characters (ế, ơ, ữ, etc.) sometimes corrupted

**Impact**: Search failures, display issues

**Solution**:
1. **UTF-8 Everywhere**:
   ```typescript
   headers: {
     'Content-Type': 'application/json; charset=utf-8'
   }
   ```

2. **Database Collation**:
   ```sql
   CREATE DATABASE nak_logistics
   WITH ENCODING 'UTF8'
   LC_COLLATE = 'en_US.UTF-8'
   LC_CTYPE = 'en_US.UTF-8';
   ```

**Status**: ✅ Resolved

---

## Future Roadmap

### Phase 1: Complete Migration (Q1 2025)

**Goal**: Move all logic from Google Apps Script to Next.js

**Tasks**:
- [ ] Migrate `ReportService.gs` → `/api/reports/dashboard`
- [ ] Migrate `ReconciliationService.gs` → `/api/reconciliation`
- [ ] Migrate `WebhookSync.gs` → `/api/webhook/appsheet` (done ✅)
- [ ] Deprecate Google Apps Script endpoints
- [ ] Keep Google Sheets as backup only

**Benefits**:
- Faster API response times (< 1 second vs 30+ seconds)
- Better error handling
- Easier debugging and testing
- Modern tech stack

---

### Phase 2: Real-Time Features (Q2 2025)

**Goal**: Add real-time updates and collaboration

**Tasks**:
- [ ] WebSocket integration for live updates
- [ ] Optimistic UI updates (immediate feedback)
- [ ] Background sync jobs (every 5 minutes)
- [ ] Push notifications for status changes
- [ ] Multi-user collaboration indicators

**Technologies**:
- Socket.IO or Pusher
- React Query mutations
- Service Workers

---

### Phase 3: Enhanced Features (Q3 2025)

**Goal**: Implement remaining modules and advanced features

**Tasks**:

**Fuel Management**:
- [ ] Fuel consumption tracking per trip
- [ ] Fuel cost analysis and trends
- [ ] Fuel efficiency metrics by vehicle
- [ ] Monthly fuel reports with charts

**Vehicle Management**:
- [ ] Vehicle fleet tracking with map view
- [ ] Maintenance schedule and reminders
- [ ] Vehicle assignment to trips
- [ ] Performance metrics (fuel efficiency, revenue/vehicle)

**Advanced Reporting**:
- [ ] Custom report builder (drag-and-drop)
- [ ] Export to Excel/PDF
- [ ] Scheduled reports (daily/weekly/monthly)
- [ ] Email delivery

**Additional Features**:
- [ ] Multi-language support (Vietnamese/English toggle)
- [ ] Role-based access control (Admin/Manager/Viewer)
- [ ] Audit log for all changes
- [ ] Advanced filtering (save filters, quick filters)
- [ ] Mobile-responsive design improvements

---

### Phase 4: AI & Analytics (Q4 2025)

**Goal**: Add intelligent features and predictive analytics

**Tasks**:
- [ ] Route optimization AI
- [ ] Demand forecasting
- [ ] Cost prediction models
- [ ] Anomaly detection (fraud/errors)
- [ ] Natural language queries ("Show me trips to Bình Dương last week")

**Technologies**:
- OpenAI API
- TensorFlow.js
- Custom ML models

---

## File Reference Guide

### Frontend Pages

| File | Purpose | Lines |
|------|---------|-------|
| [app/dashboard/page.tsx](app/dashboard/page.tsx) | Dashboard overview with KPIs | ~200 |
| [app/reconciliation/page.tsx](app/reconciliation/page.tsx) | Core reconciliation module | ~350 |
| [app/reports/page.tsx](app/reports/page.tsx) | Reports placeholder | ~50 |
| [app/fuel/page.tsx](app/fuel/page.tsx) | Fuel management placeholder | ~50 |
| [app/vehicles/page.tsx](app/vehicles/page.tsx) | Vehicle management placeholder | ~50 |
| [app/settings/page.tsx](app/settings/page.tsx) | Settings page | ~100 |

### API Routes

| File | Purpose | Lines |
|------|---------|-------|
| [app/api/webhook/appsheet/route.ts](app/api/webhook/appsheet/route.ts) | AppSheet webhook handler | ~400 |
| [app/api/reconciliation/route.ts](app/api/reconciliation/route.ts) | Reconciliation data API | ~250 |
| [app/api/reports/dashboard/route.ts](app/api/reports/dashboard/route.ts) | Dashboard metrics API | ~200 |
| [app/api/seed/import/route.ts](app/api/seed/import/route.ts) | Data import endpoint | ~150 |

### Components

| File | Purpose | Lines |
|------|---------|-------|
| [components/reconciliation/data-table.tsx](components/reconciliation/data-table.tsx) | TanStack Table rendering | ~300 |
| [components/reconciliation/toolbar.tsx](components/reconciliation/toolbar.tsx) | Filters & search UI | ~250 |
| [components/reconciliation/summary-bar.tsx](components/reconciliation/summary-bar.tsx) | KPI summary cards | ~150 |
| [components/reconciliation/TripDetailsDialog.tsx](components/reconciliation/TripDetailsDialog.tsx) | Trip details modal | ~200 |
| [components/reconciliation/columns.tsx](components/reconciliation/columns.tsx) | Table column definitions | ~150 |
| [components/sidebar.tsx](components/sidebar.tsx) | Navigation sidebar | ~200 |
| [components/top-bar.tsx](components/top-bar.tsx) | Top bar with breadcrumbs | ~150 |
| [components/dashboard-layout.tsx](components/dashboard-layout.tsx) | Main layout wrapper | ~100 |

### Backend (Google Apps Script)

| File | Purpose | Lines |
|------|---------|-------|
| [backend-gas/gas/Code.gs](backend-gas/gas/Code.gs) | Main entry point | ~100 |
| [backend-gas/gas/Config.gs](backend-gas/gas/Config.gs) | Configuration | ~50 |
| [backend-gas/gas/ReportService.gs](backend-gas/gas/ReportService.gs) | Dashboard reports | ~300 |
| [backend-gas/gas/ReconciliationService.gs](backend-gas/gas/ReconciliationService.gs) | Reconciliation data | ~200 |
| [backend-gas/gas/WebhookSync.gs](backend-gas/gas/WebhookSync.gs) | Webhook handler | ~1000+ |
| [backend-gas/gas/AppSheetWebhookService.gs](backend-gas/gas/AppSheetWebhookService.gs) | Basic webhook (deprecated) | ~150 |

### Database

| File | Purpose |
|------|---------|
| [database/001_create_reconciliation_orders.sql](database/001_create_reconciliation_orders.sql) | Base schema |
| [database/002_upgrade_reconciliation_schema.sql](database/002_upgrade_reconciliation_schema.sql) | Schema upgrades |

### Configuration

| File | Purpose |
|------|---------|
| [package.json](package.json) | Dependencies & scripts |
| [tsconfig.json](tsconfig.json) | TypeScript config |
| [tailwind.config.ts](tailwind.config.ts) | Tailwind CSS config |
| [next.config.js](next.config.js) | Next.js config |
| [.env.local](.env.local) | Environment variables |

---

## Environment Variables

**Required**:
```bash
# Database
POSTGRES_URL=
POSTGRES_PRISMA_URL=
POSTGRES_URL_NON_POOLING=
POSTGRES_USER=
POSTGRES_HOST=
POSTGRES_PASSWORD=
POSTGRES_DATABASE=

# AppSheet Integration
APPSHEET_SECRET_KEY=

# Google Apps Script (Legacy)
GAS_API_URL=
```

**Optional**:
```bash
# Development
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:3000
```

---

## Deployment

### Vercel Deployment

1. **Connect GitHub Repository**
   - Go to Vercel dashboard
   - Import project from GitHub
   - Select `nak-logistic-system` repository

2. **Configure Environment Variables**
   - Add all variables from `.env.local`
   - Use production values

3. **Deploy**
   - Vercel auto-deploys on push to `main`
   - Preview deployments on pull requests

### Google Apps Script Deployment

1. **Install Clasp**
   ```bash
   npm install -g @google/clasp
   ```

2. **Login**
   ```bash
   clasp login
   ```

3. **Deploy**
   ```bash
   cd backend-gas
   clasp push
   clasp deploy
   ```

---

## Support & Documentation

### Getting Help

- **Issues**: [GitHub Issues](https://github.com/your-org/nak-logistic-system/issues)
- **Documentation**: This file
- **API Reference**: See [API Integration](#api-integration) section

### Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

MIT License - See [LICENSE](LICENSE) file for details

---

## Changelog

### Version 2.0.0 (2024-12-30)
- ✅ Migrated webhook sync to Next.js API
- ✅ Added comprehensive data normalization
- ✅ Implemented high-performance data tables
- ✅ Added multi-level filtering and search
- ✅ Database schema upgrades with 15+ indexes

### Version 1.0.0 (2024-12-01)
- ✅ Initial Next.js 14 setup
- ✅ Basic reconciliation module
- ✅ Dashboard with KPI cards
- ✅ Google Apps Script integration

---

**Last Updated**: 2024-12-30

**Author**: NAK Logistics Development Team

**Contact**: dev@nak-logistics.com
