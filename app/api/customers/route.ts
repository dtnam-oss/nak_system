import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/customers
 * Returns a list of unique customers from reconciliation_orders
 */
export async function GET() {
  try {
    const result = await sql`
      SELECT DISTINCT customer
      FROM reconciliation_orders
      WHERE customer IS NOT NULL AND customer != ''
      ORDER BY customer ASC
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
