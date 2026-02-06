import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';

// Remove force-dynamic to enable caching
// export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Create cache key based on query params
    const cacheKey = `fuel-transactions-${limit}-${offset}`;

    const getCachedData = unstable_cache(
      async () => {
        console.log(`📊 Fetching fuel transactions (limit: ${limit}, offset: ${offset})`);

        const result = await sql`
          SELECT 
            id,
            ngay_tao as transaction_date,
            loai_hinh as fuel_source,
            doi_tuong as object,
            bien_so_xe as license_plate,
            ten_tai_xe as driver_name,
            loai_nhien_lieu as fuel_type,
            CASE
              WHEN so_luong::TEXT IS NULL OR so_luong::TEXT = '' THEN 0
              WHEN so_luong::TEXT !~ '^-?[0-9]*\.?[0-9]+$' THEN 0
              ELSE so_luong::NUMERIC
            END as quantity,
            CASE
              WHEN don_gia::TEXT IS NULL OR don_gia::TEXT = '' THEN 0
              WHEN don_gia::TEXT !~ '^-?[0-9]*\.?[0-9]+$' THEN 0
              ELSE don_gia::NUMERIC
            END as unit_price,
            CASE
              WHEN thanh_tien::TEXT IS NULL OR thanh_tien::TEXT = '' THEN 0
              WHEN thanh_tien::TEXT !~ '^-?[0-9]*\.?[0-9]+$' THEN 0
              ELSE thanh_tien::NUMERIC
            END as total_amount,
            CASE
              WHEN so_odo::TEXT IS NULL OR so_odo::TEXT = '' THEN 0
              WHEN so_odo::TEXT !~ '^-?[0-9]*\.?[0-9]+$' THEN 0
              ELSE so_odo::NUMERIC
            END as odo_number,
            trang_thai as status,
            hang_muc as category,
            thoi_gian_tao as created_at,
            nguoi_tao as created_by
          FROM public.xuat_nhien_lieu
          ORDER BY ngay_tao DESC
          LIMIT ${limit}
          OFFSET ${offset}
        `;

        console.log(`✓ Found ${result.rows.length} fuel transactions`);
        return result.rows;
      },
      [cacheKey],
      {
        revalidate: 30, // Cache for 30 seconds
        tags: ['fuel-transactions'],
      }
    );

    const data = await getCachedData();

    return NextResponse.json({
      success: true,
      data: data,
      count: data.length
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    });

  } catch (error: any) {
    console.error('❌ Error fetching fuel transactions:', error.message);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch fuel transactions',
      message: error.message
    }, { status: 500 });
  }
}
