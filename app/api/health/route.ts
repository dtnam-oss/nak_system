import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(req: NextRequest) {
    try {
        const startTime = Date.now();
        
        // Test database connection
        const result = await sql`SELECT NOW() as current_time, version() as pg_version`;
        
        const responseTime = Date.now() - startTime;
        
        return NextResponse.json({
            status: 'healthy',
            database: 'connected',
            timestamp: new Date().toISOString(),
            responseTime: `${responseTime}ms`,
            postgresql: {
                currentTime: result.rows[0].current_time,
                version: result.rows[0].pg_version.split(',')[0],
            },
            environment: process.env.NODE_ENV,
        });
    } catch (error) {
        console.error('[HEALTH_CHECK_ERROR]', error);
        
        return NextResponse.json({
            status: 'unhealthy',
            database: 'disconnected',
            timestamp: new Date().toISOString(),
            error: error instanceof Error ? error.message : 'Unknown error',
            environment: process.env.NODE_ENV,
        }, { status: 500 });
    }
}
