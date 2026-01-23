
import { sql, query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        // Default to current month if no date provided, to keep it fast
        const fromDate = searchParams.get('fromDate');
        const toDate = searchParams.get('toDate');

        // Build Time Filter
        const conditions: string[] = [];
        if (fromDate) conditions.push(`ngay_tao >= '${fromDate}'`);
        if (toDate) conditions.push(`ngay_tao <= '${toDate}'`);

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        // Optimized Query using chuyen_di + chi_tiet_chuyen_di
        // Check for missing critical fields
        const queryStr = `
      WITH trip_quality AS (
        SELECT 
          cd.ma_chuyen_di,
          cd.ten_tuyen,
          cd.doanh_thu,
          cd.so_km_theo_odo,
          BOOL_OR(
            ct.bien_kiem_soat IS NULL OR ct.bien_kiem_soat = ''
          ) as has_missing_plate
        FROM chuyen_di cd
        LEFT JOIN chi_tiet_chuyen_di ct ON ct.ma_chuyen_di = cd.ma_chuyen_di
        ${whereClause}
        GROUP BY cd.ma_chuyen_di, cd.ten_tuyen, cd.doanh_thu, cd.so_km_theo_odo
      )
      SELECT 
        COUNT(*) as "totalOrders",
        COUNT(*) FILTER (WHERE ten_tuyen IS NULL OR ten_tuyen = '') as "missingRoute",
        COUNT(*) FILTER (WHERE so_km_theo_odo = 0 OR so_km_theo_odo IS NULL) as "missingWeight",
        COUNT(*) FILTER (WHERE doanh_thu = 0 OR doanh_thu IS NULL) as "missingMoney",
        COUNT(*) FILTER (WHERE has_missing_plate = true) as "missingPlate"
      FROM trip_quality
    `;

        const result = await query(queryStr, []);
        const row = result.rows[0];

        // Calculate quality score
        const total = parseInt(row.totalOrders || '0');
        const missingRoute = parseInt(row.missingRoute || '0');
        const missingWeight = parseInt(row.missingWeight || '0');
        const missingMoney = parseInt(row.missingMoney || '0');
        const missingPlate = parseInt(row.missingPlate || '0');

        // Note: One order can have multiple errors, so sum of errors might > distinct error orders
        // We'll treat "Error Rate" as (Orders with at least 1 error) / Total
        // For simplicity here, let's sum them but cap at total
        const totalErrors = Math.min(total, missingRoute + missingWeight + missingMoney + missingPlate);
        const qualityScore = total > 0 ? Math.round(((total - totalErrors) / total) * 100) : 100;

        return NextResponse.json({
            totalOrders: total,
            qualityScore,
            errors: {
                missingRoute,
                missingWeight,
                missingMoney,
                missingPlate
            }
        });

    } catch (error) {
        console.error('❌ Data Quality Stats Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch quality stats' },
            { status: 500 }
        );
    }
}
