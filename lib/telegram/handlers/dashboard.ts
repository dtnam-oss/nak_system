/**
 * =============================================================================
 * TELEGRAM CHATBOT - DASHBOARD HANDLERS
 * =============================================================================
 *
 * Query handlers for dashboard statistics and analytics
 */

import { sql } from '@vercel/postgres';
import { BotContext, DashboardStats, TopRoute, TopDriver } from '../types';
import {
  formatCurrency,
  formatDistance,
  formatNumber,
  formatDate,
  getCurrentDate,
  getCurrentMonth,
  formatError
} from '../formatters';
import { getDashboardMenuKeyboard, getRefreshBackKeyboard } from '../keyboards';

// =============================================================================
// DASHBOARD MENU
// =============================================================================

export async function handleDashboardMenu(ctx: BotContext) {
  try {
    await ctx.answerCbQuery();

    await ctx.editMessageText(
      '📊 **DASHBOARD**\n\n' + 'Chọn loại thống kê bạn muốn xem:',
      {
        parse_mode: 'Markdown',
        ...getDashboardMenuKeyboard()
      }
    );
  } catch (error) {
    console.error('[DASHBOARD_MENU] Error:', error);
    try {
      await ctx.answerCbQuery('❌ Lỗi khi tải menu');
    } catch (e) {
      console.error('[DASHBOARD_MENU] Failed to answer callback:', e);
    }
  }
}

// =============================================================================
// TODAY STATISTICS
// =============================================================================

export async function handleDashboardToday(ctx: BotContext) {
  try {
    await ctx.answerCbQuery('⏳ Đang tải dữ liệu...');

    const today = getCurrentDate();

    const result = await sql`
      SELECT
        COUNT(*) as "totalTrips",
        COALESCE(SUM(revenue), 0) as "totalRevenue",
        COALESCE(SUM(total_distance), 0) as "totalDistance",
        COUNT(DISTINCT driver_name) as "totalDrivers"
      FROM reconciliation_orders
      WHERE date = ${today}
    `;

    const stats = result.rows[0] as DashboardStats;

    const message =
      `📊 **DASHBOARD - HÔM NAY**\n` +
      `📅 Ngày: ${formatDate(new Date())}\n\n` +
      `🚚 **Tổng chuyến:** ${formatNumber(stats.totalTrips)}\n` +
      `💰 **Doanh thu:** ${formatCurrency(stats.totalRevenue)}\n` +
      `📏 **Quãng đường:** ${formatDistance(stats.totalDistance)}\n` +
      `👥 **Tài xế:** ${formatNumber(stats.totalDrivers)} người\n\n` +
      `🕐 Cập nhật: ${new Date().toLocaleTimeString('vi-VN')}`;

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      ...getRefreshBackKeyboard('dashboard_today', 'menu_dashboard')
    });
  } catch (error) {
    console.error('[DASHBOARD_TODAY] Error:', error);
    await ctx.editMessageText(formatError('Không thể tải dữ liệu hôm nay'), {
      parse_mode: 'Markdown',
      ...getRefreshBackKeyboard('dashboard_today', 'menu_dashboard')
    });
  }
}

// =============================================================================
// MONTH STATISTICS
// =============================================================================

export async function handleDashboardMonth(ctx: BotContext) {
  try {
    await ctx.answerCbQuery('⏳ Đang tải dữ liệu...');

    const { startDate, endDate } = getCurrentMonth();

    const result = await sql`
      SELECT
        COUNT(*) as "totalTrips",
        COALESCE(SUM(revenue), 0) as "totalRevenue",
        COALESCE(SUM(total_distance), 0) as "totalDistance",
        COUNT(DISTINCT driver_name) as "totalDrivers"
      FROM reconciliation_orders
      WHERE date >= ${startDate}
        AND date <= ${endDate}
    `;

    const stats = result.rows[0] as DashboardStats;

    const avgRevenuePerTrip =
      stats.totalTrips > 0 ? stats.totalRevenue / stats.totalTrips : 0;

    const message =
      `📊 **DASHBOARD - THÁNG NÀY**\n` +
      `📅 Từ ${formatDate(startDate)} đến ${formatDate(endDate)}\n\n` +
      `🚚 **Tổng chuyến:** ${formatNumber(stats.totalTrips)}\n` +
      `💰 **Doanh thu:** ${formatCurrency(stats.totalRevenue)}\n` +
      `📏 **Quãng đường:** ${formatDistance(stats.totalDistance)}\n` +
      `👥 **Tài xế:** ${formatNumber(stats.totalDrivers)} người\n\n` +
      `📊 **Trung bình/chuyến:** ${formatCurrency(avgRevenuePerTrip)}\n\n` +
      `🕐 Cập nhật: ${new Date().toLocaleTimeString('vi-VN')}`;

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      ...getRefreshBackKeyboard('dashboard_month', 'menu_dashboard')
    });
  } catch (error) {
    console.error('[DASHBOARD_MONTH] Error:', error);
    await ctx.editMessageText(formatError('Không thể tải dữ liệu tháng này'), {
      parse_mode: 'Markdown',
      ...getRefreshBackKeyboard('dashboard_month', 'menu_dashboard')
    });
  }
}

// =============================================================================
// TOP ROUTES
// =============================================================================

export async function handleDashboardTopRoutes(ctx: BotContext) {
  try {
    await ctx.answerCbQuery('⏳ Đang tải top tuyến...');

    const { startDate, endDate } = getCurrentMonth();

    const result = await sql`
      SELECT
        route_name as "tenTuyen",
        COUNT(*) as "totalTrips",
        COALESCE(SUM(revenue), 0) as "totalRevenue",
        COALESCE(SUM(total_distance), 0) as "totalDistance"
      FROM reconciliation_orders
      WHERE date >= ${startDate}
        AND date <= ${endDate}
        AND route_name IS NOT NULL
        AND route_name != ''
      GROUP BY route_name
      ORDER BY "totalRevenue" DESC
      LIMIT 10
    `;

    const routes = result.rows as TopRoute[];

    if (routes.length === 0) {
      await ctx.editMessageText(
        '📊 **TOP TUYẾN ĐƯỜNG**\n\n' + 'Chưa có dữ liệu trong tháng này.',
        {
          parse_mode: 'Markdown',
          ...getRefreshBackKeyboard('dashboard_top_routes', 'menu_dashboard')
        }
      );
      return;
    }

    let message =
      `📊 **TOP 10 TUYẾN ĐƯỜNG**\n` +
      `📅 Tháng này (${formatDate(startDate)} - ${formatDate(endDate)})\n\n`;

    routes.forEach((route, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
      message +=
        `${medal} **${route.tenTuyen}**\n` +
        `   💰 ${formatCurrency(route.totalRevenue)}\n` +
        `   🚚 ${formatNumber(route.totalTrips)} chuyến\n` +
        `   📏 ${formatDistance(route.totalDistance)}\n\n`;
    });

    message += `🕐 Cập nhật: ${new Date().toLocaleTimeString('vi-VN')}`;

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      ...getRefreshBackKeyboard('dashboard_top_routes', 'menu_dashboard')
    });
  } catch (error) {
    console.error('[DASHBOARD_TOP_ROUTES] Error:', error);
    await ctx.editMessageText(formatError('Không thể tải top tuyến đường'), {
      parse_mode: 'Markdown',
      ...getRefreshBackKeyboard('dashboard_top_routes', 'menu_dashboard')
    });
  }
}

// =============================================================================
// TOP DRIVERS
// =============================================================================

export async function handleDashboardTopDrivers(ctx: BotContext) {
  try {
    await ctx.answerCbQuery('⏳ Đang tải top tài xế...');

    const { startDate, endDate } = getCurrentMonth();

    const result = await sql`
      SELECT
        driver_name as "tenTaiXe",
        COUNT(*) as "totalTrips",
        COALESCE(SUM(revenue), 0) as "totalRevenue",
        COALESCE(SUM(total_distance), 0) as "totalDistance"
      FROM reconciliation_orders
      WHERE date >= ${startDate}
        AND date <= ${endDate}
        AND driver_name IS NOT NULL
        AND driver_name != ''
      GROUP BY driver_name
      ORDER BY "totalTrips" DESC
      LIMIT 10
    `;

    const drivers = result.rows as TopDriver[];

    if (drivers.length === 0) {
      await ctx.editMessageText(
        '🚛 **TOP TÀI XẾ**\n\n' + 'Chưa có dữ liệu trong tháng này.',
        {
          parse_mode: 'Markdown',
          ...getRefreshBackKeyboard('dashboard_top_drivers', 'menu_dashboard')
        }
      );
      return;
    }

    let message =
      `🚛 **TOP 10 TÀI XẾ**\n` +
      `📅 Tháng này (${formatDate(startDate)} - ${formatDate(endDate)})\n\n`;

    drivers.forEach((driver, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
      const avgRevenuePerTrip = driver.totalRevenue / driver.totalTrips;

      message +=
        `${medal} **${driver.tenTaiXe}**\n` +
        `   🚚 ${formatNumber(driver.totalTrips)} chuyến\n` +
        `   💰 ${formatCurrency(driver.totalRevenue)}\n` +
        `   📏 ${formatDistance(driver.totalDistance)}\n` +
        `   📊 TB/chuyến: ${formatCurrency(avgRevenuePerTrip)}\n\n`;
    });

    message += `🕐 Cập nhật: ${new Date().toLocaleTimeString('vi-VN')}`;

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      ...getRefreshBackKeyboard('dashboard_top_drivers', 'menu_dashboard')
    });
  } catch (error) {
    console.error('[DASHBOARD_TOP_DRIVERS] Error:', error);
    await ctx.editMessageText(formatError('Không thể tải top tài xế'), {
      parse_mode: 'Markdown',
      ...getRefreshBackKeyboard('dashboard_top_drivers', 'menu_dashboard')
    });
  }
}

// =============================================================================
// REVENUE STATISTICS
// =============================================================================

export async function handleDashboardRevenue(ctx: BotContext) {
  try {
    await ctx.answerCbQuery('⏳ Đang tải thống kê doanh thu...');

    const { startDate, endDate } = getCurrentMonth();

    // Get revenue by date
    const result = await sql`
      SELECT
        date as "date",
        COUNT(*) as "trips",
        COALESCE(SUM(revenue), 0) as "revenue"
      FROM reconciliation_orders
      WHERE date >= ${startDate}
        AND date <= ${endDate}
      GROUP BY date
      ORDER BY date DESC
      LIMIT 7
    `;

    if (result.rows.length === 0) {
      await ctx.editMessageText(
        '💰 **DOANH THU**\n\n' + 'Chưa có dữ liệu trong tháng này.',
        {
          parse_mode: 'Markdown',
          ...getRefreshBackKeyboard('dashboard_revenue', 'menu_dashboard')
        }
      );
      return;
    }

    let message = `💰 **DOANH THU 7 NGÀY GẦN NHẤT**\n\n`;

    result.rows.forEach(row => {
      message +=
        `📅 ${formatDate(row.date)}\n` +
        `   💰 ${formatCurrency(row.revenue)}\n` +
        `   🚚 ${formatNumber(row.trips)} chuyến\n\n`;
    });

    message += `🕐 Cập nhật: ${new Date().toLocaleTimeString('vi-VN')}`;

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      ...getRefreshBackKeyboard('dashboard_revenue', 'menu_dashboard')
    });
  } catch (error) {
    console.error('[DASHBOARD_REVENUE] Error:', error);
    await ctx.editMessageText(formatError('Không thể tải thống kê doanh thu'), {
      parse_mode: 'Markdown',
      ...getRefreshBackKeyboard('dashboard_revenue', 'menu_dashboard')
    });
  }
}

// =============================================================================
// DISTANCE STATISTICS
// =============================================================================

export async function handleDashboardDistance(ctx: BotContext) {
  try {
    await ctx.answerCbQuery('⏳ Đang tải thống kê quãng đường...');

    const { startDate, endDate } = getCurrentMonth();

    const result = await sql`
      SELECT
        COUNT(*) as "totalTrips",
        COALESCE(SUM(total_distance), 0) as "totalDistance",
        COALESCE(AVG(total_distance), 0) as "avgDistance",
        COALESCE(MAX(total_distance), 0) as "maxDistance",
        COALESCE(MIN(total_distance), 0) as "minDistance"
      FROM reconciliation_orders
      WHERE date >= ${startDate}
        AND date <= ${endDate}
        AND total_distance > 0
    `;

    const stats = result.rows[0];

    const message =
      `📏 **THỐNG KÊ QUÃNG ĐƯỜNG**\n` +
      `📅 Tháng này\n\n` +
      `📊 **Tổng quãng đường:** ${formatDistance(stats.totalDistance)}\n` +
      `📏 **Trung bình/chuyến:** ${formatDistance(stats.avgDistance)}\n` +
      `🔝 **Cao nhất:** ${formatDistance(stats.maxDistance)}\n` +
      `🔻 **Thấp nhất:** ${formatDistance(stats.minDistance)}\n` +
      `🚚 **Tổng số chuyến:** ${formatNumber(stats.totalTrips)}\n\n` +
      `🕐 Cập nhật: ${new Date().toLocaleTimeString('vi-VN')}`;

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      ...getRefreshBackKeyboard('dashboard_distance', 'menu_dashboard')
    });
  } catch (error) {
    console.error('[DASHBOARD_DISTANCE] Error:', error);
    await ctx.editMessageText(formatError('Không thể tải thống kê quãng đường'), {
      parse_mode: 'Markdown',
      ...getRefreshBackKeyboard('dashboard_distance', 'menu_dashboard')
    });
  }
}
