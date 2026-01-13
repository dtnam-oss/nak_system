/**
 * =============================================================================
 * TELEGRAM CHATBOT - TRIPS HANDLERS
 * =============================================================================
 *
 * Query handlers for trip management and search
 */

import { sql } from '@vercel/postgres';
import { BotContext, TripRecord, AuthenticatedUser } from '../types';
import {
  formatCurrency,
  formatDistance,
  formatNumber,
  formatDate,
  formatStatus,
  formatTripType,
  formatRouteDetails,
  formatError,
  getCurrentDate,
  truncate
} from '../formatters';
import {
  getTripsMenuKeyboard,
  getRefreshBackKeyboard,
  getTripDetailKeyboard,
  getCancelKeyboard
} from '../keyboards';

// =============================================================================
// TRIPS MENU
// =============================================================================

export async function handleTripsMenu(ctx: BotContext) {
  try {
    const user = ctx.state?.user as AuthenticatedUser;

    await ctx.editMessageText(
      '🚚 **QUẢN LÝ CHUYẾN ĐI**\n\n' + 'Chọn chức năng bạn muốn sử dụng:',
      {
        parse_mode: 'Markdown',
        ...getTripsMenuKeyboard(user?.permissions)
      }
    );
    await ctx.answerCbQuery();
  } catch (error) {
    console.error('[TRIPS_MENU] Error:', error);
    await ctx.answerCbQuery('❌ Lỗi khi tải menu');
  }
}

// =============================================================================
// SEARCH TRIP
// =============================================================================

export async function handleTripsSearch(ctx: BotContext) {
  try {
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
    await ctx.answerCbQuery();
  } catch (error) {
    console.error('[TRIPS_SEARCH] Error:', error);
    await ctx.answerCbQuery('❌ Lỗi');
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
    const result = await sql<TripRecord>`
      SELECT
        ma_chuyen_di as "maChuyenDi",
        ngay_tao as "ngayTao",
        ten_khach_hang as "tenKhachHang",
        ten_tuyen as "tenTuyen",
        loai_chuyen as "loaiChuyen",
        ten_tai_xe as "tenTaiXe",
        bien_kiem_soat as "bienKiemSoat",
        trang_thai as "trangThai",
        tong_doanh_thu as "tongDoanhThu",
        tong_quang_duong as "tongQuangDuong",
        data_json as "dataJson"
      FROM chuyen_di
      WHERE ma_chuyen_di = ${tripId}
      LIMIT 1
    `;

    if (result.rows.length === 0) {
      await ctx.reply(`❌ Không tìm thấy chuyến đi: \`${tripId}\``, {
        parse_mode: 'Markdown'
      });
      return;
    }

    const trip = result.rows[0];
    const user = ctx.state?.user as AuthenticatedUser;

    // Build message
    let message = await buildTripDetailMessage(trip);

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      ...getTripDetailKeyboard(tripId, user?.permissions)
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

    const result = await sql<TripRecord>`
      SELECT
        ma_chuyen_di as "maChuyenDi",
        ten_khach_hang as "tenKhachHang",
        ten_tuyen as "tenTuyen",
        ten_tai_xe as "tenTaiXe",
        bien_kiem_soat as "bienKiemSoat",
        trang_thai as "trangThai",
        tong_doanh_thu as "tongDoanhThu"
      FROM chuyen_di
      WHERE ngay_tao = ${today}
      ORDER BY ma_chuyen_di DESC
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
        `   👤 ${trip.tenKhachHang}\n` +
        `   🛣️ ${truncate(trip.tenTuyen, 40)}\n` +
        `   🚛 ${trip.tenTaiXe} (${trip.bienKiemSoat})\n` +
        `   ${formatStatus(trip.trangThai)}\n` +
        `   💰 ${formatCurrency(trip.tongDoanhThu)}\n\n`;
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
        SUM(tong_doanh_thu) as "totalRevenue"
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
        bien_kiem_soat as "bienKiemSoat",
        COUNT(*) as "totalTrips",
        SUM(tong_doanh_thu) as "totalRevenue",
        SUM(tong_quang_duong) as "totalDistance"
      FROM chuyen_di
      WHERE bien_kiem_soat IS NOT NULL
        AND bien_kiem_soat != ''
      GROUP BY bien_kiem_soat
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

    const result = await sql<TripRecord>`
      SELECT
        ma_chuyen_di as "maChuyenDi",
        ngay_tao as "ngayTao",
        ten_khach_hang as "tenKhachHang",
        ten_tuyen as "tenTuyen",
        loai_chuyen as "loaiChuyen",
        ten_tai_xe as "tenTaiXe",
        bien_kiem_soat as "bienKiemSoat",
        trang_thai as "trangThai",
        tong_doanh_thu as "tongDoanhThu",
        tong_quang_duong as "tongQuangDuong",
        data_json as "dataJson"
      FROM chuyen_di
      WHERE ma_chuyen_di = ${tripId}
      LIMIT 1
    `;

    if (result.rows.length === 0) {
      await ctx.editMessageText(`❌ Không tìm thấy chuyến đi: \`${tripId}\``, {
        parse_mode: 'Markdown'
      });
      return;
    }

    const trip = result.rows[0];
    const user = ctx.state?.user as AuthenticatedUser;

    const message = await buildTripDetailMessage(trip);

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      ...getTripDetailKeyboard(tripId, user?.permissions)
    });
  } catch (error) {
    console.error('[TRIP_REFRESH] Error:', error);
    await ctx.answerCbQuery('❌ Lỗi khi refresh');
  }
}

// =============================================================================
// HELPER: BUILD TRIP DETAIL MESSAGE
// =============================================================================

async function buildTripDetailMessage(trip: TripRecord): Promise<string> {
  let message =
    `🚚 **THÔNG TIN CHUYẾN ĐI**\n\n` +
    `📋 **Mã:** \`${trip.maChuyenDi}\`\n` +
    `📅 **Ngày:** ${formatDate(trip.ngayTao)}\n` +
    `👤 **Khách hàng:** ${trip.tenKhachHang}\n` +
    `🛣️ **Tuyến:** ${trip.tenTuyen}\n` +
    `📦 **Loại:** ${formatTripType(trip.loaiChuyen || 'N/A')}\n` +
    `🚛 **Tài xế:** ${trip.tenTaiXe}\n` +
    `🚗 **Biển số:** ${trip.bienKiemSoat}\n` +
    `📊 **Trạng thái:** ${formatStatus(trip.trangThai)}\n` +
    `💰 **Doanh thu:** ${formatCurrency(trip.tongDoanhThu)}\n` +
    `📏 **Quãng đường:** ${formatDistance(trip.tongQuangDuong)}\n`;

  // Parse route details from data_json
  try {
    if (trip.dataJson) {
      const data = JSON.parse(trip.dataJson);
      if (data.chiTietLoTrinh && Array.isArray(data.chiTietLoTrinh)) {
        message += `\n📍 **Chi tiết lộ trình:**\n`;
        message += formatRouteDetails(data.chiTietLoTrinh);
      }
    }
  } catch (error) {
    // Ignore JSON parse errors
    console.error('[BUILD_TRIP_MESSAGE] JSON parse error:', error);
  }

  return message;
}
