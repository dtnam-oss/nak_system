import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

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

    // 1. Get total salary statistics
    const totalResult = await query(`
      SELECT
        COALESCE(SUM(thuc_lanh), 0) as total_salary,
        COUNT(*) as total_count,
        COALESCE(AVG(thuc_lanh), 0) as avg_salary,
        COUNT(*) FILTER (WHERE trang_thai = 'chua_thanh_toan') as pending_count
      FROM bang_luong
      WHERE thang = $1 AND nam = $2
    `, [month, year]);

    // 2. Get employee statistics (nhan_vien)
    const employeeResult = await query(`
      SELECT
        COUNT(*) as count,
        COALESCE(SUM(thuc_lanh), 0) as total
      FROM bang_luong
      WHERE thang = $1 AND nam = $2 AND loai_nhan_vien = 'nhan_vien'
    `, [month, year]);

    // 3. Get driver statistics (tai_xe)
    const driverResult = await query(`
      SELECT
        COUNT(*) as count,
        COALESCE(SUM(thuc_lanh), 0) as total
      FROM bang_luong
      WHERE thang = $1 AND nam = $2 AND loai_nhan_vien = 'tai_xe'
    `, [month, year]);

    const stats = {
      total_salary_month: parseFloat(totalResult.rows[0]?.total_salary || '0'),
      total_employees: parseInt(employeeResult.rows[0]?.count || '0'),
      total_drivers: parseInt(driverResult.rows[0]?.count || '0'),
      avg_salary: parseFloat(totalResult.rows[0]?.avg_salary || '0'),
      total_employee_salary: parseFloat(employeeResult.rows[0]?.total || '0'),
      total_driver_salary: parseFloat(driverResult.rows[0]?.total || '0'),
      pending_count: parseInt(totalResult.rows[0]?.pending_count || '0'),
    };

    return NextResponse.json({
      success: true,
      data: stats,
      month,
      year,
    }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });

  } catch (error: any) {
    console.error('❌ Salary Stats Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch salary statistics',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
