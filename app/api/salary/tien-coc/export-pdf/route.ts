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
      `SELECT ma_tai_xe, ten_tai_xe, email, tien_thu_coc
      FROM du_lieu_tien_coc
      WHERE thang = $1 AND nam = $2
      ORDER BY ten_tai_xe ASC`,
      [parseInt(month), parseInt(year)]
    );

    const headers = ['Ma tai xe', 'Ten tai xe', 'Email', 'Tien thu coc'];
    const rows = result.rows.map(row => [
      row.ma_tai_xe,
      row.ten_tai_xe,
      row.email,
      new Intl.NumberFormat('vi-VN').format(row.tien_thu_coc || 0)
    ]);

    const pdfBuffer = generateSalaryPDF(
      `Tien coc ${month}/${year}`,
      headers,
      rows,
      `tien_coc_${month}_${year}.pdf`
    );

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="tien_coc_${month}_${year}.pdf"`
      }
    });
  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to export PDF' }, { status: 500 });
  }
}
