import { sql } from '@vercel/postgres';
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
      conditions.push(`date >= $${paramIndex}`);
      params.push(fromDate);
      paramIndex++;
    }
    if (toDate) {
      conditions.push(`date <= $${paramIndex}`);
      params.push(toDate);
      paramIndex++;
    }
    if (customer) {
      conditions.push(`customer = $${paramIndex}`);
      params.push(customer);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Fetch all trips with details
    const tripsQuery = `
      SELECT
        id,
        order_id,
        date,
        route_name,
        customer,
        weight,
        revenue,
        cost,
        status,
        trip_type,
        route_type,
        driver_name,
        provider,
        total_distance,
        details
      FROM reconciliation_orders
      ${whereClause}
      ORDER BY customer ASC, trip_type ASC, date DESC
    `;

    const result = await sql.query(tripsQuery, params);

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
