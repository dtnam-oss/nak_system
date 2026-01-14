
import { sql } from '@vercel/postgres';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const page = parseInt(searchParams.get('page') || '1');
        const pageSize = parseInt(searchParams.get('pageSize') || '20');
        const filter = searchParams.get('filter') || 'all'; // all, missing_plate, missing_route, missing_weight, missing_money
        const fromDate = searchParams.get('fromDate');
        const toDate = searchParams.get('toDate');
        const search = searchParams.get('search');

        const offset = (page - 1) * pageSize;
        const conditions: string[] = [];
        const params: any[] = [];
        let pIdx = 1;

        // 1. Date Filter
        if (fromDate) {
            conditions.push(`date >= $${pIdx++}`);
            params.push(fromDate);
        }
        if (toDate) {
            conditions.push(`date <= $${pIdx++}`);
            params.push(toDate);
        }

        // 2. Search Filter (Order ID or Customer)
        if (search) {
            conditions.push(`(order_id ILIKE $${pIdx} OR customer ILIKE $${pIdx})`);
            params.push(`%${search}%`);
            pIdx++;
        }

        // 3. Smart Error Filter
        switch (filter) {
            case 'missing_route':
                conditions.push(`(route_name IS NULL OR route_name = '')`);
                break;
            case 'missing_weight':
                conditions.push(`(weight = 0 OR weight IS NULL)`);
                break;
            case 'missing_money':
                conditions.push(`((revenue = 0 OR revenue IS NULL) AND (cost = 0 OR cost IS NULL))`);
                break;
            case 'missing_plate':
                // Same logic as stats
                conditions.push(`(
                details IS NULL 
                OR NOT (details ? 'chiTietLoTrinh')
                OR jsonb_array_length(details->'chiTietLoTrinh') = 0
                OR EXISTS (
                    SELECT 1 
                    FROM jsonb_array_elements(details->'chiTietLoTrinh') as trip 
                    WHERE (trip->>'bienKiemSoat') IS NULL OR (trip->>'bienKiemSoat') = ''
                )
             )`);
                break;
            case 'all':
            default:
                // No extra filter
                break;
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        // Count Query
        const countResult = await sql.query(`
        SELECT COUNT(*) as total
        FROM reconciliation_orders
        ${whereClause}
    `, params);
        const totalCount = parseInt(countResult.rows[0].total);

        // Data Query
        // We select only needed columns for the table
        const dataQuery = `
        SELECT 
            id, 
            order_id, 
            date, 
            customer, 
            route_name, 
            weight, 
            revenue, 
            cost, 
            details,
            trip_type,
            provider
        FROM reconciliation_orders
        ${whereClause}
        ORDER BY date DESC, created_at DESC
        LIMIT $${pIdx++} OFFSET $${pIdx++}
    `;
        params.push(pageSize, offset);

        const result = await sql.query(dataQuery, params);

        // Process rows to extract display friendly data
        const records = result.rows.map(row => {
            let licensePlate = '---';
            try {
                const details = typeof row.details === 'string' ? JSON.parse(row.details) : row.details;
                if (details?.chiTietLoTrinh?.[0]?.bienKiemSoat) {
                    licensePlate = details.chiTietLoTrinh[0].bienKiemSoat;
                }
            } catch (e) {
                // ignore parse error
            }

            return {
                id: row.id,
                order_id: row.order_id,
                date: row.date, // keep as is, frontend will format
                customer: row.customer,
                route_name: row.route_name,
                weight: row.weight,
                revenue: row.revenue,
                license_plate: licensePlate, // Derived column
                trip_type: row.trip_type,
                provider: row.provider
            };
        });

        return NextResponse.json({
            data: records,
            meta: {
                total: totalCount,
                page,
                pageSize,
                totalPages: Math.ceil(totalCount / pageSize)
            }
        });

    } catch (error) {
        console.error('❌ Smart Query Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch query results' },
            { status: 500 }
        );
    }
}
