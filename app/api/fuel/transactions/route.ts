import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    console.log(`📊 Fetching fuel transactions (limit: ${limit}, offset: ${offset})`);
    console.log('ENV POSTGRES_URL:', process.env.POSTGRES_URL);
    
    // Test simple query first
    const testResult = await query('SELECT COUNT(*) as count FROM public.xuat_nhien_lieu', []);
    console.log('Total rows in table:', testResult.rows[0].count);
    
    const result = await query(`
      SELECT 
        id,
        ngay_tao as transaction_date,
        loai_hinh as fuel_source,
        doi_tuong as object,
        bien_so_xe as license_plate,
        ten_tai_xe as driver_name,
        loai_nhien_lieu as fuel_type,
        REPLACE(COALESCE(so_luong::TEXT, '0'), ',', '.')::NUMERIC as quantity,
        REPLACE(COALESCE(don_gia::TEXT, '0'), ',', '.')::NUMERIC as unit_price,
        REPLACE(COALESCE(thanh_tien::TEXT, '0'), ',', '.')::NUMERIC as total_amount,
        REPLACE(COALESCE(so_odo::TEXT, '0'), ',', '.')::NUMERIC as odo_number,
        trang_thai as status,
        hang_muc as category,
        thoi_gian_tao as created_at,
        nguoi_tao as created_by
      FROM public.xuat_nhien_lieu
      WHERE id IS NOT NULL
      ORDER BY ngay_tao DESC NULLS LAST, thoi_gian_tao DESC NULLS LAST
      LIMIT $1
      OFFSET $2
    `, [limit, offset]);

    console.log(`✓ Found ${result.rows.length} fuel transactions`);
    if (result.rows.length > 0) {
      console.log('First row ID:', result.rows[0].id);
      console.log('First row date:', result.rows[0].transaction_date);
      console.log('First row fuel_source:', result.rows[0].fuel_source);
    }
    
    return NextResponse.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    }, {
      headers: {
        'Cache-Control': 'no-store',
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
