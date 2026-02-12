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

    // Use SELECT * to get all available columns
    let queryStr = `
      SELECT *
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

    // Format data for Excel - Export ALL columns dynamically
    const excelData = result.rows.map((row, index) => {
      // Create a new object with all row data
      const formattedRow: any = {
        'STT': index + 1,
      };

      // Map common columns with Vietnamese headers
      const columnMapping: { [key: string]: string } = {
        'ma_nhan_vien': 'Mã nhân viên',
        'ho_va_ten': 'Họ và tên',
        'phong_ban': 'Phòng ban',
        'chuc_vu': 'Chức vụ',
        'ngay_sinh': 'Ngày sinh',
        'gioi_tinh': 'Giới tính',
        'so_dien_thoai': 'Số điện thoại',
        'email': 'Email',
        'dia_chi_thuong_tru': 'Địa chỉ thường trú',
        'so_can_cuoc': 'Số CCCD',
        'cmnd_cccd': 'CMND/CCCD (cũ)',
        'chat_id': 'Chat ID (Telegram)',
        'hinh_anh': 'URL Ảnh đại diện',
        'anh': 'Ảnh',
        'tinh_trang_cong_tac': 'Tình trạng công tác',
        'loai_hinh': 'Loại hình',
        'ngay_vao_lam': 'Ngày vào làm',
        'ngay_ky_hdld': 'Ngày ký HĐLĐ',
        'ngay_tham_gia_cong_doan': 'Ngày tham gia công đoàn',
        'ngay_tham_gia_bhxh': 'Ngày tham gia BHXH',
        'ngay_thoi_viec': 'Ngày thôi việc',
        'luong_thoa_thuan': 'Lương thỏa thuận (VNĐ)',
        'tien_coc': 'Tiền cọc (VNĐ)',
        'giam_tru_gia_canh': 'Giảm trừ gia cảnh',
        'so_tai_khoan': 'Số tài khoản',
        'ngan_hang_thu_huong': 'Ngân hàng thụ hưởng',
        'phan_quyen': 'Phân quyền',
        'xem': 'Quyền xem',
        'them': 'Quyền thêm',
        'sua': 'Quyền sửa',
        'xoa': 'Quyền xóa',
        'trang_thai': 'Trạng thái',
        'is_active': 'Hoạt động',
        'ngay_tao': 'Ngày tạo',
        'nguoi_tao': 'Người tạo',
        'thoi_gian_tao': 'Thời gian tạo',
        'created_at': 'Ngày tạo (hệ thống)',
        'updated_at': 'Cập nhật lần cuối',
        'Update_time': 'Thời gian cập nhật',
        'last_login': 'Đăng nhập lần cuối',
        'nam': 'Năm',
        'thang': 'Tháng',
      };

      // Add all columns from the database
      Object.keys(row).forEach((key) => {
        if (key === 'id') return; // Skip internal ID

        const displayName = columnMapping[key] || key;
        let value = row[key];

        // Format boolean values
        if (typeof value === 'boolean') {
          value = value ? 'Có' : 'Không';
        }
        // Format null values
        else if (value === null || value === undefined) {
          value = '';
        }
        // Keep other values as is
        else {
          value = String(value);
        }

        formattedRow[displayName] = value;
      });

      return formattedRow;
    });

    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Auto-calculate column widths based on header names
    if (excelData.length > 0) {
      const columnWidths = Object.keys(excelData[0]).map((key) => {
        const maxLength = Math.max(
          key.length, // Header length
          ...excelData.map(row => {
            const value = String(row[key] || '');
            return value.length;
          })
        );
        // Set width with min 10, max 50
        return { wch: Math.min(Math.max(maxLength + 2, 10), 50) };
      });
      worksheet['!cols'] = columnWidths;
    }

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
