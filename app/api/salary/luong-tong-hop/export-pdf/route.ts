import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { generateSalaryPDF } from '@/lib/pdf-utils';

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

    const result = await query(
      `SELECT 
        ma_nhan_vien, ten_nhan_vien, email, chuc_vu,
        luong_bat_dau, tong_chi_phi_sua_chua, hoan_coc,
        chi_phi_do_dau_ngoai, chi_phi_phat_sinh_new, thuong,
        tong_thu_nhap, tong_khau_tru, luong_thuc_lanh
      FROM luong_tong_hop
      WHERE thang = $1 AND nam = $2
      ORDER BY ten_nhan_vien ASC`,
      [parseInt(month), parseInt(year)]
    );

    const headers = [
      'Ma NV', 'Ho ten', 'Chuc vu', 'Luong chuyen', 
      'Thu nhap', 'Khau tru', 'Thuc lanh'
    ];

    const rows = result.rows.map(row => [
      row.ma_nhan_vien,
      row.ten_nhan_vien,
      row.chuc_vu,
      new Intl.NumberFormat('vi-VN').format(row.luong_bat_dau || 0),
      new Intl.NumberFormat('vi-VN').format(row.tong_thu_nhap || 0),
      new Intl.NumberFormat('vi-VN').format(row.tong_khau_tru || 0),
      new Intl.NumberFormat('vi-VN').format(row.luong_thuc_lanh || 0)
    ]);

    const pdfBuffer = generateSalaryPDF(
      `Luong tong hop ${month}/${year}`,
      headers,
      rows,
      `luong_tong_hop_${month}_${year}.pdf`
    );

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="luong_tong_hop_${month}_${year}.pdf"`
      }
    });
  } catch (error: any) {
    console.error('Error exporting PDF:', error);
    return NextResponse.json(
      { error: 'Failed to export PDF', details: error.message },
      { status: 500 }
    );
  }
}
