/**
 * =============================================================================
 * TELEGRAM CHATBOT - TRIPS HANDLERS
 * =============================================================================
 *
 * Query handlers for trip management and search
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
  truncate
} from '../formatters';
import {
  getTripsMenuKeyboard,
  getRefreshBackKeyboard,
  getCancelKeyboard
} from '../keyboards';

// =============================================================================
// TRIPS MENU
// =============================================================================

export async function handleTripsMenu(ctx: BotContext) {
  try {
    await ctx.answerCbQuery();

    const user = ctx.state?.user as AuthenticatedUser;

    await ctx.editMessageText(
      '🚚 **QUẢN LÝ CHUYẾN ĐI**\n\n' + 'Chọn chức năng bạn muốn sử dụng:',
      {
        parse_mode: 'Markdown',
        ...getTripsMenuKeyboard(user?.permissions)
      }
    );
  } catch (error) {
    console.error('[TRIPS_MENU] Error:', error);
    try {
      await ctx.answerCbQuery('❌ Lỗi khi tải menu');
    } catch (e) {
      console.error('[TRIPS_MENU] Failed to answer callback:', e);
    }
  }
}

// =============================================================================
// SEARCH TRIP
// =============================================================================

export async function handleTripsSearch(ctx: BotContext) {
  try {
    await ctx.answerCbQuery();

    await ctx.editMessageText(
      '🔍 **TRA CỨU CHUYẾN ĐI**\n\n' +
        'Nhập mã chuyến đi để tra cứu:\n' +
        'Ví dụ: `NAK2025010001`\n\n' +
        '💡 Sử dụng lệnh: `/search <mã_chuyến>`',
      {
        parse_mode: 'Markdown',
        ...getCancelKeyboard('menu_trips')
      }
    );
  } catch (error) {
    console.error('[TRIPS_SEARCH] Error:', error);
    try {
      await ctx.answerCbQuery('❌ Lỗi');
    } catch (e) {
      console.error('[TRIPS_SEARCH] Failed to answer callback:', e);
    }
  }
}

// =============================================================================
// SEARCH TRIP COMMAND
// =============================================================================

export async function handleSearchCommand(ctx: BotContext) {
  // Type guard: ensure message exists and has text
  if (!ctx.message || !('text' in ctx.message)) {
    await ctx.reply('❌ Lỗi: Không thể đọc tin nhắn.');
    return;
  }

  const args = ctx.message.text.split(' ').slice(1);

  if (args.length === 0) {
    await ctx.reply(
      '❌ Vui lòng nhập mã chuyến đi.\n\n' + 'Ví dụ: `/search NAK2025010001`',
      { parse_mode: 'Markdown' }
    );
    return;
  }

  const tripId = args[0].trim();

  try {
    const result = await sql`
      SELECT
        cd.ma_chuyen_di as "maChuyenDi",
        cd.ngay_tao as "ngayTao",
        cd.ten_khach_hang as "tenKhachHang",
        cd.ten_tuyen as "tenTuyen",
        cd.ten_tai_xe as "tenTaiXe",
        (
          SELECT bien_kiem_soat 
          FROM chi_tiet_chuyen_di 
          WHERE ma_chuyen_di = cd.ma_chuyen_di 
          LIMIT 1
        ) as "bienKiemSoat",
        CAST(cd.doanh_thu AS NUMERIC) as "tongDoanhThu",
        cd.so_km_theo_odo as "tongQuangDuong"
      FROM chuyen_di cd
      WHERE cd.ma_chuyen_di = ${tripId}
      LIMIT 1
    `;

    if (result.rows.length === 0) {
      await ctx.reply(`❌ Không tìm thấy chuyến đi: \`${tripId}\``, {
        parse_mode: 'Markdown'
      });
      return;
    }

    const trip = result.rows[0];

    // Build simplified message
    let message =
      `🚚 **THÔNG TIN CHUYẾN ĐI**\n\n` +
      `📋 **Mã:** \`${trip.maChuyenDi}\`\n` +
      `📅 **Ngày:** ${formatDate(trip.ngayTao)}\n` +
      `👤 **Khách hàng:** ${trip.tenKhachHang || 'N/A'}\n` +
      `🛣️ **Tuyến:** ${trip.tenTuyen || 'N/A'}\n` +
      `🚛 **Tài xế:** ${trip.tenTaiXe || 'N/A'}\n` +
      `🚗 **Biển số:** ${trip.bienKiemSoat || 'N/A'}\n` +
      `💰 **Doanh thu:** ${formatCurrency(trip.tongDoanhThu)}\n` +
      `📏 **Quãng đường:** ${formatDistance(trip.tongQuangDuong)}`;

    await ctx.reply(message, {
      parse_mode: 'Markdown'
    });
  } catch (error) {
    console.error('[SEARCH_COMMAND] Error:', error);
    await ctx.reply(formatError('Không thể tra cứu chuyến đi'), {
      parse_mode: 'Markdown'
    });
  }
}

// =============================================================================
// TODAY'S TRIPS
// =============================================================================

export async function handleTripsToday(ctx: BotContext) {
  try {
    await ctx.answerCbQuery('⏳ Đang tải chuyến đi hôm nay...');

    const today = getCurrentDate();

    const result = await sql`
      SELECT
        cd.ma_chuyen_di as "maChuyenDi",
        cd.ten_khach_hang as "tenKhachHang",
        cd.ten_tuyen as "tenTuyen",
        cd.ten_tai_xe as "tenTaiXe",
        (
          SELECT bien_kiem_soat 
          FROM chi_tiet_chuyen_di 
          WHERE ma_chuyen_di = cd.ma_chuyen_di 
          LIMIT 1
        ) as "bienKiemSoat",
        CAST(cd.doanh_thu AS NUMERIC) as "tongDoanhThu",
        cd.so_km_theo_odo as "tongQuangDuong"
      FROM chuyen_di cd
      WHERE cd.ngay_tao::date = ${today}::date
      ORDER BY cd.ma_chuyen_di DESC
      LIMIT 10
    `;

    if (result.rows.length === 0) {
      await ctx.editMessageText(
        '📋 **CHUYẾN ĐI HÔM NAY**\n\n' + 'Chưa có chuyến đi nào trong hôm nay.',
        {
          parse_mode: 'Markdown',
          ...getRefreshBackKeyboard('trips_today', 'menu_trips')
        }
      );
      return;
    }

    let message =
      `📋 **CHUYẾN ĐI HÔM NAY**\n` + `📅 ${formatDate(new Date())}\n\n`;

    result.rows.forEach((trip, index) => {
      message +=
        `${index + 1}. **${trip.maChuyenDi}**\n` +
        `   👤 ${trip.tenKhachHang || 'N/A'}\n` +
        `   🛣️ ${truncate(trip.tenTuyen || 'N/A', 40)}\n` +
        `   🚛 ${trip.tenTaiXe || 'N/A'} (${trip.bienKiemSoat || 'N/A'})\n` +
        `   💰 ${formatCurrency(trip.tongDoanhThu)}\n` +
        `   📏 ${formatDistance(trip.tongQuangDuong)}\n\n`;
    });

    message +=
      `📊 Tổng: ${result.rows.length} chuyến\n` +
      `💡 Dùng /search <mã> để xem chi tiết`;

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      ...getRefreshBackKeyboard('trips_today', 'menu_trips')
    });
  } catch (error) {
    console.error('[TRIPS_TODAY] Error:', error);
    await ctx.editMessageText(formatError('Không thể tải danh sách chuyến đi'), {
      parse_mode: 'Markdown',
      ...getRefreshBackKeyboard('trips_today', 'menu_trips')
    });
  }
}

// =============================================================================
// TRIPS BY CUSTOMER
// =============================================================================

export async function handleTripsByCustomer(ctx: BotContext) {
  try {
    await ctx.answerCbQuery('⏳ Đang tải khách hàng...');

    // Get top 10 customers by trip count
    const result = await sql`
      SELECT
        ten_khach_hang as "tenKhachHang",
        COUNT(*) as "totalTrips",
        COALESCE(SUM(
          CASE
            WHEN doanh_thu::TEXT IS NULL OR doanh_thu::TEXT = '' THEN 0
            WHEN doanh_thu::TEXT !~ '^-?[0-9]*\.?[0-9]+$' THEN 0
            ELSE doanh_thu::NUMERIC
          END
        ), 0) as "totalRevenue"
      FROM chuyen_di
      WHERE ten_khach_hang IS NOT NULL
        AND ten_khach_hang != ''
      GROUP BY ten_khach_hang
      ORDER BY "totalTrips" DESC
      LIMIT 10
    `;

    if (result.rows.length === 0) {
      await ctx.editMessageText('📊 **CHUYẾN ĐI THEO KHÁCH HÀNG**\n\n' + 'Chưa có dữ liệu.', {
        parse_mode: 'Markdown',
        ...getRefreshBackKeyboard('trips_by_customer', 'menu_trips')
      });
      return;
    }

    let message = `📊 **TOP 10 KHÁCH HÀNG**\n\n`;

    result.rows.forEach((customer, index) => {
      message +=
        `${index + 1}. **${customer.tenKhachHang}**\n` +
        `   🚚 ${formatNumber(customer.totalTrips)} chuyến\n` +
        `   💰 ${formatCurrency(customer.totalRevenue)}\n\n`;
    });

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      ...getRefreshBackKeyboard('trips_by_customer', 'menu_trips')
    });
  } catch (error) {
    console.error('[TRIPS_BY_CUSTOMER] Error:', error);
    await ctx.editMessageText(formatError('Không thể tải danh sách khách hàng'), {
      parse_mode: 'Markdown',
      ...getRefreshBackKeyboard('trips_by_customer', 'menu_trips')
    });
  }
}

// =============================================================================
// TRIPS BY VEHICLE
// =============================================================================

export async function handleTripsByVehicle(ctx: BotContext) {
  try {
    await ctx.answerCbQuery('⏳ Đang tải thống kê xe...');

    // Get top 10 vehicles by trip count
    const result = await sql`
      SELECT
        ct.bien_kiem_soat as "bienKiemSoat",
        COUNT(*) as "totalTrips",
        COALESCE(SUM(CAST(cd.doanh_thu AS NUMERIC)), 0) as "totalRevenue",
        COALESCE(SUM(cd.so_km_theo_odo), 0) as "totalDistance"
      FROM chi_tiet_chuyen_di ct
      INNER JOIN chuyen_di cd ON ct.ma_chuyen_di = cd.ma_chuyen_di
      WHERE ct.bien_kiem_soat IS NOT NULL
        AND ct.bien_kiem_soat != ''
      GROUP BY ct.bien_kiem_soat
      ORDER BY "totalTrips" DESC
      LIMIT 10
    `;

    if (result.rows.length === 0) {
      await ctx.editMessageText('🚛 **CHUYẾN ĐI THEO XE**\n\n' + 'Chưa có dữ liệu.', {
        parse_mode: 'Markdown',
        ...getRefreshBackKeyboard('trips_by_vehicle', 'menu_trips')
      });
      return;
    }

    let message = `🚛 **TOP 10 XE HOẠT ĐỘNG**\n\n`;

    result.rows.forEach((vehicle, index) => {
      message +=
        `${index + 1}. **${vehicle.bienKiemSoat}**\n` +
        `   🚚 ${formatNumber(vehicle.totalTrips)} chuyến\n` +
        `   💰 ${formatCurrency(vehicle.totalRevenue)}\n` +
        `   📏 ${formatDistance(vehicle.totalDistance)}\n\n`;
    });

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      ...getRefreshBackKeyboard('trips_by_vehicle', 'menu_trips')
    });
  } catch (error) {
    console.error('[TRIPS_BY_VEHICLE] Error:', error);
    await ctx.editMessageText(formatError('Không thể tải thống kê xe'), {
      parse_mode: 'Markdown',
      ...getRefreshBackKeyboard('trips_by_vehicle', 'menu_trips')
    });
  }
}

// =============================================================================
// TRIP REFRESH (Callback with trip ID)
// =============================================================================

export async function handleTripRefresh(ctx: BotContext, tripId: string) {
  try {
    await ctx.answerCbQuery('🔄 Đang refresh...');

    const result = await sql`
      SELECT
        cd.ma_chuyen_di as "maChuyenDi",
        cd.ngay_tao as "ngayTao",
        cd.ten_khach_hang as "tenKhachHang",
        cd.ten_tuyen as "tenTuyen",
        cd.ten_tai_xe as "tenTaiXe",
        (
          SELECT bien_kiem_soat 
          FROM chi_tiet_chuyen_di 
          WHERE ma_chuyen_di = cd.ma_chuyen_di 
          LIMIT 1
        ) as "bienKiemSoat",
        CAST(cd.doanh_thu AS NUMERIC) as "tongDoanhThu",
        cd.so_km_theo_odo as "tongQuangDuong"
      FROM chuyen_di cd
      WHERE cd.ma_chuyen_di = ${tripId}
      LIMIT 1
    `;

    if (result.rows.length === 0) {
      await ctx.editMessageText(`❌ Không tìm thấy chuyến đi: \`${tripId}\``, {
        parse_mode: 'Markdown'
      });
      return;
    }

    const trip = result.rows[0];

    const message =
      `🚚 **THÔNG TIN CHUYẾN ĐI**\n\n` +
      `📋 **Mã:** \`${trip.maChuyenDi}\`\n` +
      `📅 **Ngày:** ${formatDate(trip.ngayTao)}\n` +
      `👤 **Khách hàng:** ${trip.tenKhachHang || 'N/A'}\n` +
      `🛣️ **Tuyến:** ${trip.tenTuyen || 'N/A'}\n` +
      `🚛 **Tài xế:** ${trip.tenTaiXe || 'N/A'}\n` +
      `🚗 **Biển số:** ${trip.bienKiemSoat || 'N/A'}\n` +
      `💰 **Doanh thu:** ${formatCurrency(trip.tongDoanhThu)}\n` +
      `📏 **Quãng đường:** ${formatDistance(trip.tongQuangDuong)}`;

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown'
    });
  } catch (error) {
    console.error('[TRIP_REFRESH] Error:', error);
    await ctx.answerCbQuery('❌ Lỗi khi refresh');
  }
}
