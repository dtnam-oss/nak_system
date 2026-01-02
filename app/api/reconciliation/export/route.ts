import { neon } from '@neondatabase/serverless';
import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

const sql = neon(process.env.DATABASE_URL!);

// Types for database row
interface ReconciliationDatabaseRow {
  id: string;
  order_id: string;
  date: Date;
  customer: string;
  route_name: string;
  driver_name: string;
  license_plate: string;
  provider: string;
  status: string;
  cost: number;
  revenue: number;
  trip_type: string;
  route_type: string;
  data_json: any;
  created_at: Date;
}

/**
 * GET /api/reconciliation/export
 * 
 * Xuất dữ liệu đối soát ra file Excel với nhiều mẫu báo cáo khác nhau
 * 
 * Query Parameters:
 * - templateType: 'general' | 'jnt_route' | 'jnt_shift' (required)
 * - fromDate, toDate, khachHang, donViVanChuyen, loaiChuyen, searchQuery (optional filters)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Extract templateType
    const templateType = searchParams.get('templateType') || 'general';
    
    // Extract filters
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');
    const khachHang = searchParams.get('khachHang');
    const donViVanChuyen = searchParams.get('donViVanChuyen');
    const loaiChuyen = searchParams.get('loaiChuyen');
    const searchQuery = searchParams.get('searchQuery');

    console.log('📊 Export Request:', { templateType, filters: { fromDate, toDate, khachHang } });

    // =====================
    // STEP 1: Query Database with Dynamic Filters
    // =====================
    // Build WHERE clause dynamically (escape single quotes for SQL injection prevention)
    const safeClauses: string[] = ['1=1'];
    
    if (fromDate) {
      safeClauses.push(`date >= '${fromDate}'`);
    }
    if (toDate) {
      safeClauses.push(`date <= '${toDate}'`);
    }
    if (khachHang) {
      const safeCustomer = khachHang.replace(/'/g, "''");
      safeClauses.push(`LOWER(customer) LIKE '%${safeCustomer.toLowerCase()}%'`);
    }
    if (donViVanChuyen) {
      const safeProvider = donViVanChuyen.replace(/'/g, "''");
      safeClauses.push(`LOWER(TRIM(provider)) = '${safeProvider.toLowerCase()}'`);
    }
    if (loaiChuyen) {
      const safeTripType = loaiChuyen.replace(/'/g, "''");
      safeClauses.push(`LOWER(TRIM(trip_type)) LIKE '%${safeTripType.toLowerCase()}%'`);
    }
    if (searchQuery) {
      const safeQuery = searchQuery.replace(/'/g, "''");
      safeClauses.push(`(
        LOWER(order_id) LIKE '%${safeQuery.toLowerCase()}%' OR
        LOWER(customer) LIKE '%${safeQuery.toLowerCase()}%' OR
        LOWER(route_name) LIKE '%${safeQuery.toLowerCase()}%' OR
        LOWER(driver_name) LIKE '%${safeQuery.toLowerCase()}%'
      )`);
    }

    const finalQuery = `
      SELECT 
        id, order_id, date, customer, route_name, driver_name,
        license_plate, provider, status, cost, revenue,
        trip_type, route_type, data_json, created_at
      FROM reconciliation_orders
      WHERE ${safeClauses.join(' AND ')}
      ORDER BY date DESC, created_at DESC
    `;

    // Neon requires template literal syntax, so we use tagged template
    const results = await sql([finalQuery] as any) as ReconciliationDatabaseRow[];

    console.log(`✓ Fetched ${results.length} records from database`);

    // =====================
    // STEP 2: Generate Excel based on templateType (Strategy Pattern)
    // =====================
    let workbook: ExcelJS.Workbook;
    let fileName: string;

    switch (templateType) {
      case 'general':
        workbook = await generateGeneralExcel(results);
        fileName = `Doisoat_TongHop_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
        break;

      case 'jnt_route':
        workbook = await generateJnTRouteExcel(results);
        fileName = `Doisoat_JnT_TheoTuyen_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
        break;

      case 'jnt_shift':
        workbook = await generateJnTShiftExcel(results);
        fileName = `Doisoat_JnT_TheoCa_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid templateType' },
          { status: 400 }
        );
    }

    // =====================
    // STEP 3: Convert to Buffer and Return
    // =====================
    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
        'Content-Length': buffer.byteLength.toString(),
      },
    });

  } catch (error) {
    console.error('❌ Export Error:', error);
    return NextResponse.json(
      { error: 'Failed to export data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// =====================
// Excel Generator Functions
// =====================

/**
 * Generate General Report Excel (Internal Use)
 * 
 * Format: Basic table with all key columns from reconciliation_orders
 * Style: Professional with header row styling, borders, and auto-column width
 */
async function generateGeneralExcel(data: ReconciliationDatabaseRow[]): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Báo cáo Tổng hợp');

  // =====================
  // STEP 1: Define Columns
  // =====================
  worksheet.columns = [
    { header: 'Mã chuyến đi', key: 'order_id', width: 20 },
    { header: 'Ngày', key: 'date', width: 12 },
    { header: 'Khách hàng', key: 'customer', width: 25 },
    { header: 'Tên tuyến', key: 'route_name', width: 30 },
    { header: 'Tài xế', key: 'driver_name', width: 20 },
    { header: 'Biển số xe', key: 'license_plate', width: 12 },
    { header: 'Đơn vị vận chuyển', key: 'provider', width: 15 },
    { header: 'Loại chuyến', key: 'trip_type', width: 15 },
    { header: 'Loại tuyến', key: 'route_type', width: 15 },
    { header: 'Chi phí', key: 'cost', width: 15 },
    { header: 'Doanh thu', key: 'revenue', width: 15 },
    { header: 'Trạng thái', key: 'status', width: 15 },
  ];

  // =====================
  // STEP 2: Style Header Row
  // =====================
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }, // Blue background
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 25;

  // Add borders to header
  headerRow.eachCell((cell) => {
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  });

  // =====================
  // STEP 3: Add Data Rows
  // =====================
  data.forEach((record) => {
    const row = worksheet.addRow({
      order_id: record.order_id,
      date: record.date ? format(new Date(record.date), 'dd/MM/yyyy') : '',
      customer: record.customer,
      route_name: record.route_name || '',
      driver_name: record.driver_name || '',
      license_plate: record.license_plate || '',
      provider: record.provider,
      trip_type: record.trip_type || '',
      route_type: record.route_type || '',
      cost: record.cost || 0,
      revenue: record.revenue || 0,
      status: record.status,
    });

    // Format currency columns
    row.getCell('cost').numFmt = '#,##0 ₫';
    row.getCell('revenue').numFmt = '#,##0 ₫';

    // Add borders to data cells
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    // Alternate row coloring
    if (row.number % 2 === 0) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF2F2F2' }, // Light gray
      };
    }
  });

  // =====================
  // STEP 4: Add Summary Row
  // =====================
  const summaryRow = worksheet.addRow({
    order_id: 'TỔNG CỘNG',
    date: '',
    customer: '',
    route_name: '',
    driver_name: '',
    license_plate: '',
    provider: '',
    trip_type: '',
    route_type: '',
    cost: data.reduce((sum, r) => sum + (r.cost || 0), 0),
    revenue: data.reduce((sum, r) => sum + (r.revenue || 0), 0),
    status: '',
  });

  summaryRow.font = { bold: true };
  summaryRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFD966' }, // Yellow background
  };
  summaryRow.getCell('cost').numFmt = '#,##0 ₫';
  summaryRow.getCell('revenue').numFmt = '#,##0 ₫';

  summaryRow.eachCell((cell) => {
    cell.border = {
      top: { style: 'double' },
      left: { style: 'thin' },
      bottom: { style: 'double' },
      right: { style: 'thin' },
    };
  });

  console.log('✓ Generated General Excel with', data.length, 'rows');
  return workbook;
}

/**
 * Generate J&T Route-based Report Excel
 * 
 * Mẫu báo cáo theo Tuyến cho khách hàng J&T
 * - Parse data_json để lấy mảng chiTietLoTrinh
 * - Map các trường: Ngày, Biển số xe, Mã tem, Điểm đi-đến, Thể tích, Loại ca
 * - Support multi-line content trong cell (wrapText)
 */
async function generateJnTRouteExcel(data: ReconciliationDatabaseRow[]): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Bang Ke J&T');

  // =====================
  // STEP 1: Define Columns
  // =====================
  worksheet.columns = [
    { header: 'Ngày', key: 'date', width: 15 },
    { header: 'Biển số xe', key: 'licensePlate', width: 15 },
    { header: 'Mã tem', key: 'stampCode', width: 25 },
    { header: 'Điểm đi - Điểm đến', key: 'route', width: 40 },
    { header: 'Thể tích', key: 'volume', width: 15 },
    { header: 'Loại ca', key: 'shiftType', width: 20 },
  ];

  // =====================
  // STEP 2: Style Header Row
  // =====================
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, size: 11 };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD3D3D3' }, // Light gray background
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 25;

  // Add borders to header
  headerRow.eachCell((cell) => {
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  });

  // =====================
  // STEP 3: Process Data Rows
  // =====================
  data.forEach((record) => {
    // Parse data_json (can be string or object)
    let details: any = null;
    try {
      if (typeof record.data_json === 'string') {
        details = JSON.parse(record.data_json);
      } else if (typeof record.data_json === 'object' && record.data_json !== null) {
        details = record.data_json;
      }
    } catch (error) {
      console.error('Failed to parse data_json for record:', record.id, error);
    }

    // Extract chiTietLoTrinh array
    const chiTietLoTrinh = details?.chiTietLoTrinh || [];

    // =====================
    // Data Mapping Logic
    // =====================
    
    // Cột A: Ngày (format dd/MM/yyyy)
    const dateValue = record.date ? format(new Date(record.date), 'dd/MM/yyyy') : '';

    // Cột B: Biển số xe (unique values, comma-separated)
    const licensePlates = chiTietLoTrinh
      .map((item: any) => item.bienKiemSoat)
      .filter((value: any, index: number, self: any[]) => value && self.indexOf(value) === index) // unique
      .join(', ');

    // Cột C: Mã tem (join by newline)
    const stampCodes = chiTietLoTrinh
      .map((item: any) => item.maTuyen)
      .filter((value: any) => value)
      .join('\n');

    // Cột D: Điểm đi - Điểm đến (join by newline)
    const routes = chiTietLoTrinh
      .map((item: any) => item.loTrinhChiTiet)
      .filter((value: any) => value)
      .join('\n');

    // Cột E: Thể tích (join by newline)
    const volumes = chiTietLoTrinh
      .map((item: any) => item.taiTrongTinhPhi)
      .filter((value: any) => value)
      .join('\n');

    // Cột F: Loại ca (join by newline)
    const shiftTypes = chiTietLoTrinh
      .map((item: any) => item.loaiCa)
      .filter((value: any) => value)
      .join('\n');

    // =====================
    // Add Row to Worksheet
    // =====================
    const row = worksheet.addRow({
      date: dateValue,
      licensePlate: licensePlates,
      stampCode: stampCodes,
      route: routes,
      volume: volumes,
      shiftType: shiftTypes,
    });

    // =====================
    // STEP 4: Style Data Cells (CRITICAL: wrapText enabled)
    // =====================
    row.eachCell((cell) => {
      cell.alignment = {
        wrapText: true, // Enable multi-line content
        vertical: 'middle',
        horizontal: 'center',
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    // Auto-adjust row height based on content (approximate)
    const maxLines = Math.max(
      (stampCodes.match(/\n/g) || []).length + 1,
      (routes.match(/\n/g) || []).length + 1,
      (volumes.match(/\n/g) || []).length + 1,
      (shiftTypes.match(/\n/g) || []).length + 1
    );
    row.height = Math.max(20, maxLines * 15); // 15px per line
  });

  console.log('✓ Generated J&T Route Excel with', data.length, 'rows');
  return workbook;
}

/**
 * Generate J&T Shift-based Report Excel
 * 
 * TODO: Implement J&T specific columns and styles here
 * - Group by shift/driver
 * - Add shift timing, driver performance metrics
 * - Include fuel consumption, delivery counts
 */
async function generateJnTShiftExcel(data: ReconciliationDatabaseRow[]): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('J&T - Theo Ca');

  // TODO: Implement J&T Shift template
  // Placeholder: Copy general structure for now
  worksheet.columns = [
    { header: 'Ca làm việc', key: 'shift', width: 15 },
    { header: 'Tài xế', key: 'driver_name', width: 20 },
    { header: 'Biển số xe', key: 'license_plate', width: 12 },
    { header: 'Giờ bắt đầu', key: 'start_time', width: 12 },
    { header: 'Giờ kết thúc', key: 'end_time', width: 12 },
    { header: 'Số chuyến', key: 'trip_count', width: 12 },
    { header: 'Tổng chi phí', key: 'total_cost', width: 15 },
    { header: 'Ghi chú', key: 'notes', width: 30 },
  ];

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE74C3C' }, // J&T Red color
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

  // Add placeholder note
  worksheet.addRow(['TODO: Implement J&T Shift-specific logic here']);
  worksheet.addRow(['Current data count:', data.length]);

  console.log('⚠️ Generated J&T Shift Excel (Placeholder)');
  return workbook;
}
