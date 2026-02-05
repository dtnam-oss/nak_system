import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { format } from 'date-fns';
import { generateJnTShiftExcel as generateJnTShiftStrategy } from './strategies/JnT_Shift_Template';
import { generateJnTRouteExcel as generateJnTRouteStrategy } from './strategies/JnT_Route_Template';
import { generateGHNExcel as generateGHNStrategy } from './strategies/GHN_Template';
import { generateYUNYIExcel as generateYUNYIStrategy } from './strategies/YUNYI_Template';

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
 * - templateType: 'general' | 'jnt_route' | 'jnt_shift' | 'ghn' (required)
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
      conditions.push(`cd.ngay_tao::date >= $${paramIndex}::date`);
      params.push(fromDate);
      paramIndex++;
    }
    if (toDate) {
      conditions.push(`cd.ngay_tao::date <= $${paramIndex}::date`);
      params.push(toDate);
      paramIndex++;
    }
    if (khachHang) {
      // Support multi-select: comma-separated values "J&T,GHN,VIETTEL"
      const customerList = khachHang.split(',').map(c => c.trim()).filter(Boolean);

      if (customerList.length === 1) {
        // Single customer: use ILIKE for partial match
        conditions.push(`LOWER(cd.ten_khach_hang) LIKE $${paramIndex}`);
        params.push(`%${customerList[0].toLowerCase()}%`);
        paramIndex++;
      } else if (customerList.length > 1) {
        // Multiple customers: use ANY with array
        conditions.push(`cd.ten_khach_hang = ANY($${paramIndex})`);
        params.push(customerList);
        paramIndex++;
      }
    }
    if (donViVanChuyen) {
      conditions.push(`LOWER(TRIM(cd.don_vi_van_chuyen)) = $${paramIndex}`);
      params.push(donViVanChuyen.toLowerCase());
      paramIndex++;
    }
    if (loaiChuyen) {
      conditions.push(`LOWER(TRIM(cd.loai_chuyen)) LIKE $${paramIndex}`);
      params.push(`%${loaiChuyen.toLowerCase()}%`);
      paramIndex++;
    }
    if (searchQuery) {
      conditions.push(`(
        LOWER(cd.ma_chuyen_di) LIKE $${paramIndex} OR
        LOWER(cd.ten_khach_hang) LIKE $${paramIndex} OR
        LOWER(cd.ten_tuyen) LIKE $${paramIndex} OR
        LOWER(cd.ten_tai_xe) LIKE $${paramIndex}
      )`);
      params.push(`%${searchQuery.toLowerCase()}%`);
      paramIndex++;
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // Build the full query string - JOIN with chi_tiet_chuyen_di for details
    const queryString = `
      SELECT
        cd.ma_chuyen_di as order_id,
        cd.ma_chuyen_di as id,
        cd.ngay_tao as date,
        cd.ten_khach_hang as customer,
        cd.ten_tuyen as route_name,
        cd.ten_tai_xe as driver_name,
        cd.don_vi_van_chuyen as provider,
        cd.trang_thai_chuyen_di as status,
        0 as cost,
        CASE
          WHEN cd.doanh_thu::TEXT IS NULL OR cd.doanh_thu::TEXT = '' THEN 0
          WHEN cd.doanh_thu::TEXT !~ '^-?[0-9]*\\.?[0-9]+$' THEN 0
          ELSE cd.doanh_thu::NUMERIC
        END as revenue,
        cd.loai_chuyen as trip_type,
        cd.loai_tuyen as route_type,
        CASE
          WHEN cd.so_km_theo_odo::TEXT IS NULL OR cd.so_km_theo_odo::TEXT = '' THEN 0
          WHEN cd.so_km_theo_odo::TEXT !~ '^-?[0-9]*\\.?[0-9]+$' THEN 0
          ELSE cd.so_km_theo_odo::NUMERIC
        END as weight,
        CASE
          WHEN cd.so_km_theo_odo::TEXT IS NULL OR cd.so_km_theo_odo::TEXT = '' THEN 0
          WHEN cd.so_km_theo_odo::TEXT !~ '^-?[0-9]*\\.?[0-9]+$' THEN 0
          ELSE cd.so_km_theo_odo::NUMERIC
        END as total_distance,
        json_build_object(
          'chiTietLoTrinh',
          COALESCE(
            json_agg(
              json_build_object(
                'id', ct.id,
                'loTrinh', ct.lo_trinh,
                'tenTuyen', ct.ten_tuyen,
                'loTrinhChiTiet', ct.lo_trinh_chi_tiet_theo_diem,
                'bienKiemSoat', ct.bien_kiem_soat,
                'quangDuong', ct.quang_duong,
                'taiTrong', ct.tai_trong,
                'taiTrongTinhPhi', ct.tai_trong_tinh_phi,
                'soChieu', ct.so_chieu,
                'donGia', ct.don_gia,
                'thanhTien', ct.ket_qua,
                'hinhThucTinhGia', ct.hinh_thuc_tinh_gia,
                'loaiCa', ct.loai_ca,
                'maTuyen', ct.ma_chuyen_di_kh,
                'loaiTuyenKH', ct.loai_tuyen_khach_hang,
                'ngayTrenTem', ct.ngay_tren_tem,
                'tenKhachHangCap1', ct.ten_khach_hang_cap_1,
                'hinhAnh', ct.hinh_anh
              ) ORDER BY ct.id
            ) FILTER (WHERE ct.id IS NOT NULL),
            '[]'::json
          )
        ) as details,
        cd.thoi_gian_tao as created_at
      FROM chuyen_di cd
      LEFT JOIN chi_tiet_chuyen_di ct ON ct.ma_chuyen_di = cd.ma_chuyen_di
      ${whereClause}
      GROUP BY cd.ma_chuyen_di, cd.ngay_tao, cd.ten_khach_hang, cd.ten_tuyen, cd.ten_tai_xe, cd.don_vi_van_chuyen, cd.trang_thai_chuyen_di, cd.doanh_thu, cd.loai_chuyen, cd.loai_tuyen, cd.so_km_theo_odo, cd.thoi_gian_tao
      ORDER BY cd.ngay_tao DESC, cd.thoi_gian_tao DESC
    `;
    
    console.log('🔍 Executing query with filters:', { whereClause, params });
    
    // Execute using Vercel Postgres with parameterized query
    const result = await query(queryString, params);
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
        // Use strategy for Route-based report (Theo Tuyến)
        const bufferJnTRoute = await generateJnTRouteStrategy(results);
        fileName = `Doisoat_JnT_TheoTuyen_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
        console.log(`✓ Excel generated successfully: ${fileName}`);
        
        return new NextResponse(bufferJnTRoute, {
          status: 200,
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
            'Content-Length': bufferJnTRoute.byteLength.toString(),
          },
        });

      case 'jnt_shift':
        // Use strategy for Shift-based report (Theo Ca)
        const bufferJnTShift = await generateJnTShiftStrategy(results);
        fileName = `Doisoat_JnT_TheoCa_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
        console.log(`✓ Excel generated successfully: ${fileName}`);
        
        return new NextResponse(bufferJnTShift, {
          status: 200,
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
            'Content-Length': bufferJnTShift.byteLength.toString(),
          },
        });

      case 'ghn':
        // Use strategy for GHN report (Row Flattening)
        const bufferGHN = await generateGHNStrategy(results);
        fileName = `Doisoat_GHN_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
        console.log(`✓ Excel generated successfully: ${fileName}`);

        return new NextResponse(bufferGHN, {
          status: 200,
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
            'Content-Length': bufferGHN.byteLength.toString(),
          },
        });

      case 'yunyi':
        // Use strategy for YUNYI report (Row Flattening with driver split)
        const bufferYUNYI = await generateYUNYIStrategy(results);
        fileName = `Doisoat_YUNYI_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
        console.log(`✓ Excel generated successfully: ${fileName}`);

        return new NextResponse(bufferYUNYI, {
          status: 200,
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
            'Content-Length': bufferYUNYI.byteLength.toString(),
          },
        });

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
      licensePlate = Array.isArray(chiTietLoTrinh) && chiTietLoTrinh[0]?.bienKiemSoat || '';
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
      cost: 0, // Cost column không có trong schema mới
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
