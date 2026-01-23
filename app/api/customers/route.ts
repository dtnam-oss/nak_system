import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/customers
 * Returns a list of unique customers from chuyen_di table
 */
export async function GET() {
  try {
    const result = await sql`
      SELECT DISTINCT ten_khach_hang as customer
      FROM public.chuyen_di
      WHERE ten_khach_hang IS NOT NULL AND ten_khach_hang != ''
      ORDER BY ten_khach_hang ASC
    `;

    const customers = result.rows.map(row => row.customer);

    return NextResponse.json({
      success: true,
      data: customers,
      count: customers.length,
    });

  } catch (error: any) {
    console.error('[API] Error fetching customers:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch customers',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
