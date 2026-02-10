import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import ExcelJS from 'exceljs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    if (!month || !year) {
      return NextResponse.json(
        { error: 'Month and year are required' },
        { status: 400 }
      );
    }

    // Query du_lieu_thuong table
    const result = await query(
      `SELECT 
        ma_nhan_vien,
        ho_va_ten,
        email,
        hang_muc,
        tien_thuong,
        thang,
        nam
      FROM du_lieu_thuong
      WHERE thang = $1 AND nam = $2
      ORDER BY ho_va_ten ASC`,
      [parseInt(month), parseInt(year)]
    );

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Tiền Thưởng');

    // Add headers
    worksheet.columns = [
      { header: 'STT', key: 'stt', width: 8 },
      { header: 'Mã nhân viên', key: 'ma_nhan_vien', width: 15 },
      { header: 'Họ và tên', key: 'ho_va_ten', width: 25 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Hạng mục', key: 'hang_muc', width: 20 },
      { header: 'Tiền thưởng', key: 'tien_thuong', width: 15 },
      { header: 'Tháng', key: 'thang', width: 10 },
      { header: 'Năm', key: 'nam', width: 10 }
    ];

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Add data rows
    let totalTienThuong = 0;
    result.rows.forEach((row, index) => {
      const tienThuong = parseFloat(row.tien_thuong) || 0;
      totalTienThuong += tienThuong;

      worksheet.addRow({
        stt: index + 1,
        ma_nhan_vien: row.ma_nhan_vien,
        ho_va_ten: row.ho_va_ten,
        email: row.email,
        hang_muc: row.hang_muc,
        tien_thuong: tienThuong,
        thang: row.thang,
        nam: row.nam
      });
    });

    // Add summary row
    const summaryRow = worksheet.addRow({
      stt: '',
      ma_nhan_vien: '',
      ho_va_ten: '',
      email: '',
      hang_muc: 'TỔNG CỘNG',
      tien_thuong: totalTienThuong,
      thang: '',
      nam: ''
    });

    summaryRow.font = { bold: true };
    summaryRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFD700' }
    };

    // Format currency columns
    worksheet.getColumn('tien_thuong').numFmt = '#,##0';

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Return file
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="tien_thuong_${month}_${year}.xlsx"`
      }
    });
  } catch (error: any) {
    console.error('Error exporting tien thuong data:', error);
    return NextResponse.json(
      { error: 'Failed to export tien thuong data', details: error.message },
      { status: 500 }
    );
  }
}
