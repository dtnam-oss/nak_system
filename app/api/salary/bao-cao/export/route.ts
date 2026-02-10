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

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`Báo cáo tháng ${month}/${year}`);

    // Get single month data - always returns at least one row with COALESCE
    const monthData = result.rows[0];

    // Define categories
    const categories = [
      { key: 'so_nhan_vien', label: 'Số nhân viên', section: 'info' },
      { key: 'tong_luong_chuyen', label: 'Lương chuyến', section: 'income' },
      { key: 'tong_chi_phi_sua_chua', label: 'Chi phí sửa chữa', section: 'income' },
      { key: 'tong_hoan_coc', label: 'Hoàn cọc', section: 'income' },
      { key: 'tong_chi_phi_do_dau_ngoai', label: 'Chi phí đổ dầu ngoài', section: 'income' },
      { key: 'tong_chi_phi_phat_sinh_new', label: 'Chi phí phát sinh', section: 'income' },
      { key: 'tong_thuong', label: 'Thưởng', section: 'income' },
      { key: 'tong_truy_thu_dau', label: 'Truy thu dầu', section: 'deduction' },
      { key: 'tong_truy_thu_ontime', label: 'Truy thu ontime', section: 'deduction' },
      { key: 'tong_tru_coc', label: 'Trừ cọc', section: 'deduction' },
      { key: 'tong_tam_ung', label: 'Tạm ứng', section: 'deduction' },
      { key: 'tong_phat_che_tai', label: 'Phạt chế tài', section: 'deduction' },
      { key: 'tong_truy_thu_vetc', label: 'Truy thu VETC', section: 'deduction' },
      { key: 'tong_phat_nguoi', label: 'Phạt người', section: 'deduction' },
      { key: 'tong_tien_lam_the', label: 'Tiền làm thẻ', section: 'deduction' },
      { key: 'tong_bhxh', label: 'BHXH', section: 'deduction' },
      { key: 'tong_khac', label: 'Khác', section: 'deduction' },
      { key: 'tong_thu_nhap', label: 'Tổng thu nhập', section: 'summary' },
      { key: 'tong_khau_tru', label: 'Tổng khấu trừ', section: 'summary' },
      { key: 'tong_luong_thuc_lanh', label: 'Lương thực lãnh', section: 'summary' }
    ];

    // Simple columns for single month
    const columns = [
      { header: 'Hạng mục', key: 'hang_muc', width: 30 },
      { header: `Tháng ${month}/${year}`, key: 'gia_tri', width: 20 }
    ];

    worksheet.columns = columns;

    // Style header
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    worksheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };

    // Add data rows
    categories.forEach(category => {
      const value = parseFloat(monthData[category.key]) || 0;
      const rowData = {
        hang_muc: category.label,
        gia_tri: value
      };
      
      const row = worksheet.addRow(rowData);

      // Format numbers
      const cell = row.getCell(2);
      if (category.key === 'so_nhan_vien') {
        cell.numFmt = '0'; // Integer
      } else {
        cell.numFmt = '#,##0'; // Currency
      }

      // Section styling
      if (category.section === 'info') {
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE7E6E6' } };
      } else if (category.section === 'summary') {
        row.font = { bold: true };
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFD966' } };
      }
    });

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Return file
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="bao_cao_luong_${month}_${year}.xlsx"`
      }
    });
  } catch (error: any) {
    console.error('Error exporting bao cao data:', error);
    return NextResponse.json(
      { error: 'Failed to export bao cao data', details: error.message },
      { status: 500 }
    );
  }
}
