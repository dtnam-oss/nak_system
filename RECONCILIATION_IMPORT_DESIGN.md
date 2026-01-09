# 📥 Reconciliation Import & Comparison System - Design Document

> **Mục đích:** Xây dựng hệ thống import và so sánh file đối soát từ khách hàng với dữ liệu NAK

---

## 🎯 Overview

### **Problem Statement**
Khách hàng gửi file Excel đối soát → Kế toán cần so sánh với database NAK → Tìm:
- ✅ **Khớp** (Matched): Chuyến có trong cả 2 bên
- ⚠️ **Không khớp** (Mismatched): Chuyến có trong cả 2 bên nhưng giá trị khác nhau
- ❌ **Thiếu ở khách hàng** (Missing in Customer): NAK có, khách hàng không có
- ❌ **Thiếu ở NAK** (Missing in NAK): Khách hàng có, NAK không có

### **Key Challenge**
Mỗi khách hàng có template Excel khác nhau (J&T Route, J&T Shift, GHN, ...)

---

## 📊 Current Export Templates Analysis

### **1. General Template (Internal)**
**File:** Built-in `generateGeneralExcel()` in `route.ts:252`

**Columns (12):**
| Column | Key | Description |
|--------|-----|-------------|
| Mã chuyến đi | `order_id` | Primary key |
| Ngày | `date` | dd/MM/yyyy |
| Khách hàng | `customer` | Customer name |
| Tên tuyến | `route_name` | Route name |
| Tài xế | `driver_name` | Driver name |
| Biển số xe | `license_plate` | From chiTietLoTrinh[0] |
| Đơn vị vận chuyển | `provider` | Provider |
| Loại chuyến | `trip_type` | Trip type |
| Loại tuyến | `route_type` | Route type |
| Chi phí | `cost` | Cost (currency) |
| Doanh thu | `revenue` | Revenue (currency) |
| Trạng thái | `status` | Status |

**Row Logic:** 1 order = 1 row

---

### **2. J&T Route Template (Theo Tuyến)**
**File:** `strategies/JnT_Route_Template.ts`

**Columns (7):**
| Column | Key | Description |
|--------|-----|-------------|
| STT | `stt` | Row number |
| Ngày | `date` | dd/MM/yyyy |
| Biển số xe | `licensePlate` | From chiTietLoTrinh[0].bienKiemSoat |
| Điểm đi - Điểm đến | `routeName` | From order.route_name |
| Tem chiều đi | `stampOut` | chiTietLoTrinh[0].maTuyen |
| Tem chiều về | `stampIn` | chiTietLoTrinh[last].maTuyen |
| Thể tích | `volume` | Comma-separated taiTrongTinhPhi |

**Row Logic:** 1 order = 1 row (consolidated)

**Key Identifiers:**
- `stampOut` + `stampIn` (unique pair per trip)
- `date` + `licensePlate`

---

### **3. J&T Shift Template (Theo Ca)**
**File:** `strategies/JnT_Shift_Template.ts`

**Columns (6):**
| Column | Key | Description |
|--------|-----|-------------|
| Ngày | `date` | dd/MM/yyyy |
| Biển số xe | `licensePlate` | Comma-separated unique values |
| Mã tem | `stampCode` | Multi-line (\n) all maTuyen |
| Điểm đi - Điểm đến | `route` | Multi-line (\n) all loTrinhChiTiet |
| Thể tích | `volume` | Multi-line (\n) all taiTrongTinhPhi |
| Loại ca | `shiftType` | Multi-line (\n) all loaiCa |

**Row Logic:** 1 order = 1 row (multi-line cells with `wrapText`)

**Key Identifiers:**
- `stampCode` (multi-line, newline-separated)
- `date` + `licensePlate`

---

### **4. GHN Template**
**File:** `strategies/GHN_Template.ts`

**Columns (14):**
| Column | Key | Description |
|--------|-----|-------------|
| STT | `stt` | Continuous counter |
| Ngày | `date` | dd/MM/yyyy (repeated) |
| Biển số xe | `licensePlate` | From detail item |
| Trọng tải yêu cầu | `weight` | taiTrongTinhPhi |
| Hình thức tính giá | `pricingMethod` | hinhThucTinhGia |
| Lộ trình | `routeDetail` | loTrinhChiTiet |
| Số KM | `distance` | quangDuong |
| Đơn giá khung | `unitPrice` | donGia |
| Vé cầu đường | `tollFee` | Empty |
| Phí dừng tải | `parkingFee` | Empty |
| Tỷ lệ Ontime | `ontimeRate` | Empty |
| Thành tiền (chưa VAT) | `amount` | Empty |
| Tên tuyến | `routeName` | loTrinh |
| Mã chuyến | `tripCode` | maTuyen |

**Row Logic:** 1 order = N rows (flattened, one row per chiTietLoTrinh item)

**Key Identifiers:**
- `tripCode` (maTuyen) - unique per detail row
- `date` + `licensePlate` + `routeDetail`

---

## 🏗️ System Architecture

### **Phase 1: Template Parser Registry**

```typescript
// File: /lib/reconciliation/parsers/ParserRegistry.ts

interface ReconciliationRow {
  // Common fields across all templates
  date: string;              // YYYY-MM-DD normalized
  licensePlate?: string;     // Biển số xe
  routeName?: string;        // Tên tuyến

  // Template-specific identifiers
  uniqueKey: string;         // Composite key for matching

  // Raw data for comparison
  rawData: Record<string, any>;

  // Metadata
  templateType: string;      // 'jnt_route' | 'jnt_shift' | 'ghn'
  rowNumber: number;         // Original Excel row number
}

interface ParserStrategy {
  templateType: string;
  parse(file: File): Promise<ReconciliationRow[]>;
  generateUniqueKey(row: any): string;
}
```

### **Phase 2: Comparison Engine**

```typescript
// File: /lib/reconciliation/comparison/ComparisonEngine.ts

interface ComparisonResult {
  summary: {
    totalCustomerRows: number;
    totalNakOrders: number;
    matched: number;
    mismatched: number;
    missingInCustomer: number;
    missingInNak: number;
  };

  details: {
    matched: MatchedRecord[];
    mismatched: MismatchedRecord[];
    missingInCustomer: NakRecord[];
    missingInNak: CustomerRecord[];
  };
}

interface MatchedRecord {
  nakOrderId: string;
  customerRow: ReconciliationRow;
  matchedFields: string[];
  confidence: number; // 0-100%
}

interface MismatchedRecord {
  nakOrderId: string;
  customerRow: ReconciliationRow;
  differences: FieldDifference[];
}

interface FieldDifference {
  field: string;
  nakValue: any;
  customerValue: any;
  severity: 'critical' | 'warning' | 'info';
}
```

---

## 🚀 Implementation Plan

### **Step 1: Create Parser Base Class**
**File:** `/lib/reconciliation/parsers/BaseParser.ts`

```typescript
import * as XLSX from 'xlsx';

export abstract class BaseParser {
  abstract templateType: string;
  abstract expectedColumns: string[];

  async readExcel(file: File): Promise<any[]> {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer);
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json(firstSheet);
  }

  abstract parse(file: File): Promise<ReconciliationRow[]>;
  abstract generateUniqueKey(row: any): string;

  validateColumns(data: any[]): boolean {
    if (!data.length) return false;
    const firstRow = data[0];
    return this.expectedColumns.every(col => col in firstRow);
  }
}
```

---

### **Step 2: Implement Customer-Specific Parsers**

#### **2.1 J&T Route Parser**
**File:** `/lib/reconciliation/parsers/JnT_Route_Parser.ts`

```typescript
import { BaseParser } from './BaseParser';
import { ReconciliationRow } from './types';

export class JnTRouteParser extends BaseParser {
  templateType = 'jnt_route';

  expectedColumns = [
    'STT',
    'Ngày',
    'Biển số xe',
    'Điểm đi - Điểm đến',
    'Tem chiều đi',
    'Tem chiều về',
    'Thể tích'
  ];

  async parse(file: File): Promise<ReconciliationRow[]> {
    const rawData = await this.readExcel(file);

    if (!this.validateColumns(rawData)) {
      throw new Error('Invalid J&T Route template format');
    }

    return rawData.map((row, index) => ({
      date: this.normalizeDate(row['Ngày']),
      licensePlate: row['Biển số xe'],
      routeName: row['Điểm đi - Điểm đến'],
      uniqueKey: this.generateUniqueKey(row),
      rawData: row,
      templateType: this.templateType,
      rowNumber: index + 2, // Excel rows start at 2 (header = row 1)
    }));
  }

  generateUniqueKey(row: any): string {
    // Key strategy: date + stampOut + stampIn
    const date = this.normalizeDate(row['Ngày']);
    const stampOut = row['Tem chiều đi'] || '';
    const stampIn = row['Tem chiều về'] || '';
    return `${date}|${stampOut}|${stampIn}`.toLowerCase().trim();
  }

  private normalizeDate(dateStr: string): string {
    // Convert dd/MM/yyyy -> YYYY-MM-DD
    const [day, month, year] = dateStr.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
}
```

---

#### **2.2 J&T Shift Parser**
**File:** `/lib/reconciliation/parsers/JnT_Shift_Parser.ts`

```typescript
export class JnTShiftParser extends BaseParser {
  templateType = 'jnt_shift';

  expectedColumns = [
    'Ngày',
    'Biển số xe',
    'Mã tem',
    'Điểm đi - Điểm đến',
    'Thể tích',
    'Loại ca'
  ];

  async parse(file: File): Promise<ReconciliationRow[]> {
    const rawData = await this.readExcel(file);

    if (!this.validateColumns(rawData)) {
      throw new Error('Invalid J&T Shift template format');
    }

    return rawData.map((row, index) => ({
      date: this.normalizeDate(row['Ngày']),
      licensePlate: row['Biển số xe'],
      routeName: row['Điểm đi - Điểm đến']?.split('\n')[0], // First route
      uniqueKey: this.generateUniqueKey(row),
      rawData: row,
      templateType: this.templateType,
      rowNumber: index + 2,
    }));
  }

  generateUniqueKey(row: any): string {
    // Key strategy: date + all stampCodes (sorted)
    const date = this.normalizeDate(row['Ngày']);
    const stampCodes = row['Mã tem']?.split('\n') || [];
    const sortedStamps = stampCodes.sort().join('|');
    return `${date}|${sortedStamps}`.toLowerCase().trim();
  }

  private normalizeDate(dateStr: string): string {
    const [day, month, year] = dateStr.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
}
```

---

#### **2.3 GHN Parser**
**File:** `/lib/reconciliation/parsers/GHN_Parser.ts`

```typescript
export class GHNParser extends BaseParser {
  templateType = 'ghn';

  expectedColumns = [
    'STT',
    'Ngày',
    'Biển số xe',
    'Trọng tải yêu cầu',
    'Hình thức tính giá',
    'Lộ trình',
    'Số KM',
    'Đơn giá khung',
    'Tên tuyến',
    'Mã chuyến'
  ];

  async parse(file: File): Promise<ReconciliationRow[]> {
    const rawData = await this.readExcel(file);

    if (!this.validateColumns(rawData)) {
      throw new Error('Invalid GHN template format');
    }

    return rawData.map((row, index) => ({
      date: this.normalizeDate(row['Ngày']),
      licensePlate: row['Biển số xe'],
      routeName: row['Tên tuyến'],
      uniqueKey: this.generateUniqueKey(row),
      rawData: row,
      templateType: this.templateType,
      rowNumber: index + 2,
    }));
  }

  generateUniqueKey(row: any): string {
    // Key strategy: tripCode (maTuyen) is unique per detail row
    const tripCode = row['Mã chuyến'] || '';
    return tripCode.toLowerCase().trim();
  }

  private normalizeDate(dateStr: string): string {
    const [day, month, year] = dateStr.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
}
```

---

### **Step 3: Parser Registry**
**File:** `/lib/reconciliation/parsers/ParserRegistry.ts`

```typescript
import { JnTRouteParser } from './JnT_Route_Parser';
import { JnTShiftParser } from './JnT_Shift_Parser';
import { GHNParser } from './GHN_Parser';
import { BaseParser } from './BaseParser';

export class ParserRegistry {
  private parsers: Map<string, BaseParser> = new Map();

  constructor() {
    this.register(new JnTRouteParser());
    this.register(new JnTShiftParser());
    this.register(new GHNParser());
  }

  register(parser: BaseParser) {
    this.parsers.set(parser.templateType, parser);
  }

  getParser(templateType: string): BaseParser {
    const parser = this.parsers.get(templateType);
    if (!parser) {
      throw new Error(`Parser not found for template: ${templateType}`);
    }
    return parser;
  }

  getAllTemplateTypes(): string[] {
    return Array.from(this.parsers.keys());
  }

  async autoDetectTemplate(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer);
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(firstSheet);

    if (!data.length) throw new Error('Empty Excel file');

    const columns = Object.keys(data[0]);

    // Try to match columns with each parser
    for (const [templateType, parser] of this.parsers) {
      const matchScore = parser.expectedColumns.filter(col =>
        columns.includes(col)
      ).length;

      if (matchScore === parser.expectedColumns.length) {
        return templateType;
      }
    }

    throw new Error('Could not auto-detect template type');
  }
}
```

---

### **Step 4: Comparison Engine**
**File:** `/lib/reconciliation/comparison/ComparisonEngine.ts`

```typescript
import { ReconciliationRow } from '../parsers/types';

export class ComparisonEngine {
  async compare(
    customerRows: ReconciliationRow[],
    nakOrders: any[],
    dateRange: { from: string; to: string }
  ): Promise<ComparisonResult> {

    // Build index maps for fast lookup
    const customerMap = new Map<string, ReconciliationRow>();
    customerRows.forEach(row => {
      customerMap.set(row.uniqueKey, row);
    });

    const nakMap = new Map<string, any>();
    const nakKeyMap = new Map<string, string>(); // uniqueKey -> order_id

    nakOrders.forEach(order => {
      nakMap.set(order.order_id, order);

      // Generate NAK unique keys based on template type
      const uniqueKeys = this.generateNakUniqueKeys(order, customerRows[0].templateType);
      uniqueKeys.forEach(key => {
        nakKeyMap.set(key, order.order_id);
      });
    });

    // Compare
    const matched: MatchedRecord[] = [];
    const mismatched: MismatchedRecord[] = [];
    const missingInNak: CustomerRecord[] = [];

    // Pass 1: Customer → NAK matching
    for (const [customerKey, customerRow] of customerMap) {
      const nakOrderId = nakKeyMap.get(customerKey);

      if (nakOrderId) {
        const nakOrder = nakMap.get(nakOrderId);

        // Check if values match
        const differences = this.findDifferences(customerRow, nakOrder);

        if (differences.length === 0) {
          matched.push({
            nakOrderId,
            customerRow,
            matchedFields: Object.keys(customerRow.rawData),
            confidence: 100,
          });
        } else {
          mismatched.push({
            nakOrderId,
            customerRow,
            differences,
          });
        }
      } else {
        missingInNak.push({
          row: customerRow,
          reason: 'Not found in NAK database',
        });
      }
    }

    // Pass 2: Find NAK orders missing in customer file
    const missingInCustomer: NakRecord[] = [];

    for (const [nakOrderId, nakOrder] of nakMap) {
      // Check if this NAK order was matched
      const wasMatched = matched.some(m => m.nakOrderId === nakOrderId) ||
                         mismatched.some(m => m.nakOrderId === nakOrderId);

      if (!wasMatched) {
        missingInCustomer.push({
          order: nakOrder,
          reason: 'Not found in customer reconciliation file',
        });
      }
    }

    return {
      summary: {
        totalCustomerRows: customerRows.length,
        totalNakOrders: nakOrders.length,
        matched: matched.length,
        mismatched: mismatched.length,
        missingInCustomer: missingInCustomer.length,
        missingInNak: missingInNak.length,
      },
      details: {
        matched,
        mismatched,
        missingInCustomer,
        missingInNak,
      },
    };
  }

  private generateNakUniqueKeys(order: any, templateType: string): string[] {
    // Generate multiple possible keys from NAK order based on template
    const keys: string[] = [];

    try {
      const details = typeof order.details === 'string'
        ? JSON.parse(order.details)
        : order.details;

      const chiTietLoTrinh = details?.chiTietLoTrinh || [];

      switch (templateType) {
        case 'jnt_route': {
          // Key: date|stampOut|stampIn
          const date = this.formatDate(order.date);
          const stampOut = chiTietLoTrinh[0]?.maTuyen || '';
          const stampIn = chiTietLoTrinh[chiTietLoTrinh.length - 1]?.maTuyen || '';
          keys.push(`${date}|${stampOut}|${stampIn}`.toLowerCase().trim());
          break;
        }

        case 'jnt_shift': {
          // Key: date|sortedStamps
          const date = this.formatDate(order.date);
          const stamps = chiTietLoTrinh.map((item: any) => item.maTuyen).filter(Boolean);
          const sortedStamps = stamps.sort().join('|');
          keys.push(`${date}|${sortedStamps}`.toLowerCase().trim());
          break;
        }

        case 'ghn': {
          // Key: each maTuyen is a separate key
          chiTietLoTrinh.forEach((item: any) => {
            if (item.maTuyen) {
              keys.push(item.maTuyen.toLowerCase().trim());
            }
          });
          break;
        }
      }
    } catch (error) {
      console.error('Failed to generate NAK keys:', error);
    }

    return keys;
  }

  private formatDate(date: Date | string): string {
    if (typeof date === 'string') {
      return date.split('T')[0]; // YYYY-MM-DD
    }
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private findDifferences(customerRow: ReconciliationRow, nakOrder: any): FieldDifference[] {
    const differences: FieldDifference[] = [];

    // Compare common fields
    // (Implementation depends on which fields to compare per template)

    return differences;
  }
}
```

---

### **Step 5: API Endpoints**

#### **5.1 Upload & Parse Endpoint**
**File:** `/app/api/reconciliation/upload/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { ParserRegistry } from '@/lib/reconciliation/parsers/ParserRegistry';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const templateType = formData.get('templateType') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    const registry = new ParserRegistry();

    // Auto-detect if no template type provided
    const detectedType = templateType || await registry.autoDetectTemplate(file);

    // Parse file
    const parser = registry.getParser(detectedType);
    const rows = await parser.parse(file);

    return NextResponse.json({
      success: true,
      templateType: detectedType,
      rowCount: rows.length,
      rows,
    });

  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

---

#### **5.2 Compare Endpoint**
**File:** `/app/api/reconciliation/compare/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { ComparisonEngine } from '@/lib/reconciliation/comparison/ComparisonEngine';
import { sql } from '@vercel/postgres';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerRows, dateRange } = body;

    if (!customerRows || !Array.isArray(customerRows)) {
      return NextResponse.json(
        { error: 'Invalid customer rows data' },
        { status: 400 }
      );
    }

    // Fetch NAK orders from database for the date range
    const { rows: nakOrders } = await sql`
      SELECT *
      FROM reconciliation_orders
      WHERE date >= ${dateRange.from}
        AND date <= ${dateRange.to}
      ORDER BY date ASC
    `;

    // Run comparison
    const engine = new ComparisonEngine();
    const result = await engine.compare(customerRows, nakOrders, dateRange);

    return NextResponse.json({
      success: true,
      result,
    });

  } catch (error: any) {
    console.error('Comparison error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

---

### **Step 6: Frontend UI**

#### **6.1 Upload Page**
**File:** `/components/reconciliation/import-upload.tsx`

```tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

export function ReconciliationUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [templateType, setTemplateType] = useState<string>('auto');
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    if (templateType !== 'auto') {
      formData.append('templateType', templateType);
    }

    try {
      const response = await fetch('/api/reconciliation/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        // Navigate to comparison page with parsed data
        // Store in sessionStorage or state management
        sessionStorage.setItem('customerRows', JSON.stringify(data.rows));
        window.location.href = '/reconciliation/compare';
      }
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2>Upload Customer Reconciliation File</h2>

      <Select
        value={templateType}
        onValueChange={setTemplateType}
      >
        <option value="auto">Auto-detect</option>
        <option value="jnt_route">J&T - Theo Tuyến</option>
        <option value="jnt_shift">J&T - Theo Ca</option>
        <option value="ghn">GHN</option>
      </Select>

      <Input
        type="file"
        accept=".xlsx,.xls"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />

      <Button
        onClick={handleUpload}
        disabled={!file || loading}
      >
        {loading ? 'Processing...' : 'Upload & Parse'}
      </Button>
    </div>
  );
}
```

---

#### **6.2 Comparison Results Page**
**File:** `/components/reconciliation/comparison-results.tsx`

```tsx
'use client';

import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function ComparisonResults() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const customerRows = JSON.parse(sessionStorage.getItem('customerRows') || '[]');

    // Call compare API
    fetch('/api/reconciliation/compare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerRows,
        dateRange: {
          from: '2026-01-01',
          to: '2026-12-31',
        },
      }),
    })
      .then(res => res.json())
      .then(data => {
        setResult(data.result);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading comparison...</div>;

  return (
    <div className="space-y-6">
      <h2>Comparison Results</h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <SummaryCard
          title="Matched"
          count={result.summary.matched}
          icon="✅"
          variant="success"
        />
        <SummaryCard
          title="Mismatched"
          count={result.summary.mismatched}
          icon="⚠️"
          variant="warning"
        />
        <SummaryCard
          title="Missing in Customer"
          count={result.summary.missingInCustomer}
          icon="❌"
          variant="error"
        />
        <SummaryCard
          title="Missing in NAK"
          count={result.summary.missingInNak}
          icon="❌"
          variant="error"
        />
      </div>

      {/* Detail Tables */}
      <Tabs defaultValue="matched">
        <TabsList>
          <TabsTrigger value="matched">
            Matched ({result.summary.matched})
          </TabsTrigger>
          <TabsTrigger value="mismatched">
            Mismatched ({result.summary.mismatched})
          </TabsTrigger>
          <TabsTrigger value="missing-customer">
            Missing in Customer ({result.summary.missingInCustomer})
          </TabsTrigger>
          <TabsTrigger value="missing-nak">
            Missing in NAK ({result.summary.missingInNak})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="matched">
          <MatchedTable data={result.details.matched} />
        </TabsContent>

        <TabsContent value="mismatched">
          <MismatchedTable data={result.details.mismatched} />
        </TabsContent>

        <TabsContent value="missing-customer">
          <MissingTable data={result.details.missingInCustomer} source="nak" />
        </TabsContent>

        <TabsContent value="missing-nak">
          <MissingTable data={result.details.missingInNak} source="customer" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

---

## 📋 Implementation Checklist

### **Phase 1: Infrastructure** (Week 1)
- [ ] Create base parser class (`BaseParser.ts`)
- [ ] Implement parser registry (`ParserRegistry.ts`)
- [ ] Add TypeScript interfaces for all types
- [ ] Set up XLSX library for Excel parsing

### **Phase 2: Parsers** (Week 2)
- [ ] Implement J&T Route parser
- [ ] Implement J&T Shift parser
- [ ] Implement GHN parser
- [ ] Add unit tests for each parser
- [ ] Test auto-detection logic

### **Phase 3: Comparison Engine** (Week 2-3)
- [ ] Implement unique key generation for NAK orders
- [ ] Build comparison algorithm
- [ ] Add field-level difference detection
- [ ] Implement confidence scoring

### **Phase 4: Backend APIs** (Week 3)
- [ ] Create upload endpoint (`/api/reconciliation/upload`)
- [ ] Create compare endpoint (`/api/reconciliation/compare`)
- [ ] Add error handling and validation
- [ ] Add API rate limiting

### **Phase 5: Frontend UI** (Week 4)
- [ ] Create upload page with template selector
- [ ] Build comparison results dashboard
- [ ] Add summary cards and charts
- [ ] Implement detail tables with filtering
- [ ] Add export functionality for comparison results

### **Phase 6: Testing & Refinement** (Week 5)
- [ ] End-to-end testing with real customer files
- [ ] Performance optimization for large files
- [ ] UI/UX refinement based on feedback
- [ ] Documentation and training materials

---

## 🔧 Technical Considerations

### **1. Performance**
- Use streaming for large Excel files (>10MB)
- Implement pagination for comparison results
- Cache parsed customer data in session/Redis
- Index database queries on date range

### **2. Data Quality**
- Fuzzy matching for minor differences (e.g., "Hà Nội" vs "Ha Noi")
- Configurable tolerance for numeric differences (e.g., ±1% for revenue)
- Manual review workflow for low-confidence matches

### **3. Scalability**
- Background job processing for large comparisons
- Progress tracking with WebSocket updates
- Export results to Excel for offline review

### **4. Security**
- Validate file size limits (<50MB)
- Scan uploads for malware
- Restrict access to authorized users only
- Audit log for all comparison operations

---

## 📊 Expected Workflow

```
1. Kế toán nhận file Excel từ khách hàng
   ↓
2. Login vào NAK System → Reconciliation → Import
   ↓
3. Chọn template type hoặc để auto-detect
   ↓
4. Upload file → System parse → Show preview
   ↓
5. Xác nhận → Click "Compare with NAK Database"
   ↓
6. System so sánh → Hiển thị kết quả:
   - ✅ Matched: 245 chuyến
   - ⚠️ Mismatched: 12 chuyến (review)
   - ❌ Missing in Customer: 5 chuyến
   - ❌ Missing in NAK: 3 chuyến
   ↓
7. Kế toán review từng tab:
   - Click vào Mismatched → Xem chi tiết differences
   - Click vào Missing → Verify với khách hàng
   ↓
8. Export comparison report → Gửi email cho khách hàng
```

---

## 🎯 Success Metrics

- ✅ **Accuracy:** >95% match rate for correct data
- ✅ **Speed:** Process 1000 rows in <10 seconds
- ✅ **Usability:** Accountant can complete comparison in <5 minutes
- ✅ **Flexibility:** Support new templates in <1 day

---

**📚 Related Files:**
- Export strategies: `/app/api/reconciliation/export/strategies/`
- Current export endpoint: `/app/api/reconciliation/export/route.ts`
- Reconciliation UI: `/components/reconciliation/toolbar.tsx`

**🎉 Ready to implement!**
