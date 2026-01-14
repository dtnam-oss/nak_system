#!/usr/bin/env tsx
/**
 * Check Telegram User Registration Status
 *
 * Usage:
 *   npx tsx scripts/check-telegram-user.ts <chat_id>
 *   npx tsx scripts/check-telegram-user.ts 182283559
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { sql } from '@vercel/postgres';

// Load environment
config({ path: resolve(process.cwd(), '.env.local') });

async function checkUser(chatId: string) {
  console.log(`\n🔍 Checking registration status for Chat ID: ${chatId}\n`);

  try {
    // Check if user exists
    const result = await sql`
      SELECT
        ma_nhan_vien as "maNhanVien",
        ho_va_ten as "hoVaTen",
        phong_ban as "phongBan",
        chuc_vu as "chucVu",
        phan_quyen as "phanQuyen",
        chat_id as "chatId",
        xem, them, sua, xoa,
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM nhan_vien
      WHERE chat_id = ${chatId}
    `;

    if (result.rows.length === 0) {
      console.log('❌ User NOT FOUND in database');
      console.log('\nPossible solutions:');
      console.log('1. User needs to register with /register <employee_code>');
      console.log('2. Admin needs to manually add chat_id to database');
      console.log('\nTo register manually, run:');
      console.log(`   UPDATE nhan_vien SET chat_id = '${chatId}' WHERE ma_nhan_vien = '<employee_code>';`);
      return;
    }

    const user = result.rows[0];

    console.log('✅ User FOUND in database\n');
    console.log('User Information:');
    console.log('─────────────────────────────────────');
    console.log(`Employee Code:  ${user.maNhanVien}`);
    console.log(`Full Name:      ${user.hoVaTen}`);
    console.log(`Department:     ${user.phongBan || 'N/A'}`);
    console.log(`Position:       ${user.chucVu || 'N/A'}`);
    console.log(`Role:           ${user.phanQuyen || 'user'}`);
    console.log(`Chat ID:        ${user.chatId}`);
    console.log('─────────────────────────────────────');
    console.log('Permissions:');
    console.log(`  - View (xem):   ${user.xem ? '✅' : '❌'}`);
    console.log(`  - Add (them):   ${user.them ? '✅' : '❌'}`);
    console.log(`  - Edit (sua):   ${user.sua ? '✅' : '❌'}`);
    console.log(`  - Delete (xoa): ${user.xoa ? '✅' : '❌'}`);
    console.log('─────────────────────────────────────');
    console.log(`Active:         ${user.isActive ? '✅ Yes' : '❌ No'}`);
    console.log(`Created:        ${user.createdAt}`);
    console.log(`Updated:        ${user.updatedAt}`);
    console.log('─────────────────────────────────────\n');

    if (!user.isActive) {
      console.log('⚠️  WARNING: User is INACTIVE');
      console.log('   User will not be able to authenticate until activated.');
      console.log('\nTo activate, run:');
      console.log(`   UPDATE nhan_vien SET is_active = true WHERE ma_nhan_vien = '${user.maNhanVien}';`);
    } else {
      console.log('✅ User can authenticate successfully');
    }

  } catch (error) {
    console.error('❌ Error checking user:', error);
    process.exit(1);
  }
}

// Parse arguments
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('❌ Missing chat_id argument');
  console.log('\nUsage:');
  console.log('  npx tsx scripts/check-telegram-user.ts <chat_id>');
  console.log('\nExample:');
  console.log('  npx tsx scripts/check-telegram-user.ts 182283559');
  process.exit(1);
}

const chatId = args[0];
checkUser(chatId);
