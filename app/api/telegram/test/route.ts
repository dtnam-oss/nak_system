import { NextResponse } from 'next/server';

/**
 * Simple test endpoint to verify routing works
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Telegram test endpoint working',
    timestamp: new Date().toISOString(),
  });
}

export async function POST() {
  return NextResponse.json({
    status: 'ok',
    message: 'POST received',
    timestamp: new Date().toISOString(),
  });
}
