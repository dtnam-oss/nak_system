import { TelegramTopic } from '@/types/telegram';

/**
 * Telegram Topic Configuration
 * Dựa trên cấu trúc group chat của NAK Logistics
 */
export const TELEGRAM_TOPICS = {
  // Topic: KẾT QUẢ XỬ LÝ (từ ảnh: topic ID = 169)
  KET_QUA_XU_LY: {
    id: parseInt(process.env.TELEGRAM_TOPIC_KET_QUA_XU_LY || '169'),
    name: 'KẾT QUẢ XỬ LÝ',
    icon: '📊',
    reports: ['morning', 'evening', 'realtime'],
    description: 'Báo cáo tổng quan chuyến đi và xử lý'
  } as TelegramTopic,

  // Topic: ĐỐI TÁC VẬN CHUYỂN
  DOI_TAC_VAN_CHUYEN: {
    id: parseInt(process.env.TELEGRAM_TOPIC_DOI_TAC || '0'),
    name: 'ĐỐI TÁC VẬN CHUYỂN',
    icon: '🚚',
    reports: ['morning', 'evening'],
    description: 'Báo cáo hiệu suất đối tác vận chuyển'
  } as TelegramTopic,

  // Topic: KHÁCH HÀNG
  KHACH_HANG: {
    id: parseInt(process.env.TELEGRAM_TOPIC_KHACH_HANG || '0'),
    name: 'KHÁCH HÀNG',
    icon: '💼',
    reports: ['morning', 'evening'],
    description: 'Báo cáo xử lý chuyến đi theo khách hàng'
  } as TelegramTopic,
} as const;

/**
 * Bot Configuration
 */
export const BOT_CONFIG = {
  token: process.env.TELEGRAM_BOT_TOKEN || '',
  groupChatId: process.env.TELEGRAM_GROUP_CHAT_ID || '',
  webhookUrl: process.env.TELEGRAM_WEBHOOK_URL || '',

  // Conversation settings
  maxHistoryLength: 10,
  contextTimeout: 30 * 60 * 1000, // 30 minutes

  // Rate limiting
  maxMessagesPerMinute: 20,

  // Feature flags
  enableLLM: process.env.TELEGRAM_ENABLE_LLM === 'true',
  enableVoice: process.env.TELEGRAM_ENABLE_VOICE === 'true',
  enableCharts: process.env.TELEGRAM_ENABLE_CHARTS === 'true',
} as const;

/**
 * Validate configuration
 */
export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!BOT_CONFIG.token) {
    errors.push('TELEGRAM_BOT_TOKEN is required');
  }

  if (!BOT_CONFIG.groupChatId) {
    errors.push('TELEGRAM_GROUP_CHAT_ID is required');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
