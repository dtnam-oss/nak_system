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
        chuc_vu,
        COALESCE(email, '') as email,
        thang,
        nam,
        -- Thu nhập
        COALESCE(luong_bat_dau, 0) as luong_bat_dau,
        COALESCE(tong_chi_phi_sua_chua, 0) as tong_chi_phi_sua_chua,
        COALESCE(hoan_coc, 0) as hoan_coc,
        COALESCE(chi_phi_do_dau_ngoai, 0) as chi_phi_do_dau_ngoai,
        COALESCE(chi_phi_phat_sinh_new, 0) as chi_phi_phat_sinh_new,
        COALESCE(thuong, 0) as thuong,
        -- Khấu trừ
        COALESCE(truy_thu_dau, 0) as truy_thu_dau,
        COALESCE(truy_thu_ontime, 0) as truy_thu_ontime,
        COALESCE(tru_coc, 0) as tru_coc,
        COALESCE(tam_ung, 0) as tam_ung,
        COALESCE(phat_che_tai, 0) as phat_che_tai,
        COALESCE(truy_thu_vetc, 0) as truy_thu_vetc,
        COALESCE(phat_nguoi, 0) as phat_nguoi,
        COALESCE(tien_lam_the, 0) as tien_lam_the,
        COALESCE(bhxh, 0) as bhxh,
        COALESCE(khac, 0) as khac,
        -- Calculated fields
        COALESCE(tong_thu_nhap, 0) as tong_thu_nhap,
        COALESCE(tong_khau_tru, 0) as tong_khau_tru,
        COALESCE(luong_thuc_lanh, 0) as luong_thuc_lanh
      FROM luong_tong_hop
      WHERE thang = $1 AND nam = $2
      ORDER BY ma_nhan_vien ASC
    `, [month, year]);

    // Calculate summary statistics
    const totalRecords = result.rows.length;
    const totalLuongChuyen = result.rows.reduce((sum, row) =>
      sum + parseFloat(row.luong_bat_dau || '0'), 0
    );

    // Calculate total actual salary (income - deductions)
    const totalThucLanh = result.rows.reduce((sum, row) => {
      const income = parseFloat(row.luong_bat_dau || '0') +
                     parseFloat(row.tong_chi_phi_sua_chua || '0') +
                     parseFloat(row.hoan_coc || '0') +
                     parseFloat(row.chi_phi_do_dau_ngoai || '0') +
                     parseFloat(row.chi_phi_phat_sinh_new || '0');
      const deductions = parseFloat(row.truy_thu_dau || '0') +
                        parseFloat(row.truy_thu_ontime || '0') +
                        parseFloat(row.tru_coc || '0') +
                        parseFloat(row.tam_ung || '0') +
                        parseFloat(row.phat_che_tai || '0') +
                        parseFloat(row.truy_thu_vetc || '0') +
                        parseFloat(row.phat_nguoi || '0') +
                        parseFloat(row.tien_lam_the || '0') +
                        parseFloat(row.bhxh || '0') +
                        parseFloat(row.khac || '0');
      return sum + (parseFloat(row.tra_tai_xe || '0') || (income - deductions));
    }, 0);

    // Convert all numeric fields from strings to numbers
    const processedData = result.rows.map(row => ({
      ...row,
      luong_bat_dau: parseFloat(row.luong_bat_dau) || 0,
      tong_chi_phi_sua_chua: parseFloat(row.tong_chi_phi_sua_chua) || 0,
      hoan_coc: parseFloat(row.hoan_coc) || 0,
      chi_phi_do_dau_ngoai: parseFloat(row.chi_phi_do_dau_ngoai) || 0,
      chi_phi_phat_sinh_new: parseFloat(row.chi_phi_phat_sinh_new) || 0,
      thuong: parseFloat(row.thuong) || 0,
      truy_thu_dau: parseFloat(row.truy_thu_dau) || 0,
      truy_thu_ontime: parseFloat(row.truy_thu_ontime) || 0,
      tru_coc: parseFloat(row.tru_coc) || 0,
      tam_ung: parseFloat(row.tam_ung) || 0,
      phat_che_tai: parseFloat(row.phat_che_tai) || 0,
      truy_thu_vetc: parseFloat(row.truy_thu_vetc) || 0,
      phat_nguoi: parseFloat(row.phat_nguoi) || 0,
      tien_lam_the: parseFloat(row.tien_lam_the) || 0,
      bhxh: parseFloat(row.bhxh) || 0,
      khac: parseFloat(row.khac) || 0,
      tong_thu_nhap: parseFloat(row.tong_thu_nhap) || 0,
      tong_khau_tru: parseFloat(row.tong_khau_tru) || 0,
      luong_thuc_lanh: parseFloat(row.luong_thuc_lanh) || 0,
    }));

    return NextResponse.json({
      success: true,
      data: processedData,
      count: processedData.length,
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
