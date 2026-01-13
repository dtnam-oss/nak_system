import { NextRequest, NextResponse } from 'next/server';
import { Telegraf } from 'telegraf';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

export async function POST(req: NextRequest) {
  try {
    const update = await req.json();
    console.log('[MINIMAL_WEBHOOK] Received update:', update.update_id);

    // Create bot instance
    const bot = new Telegraf(BOT_TOKEN);

    // Register /start command
    bot.command('start', async (ctx) => {
      await ctx.reply(
        '✅ Bot đang hoạt động!\n\n' +
          `Chat ID: ${ctx.chat.id}\n` +
          `Username: @${ctx.from?.username || 'N/A'}\n\n` +
          'Đây là minimal webhook test.'
      );
    });

    // Process update
    await bot.handleUpdate(update);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[MINIMAL_WEBHOOK] Error:', error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Minimal webhook endpoint',
    timestamp: new Date().toISOString()
  });
}
