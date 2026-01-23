
import { sql, query } from '@/lib/db';
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
            conditions.push(`ngay_tao >= $${pIdx++}`);
            params.push(fromDate);
        }
        if (toDate) {
            conditions.push(`ngay_tao <= $${pIdx++}`);
            params.push(toDate);
        }

        // 2. Search Filter (Order ID or Customer)
        if (search) {
            conditions.push(`(ma_chuyen_di ILIKE $${pIdx} OR ten_khach_hang ILIKE $${pIdx})`);
            params.push(`%${search}%`);
            pIdx++;
        }

        // 3. Smart Error Filter
        switch (filter) {
            case 'missing_route':
                conditions.push(`(ten_tuyen IS NULL OR ten_tuyen = '')`);
                break;
            case 'missing_weight':
                conditions.push(`(so_km_theo_odo = 0 OR so_km_theo_odo IS NULL)`);
                break;
            case 'missing_money':
                conditions.push(`(doanh_thu = 0 OR doanh_thu IS NULL)`);
                break;
            case 'missing_plate':
                conditions.push(`EXISTS (
                    SELECT 1 FROM chi_tiet_chuyen_di ct 
                    WHERE ct.ma_chuyen_di = chuyen_di.ma_chuyen_di 
                    AND (ct.bien_kiem_soat IS NULL OR ct.bien_kiem_soat = '')
                )`);
                break;
            case 'all':
            default:
                // No extra filter
                break;
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        // Count Query
        const countResult = await query(`
        SELECT COUNT(*) as total
        FROM chuyen_di
        ${whereClause}
    `, params);
        const totalCount = parseInt(countResult.rows[0].total);

        // Data Query
        // We select only needed columns for the table
        const dataQuery = `
        SELECT 
            cd.id, 
            cd.ma_chuyen_di as order_id, 
            cd.ngay_tao as date, 
            cd.ten_khach_hang as customer, 
            cd.ten_tuyen as route_name, 
            cd.so_km_theo_odo as weight, 
            CAST(cd.doanh_thu AS NUMERIC) as revenue, 
            0 as cost,
            cd.loai_chuyen as trip_type,
            cd.don_vi_van_chuyen as provider,
            (
                SELECT bien_kiem_soat 
                FROM chi_tiet_chuyen_di 
                WHERE ma_chuyen_di = cd.ma_chuyen_di 
                LIMIT 1
            ) as license_plate
        FROM chuyen_di cd
        ${whereClause}
        ORDER BY cd.ngay_tao DESC, cd.thoi_gian_tao DESC
        LIMIT $${pIdx++} OFFSET $${pIdx++}
    `;
        params.push(pageSize, offset);

        const result = await query(dataQuery, params);

        // Process rows to extract display friendly data
        const records = result.rows.map(row => {
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
