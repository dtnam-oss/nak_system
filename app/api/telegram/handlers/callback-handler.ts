import { telegramBot } from '../services/telegram-bot';
import {
  MAIN_MENU_KEYBOARD,
  TRIPS_MENU_KEYBOARD,
  PARTNERS_MENU_KEYBOARD,
  FUEL_MENU_KEYBOARD,
} from '../config/commands';
import { getTodayStats } from '../commands/today';
import { getRealtimeStats } from '../commands/realtime';
import { getTripsReport } from '../commands/trips';
import { getFuelReport } from '../commands/fuel';
import { getPartnersReport } from '../commands/partners';
import { getCustomersReport } from '../commands/customers';
import { getReconciliationReport } from '../commands/reconciliation';

interface CallbackContext {
  userId: string;
  chatId: string;
  data: string;
  messageId: number;
  messageThreadId?: number;
}

/**
 * Handle callback queries from inline keyboards
 */
export async function handleCallbackQuery(context: CallbackContext): Promise<void> {
  const { chatId, data, messageThreadId } = context;

  try {
    // Main menu actions
    if (data === 'stats_today') {
      const report = await getTodayStats();
      await telegramBot.sendResponse(chatId, report, messageThreadId);
      return;
    }

    if (data === 'stats_realtime') {
      const report = await getRealtimeStats();
      await telegramBot.sendResponse(chatId, report, messageThreadId);
      return;
    }

    // Trips menu
    if (data === 'trips') {
      await telegramBot.sendResponse(chatId, {
        text: '🚛 <b>THỐNG KÊ CHUYẾN ĐI</b>\n\nChọn loại báo cáo:',
        keyboard: TRIPS_MENU_KEYBOARD,
      }, messageThreadId);
      return;
    }

    if (data === 'trips_by_status') {
      const report = await getTripsReport('status');
      await telegramBot.sendResponse(chatId, report, messageThreadId);
      return;
    }

    if (data === 'trips_by_provider') {
      const report = await getTripsReport('provider');
      await telegramBot.sendResponse(chatId, report, messageThreadId);
      return;
    }

    // Partners menu
    if (data === 'partners') {
      await telegramBot.sendResponse(chatId, {
        text: '🤝 <b>HIỆU SUẤT ĐỐI TÁC</b>\n\nChọn đối tác:',
        keyboard: PARTNERS_MENU_KEYBOARD,
      }, messageThreadId);
      return;
    }

    if (data.startsWith('partner_')) {
      const partner = data.replace('partner_', '');
      const report = await getPartnersReport(partner === 'all' ? undefined : partner);
      await telegramBot.sendResponse(chatId, report, messageThreadId);
      return;
    }

    // Customers
    if (data === 'customers') {
      const report = await getCustomersReport();
      await telegramBot.sendResponse(chatId, report, messageThreadId);
      return;
    }

    // Fuel menu
    if (data === 'fuel') {
      await telegramBot.sendResponse(chatId, {
        text: '⛽ <b>TÌNH TRẠNG NHIÊN LIỆU</b>\n\nChọn loại báo cáo:',
        keyboard: FUEL_MENU_KEYBOARD,
      }, messageThreadId);
      return;
    }

    if (data === 'fuel_current') {
      const report = await getFuelReport();
      await telegramBot.sendResponse(chatId, report, messageThreadId);
      return;
    }

    // Reconciliation
    if (data === 'reconciliation') {
      const report = await getReconciliationReport();
      await telegramBot.sendResponse(chatId, report, messageThreadId);
      return;
    }

    // Back to main menu
    if (data === 'back_main') {
      await telegramBot.sendResponse(chatId, {
        text: '📱 <b>MENU CHÍNH</b>\n\nChọn chức năng bạn muốn xem:',
        keyboard: MAIN_MENU_KEYBOARD,
      }, messageThreadId);
      return;
    }

    // Default: unknown callback
    await telegramBot.sendResponse(chatId, {
      text: '❓ Chức năng chưa được hỗ trợ.',
      keyboard: MAIN_MENU_KEYBOARD,
    }, messageThreadId);
  } catch (error) {
    console.error('❌ Error handling callback:', error);
    await telegramBot.sendResponse(chatId, {
      text: '❌ Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại.',
      keyboard: MAIN_MENU_KEYBOARD,
    }, messageThreadId);
  }
}
