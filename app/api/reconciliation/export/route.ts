import { sql } from '@vercel/postgres';
import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

// Types for database row
interface ReconciliationDatabaseRow {
  id: string;
  order_id: string;
  date: Date;
  customer: string;
  route_name: string;
  driver_name: string;
  provider: string;
  status: string;
  cost: number;
  revenue: number;
  trip_type: string;
  route_type: string;
  weight: number;
  total_distance: number;
  details: any;
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
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (fromDate) {
      conditions.push(`date >= $${paramIndex}`);
      params.push(fromDate);
      paramIndex++;
    }
    if (toDate) {
      conditions.push(`date <= $${paramIndex}`);
      params.push(toDate);
      paramIndex++;
    }
    if (khachHang) {
      conditions.push(`LOWER(customer) LIKE $${paramIndex}`);
      params.push(`%${khachHang.toLowerCase()}%`);
      paramIndex++;
    }
    if (donViVanChuyen) {
      conditions.push(`LOWER(TRIM(provider)) = $${paramIndex}`);
      params.push(donViVanChuyen.toLowerCase());
      paramIndex++;
    }
    if (loaiChuyen) {
      conditions.push(`LOWER(TRIM(trip_type)) LIKE $${paramIndex}`);
      params.push(`%${loaiChuyen.toLowerCase()}%`);
      paramIndex++;
    }
    if (searchQuery) {
      conditions.push(`(
        LOWER(order_id) LIKE $${paramIndex} OR
        LOWER(customer) LIKE $${paramIndex} OR
        LOWER(route_name) LIKE $${paramIndex} OR
        LOWER(driver_name) LIKE $${paramIndex}
      )`);
      params.push(`%${searchQuery.toLowerCase()}%`);
      paramIndex++;
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // Build the full query string
    const queryString = `
      SELECT 
        id, order_id, date, customer, route_name, driver_name,
        provider, status, cost, revenue,
        trip_type, route_type, weight, total_distance, details, created_at
      FROM reconciliation_orders
      ${whereClause}
      ORDER BY date DESC, created_at DESC
    `;
    
    console.log('🔍 Executing query with filters:', { whereClause, params });
    
    // Execute using Vercel Postgres with parameterized query
    const result = await sql.query(queryString, params);
    const results = result.rows as ReconciliationDatabaseRow[];

    console.log(`✓ Fetched ${results.length} records from database`);

    // Check if we have data
    if (results.length === 0) {
      console.log('⚠️ No data found for export with current filters');
      return NextResponse.json(
        { error: 'Không có dữ liệu để xuất với bộ lọc hiện tại' },
        { status: 404 }
      );
    }

    // =====================
    // STEP 2: Generate Excel based on templateType (Strategy Pattern)
    // =====================
    let workbook: ExcelJS.Workbook;
    let fileName: string;

    console.log(`📝 Generating ${templateType} Excel template...`);

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
        console.log(`❌ Invalid templateType: ${templateType}`);
        return NextResponse.json(
          { error: 'Invalid templateType' },
          { status: 400 }
        );
    }

    console.log(`✓ Excel generated successfully: ${fileName}`);

    // =====================
    // STEP 3: Convert to Buffer and Return
    // =====================
    console.log('📦 Converting workbook to buffer...');
    const buffer = await workbook.xlsx.writeBuffer();
    console.log(`✓ Buffer created: ${buffer.byteLength} bytes`);

    console.log('✅ Export completed successfully');

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
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { 
        error: 'Failed to export data', 
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
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
    // Extract license plate from details if available
    let licensePlate = '';
    try {
      const details = typeof record.details === 'string' ? JSON.parse(record.details) : record.details;
      const chiTietLoTrinh = details?.chiTietLoTrinh || [];
      licensePlate = chiTietLoTrinh[0]?.bienKiemSoat || '';
    } catch (error) {
      console.error('Failed to parse details for order:', record.id, error);
    }

    const row = worksheet.addRow({
      order_id: record.order_id,
      date: record.date ? format(new Date(record.date), 'dd/MM/yyyy') : '',
      customer: record.customer,
      route_name: record.route_name || '',
      driver_name: record.driver_name || '',
      license_plate: licensePlate,
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
 * - One order = one row (simplified format)
 * - Tem đi (first stamp) and Tem về (last stamp)
 * - Use route_name from database directly
 */
async function generateJnTRouteExcel(data: ReconciliationDatabaseRow[]): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('JnT Theo Tuyen');

  // =====================
  // STEP 1: Define Columns & Width
  // =====================
  worksheet.columns = [
    { header: 'STT', key: 'stt', width: 8 },
    { header: 'Ngày', key: 'date', width: 15 },
    { header: 'Biển số xe', key: 'licensePlate', width: 15 },
    { header: 'Điểm đi - Điểm đến', key: 'routeName', width: 40 },
    { header: 'Tem chiều đi', key: 'stampOut', width: 25 },
    { header: 'Tem chiều về', key: 'stampIn', width: 25 },
    { header: 'Thể tích', key: 'volume', width: 15 },
  ];

  // =====================
  // STEP 2: Style Header Row
  // =====================
  const headerRow = worksheet.getRow(1);
  headerRow.height = 25;
  
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFC0C0C0' }, // Silver gray
    };
    cell.font = { bold: true, color: { argb: 'FF000000' } };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  // =====================
  // STEP 3: Process Data Loop
  // =====================
  data.forEach((order, index) => {
    // Parse details safely (can be string or object)
    let details: any = null;
    try {
      if (typeof order.details === 'string') {
        details = JSON.parse(order.details);
      } else if (typeof order.details === 'object' && order.details !== null) {
        details = order.details;
      }
    } catch (error) {
      console.error('Failed to parse details for order:', order.id, error);
    }

    // Extract chiTietLoTrinh array
    const chiTietLoTrinh = details?.chiTietLoTrinh || [];

    // =====================
    // Data Mapping Logic
    // =====================

    // Cột A: STT (1-indexed)
    const stt = index + 1;

    // Cột B: Ngày (format dd/MM/yyyy)
    const dateValue = order.date ? format(new Date(order.date), 'dd/MM/yyyy') : '';

    // Cột C: Biển số xe (lấy phần tử đầu tiên từ chiTietLoTrinh)
    const licensePlate = chiTietLoTrinh[0]?.bienKiemSoat || '';

    // Cột D: Điểm đi - Điểm đến (lấy trực tiếp từ DB)
    const routeName = order.route_name || '';

    // Cột E: Tem chiều đi (phần tử ĐẦU TIÊN - index 0)
    const stampOut = chiTietLoTrinh[0]?.maTuyen || '';

    // Cột F: Tem chiều về (phần tử CUỐI CÙNG - index = length - 1)
    const stampIn = chiTietLoTrinh.length > 0 
      ? chiTietLoTrinh[chiTietLoTrinh.length - 1]?.maTuyen || ''
      : '';

    // Cột G: Thể tích (nếu có nhiều dòng thì nối bằng dấu phẩy, hoặc lấy dòng đại diện)
    const volumes = chiTietLoTrinh
      .map((item: any) => item.taiTrongTinhPhi)
      .filter((value: any) => value);
    const volume = volumes.length > 0 ? volumes.join(', ') : '';

    // =====================
    // Add Row to Worksheet
    // =====================
    const row = worksheet.addRow({
      stt,
      date: dateValue,
      licensePlate,
      routeName,
      stampOut,
      stampIn,
      volume,
    });

    // =====================
    // STEP 4: Style Data Cells
    // =====================
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center',
        wrapText: true, // Prevent overflow
      };
    });

    // Set row height (standard)
    row.height = 20;
  });

  console.log('✓ Generated J&T Route Excel (Simplified Format) with', data.length, 'rows');
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
