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

    // Fetch tiền cọc data
    const result = await query(`
      SELECT
        id,
        ma_tai_xe,
        ten_tai_xe,
        email,
        tien_thu_coc,
        thang,
        nam
      FROM du_lieu_tien_coc
      WHERE thang = $1 AND nam = $2
      ORDER BY ten_tai_xe ASC, ma_tai_xe ASC
    `, [month, year]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No deposit data found for the selected period' },
        { status: 404 }
      );
    }

    // Format data for Excel
    const excelData = result.rows.map((row) => ({
      'Mã tài xế': row.ma_tai_xe || '',
      'Tên tài xế': row.ten_tai_xe || '',
      'Email': row.email || '',
      'Tiền thu cọc': parseFloat(row.tien_thu_coc || '0'),
      'Tháng': row.thang,
      'Năm': row.nam,
    }));

    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    const columnWidths = [
      { wch: 12 },  // Mã tài xế
      { wch: 25 },  // Tên tài xế
      { wch: 30 },  // Email
      { wch: 18 },  // Tiền thu cọc
      { wch: 8 },   // Tháng
      { wch: 8 },   // Năm
    ];
    worksheet['!cols'] = columnWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Tiền Cọc');

    // Add summary row
    const totalCoc = result.rows.reduce((sum, row) => sum + parseFloat(row.tien_thu_coc || '0'), 0);
    const summaryData = [
      {},
      { 'Mã tài xế': 'TỔNG CỘNG', 'Tiền thu cọc': totalCoc },
    ];
    XLSX.utils.sheet_add_json(worksheet, summaryData, {
      skipHeader: true,
      origin: -1,
    });

    // Generate buffer
    const excelBuffer = XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx',
    });

    // Generate filename
    const filename = `tien_coc_${month}_${year}.xlsx`;

    // Return file
    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });

  } catch (error: any) {
    console.error('❌ Export Tien Coc Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to export tiền cọc data',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
