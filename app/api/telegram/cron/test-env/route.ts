import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const cronSecret = process.env.CRON_SECRET;
  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;

  return NextResponse.json({
    hasCronSecret: !!cronSecret,
    cronSecretLength: cronSecret?.length || 0,
    cronSecretFirst5: cronSecret?.substring(0, 5) || 'N/A',
    hasBotToken: !!telegramBotToken,
    botTokenLength: telegramBotToken?.length || 0,
    allEnvKeys: Object.keys(process.env).filter(k => k.includes('CRON') || k.includes('TELEGRAM')),
    groupChatId: process.env.TELEGRAM_GROUP_CHAT_ID,
    topicKetQua: process.env.TELEGRAM_TOPIC_KET_QUA_XU_LY,
    topicDoiTac: process.env.TELEGRAM_TOPIC_DOI_TAC,
    topicKhachHang: process.env.TELEGRAM_TOPIC_KHACH_HANG,
  });
}
