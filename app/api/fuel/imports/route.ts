import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    console.log(`📊 Fetching fuel imports (limit: ${limit}, offset: ${offset})`);

    const result = await sql`
      SELECT 
        id,
        ngay_tao as import_date,
        nha_cung_cap as supplier,
        loai_nhien_lieu as fuel_type,
        CAST(so_luong AS NUMERIC) as quantity,
        CAST(don_gia AS NUMERIC) as unit_price,
        CAST(thanh_tien AS NUMERIC) as total_amount,
        CAST(don_gia_binh_quan AS NUMERIC) as avg_price,
        '' as created_by
      FROM public.nhap_nhien_lieu
      ORDER BY ngay_tao DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    console.log(`✓ Found ${result.rows.length} fuel imports`);

    return NextResponse.json({
      success: true,
      data: result.rows,
      count: result.rows.length
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
