import { query } from '@/lib/db';
import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');

    console.log(`📥 Exporting fuel transactions (fromDate: ${fromDate}, toDate: ${toDate})`);

    // Build WHERE conditions
    const conditions = ['id IS NOT NULL'];
    const params: any[] = [];
    let paramIndex = 1;

    if (fromDate) {
      conditions.push(`ngay_tao >= $${paramIndex}::date`);
      params.push(fromDate);
      paramIndex++;
    }

    if (toDate) {
      conditions.push(`ngay_tao <= $${paramIndex}::date`);
      params.push(toDate);
      paramIndex++;
    }

    // Fetch all data (no limit for export)
    const result = await query(`
      SELECT
        id as "ID",
        ngay_tao as "Ngày",
        loai_hinh as "Loại hình",
        doi_tuong as "Đối tượng",
        bien_so_xe as "Biển số xe",
        ten_tai_xe as "Tài xế",
        loai_nhien_lieu as "Loại nhiên liệu",
        so_luong as "Số lượng (L)",
        don_vi_tinh as "Đơn vị tính",
        don_gia as "Đơn giá",
        thanh_tien as "Thành tiền",
        so_odo as "Số ODO",
        trang_thai as "Trạng thái",
        hang_muc as "Hạng mục",
        hinh_anh_tru_dau as "Hình ảnh trụ dầu",
        hinh_anh_odo as "Hình ảnh ODO",
        email_tai_xe as "Email tài xế",
        nhan_vien_tru_dau as "Nhân viên trụ dầu",
        loai_xe as "Loại xe",
        nguoi_tao as "Người tạo",
        thoi_gian_tao as "Thời gian tạo"
      FROM public.xuat_nhien_lieu
      WHERE ${conditions.join(' AND ')}
      ORDER BY ngay_tao DESC NULLS LAST, thoi_gian_tao DESC NULLS LAST
    `, params);

    console.log(`✓ Found ${result.rows.length} records for export`);

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No data to export',
      }, { status: 404 });
    }

    // Format data for Excel
    const excelData = result.rows.map(row => {
      const formattedRow: any = { ...row };

      // Format date
      if (row['Ngày']) {
        const date = new Date(row['Ngày']);
        formattedRow['Ngày'] = date.toLocaleDateString('vi-VN');
      }

      // Format datetime
      if (row['Thời gian tạo']) {
        const datetime = new Date(row['Thời gian tạo']);
        formattedRow['Thời gian tạo'] = datetime.toLocaleString('vi-VN');
      }

      // Format numbers (remove commas, convert to numbers)
      ['Số lượng (L)', 'Đơn giá', 'Thành tiền', 'Số ODO'].forEach(field => {
        if (formattedRow[field]) {
          const value = String(formattedRow[field]).replace(/,/g, '');
          formattedRow[field] = parseFloat(value) || 0;
        }
      });

      return formattedRow;
    });

    // Create workbook
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    const colWidths = [
      { wch: 12 },  // ID
      { wch: 12 },  // Ngày
      { wch: 15 },  // Loại hình
      { wch: 12 },  // Đối tượng
      { wch: 12 },  // Biển số
      { wch: 20 },  // Tài xế
      { wch: 15 },  // Loại nhiên liệu
      { wch: 12 },  // Số lượng
      { wch: 10 },  // Đơn vị
      { wch: 12 },  // Đơn giá
      { wch: 15 },  // Thành tiền
      { wch: 12 },  // ODO
      { wch: 12 },  // Trạng thái
      { wch: 12 },  // Hạng mục
      { wch: 30 },  // Hình ảnh trụ
      { wch: 30 },  // Hình ảnh ODO
      { wch: 25 },  // Email tài xế
      { wch: 25 },  // Nhân viên
      { wch: 12 },  // Loại xe
      { wch: 20 },  // Người tạo
      { wch: 18 },  // Thời gian tạo
    ];
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Fuel Transactions');

    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Create filename with date range
    const dateRangeStr = fromDate && toDate
      ? `_${fromDate}_to_${toDate}`
      : fromDate
      ? `_from_${fromDate}`
      : toDate
      ? `_to_${toDate}`
      : '';
    const filename = `fuel_transactions${dateRangeStr}.xlsx`;

    // Return Excel file
    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error: any) {
    console.error('❌ Error exporting fuel transactions:', error.message);

    return NextResponse.json({
      success: false,
      error: 'Failed to export fuel transactions',
      message: error.message,
    }, { status: 500 });
  }
}
