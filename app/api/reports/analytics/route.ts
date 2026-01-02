import { sql } from '@vercel/postgres';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface DataIntegrityError {
  order_id: string;
  date: string;
  customer: string;
  missing_fields: string[];
  detail_index: number;
}

/**
 * GET /api/reports/analytics
 * 
 * Returns:
 * 1. Statistics: Total trips, breakdown by trip_type, breakdown by status
 * 2. Data Integrity: Orders with missing required fields in chiTietLoTrinh
 * 
 * Query params: fromDate, toDate, customer (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');
    const customer = searchParams.get('customer');

    console.log('📊 Analytics API Request:', { fromDate, toDate, customer });

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

    // =====================
    // PART A: STATISTICS
    // =====================
    
    // Total trips
    const totalQuery = `
      SELECT COUNT(*) as total
      FROM reconciliation_orders
      ${whereClause}
    `;
    const totalResult = await sql.query(totalQuery, params);
    const totalTrips = parseInt(totalResult.rows[0].total);

    // Breakdown by trip_type
    const tripTypeQuery = `
      SELECT 
        trip_type,
        COUNT(*) as count
      FROM reconciliation_orders
      ${whereClause}
      GROUP BY trip_type
      ORDER BY count DESC
    `;
    const tripTypeResult = await sql.query(tripTypeQuery, params);
    const tripTypeBreakdown = tripTypeResult.rows.reduce((acc: any, row: any) => {
      acc[row.trip_type || 'unknown'] = parseInt(row.count);
      return acc;
    }, {});

    // Breakdown by status
    const statusQuery = `
      SELECT 
        status,
        COUNT(*) as count
      FROM reconciliation_orders
      ${whereClause}
      GROUP BY status
      ORDER BY count DESC
    `;
    const statusResult = await sql.query(statusQuery, params);
    const statusBreakdown = statusResult.rows.reduce((acc: any, row: any) => {
      acc[row.status || 'unknown'] = parseInt(row.count);
      return acc;
    }, {});

    // Breakdown by customer (for chart)
    const customerQuery = `
      SELECT 
        customer,
        COUNT(*) as count
      FROM reconciliation_orders
      ${whereClause}
      GROUP BY customer
      ORDER BY count DESC
      LIMIT 10
    `;
    const customerResult = await sql.query(customerQuery, params);
    const customerBreakdown = customerResult.rows.map((row: any) => ({
      customer: row.customer,
      count: parseInt(row.count)
    }));

    // =====================
    // PART B: DATA INTEGRITY
    // =====================
    
    const dataIntegrityQuery = `
      SELECT 
        order_id,
        date,
        customer,
        details
      FROM reconciliation_orders
      ${whereClause}
    `;
    
    const integrityResult = await sql.query(dataIntegrityQuery, params);
    const dataErrors: DataIntegrityError[] = [];

    // Check each order for missing fields in chiTietLoTrinh
    integrityResult.rows.forEach((order: any) => {
      const details = order.details;
      
      if (!details || !details.chiTietLoTrinh || !Array.isArray(details.chiTietLoTrinh)) {
        // Missing entire array
        dataErrors.push({
          order_id: order.order_id,
          date: order.date,
          customer: order.customer,
          missing_fields: ['chiTietLoTrinh (missing array)'],
          detail_index: -1
        });
        return;
      }

      // Check each item in the array
      details.chiTietLoTrinh.forEach((item: any, index: number) => {
        const missingFields: string[] = [];
        
        // Required fields to check
        const requiredFields = [
          { key: 'loTrinh', label: 'Lộ trình' },
          { key: 'loTrinhChiTiet', label: 'Lộ trình chi tiết' },
          { key: 'bienKiemSoat', label: 'Biển số xe' },
          { key: 'taiTrongTinhPhi', label: 'Tải trọng' }
        ];

        requiredFields.forEach(field => {
          const value = item[field.key];
          if (!value || value === '' || value === null) {
            missingFields.push(field.label);
          }
        });

        if (missingFields.length > 0) {
          dataErrors.push({
            order_id: order.order_id,
            date: order.date,
            customer: order.customer,
            missing_fields: missingFields,
            detail_index: index
          });
        }
      });
    });

    // =====================
    // RESPONSE
    // =====================
    
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      filters: {
        fromDate,
        toDate,
        customer
      },
      statistics: {
        total_trips: totalTrips,
        by_trip_type: tripTypeBreakdown,
        by_status: statusBreakdown,
        by_customer: customerBreakdown
      },
      data_integrity: {
        total_errors: dataErrors.length,
        error_rate: totalTrips > 0 ? ((dataErrors.length / totalTrips) * 100).toFixed(2) : '0.00',
        errors: dataErrors
      }
    };

    console.log('✅ Analytics Response:', {
      total: totalTrips,
      errors: dataErrors.length,
      error_rate: response.data_integrity.error_rate
    });

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Analytics API Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate analytics report',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
