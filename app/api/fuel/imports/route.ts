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
            REPLACE(COALESCE(so_luong::TEXT, '0'), ',', '.')::NUMERIC as quantity,
            REPLACE(COALESCE(don_gia_nhap::TEXT, '0'), ',', '.')::NUMERIC as unit_price,
            REPLACE(COALESCE(thanh_tien::TEXT, '0'), ',', '.')::NUMERIC as total_amount,
            REPLACE(COALESCE(don_gia_xuat_binh_quan::TEXT, '0'), ',', '.')::NUMERIC as avg_price,
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
