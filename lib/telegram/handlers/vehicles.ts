/**
 * =============================================================================
 * TELEGRAM CHATBOT - VEHICLE HANDLERS
 * =============================================================================
 *
 * Query handlers for vehicle information, routes, and fuel usage
 */

import { sql } from '@vercel/postgres';
import { BotContext } from '../types';
import {
    formatCurrency,
    formatDistance,
    formatNumber,
    formatDate,
    formatError,
    formatFuel,
    formatEfficiency,
    truncate
} from '../formatters';
import {
    getVehiclesMenuKeyboard,
    getRefreshBackKeyboard,
    getPaginationKeyboard
} from '../keyboards';
import { Markup } from 'telegraf';

// =============================================================================
// VEHICLES MENU
// =============================================================================

export async function handleVehiclesMenu(ctx: BotContext) {
    try {
        await ctx.answerCbQuery();
        await ctx.editMessageText(
            '🚛 **QUẢN LÝ PHƯƠNG TIỆN**\n\n' + 'Chọn hạng mục bạn muốn tra cứu:',
            {
                parse_mode: 'Markdown',
                ...getVehiclesMenuKeyboard()
            }
        );
    } catch (error) {
        console.error('[VEHICLES_MENU] Error:', error);
        try {
            await ctx.answerCbQuery('❌ Lỗi khi tải menu');
        } catch (e) { }
    }
}

// =============================================================================
// VEHICLE ROUTES (Lộ trình)
// =============================================================================

export async function handleVehiclesRoutes(ctx: BotContext) {
    try {
        await ctx.answerCbQuery();

        const miniAppUrl = process.env.NEXT_PUBLIC_APP_URL
            ? `${process.env.NEXT_PUBLIC_APP_URL}/mini-app/vehicle-routes`
            : 'https://nak-logistic-system.vercel.app/mini-app/vehicle-routes';

        await ctx.editMessageText(
            '🗺️ **TRA CỨU LỘ TRÌNH PHƯƠNG TIỆN**\n\n' +
            'Tính năng này cho phép bạn tra cứu lịch sử chạy của xe trong một khoảng thời gian cụ thể.\n\n' +
            '💡 **Hướng dẫn:**\n' +
            '1. Nhấn nút bên dưới để mở ứng dụng.\n' +
            '2. Nhập Biển số xe cần tra.\n' +
            '3. Chọn khoảng thời gian (Từ ngày - Đến ngày).\n' +
            '4. Xem danh sách khách hàng và lộ trình chi tiết.',
            {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.webApp('🗺️ Mở Tra cứu Lộ trình', miniAppUrl)],
                    [Markup.button.callback('◀️ Quay lại', 'menu_vehicles')]
                ])
            }
        );
    } catch (error) {
        console.error('[VEHICLES_ROUTES] Error:', error);
        await ctx.editMessageText(formatError('Không thể mở ứng dụng tra cứu'), {
            parse_mode: 'Markdown',
            ...getRefreshBackKeyboard('vehicles_routes', 'menu_vehicles')
        });
    }
}

// =============================================================================
// VEHICLE FUEL USAGE (Sử dụng nhiên liệu)
// =============================================================================

export async function handleVehiclesFuel(ctx: BotContext) {
    try {
        await ctx.answerCbQuery('⏳ Đang tải dữ liệu tiêu thụ...');

        // Get 5 vehicles with highest fuel consumption this month
        const result = await sql`
      SELECT 
        bien_so_xe as "bienSo",
        SUM(
          CASE
            WHEN so_luong::TEXT IS NULL OR so_luong::TEXT = '' THEN 0
            WHEN so_luong::TEXT !~ '^-?[0-9]*\\.?[0-9]+$' THEN 0
            ELSE so_luong::NUMERIC
          END
        ) as "tongDau",
        AVG(
          CASE
            WHEN hieu_suat::TEXT IS NULL OR hieu_suat::TEXT = '' THEN 0
            WHEN hieu_suat::TEXT !~ '^-?[0-9]*\\.?[0-9]+$' THEN 0
            ELSE hieu_suat::NUMERIC
          END
        ) as "hieuSuatTB",
        COUNT(*) as "soLanDo"
      FROM xuat_nhien_lieu
      WHERE ngay_tao >= date_trunc('month', CURRENT_DATE)
        AND bien_so_xe IS NOT NULL
        AND bien_so_xe != ''
      GROUP BY bien_so_xe
      ORDER BY "tongDau" DESC
      LIMIT 10
    `;

        if (result.rows.length === 0) {
            await ctx.editMessageText(
                '⛽ **SỬ DỤNG NHIÊN LIỆU (THÁNG NÀY)**\n\n' + 'Chưa có dữ liệu tiêu thụ dầu.',
                {
                    parse_mode: 'Markdown',
                    ...getRefreshBackKeyboard('vehicles_fuel', 'menu_vehicles')
                }
            );
            return;
        }

        let message = '⛽ **TIÊU THỤ NHIÊN LIỆU TRONG THÁNG**\n\n';
        result.rows.forEach((row, index) => {
            message += `${index + 1}. **${row.bienSo}**\n` +
                `   ⛽ ${formatFuel(row.tongDau)} | 📊 ${formatEfficiency(row.hieuSuatTB)}\n` +
                `   🔢 ${row.soLanDo} lần đổ\n\n`;
        });

        await ctx.editMessageText(message, {
            parse_mode: 'Markdown',
            ...getRefreshBackKeyboard('vehicles_fuel', 'menu_vehicles')
        });
    } catch (error) {
        console.error('[VEHICLES_FUEL] Error:', error);
        await ctx.editMessageText(formatError('Không thể tải dữ liệu nhiên liệu'), {
            parse_mode: 'Markdown',
            ...getRefreshBackKeyboard('vehicles_fuel', 'menu_vehicles')
        });
    }
}

// =============================================================================
// VEHICLE INFO (Thông tin phương tiện)
// =============================================================================

export async function handleVehiclesInfo(ctx: BotContext, page: number = 1) {
    try {
        await ctx.answerCbQuery('⏳ Đang tải danh sách phương tiện...');

        const pageSize = 5;
        const offset = (page - 1) * pageSize;

        const result = await sql`
      SELECT 
        license_plate as "bienSo",
        brand as "hieuXe",
        body_type as "loaiXe",
        weight_capacity as "taiTrong",
        weight_unit as "donVi",
        current_status as "tinhTrang"
      FROM vehicles
      ORDER BY license_plate ASC
      LIMIT ${pageSize}
      OFFSET ${offset}
    `;

        const countResult = await sql`SELECT COUNT(*) as total FROM vehicles`;
        const total = parseInt(countResult.rows[0].total);
        const totalPages = Math.ceil(total / pageSize);

        if (result.rows.length === 0) {
            await ctx.editMessageText(
                'ℹ️ **THÔNG TIN PHƯƠNG TIỆN**\n\n' + 'Chưa có dữ liệu phương tiện.',
                {
                    parse_mode: 'Markdown',
                    ...getRefreshBackKeyboard('vehicles_info', 'menu_vehicles')
                }
            );
            return;
        }

        let message = 'ℹ️ **DANH SÁCH PHƯƠNG TIỆN**\n' +
            `📄 Trang ${page}/${totalPages} | Tổng: ${total}\n\n`;

        result.rows.forEach((row) => {
            message += `🚛 **${row.bienSo}**\n` +
                `   🏷️ ${row.hieuXe || 'N/A'} - ${row.loaiXe || 'N/A'}\n` +
                `   ⚖️ Tải trọng: ${row.taiTrong} ${row.donVi || 'kg'}\n` +
                `   🛠️ Tình trạng: ${row.tinhTrang || 'Bình thường'}\n\n`;
        });

        message += '💡 Để xem chi tiết 1 xe cụ thể, hãy nhập: `/v <biển_số>`';

        await ctx.editMessageText(message, {
            parse_mode: 'Markdown',
            ...getPaginationKeyboard(page, totalPages, 'vehicles_info', 'menu_vehicles')
        });
    } catch (error) {
        console.error('[VEHICLES_INFO] Error:', error);
        await ctx.editMessageText(formatError('Không thể tải danh sách phương tiện'), {
            parse_mode: 'Markdown',
            ...getRefreshBackKeyboard('vehicles_info', 'menu_vehicles')
        });
    }
}

// =============================================================================
// SEARCH VEHICLE COMMAND (/v <bien_so>)
// =============================================================================

export async function handleVehicleSearchCommand(ctx: BotContext) {
    if (!ctx.message || !('text' in ctx.message)) return;

    const args = ctx.message.text.split(' ').slice(1);
    if (args.length === 0) {
        await ctx.reply('❌ Vui lòng nhập biển số xe.\nVí dụ: `/v 29H-12345`', { parse_mode: 'Markdown' });
        return;
    }

    const licensePlate = args[0].trim().toUpperCase();

    try {
        const result = await sql`
      SELECT * FROM vehicles WHERE license_plate = ${licensePlate} LIMIT 1
    `;

        if (result.rows.length === 0) {
            await ctx.reply(`❌ Không tìm thấy xe với biển số: \`${licensePlate}\``, { parse_mode: 'Markdown' });
            return;
        }

        const v = result.rows[0];
        const message =
            `🚛 **CHI TIẾT PHƯƠNG TIỆN**\n\n` +
            `🚗 **Biển số:** \`${v.license_plate}\`\n` +
            `🏷️ **Hiệu xe:** ${v.brand || 'N/A'}\n` +
            `💎 **Loại xe:** ${v.body_type || 'N/A'}\n` +
            `⚖️ **Tải trọng:** ${v.weight_capacity} ${v.weight_unit || 'kg'}\n` +
            `📦 **Kích thước thùng:** ${v.cargo_box_dimension || 'N/A'}\n` +
            `📏 **Thể tích:** ${v.volume ? v.volume + ' m3' : 'N/A'}\n` +
            `📍 **Khu vực:** ${v.area || 'N/A'}\n` +
            `🛠️ **Tình trạng:** ${v.current_status || 'N/A'}\n` +
            `⛽ **Định mức dầu:** ${v.fuel_norm} L/100km\n` +
            `🗓️ **Đăng kiểm tiếp theo:** ${v.next_registration_deadline ? formatDate(v.next_registration_deadline) : 'N/A'}\n` +
            `👤 **Quản lý:** ${v.manager || 'N/A'}\n`;

        await ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (error) {
        console.error('[VEHICLE_SEARCH] Error:', error);
        await ctx.reply(formatError('Lỗi khi tra cứu phương tiện'), { parse_mode: 'Markdown' });
    }
}
