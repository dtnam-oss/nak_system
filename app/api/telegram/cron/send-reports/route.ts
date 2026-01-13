import { NextRequest, NextResponse } from 'next/server';
import { telegramBot } from '../../services/telegram-bot';
import { TELEGRAM_TOPICS } from '../../config/topics';

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
} from '../../formatters/report-formatter';

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
    const data = await fetchReportData();

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
 */
async function fetchReportData() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

    // Fetch dashboard stats
    const dashboardRes = await fetch(`${baseUrl}/api/dashboard/stats`, {
      cache: 'no-store',
    });
    const dashboard = await dashboardRes.json();

    // Fetch fuel data
    const fuelRes = await fetch(`${baseUrl}/api/fuel/inventory/fifo`, {
      cache: 'no-store',
    });
    const fuel = await fuelRes.json();

    // TODO: Add more API calls for partner and customer data

    return {
      dashboard,
      fuel,
      // Mock data for now - replace with real API calls
      trips: {
        totalTrips: 174,
        processed: 0,
        processedPercent: 0,
        byStatus: {
          initializing: 0,
          new: 0,
          pending: 0,
          delivering: 0,
          completed: 78,
          done: 89,
          cancelled: 7,
        },
        comparison: 17, // vs yesterday
      },
      partners: {
        topPartners: [
          { name: 'Viettel Post', trips: 52, percentage: 30 },
          { name: 'GHN', trips: 45, percentage: 26 },
          { name: 'J&T Express', trips: 38, percentage: 22 },
        ],
      },
      customers: {
        totalCustomers: 32,
        topCustomers: [
          { name: 'Shopee Vietnam', trips: 45, revenue: 245000000 },
          { name: 'Lazada', trips: 38, revenue: 198000000 },
          { name: 'Tiki', trips: 32, revenue: 167000000 },
        ],
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
            nakVehicles: data.dashboard.vehicles?.active || 0,
            vendorVehicles: Math.floor((data.dashboard.vehicles?.total || 0) * 0.4),
            fuel: {
              current: data.fuel.totalInventory || 0,
              percentage: ((data.fuel.totalInventory || 0) / 4000) * 100,
              estimatedConsumption: 520,
            },
            priorities: [
              'Theo dõi chuyến đi ưu tiên của Shopee',
              'Kiểm tra tình trạng xe trước 7:00',
            ],
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
              newCustomers: 2,
              avgTripsPerCustomer: 5.4,
              completionRate: 95,
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
