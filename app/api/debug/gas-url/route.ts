import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Debug endpoint to check FULL GAS URL
 */
export async function GET() {
  return NextResponse.json({
    GAS_WEB_APP_URL: process.env.GAS_WEB_APP_URL || 'NOT SET',
    NEXT_PUBLIC_GAS_API_URL: process.env.NEXT_PUBLIC_GAS_API_URL || 'NOT SET',
    length_GAS_WEB_APP_URL: process.env.GAS_WEB_APP_URL?.length || 0,
    length_NEXT_PUBLIC_GAS_API_URL: process.env.NEXT_PUBLIC_GAS_API_URL?.length || 0,
    timestamp: new Date().toISOString()
  });
}
