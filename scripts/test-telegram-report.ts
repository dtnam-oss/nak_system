#!/usr/bin/env tsx

/**
 * Test Telegram Scheduled Reports
 *
 * Usage:
 *   npx tsx scripts/test-telegram-report.ts [morning|evening]
 *
 * Examples:
 *   npx tsx scripts/test-telegram-report.ts morning
 *   npx tsx scripts/test-telegram-report.ts evening
 */

import 'dotenv/config';

const APP_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const CRON_SECRET = process.env.CRON_SECRET || 'your-secret-token';

async function testReport(reportType: 'morning' | 'evening') {
  console.log(`🧪 Testing ${reportType} report...\n`);

  const url = `${APP_URL}/api/telegram/cron/send-reports?type=${reportType}&secret=${CRON_SECRET}`;

  console.log(`📍 URL: ${url}\n`);

  try {
    const response = await fetch(url);
    const result = await response.json();

    if (response.ok) {
      console.log('✅ Report sent successfully!\n');
      console.log('Results:');
      console.log(JSON.stringify(result, null, 2));
      console.log();
    } else {
      console.error('❌ Failed to send report:');
      console.error(JSON.stringify(result, null, 2));
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Parse arguments
const args = process.argv.slice(2);
const reportType = args[0] as 'morning' | 'evening';

if (!reportType || !['morning', 'evening'].includes(reportType)) {
  console.error('❌ Invalid report type. Use "morning" or "evening"');
  console.log('\nUsage:');
  console.log('  npx tsx scripts/test-telegram-report.ts [morning|evening]');
  console.log('\nExamples:');
  console.log('  npx tsx scripts/test-telegram-report.ts morning');
  console.log('  npx tsx scripts/test-telegram-report.ts evening');
  process.exit(1);
}

testReport(reportType);
