import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Import employees from Google Apps Script
 * 
 * GET /api/employees/import?secret=YOUR_SECRET
 * 
 * This endpoint fetches employee data from Google Sheets via Apps Script
 * and imports it into the nhan_vien table
 */
export async function GET(req: NextRequest) {
  try {
    // Authentication
    const secret = req.nextUrl.searchParams.get('secret');
    const expectedSecret = process.env.MIGRATION_SECRET || 'migration-2025-secure';

    if (secret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔄 Starting employee import from Google Sheets...');

    // Fetch data from Google Apps Script
    const gasUrl = process.env.NEXT_PUBLIC_GAS_API_URL;
    if (!gasUrl) {
      throw new Error('NEXT_PUBLIC_GAS_API_URL not configured');
    }

    const response = await fetch(`${gasUrl}?action=getNhanVien`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch from Google Sheets: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`📊 Fetched ${data.length} employees from Google Sheets`);

    if (!data || data.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No data received from Google Sheets',
      });
    }

    // Clear existing data (optional - comment out if you want to keep old data)
    await sql`TRUNCATE TABLE nhan_vien RESTART IDENTITY CASCADE`;
    console.log('🗑️ Cleared existing employee data');

    // Import each employee
    let imported = 0;
    let failed = 0;
    const errors: any[] = [];

    for (const employee of data) {
      try {
        await importEmployee(employee);
        imported++;
      } catch (error) {
        failed++;
        errors.push({
          ma_nhan_vien: employee.ma_nhan_vien,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        console.error(`❌ Failed to import ${employee.ma_nhan_vien}:`, error);
      }
    }

    console.log(`✅ Import completed: ${imported} success, ${failed} failed`);

    return NextResponse.json({
      success: true,
      imported,
      failed,
      total: data.length,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ Error importing employees:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Import a single employee into the database
 */
async function importEmployee(employee: any) {
  // Parse dates (handle both ISO and DD/MM/YYYY formats)
  const parseDate = (dateStr: string | null | undefined): string | null => {
    if (!dateStr) return null;
    
    // Try ISO format first
    const isoDate = new Date(dateStr);
    if (!isNaN(isoDate.getTime())) {
      return isoDate.toISOString().split('T')[0];
    }
    
    // Try DD/MM/YYYY format
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      const date = new Date(`${year}-${month}-${day}`);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }
    
    return null;
  };

  // Parse boolean from string
  const parseBoolean = (value: any): boolean => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true' || value === '1';
    }
    if (typeof value === 'number') return value === 1;
    return false;
  };

  // Parse number
  const parseNumber = (value: any): number | null => {
    if (value === null || value === undefined || value === '') return null;
    const num = parseFloat(value);
    return isNaN(num) ? null : num;
  };

  // Determine role based on chuc_vu
  const determineRole = (chucVu: string | null, phongBan: string | null): string => {
    if (!chucVu) return 'user';
    
    const chucVuLower = chucVu.toLowerCase();
    const phongBanLower = (phongBan || '').toLowerCase();
    
    if (chucVuLower.includes('admin') || chucVuLower.includes('giám đốc')) {
      return 'admin';
    }
    if (chucVuLower.includes('quản lý') || chucVuLower.includes('manager')) {
      return 'manager';
    }
    if (chucVuLower.includes('tài xế') || chucVuLower.includes('driver') || phongBanLower.includes('tài xế')) {
      return 'driver';
    }
    if (chucVuLower.includes('nhân viên') || chucVuLower.includes('staff')) {
      return 'staff';
    }
    
    return 'user';
  };

  const role = determineRole(employee.chuc_vu, employee.phong_ban);

  await sql`
    INSERT INTO nhan_vien (
      ma_nhan_vien,
      ho_va_ten,
      phong_ban,
      chuc_vu,
      hinh_anh,
      so_dien_thoai,
      email,
      chat_id,
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
      trang_thai
    ) VALUES (
      ${employee.ma_nhan_vien},
      ${employee.ho_va_ten},
      ${employee.phong_ban || null},
      ${employee.chuc_vu || null},
      ${employee.hinh_anh || null},
      ${employee.so_dien_thoai || null},
      ${employee.email || null},
      ${employee.chat_id || null},
      ${employee.tinh_trang_cong_tac || 'Đang làm việc'},
      ${parseDate(employee.ngay_vao_lam)},
      ${parseDate(employee.ngay_ky_hdld)},
      ${parseDate(employee.ngay_tham_gia_cong_doan)},
      ${parseDate(employee.ngay_tham_gia_bhxh)},
      ${parseDate(employee.ngay_thoi_viec)},
      ${parseNumber(employee.giam_tru_gia_canh)},
      ${parseNumber(employee.luong_thoa_thuan)},
      ${parseNumber(employee.tien_coc)},
      ${role},
      ${parseBoolean(employee.xem !== undefined ? employee.xem : true)},
      ${parseBoolean(employee.them)},
      ${parseBoolean(employee.sua)},
      ${parseBoolean(employee.xoa)},
      ${employee.tinh_trang_cong_tac === 'Nghỉ việc' ? 'Đã nghỉ việc' : null}
    )
    ON CONFLICT (ma_nhan_vien) 
    DO UPDATE SET
      ho_va_ten = EXCLUDED.ho_va_ten,
      phong_ban = EXCLUDED.phong_ban,
      chuc_vu = EXCLUDED.chuc_vu,
      hinh_anh = EXCLUDED.hinh_anh,
      so_dien_thoai = EXCLUDED.so_dien_thoai,
      email = EXCLUDED.email,
      chat_id = EXCLUDED.chat_id,
      tinh_trang_cong_tac = EXCLUDED.tinh_trang_cong_tac,
      ngay_vao_lam = EXCLUDED.ngay_vao_lam,
      ngay_ky_hdld = EXCLUDED.ngay_ky_hdld,
      ngay_tham_gia_cong_doan = EXCLUDED.ngay_tham_gia_cong_doan,
      ngay_tham_gia_bhxh = EXCLUDED.ngay_tham_gia_bhxh,
      ngay_thoi_viec = EXCLUDED.ngay_thoi_viec,
      giam_tru_gia_canh = EXCLUDED.giam_tru_gia_canh,
      luong_thoa_thuan = EXCLUDED.luong_thoa_thuan,
      tien_coc = EXCLUDED.tien_coc,
      phan_quyen = EXCLUDED.phan_quyen,
      xem = EXCLUDED.xem,
      them = EXCLUDED.them,
      sua = EXCLUDED.sua,
      xoa = EXCLUDED.xoa,
      trang_thai = EXCLUDED.trang_thai
  `;
}
