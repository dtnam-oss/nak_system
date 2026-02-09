import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
    const ten_tai_xe = searchParams.get('driver'); // Optional filter by driver name

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

    if (ten_tai_xe) {
      conditions.push(`ten_tai_xe ILIKE $${paramIndex++}`);
      params.push(`%${ten_tai_xe}%`);
    }

    const whereClause = conditions.join(' AND ');

    // Query from luong_tai_xe table
    const result = await query(`
      SELECT
        ma_chuyen_di,
        ngay_tao,
        nam,
        thang,
        ten_khach_hang,
        loai_chuyen,
        ten_tuyen,
        ma_tuyen,
        luong_tai_xe,
        ten_tai_xe,
        don_vi_van_chuyen
      FROM luong_tai_xe
      WHERE ${whereClause}
      ORDER BY ngay_tao DESC, ma_chuyen_di DESC
    `, params);

    // Calculate summary statistics
    const totalLuong = result.rows.reduce((sum, row) => sum + parseFloat(row.luong_tai_xe || '0'), 0);
    const totalChuyen = result.rows.length;

    // Group by driver for summary
    const driverSummary = result.rows.reduce((acc: any, row) => {
      const driver = row.ten_tai_xe || 'Unknown';
      if (!acc[driver]) {
        acc[driver] = {
          ten_tai_xe: driver,
          so_chuyen: 0,
          tong_luong: 0,
        };
      }
      acc[driver].so_chuyen += 1;
      acc[driver].tong_luong += parseFloat(row.luong_tai_xe || '0');
      return acc;
    }, {});

    // Convert numeric fields to actual numbers
    const processedData = result.rows.map(row => ({
      ...row,
      luong_tai_xe: parseFloat(row.luong_tai_xe) || 0,
    }));

    return NextResponse.json({
      success: true,
      data: processedData,
      count: processedData.length,
      summary: {
        total_luong: totalLuong,
        total_chuyen: totalChuyen,
        drivers: Object.values(driverSummary),
      },
      filters: { month, year, ten_tai_xe },
    }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });

  } catch (error: any) {
    console.error('❌ Lương Chuyến Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch lương chuyến',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
