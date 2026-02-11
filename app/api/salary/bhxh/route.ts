import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    if (!month || !year) {
      return NextResponse.json(
        { error: 'Month and year are required' },
        { status: 400 }
      );
    }

    const result = await query(
      `SELECT 
        id,
        ma_tai_xe,
        ten_tai_xe,
        email,
        hang_muc,
        so_tien,
        thang,
        nam
      FROM du_lieu_bhxh
      WHERE thang = $1 AND nam = $2
      ORDER BY ten_tai_xe ASC`,
      [parseInt(month), parseInt(year)]
    );

    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching BHXH data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch BHXH data', details: error.message },
      { status: 500 }
    );
  }
}
