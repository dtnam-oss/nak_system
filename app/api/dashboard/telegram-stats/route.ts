
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        // Determine mode: 'morning' (Plan) or 'evening' (Result)
        // Default to 'evening' if after 12:00 PM, else 'morning'
        const now = new Date();
        const currentHour = now.getHours();
        const modeParam = req.nextUrl.searchParams.get('mode');

        // Logic: User can force mode, otherwise auto-detect
        const mode = modeParam && ['morning', 'evening'].includes(modeParam)
            ? modeParam as 'morning' | 'evening'
            : (currentHour < 12 ? 'morning' : 'evening');

        console.log(`📊 Fetching Dashboard Logic. Mode: ${mode}`);

        // Standardize Dates
        // For Dashboard, we always want TODAY's data for "Plan" and "Result".
        // Unlike Telegram which might report Yesterday's result in Morning, 
        // the Dashboard is "Realtime" or "Today's View".
        const todayStr = now.toISOString().split('T')[0];
        const yesterday = new Date(now.getTime() - 86400000);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        // Queries (Reused from telegram/cron/send-reports/route.ts)

        // 1. Core Analytics (Trips & Customers) for TODAY
        const analyticsQuery = await sql`
      SELECT 
        COUNT(*) as total_trips,
        COUNT(DISTINCT ten_khach_hang) as total_customers,
        COALESCE(SUM(CAST(doanh_thu AS NUMERIC)), 0) as total_revenue
      FROM chuyen_di
      WHERE ngay_tao = ${todayStr}
    `;

        // 2. Status Breakdown
        const statusQuery = await sql`
      SELECT trang_thai_chuyen_di as status, COUNT(*) as count
      FROM chuyen_di
      WHERE ngay_tao = ${todayStr}
      GROUP BY trang_thai_chuyen_di
    `;

        // 3. Partner Performance
        // provider: NAK or VENDOR
        const partnerQuery = await sql`
      SELECT 
        don_vi_van_chuyen as provider,
        ten_tai_xe as driver_name,
        trang_thai_chuyen_di as status,
        COUNT(*) as total_trips,
        COALESCE(SUM(CAST(doanh_thu AS NUMERIC)), 0) as revenue
      FROM chuyen_di
      WHERE ngay_tao = ${todayStr}
      GROUP BY don_vi_van_chuyen, ten_tai_xe, trang_thai_chuyen_di
    `;

        // 4. Customer Performance
        const customerQuery = await sql`
      SELECT 
        ten_khach_hang as customer,
        COUNT(*) as total_trips,
        COALESCE(SUM(CAST(doanh_thu AS NUMERIC)), 0) as revenue
      FROM chuyen_di
      WHERE ngay_tao = ${todayStr}
      GROUP BY ten_khach_hang
      ORDER BY revenue DESC
      LIMIT 5
    `;

        // Process Data
        const totalTrips = parseInt(analyticsQuery.rows[0]?.total_trips || '0');
        const totalRevenue = parseFloat(analyticsQuery.rows[0]?.total_revenue || '0');

        // Status Logic
        const statusBreakdown: Record<string, number> = {};
        statusQuery.rows.forEach((row: any) => {
            const s = row.status?.toLowerCase() || 'unknown';
            statusBreakdown[s] = parseInt(row.count);
        });

        const processed = (statusBreakdown['completed'] || 0) + (statusBreakdown['done'] || 0);
        const pending = (statusBreakdown['pending'] || 0) + (statusBreakdown['new'] || 0) + (statusBreakdown['chờ duyệt'] || 0);
        const processingRate = totalTrips > 0 ? (processed / totalTrips) * 100 : 0;

        // Partner Logic
        const nakTrips = partnerQuery.rows
            .filter(r => (r.provider || '').toUpperCase() === 'NAK')
            .reduce((acc, r) => acc + parseInt(r.total_trips), 0);

        const vendorTrips = partnerQuery.rows
            .filter(r => (r.provider || '').toUpperCase() !== 'NAK')
            .reduce((acc, r) => acc + parseInt(r.total_trips), 0);

        // Top Partners (Group by driver_name)
        const partnerMap = new Map<string, { name: string, trips: number, revenue: number }>();
        partnerQuery.rows.forEach(r => {
            const name = r.driver_name || 'Unknown';
            const current = partnerMap.get(name) || { name, trips: 0, revenue: 0 };
            current.trips += parseInt(r.total_trips);
            current.revenue += parseFloat(r.revenue);
            partnerMap.set(name, current);
        });
        const topPartners = Array.from(partnerMap.values())
            .sort((a, b) => b.trips - a.trips)
            .slice(0, 5);

        // Response Structure matching Dashboard needs
        const data = {
            mode,
            meta: {
                date: todayStr,
                updatedAt: new Date().toISOString()
            },
            processing: {
                totalTrips,
                totalRevenue,
                processed,
                pending,
                processingRate,
                breakdown: statusBreakdown
            },
            partners: {
                nakTrips,
                vendorTrips,
                distribution: {
                    nak: totalTrips > 0 ? (nakTrips / totalTrips) * 100 : 0,
                    vendor: totalTrips > 0 ? (vendorTrips / totalTrips) * 100 : 0
                },
                topPartners
            },
            customers: {
                topList: customerQuery.rows.map(r => ({
                    name: r.customer,
                    trips: parseInt(r.total_trips),
                    revenue: parseFloat(r.revenue)
                }))
            }
        };

        return NextResponse.json(data);

    } catch (error) {
        console.error('❌ Dashboard Telegram-Stats Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch dashboard stats' },
            { status: 500 }
        );
    }
}
