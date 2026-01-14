
import { sql } from '@vercel/postgres';
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
        if (fromDate) conditions.push(`date >= '${fromDate}'`);
        if (toDate) conditions.push(`date <= '${toDate}'`);

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        // Optimized Single Query using Filtered Aggregation
        // We check JSONB 'details' for missing license plates in 'chiTietLoTrinh' array
        const query = `
      SELECT 
        COUNT(*) as "totalOrders",
        -- Error: Missing Route Name
        COUNT(*) FILTER (WHERE route_name IS NULL OR route_name = '') as "missingRoute",
        -- Error: Missing Weight
        COUNT(*) FILTER (WHERE weight = 0 OR weight IS NULL) as "missingWeight",
        -- Error: Missing Revenue (Cost)
        COUNT(*) FILTER (WHERE (revenue = 0 OR revenue IS NULL) AND (cost = 0 OR cost IS NULL)) as "missingMoney",
        -- Error: Missing License Plate (Complex JSONB check)
        -- Checks if details->chiTietLoTrinh exists AND contains at least one element with empty bienKiemSoat
        COUNT(*) FILTER (
            WHERE details IS NULL 
            OR NOT (details ? 'chiTietLoTrinh')
            OR jsonb_array_length(details->'chiTietLoTrinh') = 0
            OR EXISTS (
                SELECT 1 
                FROM jsonb_array_elements(details->'chiTietLoTrinh') as trip 
                WHERE (trip->>'bienKiemSoat') IS NULL OR (trip->>'bienKiemSoat') = ''
            )
        ) as "missingPlate"
      FROM reconciliation_orders
      ${whereClause}
    `;

        const result = await sql.query(query);
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
