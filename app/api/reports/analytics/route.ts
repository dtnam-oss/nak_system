import { sql, query } from '@/lib/db';
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

    // =====================
    // PART A: STATISTICS
    // =====================
    
    // Total trips
    const totalQuery = `
      SELECT COUNT(*) as total
      FROM chuyen_di
      ${whereClause}
    `;
    const totalResult = await query(totalQuery, params);
    const totalTrips = parseInt(totalResult.rows[0].total);

    // Breakdown by trip_type
    const tripTypeQuery = `
      SELECT 
        loai_chuyen as trip_type,
        COUNT(*) as count
      FROM chuyen_di
      ${whereClause}
      GROUP BY loai_chuyen
      ORDER BY count DESC
    `;
    const tripTypeResult = await query(tripTypeQuery, params);
    const tripTypeBreakdown = tripTypeResult.rows.reduce((acc: any, row: any) => {
      acc[row.trip_type || 'unknown'] = parseInt(row.count);
      return acc;
    }, {});

    // Breakdown by status
    const statusQuery = `
      SELECT 
        trang_thai_chuyen_di as status,
        COUNT(*) as count
      FROM chuyen_di
      ${whereClause}
      GROUP BY trang_thai_chuyen_di
      ORDER BY count DESC
    `;
    const statusResult = await query(statusQuery, params);
    const statusBreakdown = statusResult.rows.reduce((acc: any, row: any) => {
      acc[row.status || 'unknown'] = parseInt(row.count);
      return acc;
    }, {});

    // Breakdown by customer (for chart)
    const customerQuery = `
      SELECT 
        ten_khach_hang as customer,
        COUNT(*) as count
      FROM chuyen_di
      ${whereClause}
      GROUP BY ten_khach_hang
      ORDER BY count DESC
      LIMIT 10
    `;
    const customerResult = await query(customerQuery, params);
    const customerBreakdown = customerResult.rows.map((row: any) => ({
      customer: row.customer,
      count: parseInt(row.count)
    }));

    // =====================
    // PART B: DATA INTEGRITY
    // =====================
    
    const dataIntegrityQuery = `
      SELECT 
        cd.ma_chuyen_di as order_id,
        cd.ngay_tao as date,
        cd.ten_khach_hang as customer,
        json_agg(
          json_build_object(
            'bienKiemSoat', ct.bien_kiem_soat,
            'loTrinh', ct.lo_trinh,
            'loTrinhChiTiet', ct.lo_trinh_chi_tiet_theo_diem,
            'taiTrongTinhPhi', ct.tai_trong_tinh_phi
          )
        ) as details
      FROM chuyen_di cd
      LEFT JOIN chi_tiet_chuyen_di ct ON ct.ma_chuyen_di = cd.ma_chuyen_di
      ${whereClause}
      GROUP BY cd.ma_chuyen_di, cd.ngay_tao, cd.ten_khach_hang
    `;
    
    const integrityResult = await query(dataIntegrityQuery, params);
    const dataErrors: DataIntegrityError[] = [];

    // Check each order for missing fields in chi_tiet
    integrityResult.rows.forEach((order: any) => {
      const details = order.details;
      
      if (!details || !Array.isArray(details) || details.length === 0) {
        // Missing entire array
        dataErrors.push({
          order_id: order.order_id,
          date: order.date,
          customer: order.customer,
          missing_fields: ['Chi tiết lộ trình (missing)'],
          detail_index: -1
        });
        return;
      }

      // Check each item in the array
      details.forEach((item: any, index: number) => {
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
