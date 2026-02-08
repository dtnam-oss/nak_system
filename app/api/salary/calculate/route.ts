import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // 1. Check authentication
    const session = await getSession();
    if (!session?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    // 2. Parse request body
    const body = await request.json();
    const { month, year } = body;

    if (!month || !year) {
      return NextResponse.json(
        { success: false, error: 'Month and year are required' },
        { status: 400 }
      );
    }

    if (month < 1 || month > 12) {
      return NextResponse.json(
        { success: false, error: 'Invalid month. Must be between 1 and 12' },
        { status: 400 }
      );
    }

    let processedCount = 0;
    const errors: string[] = [];

    // 3. Calculate salary for regular employees (nhan_vien)
    try {
      const employees = await query(`
        SELECT
          ma_nhan_vien,
          ho_va_ten,
          phong_ban,
          chuc_vu,
          COALESCE(luong_thoa_thuan, 0) as luong_thoa_thuan,
          COALESCE(tien_coc, 0) as tien_coc
        FROM nhan_vien
        WHERE is_active = true
          AND phan_quyen IN ('staff', 'manager', 'admin')
          AND phan_quyen != 'driver'
      `);

      for (const emp of employees.rows) {
        const luongCoBan = parseFloat(emp.luong_thoa_thuan || '0');

        // Calculate mandatory deductions (only if luongCoBan > 0)
        const bhxh = luongCoBan > 0 ? luongCoBan * 0.105 : 0; // 10.5%
        const bhyt = luongCoBan > 0 ? luongCoBan * 0.015 : 0; // 1.5%
        const bhtn = luongCoBan > 0 ? luongCoBan * 0.01 : 0;  // 1%

        await query(`
          INSERT INTO bang_luong (
            ma_nhan_vien, ho_va_ten, phong_ban, chuc_vu, loai_nhan_vien,
            thang, nam, luong_co_ban, bhxh, bhyt, bhtn, created_by
          ) VALUES (
            $1, $2, $3, $4, 'nhan_vien', $5, $6, $7, $8, $9, $10, $11
          )
          ON CONFLICT (ma_nhan_vien, thang, nam)
          DO UPDATE SET
            luong_co_ban = EXCLUDED.luong_co_ban,
            bhxh = EXCLUDED.bhxh,
            bhyt = EXCLUDED.bhyt,
            bhtn = EXCLUDED.bhtn,
            updated_at = NOW()
        `, [
          emp.ma_nhan_vien,
          emp.ho_va_ten,
          emp.phong_ban,
          emp.chuc_vu,
          month,
          year,
          luongCoBan,
          bhxh,
          bhyt,
          bhtn,
          session.email,
        ]);

        processedCount++;
      }
    } catch (error: any) {
      errors.push(`Error processing employees: ${error.message}`);
    }

    // 4. Calculate salary for drivers (tai_xe)
    try {
      const drivers = await query(`
        SELECT
          ma_nhan_vien,
          ho_va_ten,
          phong_ban,
          chuc_vu,
          COALESCE(luong_thoa_thuan, 0) as luong_thoa_thuan,
          COALESCE(tien_coc, 0) as tien_coc
        FROM nhan_vien
        WHERE is_active = true
          AND phan_quyen = 'driver'
      `);

      for (const driver of drivers.rows) {
        // Get trips for this driver in this month
        const trips = await query(`
          SELECT
            COUNT(*) as so_chuyen,
            COALESCE(SUM(tong_doanh_thu), 0) as tong_doanh_thu
          FROM chuyen_di
          WHERE ten_tai_xe = $1
            AND EXTRACT(MONTH FROM ngay_tao) = $2
            AND EXTRACT(YEAR FROM ngay_tao) = $3
            AND trang_thai = 'approved'
        `, [driver.ho_va_ten, month, year]);

        const soChuyen = parseInt(trips.rows[0]?.so_chuyen || '0');
        const tongDoanhThu = parseFloat(trips.rows[0]?.tong_doanh_thu || '0');
        const tyLeChiaSe = 15; // 15% of revenue
        const luongTheoChuyen = tongDoanhThu * (tyLeChiaSe / 100);

        const luongCoBan = parseFloat(driver.luong_thoa_thuan || '0');

        // Calculate deductions (based on base salary only)
        const bhxh = luongCoBan > 0 ? luongCoBan * 0.105 : 0;
        const bhyt = luongCoBan > 0 ? luongCoBan * 0.015 : 0;
        const bhtn = luongCoBan > 0 ? luongCoBan * 0.01 : 0;

        await query(`
          INSERT INTO bang_luong (
            ma_nhan_vien, ho_va_ten, phong_ban, chuc_vu, loai_nhan_vien,
            thang, nam, luong_co_ban, so_chuyen_di, tong_doanh_thu,
            ty_le_chia_se, luong_theo_chuyen, bhxh, bhyt, bhtn, created_by
          ) VALUES (
            $1, $2, $3, $4, 'tai_xe', $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
          )
          ON CONFLICT (ma_nhan_vien, thang, nam)
          DO UPDATE SET
            so_chuyen_di = EXCLUDED.so_chuyen_di,
            tong_doanh_thu = EXCLUDED.tong_doanh_thu,
            luong_theo_chuyen = EXCLUDED.luong_theo_chuyen,
            updated_at = NOW()
        `, [
          driver.ma_nhan_vien,
          driver.ho_va_ten,
          driver.phong_ban,
          driver.chuc_vu,
          month,
          year,
          luongCoBan,
          soChuyen,
          tongDoanhThu,
          tyLeChiaSe,
          luongTheoChuyen,
          bhxh,
          bhyt,
          bhtn,
          session.email,
        ]);

        processedCount++;
      }
    } catch (error: any) {
      errors.push(`Error processing drivers: ${error.message}`);
    }

    // 5. Return response
    if (errors.length > 0) {
      return NextResponse.json({
        success: false,
        message: `Calculated salary with errors. Processed: ${processedCount}`,
        count: processedCount,
        errors,
      }, { status: 207 }); // 207 Multi-Status
    }

    return NextResponse.json({
      success: true,
      message: `Đã tính lương thành công cho ${processedCount} nhân viên tháng ${month}/${year}`,
      count: processedCount,
      month,
      year,
    });

  } catch (error: any) {
    console.error('❌ Calculate Salary Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to calculate salary',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
