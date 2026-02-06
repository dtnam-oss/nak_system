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
    const cacheKey = `fuel-imports-${limit}-${offset}`;

    const getCachedData = unstable_cache(
      async () => {
        console.log(`📊 Fetching fuel imports (limit: ${limit}, offset: ${offset})`);

        const result = await sql`
          SELECT 
            id,
            ngay_nhap as import_date,
            nha_cung_cap as supplier,
            ten_nhien_lieu as fuel_type,
            CASE
              WHEN so_luong::TEXT IS NULL OR so_luong::TEXT = '' THEN 0
              WHEN so_luong::TEXT !~ '^-?[0-9]*\.?[0-9]+$' THEN 0
              ELSE so_luong::NUMERIC
            END as quantity,
            CASE
              WHEN don_gia_nhap::TEXT IS NULL OR don_gia_nhap::TEXT = '' THEN 0
              WHEN don_gia_nhap::TEXT !~ '^-?[0-9]*\.?[0-9]+$' THEN 0
              ELSE don_gia_nhap::NUMERIC
            END as unit_price,
            CASE
              WHEN thanh_tien::TEXT IS NULL OR thanh_tien::TEXT = '' THEN 0
              WHEN thanh_tien::TEXT !~ '^-?[0-9]*\.?[0-9]+$' THEN 0
              ELSE thanh_tien::NUMERIC
            END as total_amount,
            CASE
              WHEN don_gia_xuat_binh_quan::TEXT IS NULL OR don_gia_xuat_binh_quan::TEXT = '' THEN 0
              WHEN don_gia_xuat_binh_quan::TEXT !~ '^-?[0-9]*\.?[0-9]+$' THEN 0
              ELSE don_gia_xuat_binh_quan::NUMERIC
            END as avg_price,
            nguoi_tao as created_by,
            thoi_gian_tao as created_at
          FROM public.nhap_nhien_lieu
          ORDER BY ngay_nhap DESC
          LIMIT ${limit}
          OFFSET ${offset}
        `;

        console.log(`✓ Found ${result.rows.length} fuel imports`);
        return result.rows;
      },
      [cacheKey],
      {
        revalidate: 30, // Cache for 30 seconds
        tags: ['fuel-imports'],
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
    console.error('❌ Error fetching fuel imports:', error.message);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch fuel imports',
      message: error.message
    }, { status: 500 });
  }
}
