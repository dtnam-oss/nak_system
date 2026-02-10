import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { generateReportPDF } from '@/lib/pdf-utils';

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

    // Query data
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

    const monthData = result.rows[0];

    const categories = [
      { key: 'so_nhan_vien', label: 'So nhan vien' },
      { key: 'tong_luong_chuyen', label: 'Luong chuyen' },
      { key: 'tong_chi_phi_sua_chua', label: 'Chi phi sua chua' },
      { key: 'tong_hoan_coc', label: 'Hoan coc' },
      { key: 'tong_chi_phi_do_dau_ngoai', label: 'Chi phi do dau ngoai' },
      { key: 'tong_chi_phi_phat_sinh_new', label: 'Chi phi phat sinh' },
      { key: 'tong_thuong', label: 'Thuong' },
      { key: 'tong_truy_thu_dau', label: 'Truy thu dau' },
      { key: 'tong_truy_thu_ontime', label: 'Truy thu ontime' },
      { key: 'tong_tru_coc', label: 'Tru coc' },
      { key: 'tong_tam_ung', label: 'Tam ung' },
      { key: 'tong_phat_che_tai', label: 'Phat che tai' },
      { key: 'tong_truy_thu_vetc', label: 'Truy thu VETC' },
      { key: 'tong_phat_nguoi', label: 'Phat nguoi' },
      { key: 'tong_tien_lam_the', label: 'Tien lam the' },
      { key: 'tong_bhxh', label: 'BHXH' },
      { key: 'tong_khac', label: 'Khac' },
      { key: 'tong_thu_nhap', label: 'TONG THU NHAP' },
      { key: 'tong_khau_tru', label: 'TONG KHAU TRU' },
      { key: 'tong_luong_thuc_lanh', label: 'LUONG THUC LANH' }
    ];

    const data = categories.map(cat => ({
      label: cat.label,
      value: cat.key === 'so_nhan_vien' 
        ? monthData[cat.key].toString()
        : new Intl.NumberFormat('vi-VN').format(parseFloat(monthData[cat.key]) || 0)
    }));

    const pdfBuffer = generateReportPDF(
      `Bao cao luong thang ${month}/${year}`,
      data,
      `bao_cao_${month}_${year}.pdf`
    );

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="bao_cao_luong_${month}_${year}.pdf"`
      }
    });
  } catch (error: any) {
    console.error('Error exporting bao cao PDF:', error);
    return NextResponse.json(
      { error: 'Failed to export PDF', details: error.message },
      { status: 500 }
    );
  }
}
