/**
 * =============================================================================
 * TELEGRAM CHATBOT - FUEL HANDLERS
 * =============================================================================
 *
 * Query handlers for fuel inventory and vehicle efficiency
 */

import { sql } from '@vercel/postgres';
import { BotContext, FuelInventoryStats, VehicleEfficiency } from '../types';
import {
  formatFuel,
  formatCurrency,
  formatDistance,
  formatEfficiency,
  formatNumber,
  formatError,
  formatPagination
} from '../formatters';
import {
  getFuelMenuKeyboard,
  getRefreshBackKeyboard,
  getPaginationKeyboard
} from '../keyboards';

// =============================================================================
// FUEL MENU
// =============================================================================

export async function handleFuelMenu(ctx: BotContext) {
  try {
    await ctx.editMessageText(
      '⛽ **QUẢN LÝ NHIÊN LIỆU**\n\n' + 'Chọn chức năng bạn muốn sử dụng:',
      {
        parse_mode: 'Markdown',
        ...getFuelMenuKeyboard()
      }
    );
    await ctx.answerCbQuery();
  } catch (error) {
    console.error('[FUEL_MENU] Error:', error);
    await ctx.answerCbQuery('❌ Lỗi khi tải menu');
  }
}

// =============================================================================
// FUEL INVENTORY
// =============================================================================

export async function handleFuelInventory(ctx: BotContext) {
  try {
    await ctx.answerCbQuery('⏳ Đang tải tồn kho...');

    // Call existing fuel stats API or query database directly
    const result = await sql`
      WITH imports AS (
        SELECT COALESCE(SUM(so_luong), 0) as total_imports
        FROM nhap_nhien_lieu
      ),
      exports AS (
        SELECT COALESCE(SUM(so_luong), 0) as total_exports
        FROM xuat_nhien_lieu
      ),
      latest_import AS (
        SELECT don_gia_binh_quan as current_avg_price
        FROM nhap_nhien_lieu
        ORDER BY ngay_tao DESC
        LIMIT 1
      )
      SELECT
        (SELECT total_imports FROM imports) - (SELECT total_exports FROM exports) as current_inventory,
        COALESCE((SELECT current_avg_price FROM latest_import), 0) as current_avg_price,
        (SELECT total_imports FROM imports) as total_imports,
        (SELECT total_exports FROM exports) as total_exports
    `;

    const stats = result.rows[0] as FuelInventoryStats;

    // Check for low stock warning
    const lowStockThreshold = 1000; // 1000 liters
    const lowStockWarning =
      stats.currentInventory < lowStockThreshold
        ? `\n⚠️ **CẢNH BÁO**: Tồn kho thấp (< ${formatFuel(lowStockThreshold)})`
        : '';

    const message =
      `⛽ **TỒN KHO NHIÊN LIỆU**\n\n` +
      `📊 **Tồn kho hiện tại:** ${formatFuel(stats.currentInventory)}\n` +
      `💰 **Giá bình quân:** ${formatCurrency(stats.currentAvgPrice)}/lít\n` +
      `📥 **Tổng nhập:** ${formatFuel(stats.totalImports)}\n` +
      `📤 **Tổng xuất:** ${formatFuel(stats.totalExports)}\n` +
      lowStockWarning +
      `\n\n🕐 Cập nhật: ${new Date().toLocaleTimeString('vi-VN')}`;

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      ...getRefreshBackKeyboard('fuel_inventory', 'menu_fuel')
    });
  } catch (error) {
    console.error('[FUEL_INVENTORY] Error:', error);
    await ctx.editMessageText(formatError('Không thể tải dữ liệu tồn kho'), {
      parse_mode: 'Markdown',
      ...getRefreshBackKeyboard('fuel_inventory', 'menu_fuel')
    });
  }
}

// =============================================================================
// FUEL EFFICIENCY (Overall)
// =============================================================================

export async function handleFuelEfficiency(ctx: BotContext) {
  try {
    await ctx.answerCbQuery('⏳ Đang tính toán hiệu suất...');

    const result = await sql`
      SELECT
        COUNT(*) as total_transactions,
        COALESCE(AVG(hieu_suat), 0) as avg_efficiency,
        COALESCE(MIN(hieu_suat), 0) as min_efficiency,
        COALESCE(MAX(hieu_suat), 0) as max_efficiency,
        COALESCE(SUM(so_luong), 0) as total_fuel,
        COALESCE(SUM(km_di_duoc), 0) as total_km
      FROM xuat_nhien_lieu
      WHERE hieu_suat IS NOT NULL
        AND do_day_binh = true
    `;

    const stats = result.rows[0];

    const message =
      `📈 **HIỆU SUẤT NHIÊN LIỆU**\n\n` +
      `📊 **Trung bình:** ${formatEfficiency(stats.avg_efficiency)}\n` +
      `🔝 **Tốt nhất:** ${formatEfficiency(stats.min_efficiency)}\n` +
      `🔻 **Kém nhất:** ${formatEfficiency(stats.max_efficiency)}\n\n` +
      `⛽ **Tổng nhiên liệu:** ${formatFuel(stats.total_fuel)}\n` +
      `📏 **Tổng quãng đường:** ${formatDistance(stats.total_km)}\n` +
      `🚚 **Số lần đổ dầu:** ${formatNumber(stats.total_transactions)}\n\n` +
      `💡 **Lưu ý:** Hiệu suất thấp hơn = Tốt hơn\n\n` +
      `🕐 Cập nhật: ${new Date().toLocaleTimeString('vi-VN')}`;

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      ...getRefreshBackKeyboard('fuel_efficiency', 'menu_fuel')
    });
  } catch (error) {
    console.error('[FUEL_EFFICIENCY] Error:', error);
    await ctx.editMessageText(formatError('Không thể tính toán hiệu suất'), {
      parse_mode: 'Markdown',
      ...getRefreshBackKeyboard('fuel_efficiency', 'menu_fuel')
    });
  }
}

// =============================================================================
// FUEL BY VEHICLE (with Pagination)
// =============================================================================

export async function handleFuelByVehicle(ctx: BotContext, page: number = 1) {
  try {
    await ctx.answerCbQuery('⏳ Đang tải hiệu suất theo xe...');

    const pageSize = 5;
    const offset = (page - 1) * pageSize;

    // Get vehicle efficiency data
    const result = await sql<VehicleEfficiency>`
      SELECT
        bien_kiem_soat as "licensePlate",
        AVG(hieu_suat) as "avgEfficiency",
        SUM(so_luong) as "totalFuel",
        SUM(km_di_duoc) as "totalKm",
        COUNT(*) as "totalTransactions"
      FROM xuat_nhien_lieu
      WHERE hieu_suat IS NOT NULL
        AND do_day_binh = true
      GROUP BY bien_kiem_soat
      ORDER BY "avgEfficiency" ASC
      LIMIT ${pageSize}
      OFFSET ${offset}
    `;

    // Get total count for pagination
    const countResult = await sql`
      SELECT COUNT(DISTINCT bien_kiem_soat) as total
      FROM xuat_nhien_lieu
      WHERE hieu_suat IS NOT NULL AND do_day_binh = true
    `;

    const totalVehicles = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(totalVehicles / pageSize);

    if (result.rows.length === 0) {
      await ctx.editMessageText(
        '⛽ **HIỆU SUẤT THEO XE**\n\n' + 'Chưa có dữ liệu hiệu suất.',
        {
          parse_mode: 'Markdown',
          ...getRefreshBackKeyboard('fuel_by_vehicle', 'menu_fuel')
        }
      );
      return;
    }

    let message =
      `⛽ **HIỆU SUẤT THEO XE**\n` +
      `${formatPagination(page, totalPages, totalVehicles)}\n\n`;

    result.rows.forEach((vehicle, index) => {
      const rank = offset + index + 1;
      const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`;

      message +=
        `${medal} **${vehicle.licensePlate}**\n` +
        `   📊 ${formatEfficiency(vehicle.avgEfficiency)}\n` +
        `   ⛽ ${formatFuel(vehicle.totalFuel)}\n` +
        `   📏 ${formatDistance(vehicle.totalKm)}\n` +
        `   🔢 ${formatNumber(vehicle.totalTransactions)} lần đổ\n\n`;
    });

    message += `💡 Hiệu suất thấp hơn = Tiết kiệm hơn`;

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      ...getPaginationKeyboard(page, totalPages, 'fuel_by_vehicle', 'menu_fuel')
    });
  } catch (error) {
    console.error('[FUEL_BY_VEHICLE] Error:', error);
    await ctx.editMessageText(formatError('Không thể tải hiệu suất theo xe'), {
      parse_mode: 'Markdown',
      ...getRefreshBackKeyboard('fuel_by_vehicle', 'menu_fuel')
    });
  }
}

// =============================================================================
// FUEL BY DATE
// =============================================================================

export async function handleFuelByDate(ctx: BotContext) {
  try {
    await ctx.answerCbQuery('⏳ Đang tải lịch sử...');

    // Get fuel transactions for last 7 days
    const result = await sql`
      SELECT
        ngay_tao::date as "date",
        COUNT(*) as "totalTransactions",
        SUM(so_luong) as "totalQuantity",
        AVG(don_gia) as "avgPrice"
      FROM xuat_nhien_lieu
      WHERE ngay_tao >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY ngay_tao::date
      ORDER BY ngay_tao::date DESC
    `;

    if (result.rows.length === 0) {
      await ctx.editMessageText(
        '📅 **NHIÊN LIỆU THEO NGÀY**\n\n' + 'Chưa có giao dịch trong 7 ngày qua.',
        {
          parse_mode: 'Markdown',
          ...getRefreshBackKeyboard('fuel_by_date', 'menu_fuel')
        }
      );
      return;
    }

    let message = `📅 **NHIÊN LIỆU 7 NGÀY QUA**\n\n`;

    result.rows.forEach(row => {
      const date = new Date(row.date);
      message +=
        `📅 ${date.toLocaleDateString('vi-VN')}\n` +
        `   ⛽ ${formatFuel(row.totalQuantity)}\n` +
        `   💰 ${formatCurrency(row.avgPrice)}/lít\n` +
        `   🔢 ${formatNumber(row.totalTransactions)} giao dịch\n\n`;
    });

    message += `🕐 Cập nhật: ${new Date().toLocaleTimeString('vi-VN')}`;

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      ...getRefreshBackKeyboard('fuel_by_date', 'menu_fuel')
    });
  } catch (error) {
    console.error('[FUEL_BY_DATE] Error:', error);
    await ctx.editMessageText(formatError('Không thể tải lịch sử nhiên liệu'), {
      parse_mode: 'Markdown',
      ...getRefreshBackKeyboard('fuel_by_date', 'menu_fuel')
    });
  }
}
