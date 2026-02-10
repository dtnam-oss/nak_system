import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

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

    // Query aggregated salary data for specific month
    const result = await query(
      `SELECT 
        $1::integer as thang,
        COUNT(DISTINCT ma_nhan_vien) as so_nhan_vien,
        COALESCE(SUM(luong_bat_dau), 0) as tong_luong_chuyen,
        COALESCE(SUM(tong_chi_phi_sua_chua), 0) as tong_chi_phi_sua_chua,
        COALESCE(SUM(hoan_coc), 0) as tong_hoan_coc,
        COALESCE(SUM(chi_phi_do_dau_ngoai), 0) as tong_chi_phi_do_dau_ngoai,
        COALESCE(SUM(chi_phi_phat_sinh_new), 0) as tong_chi_phi_phat_sinh_new,
        COALESCE(SUM(thuong), 0) as tong_thuong,
        COALESCE(SUM(truy_thu_dau), 0) as tong_truy_thu_dau,
        COALESCE(SUM(truy_thu_ontime), 0) as tong_truy_thu_ontime,
        COALESCE(SUM(tru_coc), 0) as tong_tru_coc,
        COALESCE(SUM(tam_ung), 0) as tong_tam_ung,
        COALESCE(SUM(phat_che_tai), 0) as tong_phat_che_tai,
        COALESCE(SUM(truy_thu_vetc), 0) as tong_truy_thu_vetc,
        COALESCE(SUM(phat_nguoi), 0) as tong_phat_nguoi,
        COALESCE(SUM(tien_lam_the), 0) as tong_tien_lam_the,
        COALESCE(SUM(bhxh), 0) as tong_bhxh,
        COALESCE(SUM(khac), 0) as tong_khac,
        COALESCE(SUM(tong_thu_nhap), 0) as tong_thu_nhap,
        COALESCE(SUM(tong_khau_tru), 0) as tong_khau_tru,
        COALESCE(SUM(luong_thuc_lanh), 0) as tong_luong_thuc_lanh
      FROM luong_tong_hop
      WHERE thang = $1 AND nam = $2`,
      [parseInt(month), parseInt(year)]
    );

    // Get single month data
    const monthData = result.rows[0] || {
      thang: parseInt(month),
      so_nhan_vien: 0,
      tong_luong_chuyen: 0,
      tong_chi_phi_sua_chua: 0,
      tong_hoan_coc: 0,
      tong_chi_phi_do_dau_ngoai: 0,
      tong_chi_phi_phat_sinh_new: 0,
      tong_thuong: 0,
      tong_truy_thu_dau: 0,
      tong_truy_thu_ontime: 0,
      tong_tru_coc: 0,
      tong_tam_ung: 0,
      tong_phat_che_tai: 0,
      tong_truy_thu_vetc: 0,
      tong_phat_nguoi: 0,
      tong_tien_lam_the: 0,
      tong_bhxh: 0,
      tong_khac: 0,
      tong_thu_nhap: 0,
      tong_khau_tru: 0,
      tong_luong_thuc_lanh: 0
    };

    return NextResponse.json({
      data: monthData,
      month: parseInt(month),
      year: parseInt(year)
    });
  } catch (error: any) {
    console.error('Error fetching bao cao data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bao cao data', details: error.message },
      { status: 500 }
    );
  }
}
