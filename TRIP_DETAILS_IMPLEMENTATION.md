# Trip Details Modal - Implementation Summary

## Overview
Updated the Reconciliation Data Table with new column structure and added a Trip Details Modal to display comprehensive trip information including route details.

## Files Created/Updated

### 1. ✅ New UI Component: `components/ui/dialog.tsx`
**Purpose:** Shadcn UI Dialog component for modal interactions

**Features:**
- Radix UI Dialog primitives integration
- Accessible modal with overlay
- Responsive and animated transitions
- Close button with keyboard support (Escape)

---

### 2. ✅ Updated Types: `types/reconciliation.ts`
**Added:**
```typescript
export interface ReconciliationRecord {
  // ... existing fields
  data_json?: string // Raw JSON string from Google Sheets
}

export interface ParsedDataJson {
  thongTinChuyenDi?: {
    soXe?: string
    khCap1?: string
    loaiCa?: string
    taiTrongTinhPhi?: number
    hinhThucTinhGia?: string
    // ... other fields
  }
  chiTietLoTrinh?: ChiTietLoTrinh[]
}
```

---

### 3. ✅ New Component: `components/reconciliation/TripDetailsDialog.tsx`
**Purpose:** Modal dialog to display detailed trip information

**Key Features:**
- **Safe JSON Parsing:** Handles both string and pre-parsed `data_json` with error handling
- **Section A - General Info:** Gray background box with trip summary
  - Vehicle number (Số xe)
  - Level 1 Customer (Khách hàng cấp 1)
  - Driver name
  - Total revenue
  - Total distance
  - Status badge (color-coded)
  - Shift type (Loại ca)
  - Pricing method (Hình thức tính giá)
  - Chargeable weight (Tải trọng tính phí)

- **Section B - Route Details (Critical):**
  - **Desktop:** Full-featured table with zebra striping
  - **Mobile:** Card-based layout (responsive)
  - Displays: Order, Stamp Code, Route (highlighted), Distance, Weight, Amount
  - Footer with totals (distance, weight, amount)

**Data Handling:**
```typescript
const parsedData = useMemo<ParsedDataJson | null>(() => {
  if (!record?.data_json) return null
  try {
    if (typeof record.data_json === 'string') {
      return JSON.parse(record.data_json)
    }
    return record.data_json as unknown as ParsedDataJson
  } catch (error) {
    console.error("Failed to parse data_json:", error)
    return null
  }
}, [record?.data_json])
```

**UI Highlights:**
- Vietnamese currency formatting (VND)
- Vietnamese number formatting (thousands separator)
- Responsive design (desktop table, mobile cards)
- Color-coded status badges
- Max height with scroll (90vh)

---

### 4. ✅ New Component: `components/reconciliation/columns.tsx`
**Purpose:** Column definitions for TanStack Table with action handler

**Visible Columns (in order):**
1. **Mã chuyến** - Trip ID (font-medium)
2. **Ngày tạo** - Created date (DD/MM/YYYY format)
3. **Khách hàng** - Customer name (truncated)
4. **Loại chuyến** - Trip type (Badge - color coded)
   - "Nhanh" → default variant
   - "Thường" → outline variant
5. **Tên tuyến** - Route name (truncated)
6. **Tài xế** - Driver name (truncated)
7. **Đơn vị** - Transport unit (Badge)
   - NAK → success (green)
   - VENDOR → secondary (gray)
8. **Trạng thái** - Status (Badge - color coded)
   - "Kết thúc/Hoàn thành" → success (green)
   - "Hủy/Từ chối" → destructive (red)
   - "Đang/Chờ" → default (blue)
9. **Doanh thu** - Revenue (VND currency, right-aligned)
10. **Thao tác** - Actions (Eye icon button "Chi tiết")

**Column Definition Pattern:**
```typescript
export const createColumns = ({
  onViewDetails,
}: ColumnsProps): ColumnDef<ReconciliationRecord>[] => {
  // ... column definitions
}
```

**Action Column:**
```typescript
{
  id: "actions",
  header: "Thao tác",
  cell: ({ row }) => (
    <Button
      variant="outline"
      size="sm"
      onClick={() => onViewDetails(row.original)}
    >
      <Eye className="h-4 w-4" />
      Chi tiết
    </Button>
  ),
}
```

---

### 5. ✅ Updated Component: `components/reconciliation/data-table.tsx`
**Changes:**
- Removed inline column definitions
- Imported `createColumns` and `TripDetailsDialog`
- Added state management for dialog:
  ```typescript
  const [selectedRecord, setSelectedRecord] = useState<ReconciliationRecord | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  ```
- Added click handler:
  ```typescript
  const handleViewDetails = (record: ReconciliationRecord) => {
    setSelectedRecord(record)
    setIsDialogOpen(true)
  }
  ```
- Integrated columns: `const columns = createColumns({ onViewDetails: handleViewDetails })`
- Added Dialog at bottom:
  ```tsx
  <TripDetailsDialog
    open={isDialogOpen}
    onOpenChange={setIsDialogOpen}
    record={selectedRecord}
  />
  ```

---

## Data Flow

```
User clicks "Chi tiết" button in table row
    ↓
handleViewDetails(record) called
    ↓
setSelectedRecord(record) - Store selected trip
setIsDialogOpen(true) - Open modal
    ↓
TripDetailsDialog receives record prop
    ↓
useMemo parses data_json safely
    ↓
Display general info + route details
    ↓
User closes dialog → setIsDialogOpen(false)
```

---

## Key Features Implemented

### ✅ Requirements Checklist

**Main Table:**
- [x] Display only specified columns with Vietnamese headers
- [x] Format date as DD/MM/YYYY
- [x] Color-coded Badge for Trip Type (loaiChuyen)
- [x] Color-coded Badge for Status (trangThai)
- [x] Vietnamese currency formatting (VND)
- [x] Action column with Eye icon "Chi tiết" button
- [x] Zebra striping (alternating row colors)
- [x] Pagination (20 rows/page)

**Trip Details Dialog:**
- [x] Shadcn UI Dialog component
- [x] Header: "Chi tiết chuyến đi: [Mã chuyến]"
- [x] Section A: General info in gray background box
  - [x] Vehicle number (soXe)
  - [x] Level 1 customer (khCap1)
  - [x] Driver name, total revenue, total distance
  - [x] Status badge
  - [x] Additional fields: loaiCa, hinhThucTinhGia, taiTrongTinhPhi
- [x] Section B: Route details (chiTietLoTrinh)
  - [x] Desktop: Nested table with zebra striping
  - [x] Mobile: Bordered cards
  - [x] Display: Thứ tự, Mã Tem, Lộ trình (highlighted), Quãng đường, Tải trọng, Thành tiền
  - [x] Footer totals
- [x] Safe JSON parsing with error handling
- [x] Handle invalid/missing data_json

---

## Tech Stack Used

- **TanStack Table v8** - High-performance data table
- **Shadcn UI** - Dialog, Table, Badge, Card, Button components
- **Radix UI** - Dialog primitives (@radix-ui/react-dialog)
- **Lucide React** - Eye icon
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling

---

## Testing Checklist

### Frontend Tests
- [ ] Visit `/reconciliation` page
- [ ] Verify new columns are visible (10 columns total)
- [ ] Verify "Thao tác" column shows "Chi tiết" button
- [ ] Click "Chi tiết" button on any row
- [ ] Verify dialog opens with correct title
- [ ] Check Section A displays general info correctly
- [ ] Check Section B displays route details
- [ ] Verify totals are calculated correctly
- [ ] Test on mobile (cards should render instead of table)
- [ ] Test with missing/invalid data_json
- [ ] Close dialog and verify it closes properly
- [ ] Check badge colors:
  - [ ] NAK = green, VENDOR = gray
  - [ ] Status colors based on keywords
  - [ ] Trip type colors

### Edge Cases
- [ ] Record with no data_json
- [ ] Record with invalid JSON in data_json
- [ ] Record with empty chiTietLoTrinh array
- [ ] Record with very long route names (truncation)
- [ ] Mobile responsive behavior

---

## Usage Example

```typescript
// In your page component (already implemented in app/reconciliation/page.tsx)
import { DataTable } from "@/components/reconciliation/data-table"

export default function ReconciliationPage() {
  const { data } = useReconciliationData(filters)

  return (
    <DataTable data={data?.records || []} />
  )
}
```

**User Interaction:**
1. User sees table with 10 columns
2. User clicks "Chi tiết" button (Eye icon)
3. Modal opens showing:
   - General trip information
   - Detailed route breakdown
4. User can scroll through route details
5. User closes modal by clicking X or outside

---

## Performance Considerations

- **useMemo for JSON parsing** - Prevents re-parsing on every render
- **Lazy loading** - Dialog only renders when open
- **Virtual scrolling ready** - TanStack Table supports virtualization
- **Mobile optimization** - Cards render only on mobile breakpoint

---

## File Structure

```
components/
├── ui/
│   └── dialog.tsx              ✅ NEW - Shadcn Dialog component
└── reconciliation/
    ├── columns.tsx             ✅ NEW - Column definitions
    ├── TripDetailsDialog.tsx   ✅ NEW - Trip details modal
    └── data-table.tsx          ✅ UPDATED - Integrated dialog

types/
└── reconciliation.ts           ✅ UPDATED - Added data_json & ParsedDataJson
```

---

## Next Steps (Optional Enhancements)

1. **Export Route Details to Excel**
   - Add export button in dialog footer
   - Use `xlsx` library

2. **Print Route Details**
   - Add print button
   - Format for printing

3. **Edit Mode**
   - Allow inline editing of route details
   - Save changes back to Google Sheets

4. **Route Map Visualization**
   - Integrate Google Maps
   - Show route on map

5. **Loading States**
   - Add skeleton loader in dialog while parsing

---

**Implementation Date:** December 26, 2024
**Status:** ✅ Complete and Ready for Testing
**Dependencies:** @radix-ui/react-dialog (already installed)
