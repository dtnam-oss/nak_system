import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
    const type = searchParams.get('type'); // 'nhan_vien' | 'tai_xe' | null
    const department = searchParams.get('department');
    const status = searchParams.get('status');

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

    if (department && department !== 'all') {
      conditions.push(`phong_ban = $${paramIndex++}`);
      params.push(department);
    }

    if (status && status !== 'all') {
      conditions.push(`trang_thai = $${paramIndex++}`);
      params.push(status);
    }

    const whereClause = conditions.join(' AND ');

    // Execute query
    const result = await query(`
      SELECT
        id,
        ma_nhan_vien,
        ho_va_ten,
        phong_ban,
        chuc_vu,
        loai_nhan_vien,
        thang,
        nam,
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
        ghi_chu,
        created_at,
        updated_at
      FROM bang_luong
      WHERE ${whereClause}
      ORDER BY
        CASE WHEN trang_thai = 'chua_thanh_toan' THEN 1
             WHEN trang_thai = 'da_xac_nhan' THEN 2
             WHEN trang_thai = 'da_thanh_toan' THEN 3
             ELSE 4
        END,
        ho_va_ten ASC
    `, params);

    return NextResponse.json({
      success: true,
      data: result.rows,
      count: result.rows.length,
      filters: { month, year, type, department, status },
    }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });

  } catch (error: any) {
    console.error('❌ Salary List Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch salary list',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
