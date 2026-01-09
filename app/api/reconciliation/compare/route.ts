/**
 * Reconciliation Compare API
 *
 * Endpoint: POST /api/reconciliation/compare
 * Purpose: Compare customer reconciliation data with NAK database
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { ComparisonEngine } from '@/lib/reconciliation/comparison/ComparisonEngine';
import { ReconciliationRow } from '@/lib/reconciliation/parsers/types';

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Reconciliation compare request received');

    const body = await request.json();
    const { customerRows, dateRange, customer } = body;

    // Validation
    if (!customerRows || !Array.isArray(customerRows)) {
      return NextResponse.json(
        { success: false, error: 'Invalid customer rows data' },
        { status: 400 }
      );
    }

    if (customerRows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No customer rows to compare' },
        { status: 400 }
      );
    }

    if (!dateRange || !dateRange.from || !dateRange.to) {
      return NextResponse.json(
        { success: false, error: 'Date range is required (from, to)' },
        { status: 400 }
      );
    }

    console.log(`   Customer rows: ${customerRows.length}`);
    console.log(`   Date range: ${dateRange.from} to ${dateRange.to}`);
    console.log(`   Customer filter: ${customer || 'all'}`);

    // Build SQL query
    let query = `
      SELECT
        id,
        order_id,
        date,
        customer,
        route_name,
        driver_name,
        provider,
        status,
        cost,
        revenue,
        trip_type,
        route_type,
        weight,
        total_distance,
        details,
        note,
        created_at
      FROM reconciliation_orders
      WHERE date >= $1
        AND date <= $2
    `;

    const params: any[] = [dateRange.from, dateRange.to];

    // Add customer filter if provided
    if (customer && customer !== 'all') {
      query += ` AND customer = $3`;
      params.push(customer);
    }

    query += ` ORDER BY date ASC, order_id ASC`;

    console.log('   Fetching NAK orders from database...');

    // Fetch NAK orders from database
    const { rows: nakOrders } = await sql.query(query, params);

    console.log(`   Found ${nakOrders.length} NAK orders`);

    if (nakOrders.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No NAK orders found in the specified date range',
        },
        { status: 404 }
      );
    }

    // Run comparison
    console.log('   Starting comparison engine...');
    const engine = new ComparisonEngine();
    const result = await engine.compare(
      customerRows as ReconciliationRow[],
      nakOrders,
      dateRange
    );

    console.log('✓ Comparison completed successfully');

    return NextResponse.json({
      success: true,
      result,
    });

  } catch (error: any) {
    console.error('❌ Comparison error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to compare data',
        details: error.stack,
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for comparison status/info
 */
export async function GET(request: NextRequest) {
  try {
    // Get date range stats from database
    const { rows } = await sql`
      SELECT
        MIN(date) as earliest_date,
        MAX(date) as latest_date,
        COUNT(*) as total_orders,
        COUNT(DISTINCT customer) as total_customers
      FROM reconciliation_orders
    `;

    const stats = rows[0];

    return NextResponse.json({
      success: true,
      database: {
        earliestDate: stats.earliest_date,
        latestDate: stats.latest_date,
        totalOrders: parseInt(stats.total_orders),
        totalCustomers: parseInt(stats.total_customers),
      },
      message: 'Ready to compare reconciliation data',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
