import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Temporary endpoint to check nhan_vien table schema
export async function GET() {
  try {
    // Get column information from database
    const schemaResult = await sql`
      SELECT column_name, data_type, character_maximum_length, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'nhan_vien'
      ORDER BY ordinal_position
    `;

    // Also get a sample row to see actual data
    const sampleResult = await sql`
      SELECT * FROM nhan_vien LIMIT 1
    `;

    const sampleRow = sampleResult.rows[0] || {};
    const columnNames = Object.keys(sampleRow);

    return NextResponse.json({
      total_columns: schemaResult.rows.length,
      schema_info: schemaResult.rows,
      sample_column_names: columnNames,
      sample_row: sampleRow,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message,
      },
      { status: 500 }
    );
  }
}
