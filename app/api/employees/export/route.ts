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
        ngay_sinh,
        gioi_tinh,
        dia_chi_thuong_tru,
        so_can_cuoc,
        cmnd_cccd,
        chat_id,
        hinh_anh,
        tinh_trang_cong_tac,
        ngay_vao_lam,
        ngay_ky_hdld,
        ngay_tham_gia_cong_doan,
        ngay_tham_gia_bhxh,
        ngay_thoi_viec,
        loai_hinh,
        luong_thoa_thuan,
        tien_coc,
        so_tai_khoan,
        ngan_hang_thu_huong,
        giam_tru_gia_canh,
        phan_quyen,
        xem,
        them,
        sua,
        xoa,
        trang_thai,
        ngay_tao,
        nguoi_tao,
        thoi_gian_tao,
        "Update_time",
        nam,
        thang
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
        // STT
        'STT': index + 1,

        // Thông tin cơ bản
        'Mã nhân viên': row.ma_nhan_vien || '',
        'Họ và tên': row.ho_va_ten || '',
        'Phòng ban': row.phong_ban || '',
        'Chức vụ': row.chuc_vu || '',
        'Ngày sinh': row.ngay_sinh || '',
        'Giới tính': row.gioi_tinh || '',

        // Liên hệ
        'Số điện thoại': row.so_dien_thoai || '',
        'Email': row.email || '',
        'Địa chỉ thường trú': row.dia_chi_thuong_tru || '',
        'Số CCCD': row.so_can_cuoc || '',
        'CMND/CCCD (cũ)': row.cmnd_cccd || '',
        'Chat ID (Telegram)': row.chat_id || '',
        'URL Ảnh đại diện': row.hinh_anh || '',

        // Công việc
        'Tình trạng công tác': row.tinh_trang_cong_tac || '',
        'Loại hình': row.loai_hinh || '',
        'Ngày vào làm': row.ngay_vao_lam || '',
        'Ngày ký HĐLĐ': row.ngay_ky_hdld || '',
        'Ngày tham gia công đoàn': row.ngay_tham_gia_cong_doan || '',
        'Ngày tham gia BHXH': row.ngay_tham_gia_bhxh || '',
        'Ngày thôi việc': row.ngay_thoi_viec || '',

        // Tài chính
        'Lương thỏa thuận (VNĐ)': parseFloat(row.luong_thoa_thuan || '0'),
        'Tiền cọc (VNĐ)': parseFloat(row.tien_coc || '0'),
        'Giảm trừ gia cảnh': row.giam_tru_gia_canh || '',
        'Số tài khoản': row.so_tai_khoan || '',
        'Ngân hàng thụ hưởng': row.ngan_hang_thu_huong || '',

        // Phân quyền
        'Phân quyền': row.phan_quyen || '',
        'Quyền xem': row.xem ? 'Có' : 'Không',
        'Quyền thêm': row.them ? 'Có' : 'Không',
        'Quyền sửa': row.sua ? 'Có' : 'Không',
        'Quyền xóa': row.xoa ? 'Có' : 'Không',

        // Trạng thái & Thời gian
        'Trạng thái': row.trang_thai || '',
        'Ngày tạo': row.ngay_tao || '',
        'Người tạo': row.nguoi_tao || '',
        'Thời gian tạo': row.thoi_gian_tao || '',
        'Cập nhật lần cuối': row.Update_time || '',
        'Năm': row.nam || '',
        'Tháng': row.thang || '',
      };
    });

    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Set column widths - 38 cột
    const columnWidths = [
      { wch: 5 },   // 1. STT
      // Thông tin cơ bản
      { wch: 12 },  // 2. Mã nhân viên
      { wch: 25 },  // 3. Họ và tên
      { wch: 15 },  // 4. Phòng ban
      { wch: 15 },  // 5. Chức vụ
      { wch: 12 },  // 6. Ngày sinh
      { wch: 10 },  // 7. Giới tính
      // Liên hệ
      { wch: 15 },  // 8. Số điện thoại
      { wch: 25 },  // 9. Email
      { wch: 40 },  // 10. Địa chỉ thường trú
      { wch: 15 },  // 11. Số CCCD
      { wch: 15 },  // 12. CMND/CCCD (cũ)
      { wch: 15 },  // 13. Chat ID
      { wch: 40 },  // 14. URL Ảnh đại diện
      // Công việc
      { wch: 20 },  // 15. Tình trạng công tác
      { wch: 15 },  // 16. Loại hình
      { wch: 12 },  // 17. Ngày vào làm
      { wch: 12 },  // 18. Ngày ký HĐLĐ
      { wch: 20 },  // 19. Ngày tham gia công đoàn
      { wch: 20 },  // 20. Ngày tham gia BHXH
      { wch: 15 },  // 21. Ngày thôi việc
      // Tài chính
      { wch: 18 },  // 22. Lương thỏa thuận
      { wch: 15 },  // 23. Tiền cọc
      { wch: 18 },  // 24. Giảm trừ gia cảnh
      { wch: 20 },  // 25. Số tài khoản
      { wch: 25 },  // 26. Ngân hàng thụ hưởng
      // Phân quyền
      { wch: 12 },  // 27. Phân quyền
      { wch: 10 },  // 28. Quyền xem
      { wch: 10 },  // 29. Quyền thêm
      { wch: 10 },  // 30. Quyền sửa
      { wch: 10 },  // 31. Quyền xóa
      // Trạng thái & Metadata
      { wch: 15 },  // 32. Trạng thái
      { wch: 15 },  // 33. Ngày tạo
      { wch: 15 },  // 34. Người tạo
      { wch: 18 },  // 35. Thời gian tạo
      { wch: 18 },  // 36. Cập nhật lần cuối
      { wch: 8 },   // 37. Năm
      { wch: 8 },   // 38. Tháng
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
