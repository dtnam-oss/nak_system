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
      `SELECT ma_chuyen, ten_khach_hang, loai_chuyen, ten_tuyen,
        luong_tai_xe, ten_tai_xe, ma_tai_xe
      FROM du_lieu_luong_tx
      WHERE thang = $1 AND nam = $2
      ORDER BY ten_tai_xe ASC`,
      [parseInt(month), parseInt(year)]
    );

    const headers = ['Ma chuyen', 'Khach hang', 'Loai', 'Tuyen', 'Tai xe', 'Luong'];
    const rows = result.rows.map(row => [
      row.ma_chuyen,
      row.ten_khach_hang,
      row.loai_chuyen,
      row.ten_tuyen,
      row.ten_tai_xe,
      new Intl.NumberFormat('vi-VN').format(row.luong_tai_xe || 0)
    ]);

    const pdfBuffer = generateSalaryPDF(
      `Luong chuyen ${month}/${year}`,
      headers,
      rows,
      `luong_chuyen_${month}_${year}.pdf`
    );

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="luong_chuyen_${month}_${year}.pdf"`
      }
    });
  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to export PDF' }, { status: 500 });
  }
}
