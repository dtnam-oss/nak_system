import { NextRequest, NextResponse } from 'next/server';
import { telegramBot } from '../services/telegram-bot';
import { handleMessage } from '../handlers/message-handler';
import { handleCallbackQuery } from '../handlers/callback-handler';
import { validateConfig } from '../config/topics';

// Force Node.js runtime (telegraf doesn't work in Edge runtime)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Telegram Webhook Handler
 * Receives updates from Telegram and processes them
 */
export async function POST(req: NextRequest) {
  try {
    // Validate configuration
    const configValidation = validateConfig();
    if (!configValidation.valid) {
      console.error('❌ Configuration errors:', configValidation.errors);
      return NextResponse.json(
        { error: 'Bot configuration error', details: configValidation.errors },
        { status: 500 }
      );
    }

    // Parse update from Telegram
    const update = await req.json();
    console.log('📨 Received update:', JSON.stringify(update, null, 2));

    const bot = telegramBot.getBot();

    // Handle text messages
    if (update.message?.text) {
      const message = update.message;
      const chatId = message.chat.id;
      const userId = message.from.id;
      const text = message.text;
      const messageThreadId = message.message_thread_id;

      console.log(`💬 Message from user ${userId} in chat ${chatId}: ${text}`);

      // Send typing indicator
      await telegramBot.sendTyping(chatId);

      // Handle the message
      await handleMessage({
        userId: userId.toString(),
        chatId: chatId.toString(),
        text,
        messageThreadId,
      });
    }

    // Handle callback queries (button clicks)
    if (update.callback_query) {
      const callbackQuery = update.callback_query;
      const chatId = callbackQuery.message.chat.id;
      const userId = callbackQuery.from.id;
      const data = callbackQuery.data;
      const messageId = callbackQuery.message.message_id;
      const messageThreadId = callbackQuery.message.message_thread_id;

      console.log(`🔘 Callback from user ${userId}: ${data}`);

      // Answer callback query immediately
      await bot.telegram.answerCbQuery(callbackQuery.id);

      // Handle the callback
      await handleCallbackQuery({
        userId: userId.toString(),
        chatId: chatId.toString(),
        data,
        messageId,
        messageThreadId,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('❌ Webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Health check endpoint
 */
export async function GET() {
  try {
    const configValidation = validateConfig();

    return NextResponse.json({
      status: 'ok',
      config: configValidation.valid ? 'valid' : 'invalid',
      errors: configValidation.errors,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { status: 'error', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
