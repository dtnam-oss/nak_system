import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import ExcelJS from 'exceljs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');

    if (!year) {
      return NextResponse.json(
        { error: 'Year is required' },
        { status: 400 }
      );
    }

    // Query aggregated salary data by month for the year
    const result = await query(
      `SELECT 
        thang,
        COUNT(DISTINCT ma_nhan_vien) as so_nhan_vien,
        SUM(luong_bat_dau) as tong_luong_bat_dau,
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
      WHERE nam = $1
      GROUP BY thang
      ORDER BY thang ASC`,
      [parseInt(year)]
    );

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`Báo cáo lương ${year}`);

    // Define categories
    const categories = [
      { key: 'so_nhan_vien', label: 'Số nhân viên', section: 'info' },
      { key: 'tong_luong_bat_dau', label: 'Lương bắt đầu', section: 'income' },
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

    // Build dynamic columns
    const months = result.rows.map(r => r.thang).sort((a, b) => a - b);
    const columns = [
      { header: 'Hạng mục', key: 'hang_muc', width: 30 },
      ...months.map(m => ({ header: `Tháng ${m}`, key: `thang_${m}`, width: 15 })),
      { header: 'Tổng cộng', key: 'tong', width: 15 }
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
      const rowData: any = { hang_muc: category.label };
      let total = 0;

      months.forEach(month => {
        const monthData = result.rows.find(r => r.thang === month);
        const value = monthData ? parseFloat(monthData[category.key]) || 0 : 0;
        rowData[`thang_${month}`] = value;
        total += value;
      });

      rowData.tong = total;
      const row = worksheet.addRow(rowData);

      // Format numbers
      columns.slice(1).forEach((col, idx) => {
        const cell = row.getCell(idx + 2);
        if (category.key === 'so_nhan_vien') {
          cell.numFmt = '0'; // Integer
        } else {
          cell.numFmt = '#,##0'; // Currency
        }
      });

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
        'Content-Disposition': `attachment; filename="bao_cao_luong_${year}.xlsx"`
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
