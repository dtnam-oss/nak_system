import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    console.log(`📊 Fetching fuel transactions (limit: ${limit}, offset: ${offset})`);

    const result = await sql`
      SELECT 
        id,
        ngay_xuat as transaction_date,
        loai_hinh as fuel_source,
        doi_tuong as object,
        bien_so_xe as license_plate,
        ten_lai_xe as driver_name,
        loai_nhien_lieu as fuel_type,
        CAST(so_luong AS NUMERIC) as quantity,
        CAST(don_gia AS NUMERIC) as unit_price,
        CAST(thanh_tien AS NUMERIC) as total_amount,
        so_odo as odo_number,
        trang_thai as status,
        phan_loai as category
      FROM public.xuat_nhien_lieu
      ORDER BY ngay_xuat DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    console.log(`✓ Found ${result.rows.length} fuel transactions`);

    return NextResponse.json({
      success: true,
      data: result.rows,
      count: result.rows.length
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
