import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
    const type = searchParams.get('type'); // 'nhan_vien' | 'tai_xe' | null

    // Validate month and year
    if (month < 1 || month > 12) {
      return NextResponse.json(
        { success: false, error: 'Invalid month. Must be between 1 and 12' },
        { status: 400 }
      );
    }

    // Build WHERE conditions
    const conditions: string[] = ['thang = $1', 'nam = $2'];
    const params: any[] = [month, year];
    let paramIndex = 3;

    if (type && (type === 'nhan_vien' || type === 'tai_xe')) {
      conditions.push(`loai_nhan_vien = $${paramIndex++}`);
      params.push(type);
    }

    const whereClause = conditions.join(' AND ');

    // Fetch salary data
    const result = await query(`
      SELECT
        ma_nhan_vien,
        ho_va_ten,
        phong_ban,
        chuc_vu,
        loai_nhan_vien,
        luong_co_ban,
        so_chuyen_di,
        tong_doanh_thu,
        ty_le_chia_se,
        luong_theo_chuyen,
        phu_cap,
        thuong,
        bhxh,
        bhyt,
        bhtn,
        thue_tncn,
        khau_tru_khac,
        tien_coc_da_tru,
        tong_thu_nhap,
        tong_khau_tru,
        thuc_lanh,
        trang_thai,
        ngay_thanh_toan,
        ghi_chu
      FROM bang_luong
      WHERE ${whereClause}
      ORDER BY ho_va_ten ASC
    `, params);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No salary data found for the selected period' },
        { status: 404 }
      );
    }

    // Format data for Excel
    const excelData = result.rows.map((row) => {
      const baseData = {
        'Mã NV': row.ma_nhan_vien,
        'Họ và tên': row.ho_va_ten,
        'Phòng ban': row.phong_ban || '',
        'Chức vụ': row.chuc_vu || '',
        'Loại': row.loai_nhan_vien === 'tai_xe' ? 'Tài xế' : 'Nhân viên',
        'Lương cơ bản': parseFloat(row.luong_co_ban || '0'),
      };

      // Add driver-specific columns
      if (row.loai_nhan_vien === 'tai_xe') {
        Object.assign(baseData, {
          'Số chuyến': parseInt(row.so_chuyen_di || '0'),
          'Tổng doanh thu': parseFloat(row.tong_doanh_thu || '0'),
          'Tỷ lệ %': parseFloat(row.ty_le_chia_se || '0'),
          'Lương theo chuyến': parseFloat(row.luong_theo_chuyen || '0'),
        });
      }

      // Add common columns
      Object.assign(baseData, {
        'Phụ cấp': parseFloat(row.phu_cap || '0'),
        'Thưởng': parseFloat(row.thuong || '0'),
        'Tổng thu nhập': parseFloat(row.tong_thu_nhap || '0'),
        'BHXH': parseFloat(row.bhxh || '0'),
        'BHYT': parseFloat(row.bhyt || '0'),
        'BHTN': parseFloat(row.bhtn || '0'),
        'Thuế TNCN': parseFloat(row.thue_tncn || '0'),
        'Khấu trừ khác': parseFloat(row.khau_tru_khac || '0'),
        'Tiền cọc đã trừ': parseFloat(row.tien_coc_da_tru || '0'),
        'Tổng khấu trừ': parseFloat(row.tong_khau_tru || '0'),
        'Thực lãnh': parseFloat(row.thuc_lanh || '0'),
        'Trạng thái': row.trang_thai === 'da_thanh_toan' ? 'Đã thanh toán' :
                      row.trang_thai === 'da_xac_nhan' ? 'Đã xác nhận' : 'Chưa thanh toán',
        'Ngày thanh toán': row.ngay_thanh_toan ?
          new Date(row.ngay_thanh_toan).toLocaleDateString('vi-VN') : '',
        'Ghi chú': row.ghi_chu || '',
      });

      return baseData;
    });

    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    const columnWidths = [
      { wch: 10 },  // Mã NV
      { wch: 25 },  // Họ và tên
      { wch: 15 },  // Phòng ban
      { wch: 15 },  // Chức vụ
      { wch: 10 },  // Loại
      { wch: 15 },  // Lương CB
      { wch: 10 },  // Số chuyến (if driver)
      { wch: 15 },  // Doanh thu (if driver)
      { wch: 10 },  // Tỷ lệ % (if driver)
      { wch: 15 },  // Lương theo chuyến (if driver)
      { wch: 12 },  // Phụ cấp
      { wch: 12 },  // Thưởng
      { wch: 15 },  // Tổng thu nhập
      { wch: 12 },  // BHXH
      { wch: 12 },  // BHYT
      { wch: 12 },  // BHTN
      { wch: 12 },  // Thuế
      { wch: 12 },  // Khấu trừ khác
      { wch: 15 },  // Tiền cọc
      { wch: 15 },  // Tổng khấu trừ
      { wch: 15 },  // Thực lãnh
      { wch: 15 },  // Trạng thái
      { wch: 15 },  // Ngày thanh toán
      { wch: 30 },  // Ghi chú
    ];
    worksheet['!cols'] = columnWidths;

    const workbook = XLSX.utils.book_new();
    const sheetName = type === 'tai_xe' ? 'Lương Tài Xế' :
                      type === 'nhan_vien' ? 'Lương Nhân Viên' : 'Bảng Lương';
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Generate buffer
    const excelBuffer = XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx',
    });

    // Generate filename
    const typeStr = type === 'tai_xe' ? 'tai_xe' :
                    type === 'nhan_vien' ? 'nhan_vien' : 'tat_ca';
    const filename = `bang_luong_${typeStr}_${month}_${year}.xlsx`;

    // Return file
    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });

  } catch (error: any) {
    console.error('❌ Export Salary Error:', error);
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
