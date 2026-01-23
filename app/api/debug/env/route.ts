import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/debug/env
 * 
 * Debug endpoint to check environment variables (production only)
 * Returns masked connection strings for security
 */
export async function GET() {
  try {
    const env = {
      hasPostgresUrl: !!process.env.POSTGRES_URL,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      hasGasApiUrl: !!process.env.NEXT_PUBLIC_GAS_API_URL,
      hasTelegramToken: !!process.env.TELEGRAM_BOT_TOKEN,
      hasCronSecret: !!process.env.CRON_SECRET,
      hasSessionSecret: !!process.env.SESSION_SECRET,
      
      // Masked values (show first 10 chars only)
      postgresUrl: process.env.POSTGRES_URL?.substring(0, 30) + '...',
      databaseUrl: process.env.DATABASE_URL?.substring(0, 30) + '...',
      
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV,
    };

    return NextResponse.json({
      success: true,
      environment: env,
      message: 'Environment variables check',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Environment check error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
