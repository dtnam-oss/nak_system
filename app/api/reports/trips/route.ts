import { sql, query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/reports/trips
 * 
 * Returns detailed trip list for operation summary tab
 * Query params: fromDate, toDate, customer (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');
    const customer = searchParams.get('customer');

    console.log('📊 Trips API Request:', { fromDate, toDate, customer });

    // Build WHERE clause
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (fromDate) {
      conditions.push(`ngay_tao >= $${paramIndex}`);
      params.push(fromDate);
      paramIndex++;
    }
    if (toDate) {
      conditions.push(`ngay_tao <= $${paramIndex}`);
      params.push(toDate);
      paramIndex++;
    }
    if (customer) {
      conditions.push(`ten_khach_hang = $${paramIndex}`);
      params.push(customer);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Fetch all trips with details
    const tripsQuery = `
      SELECT
        id,
        ma_chuyen_di as order_id,
        ngay_tao as date,
        ten_tuyen as route_name,
        ten_khach_hang as customer,
        so_km_theo_odo as weight,
        CAST(doanh_thu AS NUMERIC) as revenue,
        0 as cost,
        trang_thai_chuyen_di as status,
        loai_chuyen as trip_type,
        loai_tuyen as route_type,
        ten_tai_xe as driver_name,
        don_vi_van_chuyen as provider,
        CAST(so_km_theo_odo AS NUMERIC) as total_distance
      FROM chuyen_di
      ${whereClause}
      ORDER BY ten_khach_hang ASC, loai_chuyen ASC, ngay_tao DESC
    `;

    const result = await query(tripsQuery, params);

    console.log(`✅ Trips API Response: ${result.rows.length} trips`);

    return NextResponse.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });

  } catch (error: any) {
    console.error('❌ Trips API Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch trips',
        data: []
      },
      { status: 500 }
    );
  }
}
