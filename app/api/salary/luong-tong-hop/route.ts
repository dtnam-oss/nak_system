import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

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

    // Query from luong_tong_hop table
    const result = await query(`
      SELECT
        id,
        ma_nhan_vien,
        ten_nhan_vien,
        phong_ban,
        chuc_vu,
        thang,
        nam,
        luong_chuyen,
        cp_sua_chua,
        cp_do_dau,
        cp_phat_sinh,
        cp_ccdc,
        ho_tro,
        truy_thu,
        tru_coc,
        hoan_coc,
        tam_ung,
        phat_nguoi,
        bhxh,
        khac
      FROM luong_tong_hop
      WHERE thang = $1 AND nam = $2
      ORDER BY ma_nhan_vien ASC
    `, [month, year]);

    // Calculate summary statistics
    const totalRecords = result.rows.length;
    const totalLuongChuyen = result.rows.reduce((sum, row) =>
      sum + parseFloat(row.luong_chuyen || '0'), 0
    );

    // Calculate total actual salary (income - deductions)
    const totalThucLanh = result.rows.reduce((sum, row) => {
      const income = parseFloat(row.luong_chuyen || '0') +
                     parseFloat(row.ho_tro || '0') +
                     parseFloat(row.hoan_coc || '0');
      const deductions = parseFloat(row.cp_sua_chua || '0') +
                        parseFloat(row.cp_do_dau || '0') +
                        parseFloat(row.cp_phat_sinh || '0') +
                        parseFloat(row.cp_ccdc || '0') +
                        parseFloat(row.truy_thu || '0') +
                        parseFloat(row.tru_coc || '0') +
                        parseFloat(row.tam_ung || '0') +
                        parseFloat(row.phat_nguoi || '0') +
                        parseFloat(row.bhxh || '0') +
                        parseFloat(row.khac || '0');
      return sum + (income - deductions);
    }, 0);

    return NextResponse.json({
      success: true,
      data: result.rows,
      count: result.rows.length,
      summary: {
        total_records: totalRecords,
        total_luong_chuyen: totalLuongChuyen,
        total_thuc_lanh: totalThucLanh,
      },
      filters: { month, year },
    }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });

  } catch (error: any) {
    console.error('❌ Lương Tổng Hợp Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch lương tổng hợp',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
