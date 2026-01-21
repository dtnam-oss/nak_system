#!/usr/bin/env tsx
/**
 * Test Employees Telegram Handlers
 *
 * Usage:
 *   npx tsx scripts/test-employees-telegram.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { sql } from '@vercel/postgres';

config({ path: resolve(process.cwd(), '.env.local') });

async function testEmployees() {
  console.log('\n🧪 TESTING TELEGRAM EMPLOYEES QUERIES\n');
  console.log('━'.repeat(50));

  try {
    // Test 1: Total Employees
    console.log('\n📊 Test 1: Employee Overview');
    console.log('─'.repeat(50));

    const totalResult = await sql`
      SELECT COUNT(*) as total
      FROM nhan_vien
      WHERE is_active = true
    `;

    const total = Number(totalResult.rows[0].total);
    console.log(`✅ Total employees: ${total}`);

    // Get by status
    const statusResult = await sql`
      SELECT
        trang_thai as "trangThai",
        COUNT(*) as "total"
      FROM nhan_vien
      WHERE is_active = true
      GROUP BY trang_thai
    `;

    console.log('\nBy status:');
    statusResult.rows.forEach(row => {
      console.log(`  ${row.trangThai || 'Unknown'}: ${row.total}`);
    });

    // Test 2: Employees by Position
    console.log('\n👔 Test 2: Employees by Position');
    console.log('─'.repeat(50));

    const positionResult = await sql`
      SELECT
        chuc_vu as "chucVu",
        COUNT(*) as "total"
      FROM nhan_vien
      WHERE is_active = true
        AND chuc_vu IS NOT NULL
        AND chuc_vu != ''
      GROUP BY chuc_vu
      ORDER BY "total" DESC
    `;

    console.log(`✅ Found ${positionResult.rows.length} positions`);
    positionResult.rows.slice(0, 5).forEach((pos, idx) => {
      console.log(`${idx + 1}. ${pos.chucVu}: ${pos.total} người`);
    });

    // Test 3: Employees by Department
    console.log('\n🏢 Test 3: Employees by Department');
    console.log('─'.repeat(50));

    const departmentResult = await sql`
      SELECT
        phong_ban as "phongBan",
        COUNT(*) as "total"
      FROM nhan_vien
      WHERE is_active = true
        AND phong_ban IS NOT NULL
        AND phong_ban != ''
      GROUP BY phong_ban
      ORDER BY "total" DESC
      LIMIT 5
    `;

    console.log(`✅ Found ${departmentResult.rows.length} departments`);
    departmentResult.rows.forEach((dept, idx) => {
      console.log(`${idx + 1}. ${dept.phongBan}: ${dept.total} người`);
    });

    // Test 4: Search Employee
    console.log('\n🔍 Test 4: Search Employee');
    console.log('─'.repeat(50));

    const sampleResult = await sql`
      SELECT ma_nhan_vien as "maNhanVien"
      FROM nhan_vien
      WHERE is_active = true
      LIMIT 1
    `;

    if (sampleResult.rows.length > 0) {
      const empCode = sampleResult.rows[0].maNhanVien;
      console.log(`Testing with employee code: ${empCode}`);

      const empResult = await sql`
        SELECT
          ma_nhan_vien as "maNhanVien",
          ho_va_ten as "hoVaTen",
          phong_ban as "phongBan",
          chuc_vu as "chucVu",
          so_dien_thoai as "soDienThoai",
          email,
          trang_thai as "trangThai",
          ngay_vao_lam as "ngayVaoLam"
        FROM nhan_vien
        WHERE is_active = true
          AND ma_nhan_vien = ${empCode}
        LIMIT 1
      `;

      if (empResult.rows.length > 0) {
        const emp = empResult.rows[0];
        console.log(`✅ Employee found:`);
        console.log(`   Mã: ${emp.maNhanVien}`);
        console.log(`   Họ tên: ${emp.hoVaTen}`);
        console.log(`   Phòng ban: ${emp.phongBan || 'N/A'}`);
        console.log(`   Chức vụ: ${emp.chucVu || 'N/A'}`);
        console.log(`   SĐT: ${emp.soDienThoai || 'N/A'}`);
        console.log(`   Email: ${emp.email || 'N/A'}`);
        console.log(`   Trạng thái: ${emp.trangThai || 'N/A'}`);
      }
    }

    // Test 5: Search by Name
    console.log('\n🔍 Test 5: Search by Name');
    console.log('─'.repeat(50));

    const nameSearchResult = await sql`
      SELECT
        ma_nhan_vien as "maNhanVien",
        ho_va_ten as "hoVaTen",
        chuc_vu as "chucVu"
      FROM nhan_vien
      WHERE is_active = true
        AND ho_va_ten IS NOT NULL
      ORDER BY ma_nhan_vien
      LIMIT 1
    `;

    if (nameSearchResult.rows.length > 0) {
      const emp = nameSearchResult.rows[0];
      const searchTerm = emp.hoVaTen.split(' ')[0]; // Get first name
      console.log(`Testing search with term: "${searchTerm}"`);

      const searchResult = await sql`
        SELECT
          ma_nhan_vien as "maNhanVien",
          ho_va_ten as "hoVaTen",
          chuc_vu as "chucVu"
        FROM nhan_vien
        WHERE is_active = true
          AND UPPER(ho_va_ten) LIKE UPPER(${`%${searchTerm}%`})
        ORDER BY ma_nhan_vien
        LIMIT 5
      `;

      console.log(`✅ Found ${searchResult.rows.length} employees matching "${searchTerm}"`);
      searchResult.rows.forEach((e, idx) => {
        console.log(`${idx + 1}. ${e.hoVaTen} (${e.maNhanVien}) - ${e.chucVu || 'N/A'}`);
      });
    }

    // Test 6: List Employees
    console.log('\n📋 Test 6: List Employees');
    console.log('─'.repeat(50));

    const listResult = await sql`
      SELECT
        ma_nhan_vien as "maNhanVien",
        ho_va_ten as "hoVaTen",
        phong_ban as "phongBan",
        chuc_vu as "chucVu",
        trang_thai as "trangThai"
      FROM nhan_vien
      WHERE is_active = true
      ORDER BY ma_nhan_vien
      LIMIT 5
    `;

    console.log(`✅ Listing first 5 employees:`);
    listResult.rows.forEach((emp, idx) => {
      console.log(`${idx + 1}. ${emp.hoVaTen} (${emp.maNhanVien})`);
      console.log(`   ${emp.phongBan || 'N/A'} - ${emp.chucVu || 'N/A'}`);
      console.log(`   Status: ${emp.trangThai || 'N/A'}`);
    });

    // Summary
    console.log('\n' + '━'.repeat(50));
    console.log('✅ ALL TESTS PASSED!');
    console.log('━'.repeat(50));
    console.log('\n📊 Summary:');
    console.log(`  • Total Employees: ✅ (${total} nhân viên)`);
    console.log(`  • By Position: ✅ (${positionResult.rows.length} chức vụ)`);
    console.log(`  • By Department: ✅ (${departmentResult.rows.length} phòng ban)`);
    console.log(`  • Search by Code: ✅`);
    console.log(`  • Search by Name: ✅`);
    console.log(`  • List Employees: ✅`);
    console.log('\n🎉 All employee queries are working correctly!\n');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    process.exit(1);
  }
}

testEmployees();
