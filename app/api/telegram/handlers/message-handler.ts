import { telegramBot } from '../services/telegram-bot';
import { MAIN_MENU_KEYBOARD } from '../config/commands';
import { getTodayStats } from '../commands/today';
import { getRealtimeStats } from '../commands/realtime';
import { getTripsReport } from '../commands/trips';
import { getFuelReport } from '../commands/fuel';
import { getPartnersReport } from '../commands/partners';
import { getCustomersReport } from '../commands/customers';
import { getReconciliationReport } from '../commands/reconciliation';

interface MessageContext {
  userId: string;
  chatId: string;
  text: string;
  messageThreadId?: number;
}

/**
 * Main message handler
 * Routes messages to appropriate command handlers
 */
export async function handleMessage(context: MessageContext): Promise<void> {
  const { userId, chatId, text, messageThreadId } = context;
  const command = text.toLowerCase().trim();

  try {
    // Handle commands
    if (command.startsWith('/')) {
      await handleCommand(command, context);
      return;
    }

    // Handle natural language queries (future: LLM integration)
    await handleNaturalQuery(text, context);
  } catch (error) {
    console.error('❌ Error handling message:', error);
    await telegramBot.sendResponse(chatId, {
      text: '❌ Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại sau.',
    }, messageThreadId);
  }
}

/**
 * Handle slash commands
 */
async function handleCommand(command: string, context: MessageContext): Promise<void> {
  const { chatId, messageThreadId } = context;

  switch (command) {
    case '/start':
      await telegramBot.sendResponse(chatId, {
        text: `
👋 <b>Chào mừng đến với NAK Logistics Assistant!</b>

Tôi là trợ lý ảo giúp bạn tra cứu thông tin về:
• 📊 Chuyến đi và vận chuyển
• 🤝 Đối tác vận chuyển
• 💼 Khách hàng
• ⛽ Nhiên liệu
• 💰 Đối soát

<b>Bạn có thể:</b>
• Gửi lệnh (VD: /today, /fuel)
• Chọn từ menu bên dưới
• Hoặc hỏi tự nhiên (VD: "Hôm nay có bao nhiêu chuyến?")

Chọn một mục để bắt đầu:
        `.trim(),
        keyboard: MAIN_MENU_KEYBOARD,
      }, messageThreadId);
      break;

    case '/help':
      await telegramBot.sendResponse(chatId, {
        text: `
📚 <b>HƯỚNG DẪN SỬ DỤNG</b>

<b>Lệnh nhanh:</b>
/today - Báo cáo hôm nay
/realtime - Số liệu realtime
/trips - Thống kê chuyến đi
/partners - Hiệu suất đối tác
/customers - Phân tích khách hàng
/fuel - Tình trạng nhiên liệu
/reconciliation - Đối soát

<b>Hỏi tự nhiên:</b>
• "Hôm nay có bao nhiêu chuyến?"
• "Nhiên liệu còn bao nhiêu?"
• "Top 5 khách hàng"
• "So sánh với hôm qua"

<b>Menu tương tác:</b>
Dùng /menu để mở menu chính
        `.trim(),
        keyboard: MAIN_MENU_KEYBOARD,
      }, messageThreadId);
      break;

    case '/menu':
      await telegramBot.sendResponse(chatId, {
        text: '📱 <b>MENU CHÍNH</b>\n\nChọn chức năng bạn muốn xem:',
        keyboard: MAIN_MENU_KEYBOARD,
      }, messageThreadId);
      break;

    case '/today':
      const todayReport = await getTodayStats();
      await telegramBot.sendResponse(chatId, todayReport, messageThreadId);
      break;

    case '/realtime':
      const realtimeReport = await getRealtimeStats();
      await telegramBot.sendResponse(chatId, realtimeReport, messageThreadId);
      break;

    case '/trips':
      const tripsReport = await getTripsReport();
      await telegramBot.sendResponse(chatId, tripsReport, messageThreadId);
      break;

    case '/fuel':
      const fuelReport = await getFuelReport();
      await telegramBot.sendResponse(chatId, fuelReport, messageThreadId);
      break;

    case '/partners':
      const partnersReport = await getPartnersReport();
      await telegramBot.sendResponse(chatId, partnersReport, messageThreadId);
      break;

    case '/customers':
      const customersReport = await getCustomersReport();
      await telegramBot.sendResponse(chatId, customersReport, messageThreadId);
      break;

    case '/reconciliation':
      const reconciliationReport = await getReconciliationReport();
      await telegramBot.sendResponse(chatId, reconciliationReport, messageThreadId);
      break;

    default:
      await telegramBot.sendResponse(chatId, {
        text: `
❓ Lệnh không được hỗ trợ: <code>${command}</code>

Dùng /help để xem danh sách lệnh.
        `.trim(),
        keyboard: MAIN_MENU_KEYBOARD,
      }, messageThreadId);
  }
}

/**
 * Handle natural language queries
 * TODO: Integrate with LLM for better understanding
 */
async function handleNaturalQuery(text: string, context: MessageContext): Promise<void> {
  const { chatId, messageThreadId } = context;
  const lowerText = text.toLowerCase();

  // Simple keyword matching for now
  if (lowerText.includes('chuyến đi') || lowerText.includes('chuyến')) {
    const tripsReport = await getTripsReport();
    await telegramBot.sendResponse(chatId, tripsReport, messageThreadId);
  } else if (lowerText.includes('nhiên liệu') || lowerText.includes('xăng') || lowerText.includes('fuel')) {
    const fuelReport = await getFuelReport();
    await telegramBot.sendResponse(chatId, fuelReport, messageThreadId);
  } else if (lowerText.includes('đối tác') || lowerText.includes('partner')) {
    const partnersReport = await getPartnersReport();
    await telegramBot.sendResponse(chatId, partnersReport, messageThreadId);
  } else if (lowerText.includes('khách hàng') || lowerText.includes('customer')) {
    const customersReport = await getCustomersReport();
    await telegramBot.sendResponse(chatId, customersReport, messageThreadId);
  } else if (lowerText.includes('hôm nay') || lowerText.includes('today')) {
    const todayReport = await getTodayStats();
    await telegramBot.sendResponse(chatId, todayReport, messageThreadId);
  } else {
    // Default response with menu
    await telegramBot.sendResponse(chatId, {
      text: `
💬 Tôi chưa hiểu câu hỏi của bạn.

Bạn có thể:
• Chọn từ menu bên dưới
• Dùng lệnh /help để xem hướng dẫn
• Hỏi rõ hơn (VD: "Hôm nay có bao nhiêu chuyến?")
      `.trim(),
      keyboard: MAIN_MENU_KEYBOARD,
    }, messageThreadId);
  }
}
