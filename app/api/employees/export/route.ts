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
      if (active === 'true' || active === 'active') {
        // Filter active employees (not "Đã nghỉ việc")
        conditions.push(`(trang_thai IS NULL OR trang_thai NOT ILIKE '%nghỉ việc%')`);
      } else if (active === 'false') {
        // Filter inactive employees
        conditions.push(`trang_thai ILIKE '%nghỉ việc%'`);
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
        chat_id,
        hinh_anh,
        tinh_trang_cong_tac,
        ngay_vao_lam,
        ngay_ky_hdld,
        ngay_tham_gia_cong_doan,
        ngay_tham_gia_bhxh,
        ngay_thoi_viec,
        giam_tru_gia_canh,
        luong_thoa_thuan,
        tien_coc,
        phan_quyen,
        xem,
        them,
        sua,
        xoa,
        trang_thai,
        ngay_sinh,
        so_can_cuoc
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

    // Format data for Excel - TOÀN BỘ DỮ LIỆU
    const excelData = result.rows.map((row, index) => {
      return {
        // Thông tin cơ bản
        'STT': index + 1,
        'Mã nhân viên': row.ma_nhan_vien || '',
        'Họ và tên': row.ho_va_ten || '',
        'Phòng ban': row.phong_ban || '',
        'Chức vụ': row.chuc_vu || '',

        // Liên hệ
        'Số điện thoại': row.so_dien_thoai || '',
        'Email': row.email || '',
        'Chat ID (Telegram)': row.chat_id || '',
        'URL Ảnh đại diện': row.hinh_anh || '',

        // Công việc
        'Tình trạng công tác': row.tinh_trang_cong_tac || '',
        'Ngày vào làm': row.ngay_vao_lam ? new Date(row.ngay_vao_lam).toLocaleDateString('vi-VN') : '',
        'Ngày ký HĐLĐ': row.ngay_ky_hdld ? new Date(row.ngay_ky_hdld).toLocaleDateString('vi-VN') : '',
        'Ngày tham gia công đoàn': row.ngay_tham_gia_cong_doan ? new Date(row.ngay_tham_gia_cong_doan).toLocaleDateString('vi-VN') : '',
        'Ngày tham gia BHXH': row.ngay_tham_gia_bhxh ? new Date(row.ngay_tham_gia_bhxh).toLocaleDateString('vi-VN') : '',
        'Ngày thôi việc': row.ngay_thoi_viec ? new Date(row.ngay_thoi_viec).toLocaleDateString('vi-VN') : '',

        // Tài chính
        'Giảm trừ gia cảnh (VNĐ)': parseFloat(row.giam_tru_gia_canh || '0'),
        'Lương thỏa thuận (VNĐ)': parseFloat(row.luong_thoa_thuan || '0'),
        'Tiền cọc (VNĐ)': parseFloat(row.tien_coc || '0'),

        // Phân quyền
        'Phân quyền': row.phan_quyen || '',
        'Quyền xem': row.xem ? 'Có' : 'Không',
        'Quyền thêm': row.them ? 'Có' : 'Không',
        'Quyền sửa': row.sua ? 'Có' : 'Không',
        'Quyền xóa': row.xoa ? 'Có' : 'Không',

        // Trạng thái
        'Trạng thái': row.trang_thai || 'Đang làm việc',
        'Ngày sinh': row.ngay_sinh ? new Date(row.ngay_sinh).toLocaleDateString('vi-VN') : '',
        'Số CCCD': row.so_can_cuoc || '',

        // Metadata
        'Ngày tạo': row.created_at ? new Date(row.created_at).toLocaleString('vi-VN') : '',
        'Cập nhật lần cuối': row.updated_at ? new Date(row.updated_at).toLocaleString('vi-VN') : '',
      };
    });

    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Set column widths - 27 cột
    const columnWidths = [
      { wch: 5 },   // STT
      { wch: 15 },  // Mã nhân viên
      { wch: 25 },  // Họ và tên
      { wch: 15 },  // Phòng ban
      { wch: 15 },  // Chức vụ
      // Liên hệ
      { wch: 15 },  // Số điện thoại
      { wch: 25 },  // Email
      { wch: 15 },  // Chat ID
      { wch: 40 },  // URL Ảnh đại diện
      // Công việc
      { wch: 20 },  // Tình trạng công tác
      { wch: 15 },  // Ngày vào làm
      { wch: 15 },  // Ngày ký HĐLĐ
      { wch: 20 },  // Ngày tham gia công đoàn
      { wch: 20 },  // Ngày tham gia BHXH
      { wch: 15 },  // Ngày thôi việc
      // Tài chính
      { wch: 20 },  // Giảm trừ gia cảnh
      { wch: 20 },  // Lương thỏa thuận
      { wch: 15 },  // Tiền cọc
      // Phân quyền
      { wch: 12 },  // Phân quyền
      { wch: 12 },  // Quyền xem
      { wch: 12 },  // Quyền thêm
      { wch: 12 },  // Quyền sửa
      { wch: 12 },  // Quyền xóa
      // Trạng thái & Thông tin bổ sung
      { wch: 15 },  // Trạng thái
      { wch: 15 },  // Ngày sinh
      { wch: 15 },  // Số CCCD
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
