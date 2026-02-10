import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { generateSalaryPDF } from '@/lib/pdf-utils';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    if (!month || !year) {
      return NextResponse.json({ error: 'Month and year required' }, { status: 400 });
    }

    const result = await query(
      `SELECT ma_nhan_vien, ho_va_ten, email, hang_muc, tien_thuong
      FROM du_lieu_thuong
      WHERE thang = $1 AND nam = $2
      ORDER BY ho_va_ten ASC`,
      [parseInt(month), parseInt(year)]
    );

    const headers = ['Ma NV', 'Ho ten', 'Email', 'Hang muc', 'Tien thuong'];
    const rows = result.rows.map(row => [
      row.ma_nhan_vien,
      row.ho_va_ten,
      row.email,
      row.hang_muc,
      new Intl.NumberFormat('vi-VN').format(row.tien_thuong || 0)
    ]);

    const pdfBuffer = generateSalaryPDF(
      `Tien thuong ${month}/${year}`,
      headers,
      rows,
      `tien_thuong_${month}_${year}.pdf`
    );

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="tien_thuong_${month}_${year}.pdf"`
      }
    });
  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to export PDF' }, { status: 500 });
  }
}
