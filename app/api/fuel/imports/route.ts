import { sql } from '@vercel/postgres';
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
        import_date,
        supplier,
        fuel_type,
        quantity,
        unit_price,
        total_amount,
        avg_price,
        created_by
      FROM fuel_imports
      ORDER BY import_date DESC, updated_at DESC
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
