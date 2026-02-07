import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const logs: string[] = [];

  try {
    logs.push('🔍 Testing database connection...');
    logs.push(`📍 POSTGRES_URL env var: ${process.env.POSTGRES_URL ? 'SET' : 'NOT SET'}`);
    logs.push(`📍 POSTGRES_URL value: ${process.env.POSTGRES_URL?.substring(0, 50)}...`);

    // Test 1: Simple query
    logs.push('\n📊 Test 1: SELECT NOW()');
    const timeResult = await query('SELECT NOW() as server_time', []);
    logs.push(`✅ Server time: ${timeResult.rows[0].server_time}`);

    // Test 2: Check user
    logs.push('\n📊 Test 2: Check current user');
    const userResult = await query('SELECT current_user, current_database()', []);
    logs.push(`✅ User: ${userResult.rows[0].current_user}`);
    logs.push(`✅ Database: ${userResult.rows[0].current_database}`);

    // Test 3: Count rows in xuat_nhien_lieu
    logs.push('\n📊 Test 3: Count xuat_nhien_lieu rows');
    const countResult = await query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE id IS NOT NULL) as valid_rows,
        COUNT(*) FILTER (WHERE id IS NULL) as null_rows
      FROM public.xuat_nhien_lieu
    `, []);
    logs.push(`✅ Total rows: ${countResult.rows[0].total}`);
    logs.push(`✅ Valid rows (id NOT NULL): ${countResult.rows[0].valid_rows}`);
    logs.push(`✅ Null rows (id IS NULL): ${countResult.rows[0].null_rows}`);

    // Test 4: Get sample data
    logs.push('\n📊 Test 4: Sample data');
    const sampleResult = await query(`
      SELECT id, ngay_tao, loai_hinh, ten_tai_xe
      FROM public.xuat_nhien_lieu
      WHERE id IS NOT NULL
      ORDER BY thoi_gian_tao DESC
      LIMIT 3
    `, []);
    logs.push(`✅ Sample rows retrieved: ${sampleResult.rows.length}`);

    return NextResponse.json({
      success: true,
      connected: true,
      logs: logs,
      tests: {
        server_time: timeResult.rows[0].server_time,
        current_user: userResult.rows[0].current_user,
        current_database: userResult.rows[0].current_database,
        total_rows: countResult.rows[0].total,
        valid_rows: countResult.rows[0].valid_rows,
        null_rows: countResult.rows[0].null_rows,
        sample_data: sampleResult.rows,
      },
    });

  } catch (error: any) {
    logs.push(`\n❌ ERROR: ${error.message}`);
    logs.push(`Stack: ${error.stack}`);

    return NextResponse.json({
      success: false,
      connected: false,
      error: error.message,
      errorCode: error.code,
      errorStack: error.stack,
      logs: logs,
    }, { status: 500 });
  }
}
