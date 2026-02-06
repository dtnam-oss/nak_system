import { sql, query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';

// Enable caching for vehicle data
// export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    const loaiHinh = searchParams.get('loaiHinh') || ''; // NAK/Vendor/All
    const search = searchParams.get('search') || '';

    // Create cache key based on query params
    const cacheKey = `vehicles-${limit}-${offset}-${loaiHinh}-${search}`;

    const getCachedData = unstable_cache(
      async () => {
        console.log(`📊 Fetching vehicles (limit: ${limit}, offset: ${offset}, loaiHinh: ${loaiHinh}, search: ${search})`);

        // Build dynamic query based on filters
        let countQuery = `SELECT COUNT(*) as total FROM phuong_tien`;
        let dataQuery = `
          SELECT 
            bien_kiem_soat as license_plate,
            hieu_xe as brand,
            loai_xe as vehicle_type,
            CASE
              WHEN tai_trong::TEXT IS NULL OR tai_trong::TEXT = '' THEN 0
              WHEN tai_trong::TEXT !~ '^-?[0-9]*\\.?[0-9]+$' THEN 0
              ELSE tai_trong::NUMERIC
            END as weight_capacity,
            don_vi_tinh as weight_unit,
            loai_hinh as ownership_type,
            tinh_trang as current_status,
            ngay_tao as created_at,
            nguoi_tao as created_by
          FROM phuong_tien
        `;

        const conditions = [];
        
        if (loaiHinh && loaiHinh !== 'all') {
          conditions.push(`LOWER(TRIM(loai_hinh)) = '${loaiHinh.toLowerCase()}'`);
        }

        if (search) {
          const searchEscaped = search.replace(/'/g, "''");
          conditions.push(`(
            bien_kiem_soat ILIKE '%${searchEscaped}%' OR
            hieu_xe ILIKE '%${searchEscaped}%' OR
            loai_xe ILIKE '%${searchEscaped}%'
          )`);
        }

        if (conditions.length > 0) {
          const whereClause = ` WHERE ${conditions.join(' AND ')}`;
          countQuery += whereClause;
          dataQuery += whereClause;
        }

        dataQuery += ` ORDER BY ngay_tao DESC, bien_kiem_soat ASC LIMIT ${limit} OFFSET ${offset}`;

        // Get total count
        const countResult = await query(countQuery);
        const total = parseInt(countResult.rows[0]?.total || '0');

        // Get vehicles data
        const result = await query(dataQuery);

        console.log(`✓ Found ${result.rows.length} vehicles (total: ${total})`);
        
        return {
          vehicles: result.rows,
          total,
          count: result.rows.length
        };
      },
      [cacheKey],
      {
        revalidate: 60, // Cache for 60 seconds
        tags: ['vehicles'],
      }
    );

    const data = await getCachedData();

    return NextResponse.json({
      success: true,
      ...data
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });

  } catch (error: any) {
    console.error('❌ Error fetching vehicles:', error.message);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch vehicles',
      message: error.message
    }, { status: 500 });
  }
}
