import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const phongBan = searchParams.get('phong_ban');
    const phanQuyen = searchParams.get('phan_quyen');
    const active = searchParams.get('active');

    // Build query with filters
    const conditions: string[] = [];

    if (active && active !== 'all') {
      if (active === 'true') {
        conditions.push(`is_active = true`);
      } else {
        conditions.push(`is_active = false`);
      }
    }

    if (phongBan && phongBan !== 'all') {
      conditions.push(`phong_ban = '${phongBan}'`);
    }

    if (phanQuyen && phanQuyen !== 'all') {
      conditions.push(`phan_quyen = '${phanQuyen}'`);
    }

    let queryStr = `
      SELECT
        ma_nhan_vien,
        ho_va_ten,
        phong_ban,
        chuc_vu,
        so_dien_thoai,
        email,
        tinh_trang_cong_tac,
        ngay_vao_lam,
        ngay_ky_hdld,
        luong_thoa_thuan,
        tien_coc,
        phan_quyen,
        is_active
      FROM nhan_vien
    `;

    if (conditions.length > 0) {
      queryStr += ' WHERE ' + conditions.join(' AND ');
    }

    queryStr += ' ORDER BY ma_nhan_vien ASC';

    const result = await query(queryStr, []);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No employee data found' },
        { status: 404 }
      );
    }

    // Format data for Excel
    const excelData = result.rows.map((row, index) => {
      return {
        'STT': index + 1,
        'Mã nhân viên': row.ma_nhan_vien || '',
        'Họ và tên': row.ho_va_ten || '',
        'Phòng ban': row.phong_ban || '',
        'Chức vụ': row.chuc_vu || '',
        'Số điện thoại': row.so_dien_thoai || '',
        'Email': row.email || '',
        'Tình trạng công tác': row.tinh_trang_cong_tac || '',
        'Ngày vào làm': row.ngay_vao_lam ? new Date(row.ngay_vao_lam).toLocaleDateString('vi-VN') : '',
        'Ngày ký HĐLĐ': row.ngay_ky_hdld ? new Date(row.ngay_ky_hdld).toLocaleDateString('vi-VN') : '',
        'Lương thỏa thuận': parseFloat(row.luong_thoa_thuan || '0'),
        'Tiền cọc': parseFloat(row.tien_coc || '0'),
        'Phân quyền': row.phan_quyen || '',
        'Trạng thái': row.is_active ? 'Đang làm việc' : 'Đã nghỉ việc',
      };
    });

    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    const columnWidths = [
      { wch: 5 },   // STT
      { wch: 15 },  // Mã nhân viên
      { wch: 25 },  // Họ và tên
      { wch: 15 },  // Phòng ban
      { wch: 15 },  // Chức vụ
      { wch: 15 },  // Số điện thoại
      { wch: 25 },  // Email
      { wch: 20 },  // Tình trạng công tác
      { wch: 15 },  // Ngày vào làm
      { wch: 15 },  // Ngày ký HĐLĐ
      { wch: 18 },  // Lương thỏa thuận
      { wch: 15 },  // Tiền cọc
      { wch: 12 },  // Phân quyền
      { wch: 15 },  // Trạng thái
    ];
    worksheet['!cols'] = columnWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Nhân viên');

    // Generate buffer
    const excelBuffer = XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx',
    });

    // Generate filename with current date
    const today = new Date().toISOString().split('T')[0];
    const filename = `employees_${today}.xlsx`;

    // Return file
    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });

  } catch (error: any) {
    console.error('❌ Export Employees Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to export employee data',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
