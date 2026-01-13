/**
 * =============================================================================
 * TELEGRAM CHATBOT - REPORTS HANDLERS
 * =============================================================================
 *
 * Query handlers for reports and Excel export
 */

import { sql } from '@vercel/postgres';
import { BotContext, AuthenticatedUser } from '../types';
import {
  formatCurrency,
  formatDistance,
  formatNumber,
  formatDate,
  formatError,
  getCurrentDate,
  getCurrentWeek,
  getCurrentMonth
} from '../formatters';
import { getReportsMenuKeyboard, getRefreshBackKeyboard, getCancelKeyboard } from '../keyboards';

// =============================================================================
// REPORTS MENU
// =============================================================================

export async function handleReportsMenu(ctx: BotContext) {
  try {
    const user = ctx.state?.user as AuthenticatedUser;

    await ctx.editMessageText(
      '📈 **BÁO CÁO & THỐNG KÊ**\n\n' + 'Chọn loại báo cáo bạn muốn xem:',
      {
        parse_mode: 'Markdown',
        ...getReportsMenuKeyboard(user?.permissions)
      }
    );
    await ctx.answerCbQuery();
  } catch (error) {
    console.error('[REPORTS_MENU] Error:', error);
    await ctx.answerCbQuery('❌ Lỗi khi tải menu');
  }
}

// =============================================================================
// TODAY REPORT
// =============================================================================

export async function handleReportToday(ctx: BotContext) {
  try {
    await ctx.answerCbQuery('⏳ Đang tạo báo cáo...');

    const today = getCurrentDate();

    // Trip statistics
    const tripStats = await sql`
      SELECT
        COUNT(*) as "totalTrips",
        COALESCE(SUM(tong_doanh_thu), 0) as "totalRevenue",
        COALESCE(SUM(tong_quang_duong), 0) as "totalDistance",
        COUNT(DISTINCT ten_tai_xe) as "totalDrivers",
        COUNT(DISTINCT bien_kiem_soat) as "totalVehicles"
      FROM chuyen_di
      WHERE ngay_tao = ${today}
    `;

    // Top customer today
    const topCustomer = await sql`
      SELECT
        ten_khach_hang,
        COUNT(*) as trips,
        SUM(tong_doanh_thu) as revenue
      FROM chuyen_di
      WHERE ngay_tao = ${today}
        AND ten_khach_hang IS NOT NULL
      GROUP BY ten_khach_hang
      ORDER BY revenue DESC
      LIMIT 1
    `;

    // Top route today
    const topRoute = await sql`
      SELECT
        ten_tuyen,
        COUNT(*) as trips,
        SUM(tong_doanh_thu) as revenue
      FROM chuyen_di
      WHERE ngay_tao = ${today}
        AND ten_tuyen IS NOT NULL
      GROUP BY ten_tuyen
      ORDER BY revenue DESC
      LIMIT 1
    `;

    const stats = tripStats.rows[0];
    const avgRevenuePerTrip = stats.totalTrips > 0 ? stats.totalRevenue / stats.totalTrips : 0;

    let message =
      `📊 **BÁO CÁO HÔM NAY**\n` +
      `📅 ${formatDate(new Date())}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📈 **TỔNG QUAN**\n` +
      `🚚 Tổng chuyến: ${formatNumber(stats.totalTrips)}\n` +
      `💰 Doanh thu: ${formatCurrency(stats.totalRevenue)}\n` +
      `📏 Quãng đường: ${formatDistance(stats.totalDistance)}\n` +
      `👥 Tài xế: ${formatNumber(stats.totalDrivers)} người\n` +
      `🚛 Xe: ${formatNumber(stats.totalVehicles)} chiếc\n` +
      `📊 TB/chuyến: ${formatCurrency(avgRevenuePerTrip)}\n\n`;

    if (topCustomer.rows.length > 0) {
      const customer = topCustomer.rows[0];
      message +=
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `👑 **TOP KHÁCH HÀNG**\n` +
        `${customer.ten_khach_hang}\n` +
        `🚚 ${formatNumber(customer.trips)} chuyến\n` +
        `💰 ${formatCurrency(customer.revenue)}\n\n`;
    }

    if (topRoute.rows.length > 0) {
      const route = topRoute.rows[0];
      message +=
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `🛣️ **TOP TUYẾN ĐƯỜNG**\n` +
        `${route.ten_tuyen}\n` +
        `🚚 ${formatNumber(route.trips)} chuyến\n` +
        `💰 ${formatCurrency(route.revenue)}\n\n`;
    }

    message += `🕐 Tạo lúc: ${new Date().toLocaleTimeString('vi-VN')}`;

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      ...getRefreshBackKeyboard('report_today', 'menu_reports')
    });
  } catch (error) {
    console.error('[REPORT_TODAY] Error:', error);
    await ctx.editMessageText(formatError('Không thể tạo báo cáo'), {
      parse_mode: 'Markdown',
      ...getRefreshBackKeyboard('report_today', 'menu_reports')
    });
  }
}

// =============================================================================
// WEEK REPORT
// =============================================================================

export async function handleReportWeek(ctx: BotContext) {
  try {
    await ctx.answerCbQuery('⏳ Đang tạo báo cáo tuần...');

    const { startDate, endDate } = getCurrentWeek();

    const tripStats = await sql`
      SELECT
        COUNT(*) as "totalTrips",
        COALESCE(SUM(tong_doanh_thu), 0) as "totalRevenue",
        COALESCE(SUM(tong_quang_duong), 0) as "totalDistance",
        COUNT(DISTINCT ten_tai_xe) as "totalDrivers"
      FROM chuyen_di
      WHERE ngay_tao >= ${startDate}
        AND ngay_tao <= ${endDate}
    `;

    // Daily breakdown
    const dailyStats = await sql`
      SELECT
        ngay_tao as date,
        COUNT(*) as trips,
        SUM(tong_doanh_thu) as revenue
      FROM chuyen_di
      WHERE ngay_tao >= ${startDate}
        AND ngay_tao <= ${endDate}
      GROUP BY ngay_tao
      ORDER BY ngay_tao ASC
    `;

    const stats = tripStats.rows[0];

    let message =
      `📊 **BÁO CÁO TUẦN NÀY**\n` +
      `📅 ${formatDate(startDate)} - ${formatDate(endDate)}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📈 **TỔNG QUAN**\n` +
      `🚚 Tổng chuyến: ${formatNumber(stats.totalTrips)}\n` +
      `💰 Doanh thu: ${formatCurrency(stats.totalRevenue)}\n` +
      `📏 Quãng đường: ${formatDistance(stats.totalDistance)}\n` +
      `👥 Tài xế: ${formatNumber(stats.totalDrivers)} người\n\n`;

    if (dailyStats.rows.length > 0) {
      message += `━━━━━━━━━━━━━━━━━━━━\n📆 **THEO NGÀY**\n`;
      dailyStats.rows.forEach(day => {
        const dayName = new Date(day.date).toLocaleDateString('vi-VN', { weekday: 'short' });
        message +=
          `${dayName} ${formatDate(day.date)}: ` +
          `${formatNumber(day.trips)} chuyến | ${formatCurrency(day.revenue)}\n`;
      });
      message += '\n';
    }

    message += `🕐 Tạo lúc: ${new Date().toLocaleTimeString('vi-VN')}`;

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      ...getRefreshBackKeyboard('report_week', 'menu_reports')
    });
  } catch (error) {
    console.error('[REPORT_WEEK] Error:', error);
    await ctx.editMessageText(formatError('Không thể tạo báo cáo tuần'), {
      parse_mode: 'Markdown',
      ...getRefreshBackKeyboard('report_week', 'menu_reports')
    });
  }
}

// =============================================================================
// MONTH REPORT
// =============================================================================

export async function handleReportMonth(ctx: BotContext) {
  try {
    await ctx.answerCbQuery('⏳ Đang tạo báo cáo tháng...');

    const { startDate, endDate } = getCurrentMonth();

    const tripStats = await sql`
      SELECT
        COUNT(*) as "totalTrips",
        COALESCE(SUM(tong_doanh_thu), 0) as "totalRevenue",
        COALESCE(SUM(tong_quang_duong), 0) as "totalDistance",
        COUNT(DISTINCT ten_khach_hang) as "totalCustomers",
        COUNT(DISTINCT ten_tai_xe) as "totalDrivers"
      FROM chuyen_di
      WHERE ngay_tao >= ${startDate}
        AND ngay_tao <= ${endDate}
    `;

    // Top 3 customers
    const topCustomers = await sql`
      SELECT
        ten_khach_hang,
        COUNT(*) as trips,
        SUM(tong_doanh_thu) as revenue
      FROM chuyen_di
      WHERE ngay_tao >= ${startDate}
        AND ngay_tao <= ${endDate}
        AND ten_khach_hang IS NOT NULL
      GROUP BY ten_khach_hang
      ORDER BY revenue DESC
      LIMIT 3
    `;

    // Top 3 routes
    const topRoutes = await sql`
      SELECT
        ten_tuyen,
        COUNT(*) as trips,
        SUM(tong_doanh_thu) as revenue
      FROM chuyen_di
      WHERE ngay_tao >= ${startDate}
        AND ngay_tao <= ${endDate}
        AND ten_tuyen IS NOT NULL
      GROUP BY ten_tuyen
      ORDER BY revenue DESC
      LIMIT 3
    `;

    const stats = tripStats.rows[0];
    const avgRevenuePerTrip = stats.totalTrips > 0 ? stats.totalRevenue / stats.totalTrips : 0;

    let message =
      `📊 **BÁO CÁO THÁNG**\n` +
      `📅 ${formatDate(startDate)} - ${formatDate(endDate)}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📈 **TỔNG QUAN**\n` +
      `🚚 Tổng chuyến: ${formatNumber(stats.totalTrips)}\n` +
      `💰 Doanh thu: ${formatCurrency(stats.totalRevenue)}\n` +
      `📏 Quãng đường: ${formatDistance(stats.totalDistance)}\n` +
      `👥 Khách hàng: ${formatNumber(stats.totalCustomers)}\n` +
      `🚛 Tài xế: ${formatNumber(stats.totalDrivers)}\n` +
      `📊 TB/chuyến: ${formatCurrency(avgRevenuePerTrip)}\n\n`;

    if (topCustomers.rows.length > 0) {
      message += `━━━━━━━━━━━━━━━━━━━━\n👑 **TOP 3 KHÁCH HÀNG**\n`;
      topCustomers.rows.forEach((customer, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';
        message +=
          `${medal} ${customer.ten_khach_hang}\n` +
          `   ${formatNumber(customer.trips)} chuyến | ${formatCurrency(customer.revenue)}\n`;
      });
      message += '\n';
    }

    if (topRoutes.rows.length > 0) {
      message += `━━━━━━━━━━━━━━━━━━━━\n🛣️ **TOP 3 TUYẾN ĐƯỜNG**\n`;
      topRoutes.rows.forEach((route, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';
        message +=
          `${medal} ${route.ten_tuyen}\n` +
          `   ${formatNumber(route.trips)} chuyến | ${formatCurrency(route.revenue)}\n`;
      });
      message += '\n';
    }

    message += `🕐 Tạo lúc: ${new Date().toLocaleTimeString('vi-VN')}`;

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      ...getRefreshBackKeyboard('report_month', 'menu_reports')
    });
  } catch (error) {
    console.error('[REPORT_MONTH] Error:', error);
    await ctx.editMessageText(formatError('Không thể tạo báo cáo tháng'), {
      parse_mode: 'Markdown',
      ...getRefreshBackKeyboard('report_month', 'menu_reports')
    });
  }
}

// =============================================================================
// CUSTOM REPORT (Multi-step conversation)
// =============================================================================

export async function handleReportCustom(ctx: BotContext) {
  try {
    await ctx.editMessageText(
      '📅 **BÁO CÁO TÙY CHỈNH**\n\n' +
        'Nhập ngày bắt đầu (DD/MM/YYYY):\n' +
        'Ví dụ: `01/01/2025`',
      {
        parse_mode: 'Markdown',
        ...getCancelKeyboard('menu_reports')
      }
    );

    // Set conversation state
    if (!ctx.session) {
      ctx.session = {};
    }
    ctx.session.awaitingStartDate = true;

    await ctx.answerCbQuery();
  } catch (error) {
    console.error('[REPORT_CUSTOM] Error:', error);
    await ctx.answerCbQuery('❌ Lỗi');
  }
}

// =============================================================================
// EXPORT TO EXCEL
// =============================================================================

export async function handleReportExport(ctx: BotContext) {
  try {
    await ctx.answerCbQuery('⏳ Đang tạo file Excel...');

    await ctx.editMessageText(
      '📥 **EXPORT EXCEL**\n\n' +
        '⚠️ Tính năng này đang được phát triển.\n\n' +
        'Vui lòng liên hệ Admin để export dữ liệu.',
      {
        parse_mode: 'Markdown',
        ...getRefreshBackKeyboard('menu_reports', 'menu_reports')
      }
    );

    // TODO: Implement Excel export using exceljs
    // See TELEGRAM_CHATBOT_INLINE_KEYBOARD_DESIGN.md:569-609 for implementation guide

  } catch (error) {
    console.error('[REPORT_EXPORT] Error:', error);
    await ctx.editMessageText(formatError('Không thể tạo file Excel'), {
      parse_mode: 'Markdown',
      ...getRefreshBackKeyboard('menu_reports', 'menu_reports')
    });
  }
}
