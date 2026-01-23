import { NextResponse } from 'next/server';
import { checkHealth } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/health/database
 * Check database connection health
 */
export async function GET() {
  try {
    const health = await checkHealth();

    if (!health.connected) {
      return NextResponse.json(
        {
          success: false,
          error: health.error || 'Database connection failed',
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      success: true,
      database: {
        connected: true,
        serverTime: health.serverTime,
        version: health.version,
        pool: health.poolStats,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
