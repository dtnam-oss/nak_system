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

    // ALWAYS exclude cancelled trips (Hủy) from export
    conditions.push(`cd.trang_thai_chuyen_di NOT IN ('Hủy', 'Huỷ')`);

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
 * Format: Full table combining chuyen_di + chi_tiet_chuyen_di columns
 * Logic: 1 order = 1 row, multiple chi_tiet_chuyen_di are merged into
 *        a single cell using \n separator (wrapText enabled)
 */
async function generateGeneralExcel(data: ReconciliationDatabaseRow[]): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Báo cáo Tổng hợp');

  // =====================
  // STEP 1: Define Columns
  // Order-level columns first, then chi_tiet_chuyen_di columns (multi-line)
  // =====================
  worksheet.columns = [
    // --- Thông tin chuyến đi (chuyen_di) ---
    { header: 'Mã chuyến đi', key: 'order_id',    width: 22 },
    { header: 'Ngày',          key: 'date',         width: 12 },
    { header: 'Khách hàng',    key: 'customer',     width: 20 },
    { header: 'Tên tuyến',     key: 'route_name',   width: 30 },
    { header: 'Tài xế',        key: 'driver_name',  width: 22 },
    { header: 'Đơn vị VC',     key: 'provider',     width: 12 },
    { header: 'Loại chuyến',   key: 'trip_type',    width: 14 },
    { header: 'Loại tuyến',    key: 'route_type',   width: 14 },
    { header: 'Doanh thu',     key: 'revenue',      width: 15 },
    { header: 'Trạng thái',    key: 'status',       width: 15 },
    // --- Chi tiết lộ trình (chi_tiet_chuyen_di) - gộp nhiều dòng bằng \n ---
    { header: 'Biển số xe',          key: 'bien_kiem_soat',       width: 14 },
    { header: 'Lộ trình',            key: 'lo_trinh',             width: 35 },
    { header: 'Lộ trình chi tiết',   key: 'lo_trinh_chi_tiet',   width: 45 },
    { header: 'Mã chuyến KH',        key: 'ma_chuyen_di_kh',     width: 22 },
    { header: 'Tải trọng',           key: 'tai_trong',            width: 12 },
    { header: 'Tải trọng tính phí',  key: 'tai_trong_tinh_phi',  width: 16 },
    { header: 'Quãng đường (km)',     key: 'quang_duong',         width: 15 },
    { header: 'Số chiều',            key: 'so_chieu',             width: 10 },
    { header: 'Đơn giá',             key: 'don_gia',              width: 14 },
    { header: 'Hình thức tính giá',  key: 'hinh_thuc_tinh_gia',  width: 20 },
    { header: 'Loại ca',             key: 'loai_ca',              width: 14 },
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
  headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  headerRow.height = 30;

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
    // Parse chiTietLoTrinh array from details JSON
    let chiTietLoTrinh: any[] = [];
    try {
      const details = typeof record.details === 'string'
        ? JSON.parse(record.details)
        : record.details;
      chiTietLoTrinh = Array.isArray(details?.chiTietLoTrinh) ? details.chiTietLoTrinh : [];
    } catch (error) {
      console.error('Failed to parse details for order:', record.id, error);
    }

    // Helper: join non-empty values from all chi_tiet items using \n
    const joinField = (field: string): string =>
      chiTietLoTrinh
        .map((item: any) => {
          const val = item[field];
          return (val !== null && val !== undefined && val !== '') ? String(val) : null;
        })
        .filter((v): v is string => v !== null)
        .join('\n');

    // Helper: join unique values only (e.g. bien_kiem_soat thường giống nhau)
    const joinUniqueField = (field: string): string =>
      [...new Set(
        chiTietLoTrinh
          .map((item: any) => item[field])
          .filter((v: any) => v !== null && v !== undefined && v !== '')
          .map(String)
      )].join('\n');

    const row = worksheet.addRow({
      // Order-level fields
      order_id:   record.order_id,
      date:       record.date ? format(new Date(record.date), 'dd/MM/yyyy') : '',
      customer:   record.customer || '',
      route_name: record.route_name || '',
      driver_name: record.driver_name || '',
      provider:   record.provider || '',
      trip_type:  record.trip_type || '',
      route_type: record.route_type || '',
      revenue:    record.revenue || 0,
      status:     record.status || '',
      // chi_tiet_chuyen_di fields - multi-line merged
      bien_kiem_soat:      joinUniqueField('bienKiemSoat'),
      lo_trinh:            joinField('loTrinh'),
      lo_trinh_chi_tiet:   joinField('loTrinhChiTiet'),
      ma_chuyen_di_kh:     joinField('maTuyen'),
      tai_trong:           joinField('taiTrong'),
      tai_trong_tinh_phi:  joinField('taiTrongTinhPhi'),
      quang_duong:         joinField('quangDuong'),
      so_chieu:            joinField('soChieu'),
      don_gia:             joinField('donGia'),
      hinh_thuc_tinh_gia:  joinField('hinhThucTinhGia'),
      loai_ca:             joinField('loaiCa'),
    });

    // Format currency
    row.getCell('revenue').numFmt = '#,##0 ₫';

    // Style all cells: borders + wrapText
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = {
        top:    { style: 'thin' },
        left:   { style: 'thin' },
        bottom: { style: 'thin' },
        right:  { style: 'thin' },
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'left',
        wrapText: true, // Enable multi-line display
      };
    });

    // Align numeric/date columns to center
    ['date', 'revenue', 'quang_duong', 'so_chieu', 'don_gia', 'tai_trong', 'tai_trong_tinh_phi'].forEach((key) => {
      row.getCell(key).alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    });

    // Auto row height based on max number of detail lines
    const lineCount = Math.max(chiTietLoTrinh.length, 1);
    row.height = Math.max(20, lineCount * 16);

    // Alternate row coloring
    if (row.number % 2 === 0) {
      row.eachCell({ includeEmpty: true }, (cell) => {
        // Only set fill if not already coloured by other logic
        if (!cell.fill || (cell.fill as any).fgColor?.argb === undefined) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF2F2F2' },
          };
        }
      });
    }
  });

  // =====================
  // STEP 4: Add Summary Row
  // =====================
  const summaryRow = worksheet.addRow({
    order_id: `TỔNG CỘNG: ${data.length} chuyến`,
    date: '', customer: '', route_name: '', driver_name: '',
    provider: '', trip_type: '', route_type: '',
    revenue: data.reduce((sum, r) => sum + (r.revenue || 0), 0),
    status: '',
    bien_kiem_soat: '', lo_trinh: '', lo_trinh_chi_tiet: '',
    ma_chuyen_di_kh: '', tai_trong: '', tai_trong_tinh_phi: '',
    quang_duong: '', so_chieu: '', don_gia: '',
    hinh_thuc_tinh_gia: '', loai_ca: '',
  });

  summaryRow.font = { bold: true, size: 11 };
  summaryRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFD966' }, // Yellow background
  };
  summaryRow.height = 25;
  summaryRow.getCell('revenue').numFmt = '#,##0 ₫';

  summaryRow.eachCell({ includeEmpty: true }, (cell) => {
    cell.border = {
      top:    { style: 'double' },
      left:   { style: 'thin' },
      bottom: { style: 'double' },
      right:  { style: 'thin' },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  console.log('✓ Generated General Excel with', data.length, 'orders, 21 columns');
  return workbook;
}
