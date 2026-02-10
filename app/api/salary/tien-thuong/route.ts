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

    // Query du_lieu_thuong table
    const result = await query(
      `SELECT 
        id,
        ma_nhan_vien,
        ho_va_ten,
        email,
        hang_muc,
        tien_thuong,
        thang,
        nam
      FROM du_lieu_thuong
      WHERE thang = $1 AND nam = $2
      ORDER BY ho_va_ten ASC`,
      [parseInt(month), parseInt(year)]
    );

    // Calculate summary
    const total_tien_thuong = result.rows.reduce((sum, row) => {
      return sum + (parseFloat(row.tien_thuong) || 0);
    }, 0);

    return NextResponse.json({
      data: result.rows,
      summary: {
        total_records: result.rows.length,
        total_tien_thuong
      }
    });
  } catch (error: any) {
    console.error('Error fetching tien thuong data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tien thuong data', details: error.message },
      { status: 500 }
    );
  }
}
