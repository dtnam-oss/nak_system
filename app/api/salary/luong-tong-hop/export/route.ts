import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

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

    // Fetch data from luong_tong_hop table
    const result = await query(`
      SELECT
        ma_nhan_vien,
        ten_nhan_vien,
        phong_ban,
        chuc_vu,
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

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No salary data found for the selected period' },
        { status: 404 }
      );
    }

    // Format data for Excel
    const excelData = result.rows.map((row) => {
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
      const thucLanh = income - deductions;

      return {
        'Mã NV': row.ma_nhan_vien || '',
        'Họ tên': row.ten_nhan_vien || '',
        'Phòng ban': row.phong_ban || '',
        'Chức vụ': row.chuc_vu || '',
        'Lương chuyến': parseFloat(row.luong_chuyen || '0'),
        'Hỗ trợ': parseFloat(row.ho_tro || '0'),
        'Hoàn cọc': parseFloat(row.hoan_coc || '0'),
        'CP Sửa chữa': parseFloat(row.cp_sua_chua || '0'),
        'CP Đổ dầu': parseFloat(row.cp_do_dau || '0'),
        'CP Phát sinh': parseFloat(row.cp_phat_sinh || '0'),
        'CP CCDC': parseFloat(row.cp_ccdc || '0'),
        'Truy thu': parseFloat(row.truy_thu || '0'),
        'Trừ cọc': parseFloat(row.tru_coc || '0'),
        'Tạm ứng': parseFloat(row.tam_ung || '0'),
        'Phạt người': parseFloat(row.phat_nguoi || '0'),
        'BHXH': parseFloat(row.bhxh || '0'),
        'Khác': parseFloat(row.khac || '0'),
        'Thực lãnh': thucLanh,
      };
    });

    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    const columnWidths = [
      { wch: 12 },  // Mã NV
      { wch: 25 },  // Họ tên
      { wch: 15 },  // Phòng ban
      { wch: 15 },  // Chức vụ
      { wch: 15 },  // Lương chuyến
      { wch: 12 },  // Hỗ trợ
      { wch: 12 },  // Hoàn cọc
      { wch: 12 },  // CP Sửa chữa
      { wch: 12 },  // CP Đổ dầu
      { wch: 12 },  // CP Phát sinh
      { wch: 12 },  // CP CCDC
      { wch: 12 },  // Truy thu
      { wch: 12 },  // Trừ cọc
      { wch: 12 },  // Tạm ứng
      { wch: 12 },  // Phạt người
      { wch: 12 },  // BHXH
      { wch: 12 },  // Khác
      { wch: 15 },  // Thực lãnh
    ];
    worksheet['!cols'] = columnWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Lương Tổng Hợp');

    // Generate buffer
    const excelBuffer = XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx',
    });

    // Generate filename
    const filename = `luong_tong_hop_${month}_${year}.xlsx`;

    // Return file
    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });

  } catch (error: any) {
    console.error('❌ Export Luong Tong Hop Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to export salary data',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
