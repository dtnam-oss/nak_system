import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
    const ma_tai_xe = searchParams.get('driver'); // Optional filter

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

    if (ma_tai_xe) {
      conditions.push(`ma_tai_xe = $${paramIndex++}`);
      params.push(ma_tai_xe);
    }

    const whereClause = conditions.join(' AND ');

    // Query from du_lieu_tien_coc table
    const result = await query(`
      SELECT
        id,
        ma_tai_xe,
        ten_tai_xe,
        email,
        tien_thu_coc,
        thang,
        nam
      FROM du_lieu_tien_coc
      WHERE ${whereClause}
      ORDER BY ten_tai_xe ASC, ma_tai_xe ASC
    `, params);

    // Parse numeric fields
    const data = result.rows.map(row => ({
      ...row,
      tien_thu_coc: parseFloat(row.tien_thu_coc || '0'),
    }));

    return NextResponse.json({
      success: true,
      data,
      summary: {
        total_records: data.length,
        total_tien_coc: data.reduce((sum, r) => sum + r.tien_thu_coc, 0),
      }
    });

  } catch (error: any) {
    console.error('❌ Tien Coc API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch tiền cọc',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
