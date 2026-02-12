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
        chuc_vu,
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

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No salary data found for the selected period' },
        { status: 404 }
      );
    }

    // Format data for Excel
    const excelData = result.rows.map((row) => {
      return {
        'Mã NV': row.ma_nhan_vien || '',
        'Họ tên': row.ten_nhan_vien || '',
        'Chức vụ': row.chuc_vu || 'Tài xế',

        // Thu nhập
        'Lương chuyển': parseFloat(row.luong_bat_dau || '0'),
        'Hoàn phí sửa chữa': parseFloat(row.tong_chi_phi_sua_chua || '0'),
        'Hoàn cọc': parseFloat(row.hoan_coc || '0'),
        'Hoàn phí đổ dầu ngoài': parseFloat(row.chi_phi_do_dau_ngoai || '0'),
        'Hoàn chi phí phát sinh': parseFloat(row.chi_phi_phat_sinh_new || '0'),
        'Thưởng': parseFloat(row.thuong || '0'),
        'Tổng thu nhập': parseFloat(row.tong_thu_nhap || '0'),

        // Khấu trừ
        'Truy thu đầu': parseFloat(row.truy_thu_dau || '0'),
        'Truy thu ontime': parseFloat(row.truy_thu_ontime || '0'),
        'Trừ cọc': parseFloat(row.tru_coc || '0'),
        'Phí tạm ứng': parseFloat(row.tam_ung || '0'),
        'Phạt chế tài': parseFloat(row.phat_che_tai || '0'),
        'Truy thu VETC': parseFloat(row.truy_thu_vetc || '0'),
        'Phạt nguội': parseFloat(row.phat_nguoi || '0'),
        'Tiền làm thẻ': parseFloat(row.tien_lam_the || '0'),
        'BHXH': parseFloat(row.bhxh || '0'),
        'Khác': parseFloat(row.khac || '0'),
        'Tổng khấu trừ': parseFloat(row.tong_khau_tru || '0'),

        // Kết quả
        'Thực lãnh': parseFloat(row.luong_thuc_lanh || '0'),
      };
    });

    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    const columnWidths = [
      { wch: 12 },  // Mã NV
      { wch: 25 },  // Họ tên
      { wch: 15 },  // Chức vụ
      // Thu nhập
      { wch: 15 },  // Lương chuyển
      { wch: 18 },  // Hoàn phí sửa chữa
      { wch: 12 },  // Hoàn cọc
      { wch: 20 },  // Hoàn phí đổ dầu ngoài
      { wch: 20 },  // Hoàn chi phí phát sinh
      { wch: 12 },  // Thưởng
      { wch: 15 },  // Tổng thu nhập
      // Khấu trừ
      { wch: 15 },  // Truy thu đầu
      { wch: 15 },  // Truy thu ontime
      { wch: 12 },  // Trừ cọc
      { wch: 12 },  // Phí tạm ứng
      { wch: 12 },  // Phạt chế tài
      { wch: 15 },  // Truy thu VETC
      { wch: 12 },  // Phạt nguội
      { wch: 12 },  // Tiền làm thẻ
      { wch: 12 },  // BHXH
      { wch: 12 },  // Khác
      { wch: 15 },  // Tổng khấu trừ
      // Kết quả
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
