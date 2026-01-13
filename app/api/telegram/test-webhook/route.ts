import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    console.log('[TEST_WEBHOOK] Received:', JSON.stringify(body));

    return NextResponse.json({
      ok: true,
      message: 'Test webhook received',
      update_id: body.update_id
    });
  } catch (error) {
    console.error('[TEST_WEBHOOK] Error:', error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Test webhook endpoint',
    timestamp: new Date().toISOString()
  });
}
