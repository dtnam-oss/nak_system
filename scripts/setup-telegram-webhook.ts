#!/usr/bin/env tsx

/**
 * Setup Telegram Webhook
 *
 * Usage:
 *   npx tsx scripts/setup-telegram-webhook.ts
 *
 * Make sure you have configured:
 * - TELEGRAM_BOT_TOKEN in .env.local
 * - TELEGRAM_WEBHOOK_URL in .env.local
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_URL = process.env.TELEGRAM_WEBHOOK_URL;

async function setupWebhook() {
  console.log('🚀 Setting up Telegram webhook...\n');

  // Validate environment variables
  if (!BOT_TOKEN) {
    console.error('❌ TELEGRAM_BOT_TOKEN is not set in .env.local');
    process.exit(1);
  }

  if (!WEBHOOK_URL) {
    console.error('❌ TELEGRAM_WEBHOOK_URL is not set in .env.local');
    process.exit(1);
  }

  console.log(`📍 Webhook URL: ${WEBHOOK_URL}`);

  try {
    // Set webhook
    const setWebhookUrl = `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`;

    const response = await fetch(setWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: WEBHOOK_URL,
        allowed_updates: ['message', 'callback_query'],
        drop_pending_updates: true,
      }),
    });

    const result = await response.json();

    if (result.ok) {
      console.log('✅ Webhook set successfully!\n');
    } else {
      console.error('❌ Failed to set webhook:', result);
      process.exit(1);
    }

    // Get webhook info
    console.log('📊 Getting webhook info...\n');

    const getWebhookUrl = `https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`;
    const infoResponse = await fetch(getWebhookUrl);
    const info = await infoResponse.json();

    if (info.ok) {
      console.log('Webhook Info:');
      console.log('  URL:', info.result.url);
      console.log('  Has custom certificate:', info.result.has_custom_certificate);
      console.log('  Pending update count:', info.result.pending_update_count);
      console.log('  Last error date:', info.result.last_error_date || 'None');
      console.log('  Last error message:', info.result.last_error_message || 'None');
      console.log();
    }

    // Test webhook
    console.log('🧪 Testing webhook endpoint...\n');

    try {
      const testResponse = await fetch(WEBHOOK_URL.replace(/\/webhook$/, '/webhook'), {
        method: 'GET',
      });

      const testResult = await testResponse.json();

      if (testResult.status === 'ok') {
        console.log('✅ Webhook endpoint is responding correctly!');
        console.log('   Status:', testResult.status);
        console.log('   Config:', testResult.config);
      } else {
        console.log('⚠️  Webhook endpoint response:', testResult);
      }
    } catch (error) {
      console.log('⚠️  Could not test webhook endpoint:', error instanceof Error ? error.message : 'Unknown error');
    }

    console.log('\n✅ Setup complete!');
    console.log('\n📝 Next steps:');
    console.log('   1. Send /start to your bot in Telegram');
    console.log('   2. Try commands like /today, /realtime');
    console.log('   3. Setup cron jobs for scheduled reports');
    console.log();

  } catch (error) {
    console.error('❌ Error setting up webhook:', error);
    process.exit(1);
  }
}

setupWebhook();
