import { Telegraf, Context } from 'telegraf';
import { BOT_CONFIG } from '../config/topics';
import { BotResponse } from '@/types/telegram';

/**
 * Telegram Bot Service
 * Singleton instance for managing Telegram bot
 */
class TelegramBotService {
  private static instance: TelegramBotService;
  private bot: Telegraf | null = null;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): TelegramBotService {
    if (!TelegramBotService.instance) {
      TelegramBotService.instance = new TelegramBotService();
    }
    return TelegramBotService.instance;
  }

  /**
   * Initialize the bot
   */
  initialize(): Telegraf {
    if (this.isInitialized && this.bot) {
      return this.bot;
    }

    if (!BOT_CONFIG.token) {
      throw new Error('TELEGRAM_BOT_TOKEN is not configured');
    }

    this.bot = new Telegraf(BOT_CONFIG.token);
    this.isInitialized = true;

    return this.bot;
  }

  /**
   * Get bot instance
   */
  getBot(): Telegraf {
    if (!this.bot) {
      return this.initialize();
    }
    return this.bot;
  }

  /**
   * Send message to a specific topic in the group
   */
  async sendToTopic(
    topicId: number,
    message: string,
    options?: {
      parseMode?: 'Markdown' | 'HTML';
      keyboard?: any;
      photo?: string;
      disableNotification?: boolean;
    }
  ): Promise<void> {
    const bot = this.getBot();
    const chatId = BOT_CONFIG.groupChatId;

    if (!chatId) {
      throw new Error('TELEGRAM_GROUP_CHAT_ID is not configured');
    }

    try {
      if (options?.photo) {
        await bot.telegram.sendPhoto(chatId, options.photo, {
          caption: message,
          message_thread_id: topicId,
          parse_mode: options.parseMode,
          reply_markup: options.keyboard,
          disable_notification: options.disableNotification,
        });
      } else {
        await bot.telegram.sendMessage(chatId, message, {
          message_thread_id: topicId,
          parse_mode: options?.parseMode,
          reply_markup: options?.keyboard,
          disable_notification: options?.disableNotification,
        });
      }

      console.log(`✅ Message sent to topic ${topicId}`);
    } catch (error) {
      console.error(`❌ Failed to send to topic ${topicId}:`, error);
      throw error;
    }
  }

  /**
   * Send document to a specific topic
   */
  async sendDocumentToTopic(
    topicId: number,
    document: {
      filename: string;
      source: Buffer;
    },
    caption?: string
  ): Promise<void> {
    const bot = this.getBot();
    const chatId = BOT_CONFIG.groupChatId;

    if (!chatId) {
      throw new Error('TELEGRAM_GROUP_CHAT_ID is not configured');
    }

    try {
      await bot.telegram.sendDocument(
        chatId,
        {
          source: document.source,
          filename: document.filename,
        },
        {
          message_thread_id: topicId,
          caption: caption,
        }
      );

      console.log(`✅ Document sent to topic ${topicId}: ${document.filename}`);
    } catch (error) {
      console.error(`❌ Failed to send document to topic ${topicId}:`, error);
      throw error;
    }
  }

  /**
   * Send response to user
   */
  async sendResponse(
    chatId: string | number,
    response: BotResponse,
    messageThreadId?: number
  ): Promise<void> {
    const bot = this.getBot();

    try {
      if (response.document) {
        await bot.telegram.sendDocument(
          chatId,
          {
            source: response.document.buffer,
            filename: response.document.filename,
          },
          {
            caption: response.text,
            message_thread_id: messageThreadId,
          }
        );
      } else if (response.photo) {
        await bot.telegram.sendPhoto(chatId, response.photo, {
          caption: response.text,
          reply_markup: response.keyboard,
          message_thread_id: messageThreadId,
        });
      } else {
        await bot.telegram.sendMessage(chatId, response.text, {
          parse_mode: 'HTML',
          reply_markup: response.keyboard,
          message_thread_id: messageThreadId,
        });
      }
    } catch (error) {
      console.error('❌ Failed to send response:', error);
      throw error;
    }
  }

  /**
   * Send typing action
   */
  async sendTyping(chatId: string | number): Promise<void> {
    const bot = this.getBot();
    try {
      await bot.telegram.sendChatAction(chatId, 'typing');
    } catch (error) {
      console.error('❌ Failed to send typing action:', error);
    }
  }
}

// Export singleton instance
export const telegramBot = TelegramBotService.getInstance();
