import { sql } from '@vercel/postgres';
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
        transaction_date,
        fuel_source,
        object,
        license_plate,
        driver_name,
        fuel_type,
        quantity,
        unit_price,
        total_amount,
        odo_number,
        status,
        category
      FROM fuel_transactions
      ORDER BY transaction_date DESC, updated_at DESC
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
