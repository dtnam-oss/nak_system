import { NextRequest, NextResponse } from 'next/server';
import { telegramBot } from '@/lib/telegram-old/services/telegram-bot';
import { TELEGRAM_TOPICS } from '@/lib/telegram-old/config/topics';
import { sql } from '@/lib/db';

// Force Node.js runtime (telegraf doesn't work in Edge runtime)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import {
  formatMorningKetQuaXuLy,
  formatEveningKetQuaXuLy,
  formatMorningDoiTac,
  formatEveningDoiTac,
  formatMorningKhachHang,
  formatEveningKhachHang,
} from '@/lib/telegram-old/formatters/report-formatter';

/**
 * Cron endpoint to send scheduled reports
 * Call this from:
 * - Vercel Cron Jobs
 * - External cron service (cron-job.org, etc.)
 * - GitHub Actions
 *
 * Query params:
 * - type: 'morning' | 'evening'
 * - secret: Your secret token for authentication
 */
export async function GET(req: NextRequest) {
  try {
    // Authentication
    const secret = req.nextUrl.searchParams.get('secret');
    const expectedSecret = process.env.CRON_SECRET || 'your-secret-token';

    if (secret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get report type
    const reportType = req.nextUrl.searchParams.get('type') as 'morning' | 'evening';

    if (!reportType || !['morning', 'evening'].includes(reportType)) {
      return NextResponse.json(
        { error: 'Invalid report type. Use "morning" or "evening"' },
        { status: 400 }
      );
    }

    console.log(`📊 Sending ${reportType} reports...`);

    // Fetch data for reports
    const data = await fetchReportData(reportType);
    
    // Debug log
    console.log('📈 Fetched data summary:', {
      reportDate: data.reportDate,
      totalTrips: data.trips.totalTrips,
      customers: data.customers.totalCustomers,
      topCustomersCount: data.customers.topCustomers.length,
      topPartnersCount: data.partners.topPartners.length,
    });

    // Send reports to each topic
    const results = await sendReports(reportType, data);

    return NextResponse.json({
      success: true,
      reportType,
      timestamp: new Date().toISOString(),
      results,
    });
  } catch (error) {
    console.error('❌ Error sending scheduled reports:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Fetch data for all reports
 * @param reportType - 'morning' for yesterday data, 'evening' for today data
 */
async function fetchReportData(reportType: 'morning' | 'evening') {
  try {
    // Determine base URL
    const baseUrl = process.env.NEXT_PUBLIC_API_URL 
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
    
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const yesterday = new Date(today.getTime() - 86400000);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const twoDaysAgo = new Date(today.getTime() - 2 * 86400000);
    const twoDaysAgoStr = twoDaysAgo.toISOString().split('T')[0];
    
    // Determine report date based on type
    // Morning report: yesterday's data
    // Evening report: today's data
    const reportDate = reportType === 'morning' ? yesterdayStr : todayStr;
    const comparisonDate = reportType === 'morning' ? twoDaysAgoStr : yesterdayStr;
    
    // Calculate dates for comparisons
    const lastWeek = new Date(today.getTime() - 7 * 86400000);
    const lastWeekStr = lastWeek.toISOString().split('T')[0];
    const lastMonth = new Date(today.getTime() - 30 * 86400000);
    const lastMonthStr = lastMonth.toISOString().split('T')[0];

    console.log('📅 Date range:', { 
      reportType,
      reportDate,
      comparisonDate,
      lastWeekStr,
      lastMonthStr,
      todayStr, 
      yesterdayStr 
    });

    // Fetch dashboard stats (keep HTTP call - lightweight)
    const dashboardRes = await fetch(`${baseUrl}/api/dashboard/stats`, {
      cache: 'no-store',
    });
    const dashboard = await dashboardRes.json();

    // Fetch fuel data (keep HTTP call - lightweight)
    const fuelRes = await fetch(`${baseUrl}/api/fuel/inventory/fifo`, {
      cache: 'no-store',
    });
    const fuel = await fuelRes.json();

    // Direct DB query for trips analytics (avoid env issue with HTTP)
    // Query for the report date only
    const analyticsQuery = await sql`
      SELECT 
        COUNT(*) as total_trips,
        COUNT(DISTINCT customer) as total_customers
      FROM reconciliation_orders
      WHERE date = ${reportDate}
    `;
    
    // Query for comparison date (previous day)
    const comparisonQuery = await sql`
      SELECT 
        COUNT(*) as total_trips,
        COUNT(DISTINCT customer) as total_customers
      FROM reconciliation_orders
      WHERE date = ${comparisonDate}
    `;
    
    // Query for same day last week
    const lastWeekQuery = await sql`
      SELECT 
        COUNT(*) as total_trips,
        COUNT(DISTINCT customer) as total_customers
      FROM reconciliation_orders
      WHERE date = ${lastWeekStr}
    `;
    
    // Query for same day last month
    const lastMonthQuery = await sql`
      SELECT 
        COUNT(*) as total_trips,
        COUNT(DISTINCT customer) as total_customers
      FROM reconciliation_orders
      WHERE date = ${lastMonthStr}
    `;

    const statusQuery = await sql`
      SELECT status, COUNT(*) as count
      FROM reconciliation_orders
      WHERE date = ${reportDate}
      GROUP BY status
    `;

    const tripsQuery = await sql`
      SELECT 
        customer,
        provider,
        driver_name,
        revenue,
        status
      FROM reconciliation_orders
      WHERE date = ${reportDate}
      ORDER BY revenue DESC
    `;

    const customersQuery = await sql`
      SELECT DISTINCT customer
      FROM reconciliation_orders
      WHERE customer IS NOT NULL AND customer != ''
    `;

    console.log('📊 Analytics from DB:', JSON.stringify(analyticsQuery.rows[0], null, 2));

    // Process trips data
    const trips = tripsQuery.rows || [];
    const totalTrips = parseInt(analyticsQuery.rows[0]?.total_trips || '0');
    const totalCustomers = parseInt(analyticsQuery.rows[0]?.total_customers || '0');
    const comparisonTotal = parseInt(comparisonQuery.rows[0]?.total_trips || '0');
    const comparison = totalTrips - comparisonTotal;
    
    // Calculate comparisons for customers
    const comparisonCustomers = parseInt(comparisonQuery.rows[0]?.total_customers || '0');
    const lastWeekTrips = parseInt(lastWeekQuery.rows[0]?.total_trips || '0');
    const lastWeekCustomers = parseInt(lastWeekQuery.rows[0]?.total_customers || '0');
    const lastMonthTrips = parseInt(lastMonthQuery.rows[0]?.total_trips || '0');
    const lastMonthCustomers = parseInt(lastMonthQuery.rows[0]?.total_customers || '0');
    
    const customerComparisons = {
      vsYesterday: totalCustomers - comparisonCustomers,
      vsLastWeek: totalCustomers - lastWeekCustomers,
      vsLastMonth: totalCustomers - lastMonthCustomers,
    };
    
    const tripComparisons = {
      vsYesterday: totalTrips - comparisonTotal,
      vsLastWeek: totalTrips - lastWeekTrips,
      vsLastMonth: totalTrips - lastMonthTrips,
    };

    // Calculate status breakdown
    const statusBreakdown: Record<string, number> = {};
    statusQuery.rows.forEach((row: any) => {
      statusBreakdown[row.status || 'unknown'] = parseInt(row.count);
    });
    
    const processed = (statusBreakdown.completed || 0) + (statusBreakdown.done || 0);
    const processedPercent = totalTrips > 0 ? (processed / totalTrips) * 100 : 0;

    // Get detailed partner stats with status breakdown using driver_name
    // provider: NAK or VENDOR (who handles the transport)
    // driver_name: Actual partner/driver details
    const driverStats: Record<string, { total: number; inProgress: number; completed: number; provider: string; }> = {};
    trips.forEach((trip: any) => {
      const provider = trip.provider || 'NAK';
      const driverName = trip.driver_name || `Chưa gán | ${provider}`;
      const status = trip.status || 'unknown';
      
      if (!driverStats[driverName]) {
        driverStats[driverName] = { total: 0, inProgress: 0, completed: 0, provider };
      }
      
      driverStats[driverName].total += 1;
      
      // In-progress: not completed and not cancelled
      if (status !== 'completed' && status !== 'done' && status !== 'cancelled') {
        driverStats[driverName].inProgress += 1;
      }
      
      // Completed
      if (status === 'completed' || status === 'done') {
        driverStats[driverName].completed += 1;
      }
    });

    // Get all drivers/partners with details
    const allVendors = Object.entries(driverStats)
      .map(([name, stats]) => ({
        name,
        total: stats.total,
        inProgress: stats.inProgress,
        completed: stats.completed,
        provider: stats.provider,
        percentage: totalTrips > 0 ? Math.round((stats.total / totalTrips) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);
    
    // Top 3 partners by trip count
    const topPartners = allVendors.slice(0, 3);
    
    // Calculate NAK vs Vendor breakdown
    const nakTrips = trips.filter((t: any) => t.provider === 'NAK').length;
    const vendorTrips = trips.filter((t: any) => t.provider === 'VENDOR').length;

    // Get top customers by trip count and revenue
    const customerStats: Record<string, { trips: number; revenue: number }> = {};
    trips.forEach((trip: any) => {
      const customer = trip.customer || 'Unknown';
      if (!customerStats[customer]) {
        customerStats[customer] = { trips: 0, revenue: 0 };
      }
      customerStats[customer].trips += 1;
      customerStats[customer].revenue += parseFloat(trip.revenue || 0);
    });

    const topCustomers = Object.entries(customerStats)
      .map(([name, stats]) => ({
        name,
        trips: stats.trips,
        revenue: stats.revenue,
      }))
      .sort((a, b) => b.trips - a.trips)  // Sort by trips count, not revenue
      .slice(0, 5);

    const totalCustomersDistinct = customersQuery.rows.length;

    return {
      reportDate,
      dashboard,
      fuel,
      trips: {
        totalTrips,
        processed,
        processedPercent,
        byStatus: statusBreakdown,
        comparison,
        comparisons: tripComparisons,
      },
      partners: {
        topPartners,
        allVendors,
        nakTrips,
        vendorTrips,
      },
      customers: {
        totalCustomers: totalCustomersDistinct,
        topCustomers,
        comparisons: customerComparisons,
      },
    };
  } catch (error) {
    console.error('❌ Error fetching report data:', error);
    throw error;
  }
}

/**
 * Send reports to all topics
 */
async function sendReports(reportType: 'morning' | 'evening', data: any) {
  const results = [];

  try {
    // 1. Send to KẾT QUẢ XỬ LÝ topic
    const ketQuaMessage =
      reportType === 'morning'
        ? formatMorningKetQuaXuLy({
            plannedTrips: data.trips.totalTrips,
            nakTrips: data.partners.nakTrips || 0,
            vendorTrips: data.partners.vendorTrips || 0,
            fuel: {
              current: data.fuel.totalInventory || 0,
              percentage: ((data.fuel.totalInventory || 0) / 4000) * 100,
              estimatedConsumption: 520,
            },
            priorities: [], // No mock data - leave empty
          })
        : formatEveningKetQuaXuLy(data.trips);

    await telegramBot.sendToTopic(TELEGRAM_TOPICS.KET_QUA_XU_LY.id, ketQuaMessage, {
      parseMode: 'HTML',
      disableNotification: reportType === 'evening', // Silent for evening reports
    });

    results.push({ topic: 'KẾT QUẢ XỬ LÝ', status: 'sent' });

    // 2. Send to ĐỐI TÁC VẬN CHUYỂN topic (if configured)
    if (TELEGRAM_TOPICS.DOI_TAC_VAN_CHUYEN.id > 0) {
      const doiTacMessage =
        reportType === 'morning'
          ? formatMorningDoiTac({
              plannedTrips: data.trips.totalTrips,
              partners: data.partners.topPartners,
            })
          : formatEveningDoiTac({
              totalTrips: data.trips.totalTrips,
              processed: data.trips.processed,
              processedPercent: data.trips.processedPercent,
              byStatus: data.trips.byStatus,
              topPartners: data.partners.topPartners,
              allVendors: data.partners.allVendors,
              underperformers: [],
            });

      await telegramBot.sendToTopic(TELEGRAM_TOPICS.DOI_TAC_VAN_CHUYEN.id, doiTacMessage, {
        parseMode: 'HTML',
        disableNotification: reportType === 'evening',
      });

      results.push({ topic: 'ĐỐI TÁC VẬN CHUYỂN', status: 'sent' });
    }

    // 3. Send to KHÁCH HÀNG topic (if configured)
    if (TELEGRAM_TOPICS.KHACH_HANG.id > 0) {
      const khachHangMessage =
        reportType === 'morning'
          ? formatMorningKhachHang({
              plannedTrips: data.trips.totalTrips,
              activeCustomers: data.customers.totalCustomers,
              topCustomers: data.customers.topCustomers,
              specialRequests: [],
            })
          : formatEveningKhachHang({
              totalCustomers: data.customers.totalCustomers,
              totalTrips: data.trips.totalTrips,
              topCustomers: data.customers.topCustomers,
              comparisons: data.customers.comparisons,
            });

      await telegramBot.sendToTopic(TELEGRAM_TOPICS.KHACH_HANG.id, khachHangMessage, {
        parseMode: 'HTML',
        disableNotification: reportType === 'evening',
      });

      results.push({ topic: 'KHÁCH HÀNG', status: 'sent' });
    }

    console.log(`✅ All ${reportType} reports sent successfully`);
    return results;
  } catch (error) {
    console.error('❌ Error sending reports:', error);
    throw error;
  }
}
