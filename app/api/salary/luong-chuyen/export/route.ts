import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));

    // Validate month and year
    if (month < 1 || month > 12) {
      return NextResponse.json(
        { success: false, error: 'Invalid month. Must be between 1 and 12' },
        { status: 400 }
      );
    }

    // Fetch luong-chuyen data from luong_tai_xe table
    const result = await query(`
      SELECT
        ma_chuyen_di,
        ngay_tao,
        nam,
        thang,
        ten_khach_hang,
        loai_chuyen,
        ten_tuyen,
        ma_tuyen,
        luong_tai_xe,
        ten_tai_xe,
        don_vi_van_chuyen
      FROM luong_tai_xe
      WHERE thang = $1 AND nam = $2
      ORDER BY ngay_tao DESC, ma_chuyen_di DESC
    `, [month, year]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No trip salary data found for the selected period' },
        { status: 404 }
      );
    }

    // Format data for Excel
    const excelData = result.rows.map((row) => ({
      'Mã chuyến': row.ma_chuyen_di || '',
      'Ngày tạo': row.ngay_tao ? new Date(row.ngay_tao).toLocaleDateString('vi-VN') : '',
      'Tài xế': row.ten_tai_xe || '',
      'Khách hàng': row.ten_khach_hang || '',
      'Loại chuyến': row.loai_chuyen || '',
      'Tuyến đường': row.ten_tuyen || row.ma_tuyen || '',
      'Mã tuyến': row.ma_tuyen || '',
      'Đơn vị vận chuyển': row.don_vi_van_chuyen || '',
      'Lương tài xế': parseFloat(row.luong_tai_xe || '0'),
    }));

    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    const columnWidths = [
      { wch: 15 },  // Mã chuyến
      { wch: 12 },  // Ngày tạo
      { wch: 20 },  // Tài xế
      { wch: 25 },  // Khách hàng
      { wch: 12 },  // Loại chuyến
      { wch: 30 },  // Tuyến đường
      { wch: 12 },  // Mã tuyến
      { wch: 20 },  // Đơn vị vận chuyển
      { wch: 15 },  // Lương tài xế
    ];
    worksheet['!cols'] = columnWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Lương Chuyến');

    // Generate buffer
    const excelBuffer = XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx',
    });

    // Generate filename
    const filename = `luong_chuyen_${month}_${year}.xlsx`;

    // Return file
    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });

  } catch (error: any) {
    console.error('❌ Export Luong Chuyen Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to export trip salary data',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
