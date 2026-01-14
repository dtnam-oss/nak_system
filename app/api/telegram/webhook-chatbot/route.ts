/**
 * =============================================================================
 * TELEGRAM CHATBOT WEBHOOK - INTERACTIVE BOT
 * =============================================================================
 *
 * Main webhook endpoint for Telegram Interactive Chatbot
 * Handles all commands, callbacks, and inline queries
 *
 * URL: /api/telegram/webhook-chatbot
 */

import { NextRequest, NextResponse } from 'next/server';
import { Telegraf } from 'telegraf';
import { BotContext } from '@/lib/telegram/types';
import {
  requireAuth,
  requirePermission,
  requireRole,
  rateLimit,
  authenticateUser,
  registerUser,
  getRegisteredUsers,
  isAdmin
} from '@/lib/telegram/auth';
import {
  getMainMenuKeyboard,
  getAdminMenuKeyboard,
  NOOP_ACTION
} from '@/lib/telegram/keyboards';
import {
  handleDashboardMenu,
  handleDashboardToday,
  handleDashboardMonth,
  handleDashboardTopRoutes,
  handleDashboardTopDrivers,
  handleDashboardRevenue,
  handleDashboardDistance,
  handleTripsMenu,
  handleTripsSearch,
  handleSearchCommand,
  handleTripsToday,
  handleTripsByCustomer,
  handleTripsByVehicle,
  handleTripRefresh,
  handleFuelMenu,
  handleFuelInventory,
  handleFuelEfficiency,
  handleFuelByVehicle,
  handleFuelByDate,
  handleReportsMenu,
  handleReportToday,
  handleReportWeek,
  handleReportMonth,
  handleReportCustom,
  handleReportExport
} from '@/lib/telegram/handlers';
import { formatError } from '@/lib/telegram/formatters';

// Force Node.js runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Initialize Telegraf bot
const bot = new Telegraf<BotContext>(process.env.TELEGRAM_BOT_TOKEN || '');

// =============================================================================
// SESSION MANAGEMENT
// =============================================================================

// Simple in-memory session storage
// In production, use Redis or database
const sessions = new Map<string, any>();

// Middleware to attach session
bot.use(async (ctx, next) => {
  const chatId = ctx.chat?.id.toString();
  if (chatId) {
    if (!sessions.has(chatId)) {
      sessions.set(chatId, {});
    }
    ctx.session = sessions.get(chatId);
  }
  await next();
});

// =============================================================================
// BASIC COMMANDS
// =============================================================================

/**
 * /start - Initialize bot and authenticate user
 */
bot.command('start', async (ctx) => {
  const chatId = ctx.chat.id.toString();
  const username = ctx.from?.username || 'Unknown';
  const firstName = ctx.from?.first_name || '';
  const lastName = ctx.from?.last_name || '';

  try {
    // Try to authenticate user
    const user = await authenticateUser(chatId);

    if (user) {
      // ✅ Authenticated
      await ctx.reply(
        `🎉 **Xin chào ${user.hoVaTen}!**\n\n` +
          `✅ Bạn đã được xác thực thành công.\n` +
          `📋 Mã nhân viên: ${user.maNhanVien}\n` +
          `🏢 Phòng ban: ${user.phongBan}\n` +
          `👔 Chức vụ: ${user.chucVu}\n` +
          `👤 Phân quyền: ${user.phanQuyen}\n\n` +
          `Sử dụng /menu để bắt đầu.`,
        {
          parse_mode: 'Markdown',
          ...getMainMenuKeyboard()
        }
      );
    } else {
      // ❌ Not registered
      await ctx.reply(
        `👋 **Xin chào ${firstName} ${lastName}!**\n\n` +
          `⚠️ Chat ID của bạn chưa được đăng ký trong hệ thống.\n` +
          `🔑 Chat ID: \`${chatId}\`\n\n` +
          `📝 **Cách đăng ký:**\n` +
          `Gửi lệnh: \`/register <mã_nhân_viên>\`\n` +
          `Ví dụ: \`/register NV001\`\n\n` +
          `💡 Hoặc liên hệ Admin để được cấp quyền truy cập.`,
        { parse_mode: 'Markdown' }
      );
    }
  } catch (error) {
    console.error('[START] Error:', error);
    await ctx.reply(formatError('Không thể khởi tạo bot'), { parse_mode: 'Markdown' });
  }
});

/**
 * /register - Manual registration
 */
bot.command('register', async (ctx) => {
  const chatId = ctx.chat.id.toString();
  const args = ctx.message.text.split(' ').slice(1);

  if (args.length === 0) {
    await ctx.reply(
      '❌ **Sai cú pháp**\n\n' +
        'Vui lòng nhập mã nhân viên.\n\n' +
        'Cú pháp: `/register <mã_nhân_viên>`\n' +
        'Ví dụ: `/register NV001`',
      { parse_mode: 'Markdown' }
    );
    return;
  }

  const employeeCode = args[0].trim().toUpperCase();

  try {
    const user = await registerUser(chatId, employeeCode);

    if (!user) {
      await ctx.reply(
        `❌ **Đăng ký thất bại**\n\n` +
          `Không tìm thấy nhân viên với mã: \`${employeeCode}\`\n\n` +
          `Vui lòng kiểm tra lại mã nhân viên hoặc liên hệ Admin.`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    await ctx.reply(
      `✅ **Đăng ký thành công!**\n\n` +
        `👤 Tên: ${user.hoVaTen}\n` +
        `📋 Mã NV: ${user.maNhanVien}\n` +
        `🏢 Phòng ban: ${user.phongBan}\n` +
        `🔑 Phân quyền: ${user.phanQuyen}\n\n` +
        `Sử dụng /menu để bắt đầu.`,
      {
        parse_mode: 'Markdown',
        ...getMainMenuKeyboard()
      }
    );
  } catch (error) {
    console.error('[REGISTER] Error:', error);
    await ctx.reply(formatError('Đã xảy ra lỗi khi đăng ký'), { parse_mode: 'Markdown' });
  }
});

/**
 * /menu - Show main menu
 */
bot.command('menu', requireAuth, async (ctx) => {
  const user = ctx.state!.user!;

  await ctx.reply(
    `🏠 **MENU CHÍNH**\n\n` + `Xin chào ${user.hoVaTen}!\n` + `Chọn chức năng bạn muốn sử dụng:`,
    {
      parse_mode: 'Markdown',
      ...getMainMenuKeyboard()
    }
  );
});

/**
 * /help - Show help message
 */
bot.command('help', async (ctx) => {
  await ctx.reply(
    `ℹ️ **HƯỚNG DẪN SỬ DỤNG BOT**\n\n` +
      `**Lệnh cơ bản:**\n` +
      `/start - Khởi tạo bot\n` +
      `/menu - Hiển thị menu chính\n` +
      `/search <mã> - Tra cứu chuyến đi\n` +
      `/register <mã_NV> - Đăng ký tài khoản\n` +
      `/help - Hiển thị trợ giúp\n\n` +
      `**Menu chức năng:**\n` +
      `📊 Dashboard - Thống kê tổng quan\n` +
      `🚚 Chuyến đi - Quản lý chuyến đi\n` +
      `⛽ Nhiên liệu - Quản lý nhiên liệu\n` +
      `📈 Báo cáo - Xem báo cáo\n\n` +
      `💡 **Mẹo:** Sử dụng các nút bấm để điều hướng nhanh hơn!`,
    { parse_mode: 'Markdown' }
  );
});

/**
 * /search - Search trip by ID
 */
bot.command('search', requireAuth, rateLimit(5, 60000), handleSearchCommand);

// =============================================================================
// ADMIN COMMANDS
// =============================================================================

/**
 * /users - List registered users (Admin only)
 */
bot.command('users', requireAuth, requireRole(['admin']), async (ctx) => {
  try {
    const users = await getRegisteredUsers(20);

    if (users.length === 0) {
      await ctx.reply('👥 Chưa có người dùng nào đăng ký.');
      return;
    }

    let message = '👥 **DANH SÁCH NGƯỜI DÙNG ĐÃ ĐĂNG KÝ**\n\n';

    users.forEach((user, index) => {
      message +=
        `${index + 1}. **${user.hoVaTen}** (${user.maNhanVien})\n` +
        `   📱 Chat ID: \`${user.chatId}\`\n` +
        `   🔑 Quyền: ${user.phanQuyen}\n` +
        `   ⚡ ${user.isActive ? '✅ Active' : '❌ Inactive'}\n\n`;
    });

    await ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('[USERS] Error:', error);
    await ctx.reply(formatError('Không thể tải danh sách người dùng'), { parse_mode: 'Markdown' });
  }
});

// =============================================================================
// CALLBACK QUERY HANDLERS (Button Clicks)
// =============================================================================

// Main menu callbacks
bot.action('menu_main', requireAuth, async (ctx) => {
  const user = ctx.state!.user!;

  await ctx.editMessageText(
    `🏠 **MENU CHÍNH**\n\n` + `Xin chào ${user.hoVaTen}!\n` + `Chọn chức năng bạn muốn sử dụng:`,
    {
      parse_mode: 'Markdown',
      ...getMainMenuKeyboard()
    }
  );
  await ctx.answerCbQuery();
});

// Dashboard callbacks
bot.action('menu_dashboard', requireAuth, handleDashboardMenu);
bot.action('dashboard_today', requireAuth, handleDashboardToday);
bot.action('dashboard_month', requireAuth, handleDashboardMonth);
bot.action('dashboard_top_routes', requireAuth, handleDashboardTopRoutes);
bot.action('dashboard_top_drivers', requireAuth, handleDashboardTopDrivers);
bot.action('dashboard_revenue', requireAuth, handleDashboardRevenue);
bot.action('dashboard_distance', requireAuth, handleDashboardDistance);
bot.action('dashboard_back', requireAuth, handleDashboardMenu);

// Trips callbacks
bot.action('menu_trips', requireAuth, handleTripsMenu);
bot.action('trips_search', requireAuth, handleTripsSearch);
bot.action('trips_today', requireAuth, handleTripsToday);
bot.action('trips_by_customer', requireAuth, handleTripsByCustomer);
bot.action('trips_by_vehicle', requireAuth, handleTripsByVehicle);

// Trip refresh with dynamic ID
bot.action(/^trip_refresh_(.+)$/, requireAuth, async (ctx) => {
  const tripId = ctx.match[1];
  await handleTripRefresh(ctx, tripId);
});

// Fuel callbacks
bot.action('menu_fuel', requireAuth, handleFuelMenu);
bot.action('fuel_inventory', requireAuth, handleFuelInventory);
bot.action('fuel_efficiency', requireAuth, handleFuelEfficiency);
bot.action('fuel_by_vehicle', requireAuth, async (ctx) => {
  await handleFuelByVehicle(ctx, 1);
});
bot.action(/^fuel_by_vehicle_page_(\d+)$/, requireAuth, async (ctx) => {
  const page = parseInt(ctx.match[1]);
  await handleFuelByVehicle(ctx, page);
});
bot.action('fuel_by_date', requireAuth, handleFuelByDate);

// Reports callbacks
bot.action('menu_reports', requireAuth, handleReportsMenu);
bot.action('report_today', requireAuth, handleReportToday);
bot.action('report_week', requireAuth, handleReportWeek);
bot.action('report_month', requireAuth, handleReportMonth);
bot.action('report_custom', requireAuth, handleReportCustom);
bot.action('report_export', requireAuth, requirePermission('xem'), handleReportExport);

// Settings callback (placeholder)
bot.action('menu_settings', requireAuth, async (ctx) => {
  await ctx.editMessageText(
    '⚙️ **CÀI ĐẶT**\n\n' +
      '⚠️ Tính năng đang được phát triển.\n\n' +
      'Các tùy chọn sẽ có:\n' +
      '🔔 Thông báo\n' +
      '🌐 Ngôn ngữ\n' +
      '👤 Thông tin cá nhân\n' +
      '🔐 Bảo mật',
    {
      parse_mode: 'Markdown',
      ...getMainMenuKeyboard()
    }
  );
  await ctx.answerCbQuery();
});

// Help callback
bot.action('help', async (ctx) => {
  await ctx.editMessageText(
    `ℹ️ **HƯỚNG DẪN SỬ DỤNG BOT**\n\n` +
      `**Lệnh cơ bản:**\n` +
      `/start - Khởi tạo bot\n` +
      `/menu - Hiển thị menu chính\n` +
      `/search <mã> - Tra cứu chuyến đi\n` +
      `/register <mã_NV> - Đăng ký tài khoản\n` +
      `/help - Hiển thị trợ giúp\n\n` +
      `**Menu chức năng:**\n` +
      `📊 Dashboard - Thống kê tổng quan\n` +
      `🚚 Chuyến đi - Quản lý chuyến đi\n` +
      `⛽ Nhiên liệu - Quản lý nhiên liệu\n` +
      `📈 Báo cáo - Xem báo cáo\n\n` +
      `💡 **Mẹo:** Sử dụng các nút bấm để điều hướng nhanh hơn!`,
    {
      parse_mode: 'Markdown',
      ...getMainMenuKeyboard()
    }
  );
  await ctx.answerCbQuery();
});

// Employees menu callback (placeholder)
bot.action('menu_employees', requireAuth, async (ctx) => {
  await ctx.editMessageText(
    '👥 **QUẢN LÝ NHÂN VIÊN**\n\n' + '⚠️ Tính năng đang được phát triển.',
    {
      parse_mode: 'Markdown',
      ...getMainMenuKeyboard()
    }
  );
  await ctx.answerCbQuery();
});

// NOOP action (for non-clickable buttons)
bot.action(NOOP_ACTION, async (ctx) => {
  await ctx.answerCbQuery();
});

// Catch all unknown actions
bot.on('callback_query', async (ctx) => {
  console.log('[UNKNOWN_CALLBACK]', ctx.callbackQuery);
  await ctx.answerCbQuery('⚠️ Hành động không xác định');
});

// =============================================================================
// ERROR HANDLING
// =============================================================================

bot.catch((err, ctx) => {
  console.error('[BOT_ERROR] Error:', err);
  console.error('[BOT_ERROR] Context:', ctx);

  try {
    ctx.reply(formatError('Đã xảy ra lỗi không mong muốn'), { parse_mode: 'Markdown' });
  } catch (replyError) {
    console.error('[BOT_ERROR] Failed to send error message:', replyError);
  }
});

// =============================================================================
// WEBHOOK HANDLER
// =============================================================================

export async function POST(req: NextRequest) {
  try {
    const update = await req.json();

    console.log('[WEBHOOK] Received update:', update.update_id);

    // Process update with Telegraf
    await bot.handleUpdate(update);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[WEBHOOK] Error:', error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// =============================================================================
// HEALTH CHECK
// =============================================================================

export async function GET() {
  try {
    const botInfo = await bot.telegram.getMe();

    return NextResponse.json({
      status: 'ok',
      bot: {
        id: botInfo.id,
        username: botInfo.username,
        first_name: botInfo.first_name
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
