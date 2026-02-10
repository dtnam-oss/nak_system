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
        thang,
        COUNT(DISTINCT ma_nhan_vien) as so_nhan_vien,
        SUM(luong_bat_dau) as tong_luong_chuyen,
        SUM(tong_chi_phi_sua_chua) as tong_chi_phi_sua_chua,
        SUM(hoan_coc) as tong_hoan_coc,
        SUM(chi_phi_do_dau_ngoai) as tong_chi_phi_do_dau_ngoai,
        SUM(chi_phi_phat_sinh_new) as tong_chi_phi_phat_sinh_new,
        SUM(thuong) as tong_thuong,
        SUM(truy_thu_dau) as tong_truy_thu_dau,
        SUM(truy_thu_ontime) as tong_truy_thu_ontime,
        SUM(tru_coc) as tong_tru_coc,
        SUM(tam_ung) as tong_tam_ung,
        SUM(phat_che_tai) as tong_phat_che_tai,
        SUM(truy_thu_vetc) as tong_truy_thu_vetc,
        SUM(phat_nguoi) as tong_phat_nguoi,
        SUM(tien_lam_the) as tong_tien_lam_the,
        SUM(bhxh) as tong_bhxh,
        SUM(khac) as tong_khac,
        SUM(tong_thu_nhap) as tong_thu_nhap,
        SUM(tong_khau_tru) as tong_khau_tru,
        SUM(luong_thuc_lanh) as tong_luong_thuc_lanh
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
