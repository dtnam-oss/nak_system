# NAK Logistics Management Dashboard

High-performance logistics management system built with Next.js 14, TypeScript, and Tailwind CSS.

## Design Philosophy (AllInGo Enterprise White Style)

- **Ultra-clean, Minimalist Interface**: Enterprise white design with no unnecessary decorations
- **Color Palette**:
  - Background: `#FFFFFF` (White)
  - Borders: `#E2E8F0` (Light Gray)
  - Text: `#0F172A` (Dark Slate)
  - Primary Action: `#2563EB` (Royal Blue)
- **High Information Density**: Card-based layout with breathable spacing
- **Maximum Performance**: Optimized for large datasets

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Components**: Shadcn/UI (Radix UI primitives)
- **State Management**: TanStack Query (React Query)
- **Data Tables**: TanStack Table v8 (High-performance virtualization)

## Project Structure

```
nak-logistic-system/
├── app/
│   ├── dashboard/          # Dashboard overview
│   ├── reconciliation/     # Core reconciliation feature
│   ├── reports/            # Reports page
│   ├── fuel/               # Fuel management
│   ├── vehicles/           # Vehicle management
│   ├── layout.tsx          # Root layout with Providers
│   └── globals.css         # Global styles & theme tokens
├── components/
│   ├── ui/                 # Shadcn UI components
│   │   ├── button.tsx
│   │   ├── badge.tsx
│   │   ├── card.tsx
│   │   └── input.tsx
│   ├── reconciliation/     # Reconciliation-specific components
│   │   ├── data-table.tsx  # High-performance TanStack Table
│   │   ├── filter-sidebar.tsx
│   │   └── summary-bar.tsx
│   ├── sidebar.tsx         # Main navigation sidebar
│   ├── top-bar.tsx         # Top bar with breadcrumbs & search
│   ├── dashboard-layout.tsx # Main dashboard wrapper
│   └── providers.tsx       # React Query provider
├── types/
│   └── reconciliation.ts   # TypeScript interfaces
└── lib/
    └── utils.ts            # Utility functions (cn helper)
```

## Features Implemented

### 1. Sidebar Navigation (Left)
- Clean vertical menu with icons
- Menu items:
  1. Dashboard (Tổng quan)
  2. Reports (Báo cáo)
  3. Reconciliation (Đối soát) - Core Feature
  4. Fuel Management (Nhiên liệu)
  5. Vehicles (Phương tiện)
- User profile & settings at bottom

### 2. Main Layout
- Top bar with breadcrumbs, global search, and notifications
- White background with proper padding
- Responsive sidebar (fixed 256px width)

### 3. Reconciliation Page (Core Feature)
- **Split Layout**:
  - Left: Sticky filter sidebar (288px width)
  - Right: Data table with summary bar

- **Filter Panel**:
  - Date range (From/To)
  - Customer search
  - License plate search
  - Status dropdown
  - Reset filters button

- **Summary Bar**:
  - Total Orders
  - Total Amount (VND)
  - Total Weight (tons)
  - Approved Orders
  - Pending Orders

- **High-Performance Data Table**:
  - TanStack Table v8 implementation
  - Zebra striping (subtle gray alternating rows)
  - Sticky header
  - Pagination controls
  - Columns: ID, Date, License Plate, Route, Customer, Weight, Cost, Status
  - Status badges with color coding
  - Handles 150+ records smoothly

## Getting Started

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Build for Production

```bash
# Build the application
npm run build

# Start production server
npm start
```

## Key Pages

- **Dashboard** (`/dashboard`): Overview with quick stats and access cards
- **Reconciliation** (`/reconciliation`): Full-featured reconciliation management with filters and data table
- **Reports** (`/reports`): Placeholder for future development
- **Fuel** (`/fuel`): Placeholder for future development
- **Vehicles** (`/vehicles`): Placeholder for future development

## Performance Features

1. **TanStack Table**: Optimized for rendering thousands of rows
2. **Pagination**: Default 20 rows per page
3. **Memoization**: useMemo for filtered data and summary calculations
4. **React Query**: Efficient data fetching and caching (ready for API integration)

## Data Integration

Currently using mock data. To integrate with your API:

1. Create API routes in `app/api/`
2. Update the reconciliation page to use TanStack Query:

```typescript
const { data, isLoading } = useQuery({
  queryKey: ['reconciliation', filters],
  queryFn: () => fetch('/api/reconciliation').then(r => r.json())
})
```

3. Replace mock data generation with actual API calls

## Customization

### Theme Colors

Edit `app/globals.css` to customize the color palette (lines 49-83):

```css
:root {
  --background: 255 255 255;        /* White */
  --foreground: 15 23 42;           /* Dark Slate */
  --primary: 37 99 235;             /* Royal Blue */
  --border: 226 232 240;            /* Light Gray */
  /* ... more tokens */
}
```

### Adding New Pages

1. Create a new folder in `app/`
2. Add a `page.tsx` file
3. Use the `DashboardLayout` wrapper:

```typescript
import { DashboardLayout } from "@/components/dashboard-layout"

export default function NewPage() {
  return (
    <DashboardLayout breadcrumbs={[{ label: "Dashboard" }, { label: "New Page" }]}>
      {/* Your content */}
    </DashboardLayout>
  )
}
```

4. Update sidebar navigation in `components/sidebar.tsx`

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

MIT
