/**
 * =============================================================================
 * TELEGRAM CHATBOT - EMPLOYEES HANDLERS
 * =============================================================================
 *
 * Query handlers for employee management
 */

import { sql } from '@vercel/postgres';
import { BotContext, AuthenticatedUser } from '../types';
import {
  formatNumber,
  formatDate,
  formatError,
  truncate
} from '../formatters';
import {
  getEmployeesMenuKeyboard,
  getRefreshBackKeyboard,
  getCancelKeyboard
} from '../keyboards';

// =============================================================================
// EMPLOYEES MENU
// =============================================================================

export async function handleEmployeesMenu(ctx: BotContext) {
  try {
    await ctx.answerCbQuery();

    await ctx.editMessageText(
      '👥 **QUẢN LÝ NHÂN VIÊN**\n\n' + 'Chọn chức năng bạn muốn sử dụng:',
      {
        parse_mode: 'Markdown',
        ...getEmployeesMenuKeyboard()
      }
    );
  } catch (error) {
    console.error('[EMPLOYEES_MENU] Error:', error);
    try {
      await ctx.answerCbQuery('❌ Lỗi khi tải menu');
    } catch (e) {
      console.error('[EMPLOYEES_MENU] Failed to answer callback:', e);
    }
  }
}

// =============================================================================
// EMPLOYEES OVERVIEW
// =============================================================================

export async function handleEmployeesOverview(ctx: BotContext) {
  try {
    await ctx.answerCbQuery('⏳ Đang tải tổng quan...');

    // Get total employees
    const totalResult = await sql`
      SELECT COUNT(*) as total
      FROM nhan_vien
      WHERE is_active = true
    `;

    const total = Number(totalResult.rows[0].total);

    // Get employees by position
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

    // Get employees by department
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

    // Get active vs inactive
    const statusResult = await sql`
      SELECT
        trang_thai as "trangThai",
        COUNT(*) as "total"
      FROM nhan_vien
      WHERE is_active = true
      GROUP BY trang_thai
    `;

    let message = `👥 **TỔNG QUAN NHÂN VIÊN**\n\n`;
    message += `📊 **Tổng số:** ${formatNumber(total)} nhân viên\n\n`;

    // Status breakdown
    if (statusResult.rows.length > 0) {
      message += `📋 **Trạng thái:**\n`;
      statusResult.rows.forEach(row => {
        const status = row.trangThai || 'Chưa xác định';
        const icon = status === 'Đang làm việc' ? '✅' : '⏸️';
        message += `   ${icon} ${status}: ${formatNumber(row.total)}\n`;
      });
      message += '\n';
    }

    // Position breakdown
    if (positionResult.rows.length > 0) {
      message += `👔 **Theo chức vụ:**\n`;
      positionResult.rows.forEach(row => {
        message += `   • ${row.chucVu}: ${formatNumber(row.total)}\n`;
      });
      message += '\n';
    }

    // Department breakdown
    if (departmentResult.rows.length > 0) {
      message += `🏢 **Top 5 phòng ban:**\n`;
      departmentResult.rows.forEach((row, index) => {
        message += `   ${index + 1}. ${row.phongBan}: ${formatNumber(row.total)}\n`;
      });
      message += '\n';
    }

    message += `🕐 Cập nhật: ${new Date().toLocaleTimeString('vi-VN')}`;

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      ...getRefreshBackKeyboard('employees_overview', 'menu_employees')
    });
  } catch (error) {
    console.error('[EMPLOYEES_OVERVIEW] Error:', error);
    await ctx.editMessageText(formatError('Không thể tải tổng quan nhân viên'), {
      parse_mode: 'Markdown',
      ...getRefreshBackKeyboard('employees_overview', 'menu_employees')
    });
  }
}

// =============================================================================
// SEARCH EMPLOYEE
// =============================================================================

export async function handleEmployeesSearch(ctx: BotContext) {
  try {
    await ctx.answerCbQuery();

    await ctx.editMessageText(
      '🔍 **TRA CỨU NHÂN VIÊN**\n\n' +
        'Nhập tên hoặc mã nhân viên để tra cứu:\n' +
        'Ví dụ: `NV001` hoặc `Nguyễn Văn A`\n\n' +
        '💡 Sử dụng lệnh: `/nv <tên_hoặc_mã>`',
      {
        parse_mode: 'Markdown',
        ...getCancelKeyboard('menu_employees')
      }
    );
  } catch (error) {
    console.error('[EMPLOYEES_SEARCH] Error:', error);
    try {
      await ctx.answerCbQuery('❌ Lỗi');
    } catch (e) {
      console.error('[EMPLOYEES_SEARCH] Failed to answer callback:', e);
    }
  }
}

// =============================================================================
// SEARCH EMPLOYEE COMMAND
// =============================================================================

export async function handleEmployeeSearchCommand(ctx: BotContext) {
  // Type guard: ensure message exists and has text
  if (!ctx.message || !('text' in ctx.message)) {
    await ctx.reply('❌ Lỗi: Không thể đọc tin nhắn.');
    return;
  }

  const args = ctx.message.text.split(' ').slice(1);

  if (args.length === 0) {
    await ctx.reply(
      '❌ Vui lòng nhập tên hoặc mã nhân viên.\n\n' +
        'Ví dụ: `/nv NV001` hoặc `/nv Nguyễn Văn A`',
      { parse_mode: 'Markdown' }
    );
    return;
  }

  const searchTerm = args.join(' ').trim();

  try {
    // Search by employee code or name
    const result = await sql`
      SELECT
        ma_nhan_vien as "maNhanVien",
        ho_va_ten as "hoVaTen",
        phong_ban as "phongBan",
        chuc_vu as "chucVu",
        so_dien_thoai as "soDienThoai",
        email,
        trang_thai as "trangThai",
        ngay_vao_lam as "ngayVaoLam",
        dia_chi as "diaChi"
      FROM nhan_vien
      WHERE is_active = true
        AND (
          UPPER(ma_nhan_vien) LIKE UPPER(${`%${searchTerm}%`})
          OR UPPER(ho_va_ten) LIKE UPPER(${`%${searchTerm}%`})
        )
      ORDER BY ma_nhan_vien
      LIMIT 10
    `;

    if (result.rows.length === 0) {
      await ctx.reply(`❌ Không tìm thấy nhân viên: \`${searchTerm}\``, {
        parse_mode: 'Markdown'
      });
      return;
    }

    if (result.rows.length === 1) {
      // Show detailed info for single result
      const emp = result.rows[0];

      let message =
        `👤 **THÔNG TIN NHÂN VIÊN**\n\n` +
        `📋 **Mã:** \`${emp.maNhanVien}\`\n` +
        `👨 **Họ tên:** ${emp.hoVaTen}\n` +
        `🏢 **Phòng ban:** ${emp.phongBan || 'N/A'}\n` +
        `👔 **Chức vụ:** ${emp.chucVu || 'N/A'}\n` +
        `📞 **SĐT:** ${emp.soDienThoai || 'N/A'}\n` +
        `📧 **Email:** ${emp.email || 'N/A'}\n` +
        `📊 **Trạng thái:** ${emp.trangThai || 'N/A'}\n` +
        `📅 **Ngày vào làm:** ${formatDate(emp.ngayVaoLam)}\n`;

      if (emp.diaChi) {
        message += `📍 **Địa chỉ:** ${truncate(emp.diaChi, 50)}\n`;
      }

      await ctx.reply(message, {
        parse_mode: 'Markdown'
      });
    } else {
      // Show list for multiple results
      let message =
        `🔍 **KẾT QUẢ TÌM KIẾM**\n` +
        `Tìm thấy ${result.rows.length} nhân viên:\n\n`;

      result.rows.forEach((emp, index) => {
        message +=
          `${index + 1}. **${emp.hoVaTen}** (${emp.maNhanVien})\n` +
          `   🏢 ${emp.phongBan || 'N/A'} - ${emp.chucVu || 'N/A'}\n` +
          `   📊 ${emp.trangThai || 'N/A'}\n\n`;
      });

      message += `💡 Dùng \`/nv <mã>\` để xem chi tiết`;

      await ctx.reply(message, {
        parse_mode: 'Markdown'
      });
    }
  } catch (error) {
    console.error('[EMPLOYEE_SEARCH_COMMAND] Error:', error);
    await ctx.reply(formatError('Không thể tra cứu nhân viên'), {
      parse_mode: 'Markdown'
    });
  }
}

// =============================================================================
// EMPLOYEES BY DEPARTMENT
// =============================================================================

export async function handleEmployeesByDepartment(ctx: BotContext) {
  try {
    await ctx.answerCbQuery('⏳ Đang tải danh sách phòng ban...');

    const result = await sql`
      SELECT
        phong_ban as "phongBan",
        COUNT(*) as "total"
      FROM nhan_vien
      WHERE is_active = true
        AND phong_ban IS NOT NULL
        AND phong_ban != ''
      GROUP BY phong_ban
      ORDER BY "total" DESC
    `;

    if (result.rows.length === 0) {
      await ctx.editMessageText(
        '🏢 **NHÂN VIÊN THEO PHÒNG BAN**\n\n' + 'Chưa có dữ liệu.',
        {
          parse_mode: 'Markdown',
          ...getRefreshBackKeyboard('employees_by_department', 'menu_employees')
        }
      );
      return;
    }

    let message = `🏢 **NHÂN VIÊN THEO PHÒNG BAN**\n\n`;

    result.rows.forEach((dept, index) => {
      message +=
        `${index + 1}. **${dept.phongBan}**\n` +
        `   👥 ${formatNumber(dept.total)} nhân viên\n\n`;
    });

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      ...getRefreshBackKeyboard('employees_by_department', 'menu_employees')
    });
  } catch (error) {
    console.error('[EMPLOYEES_BY_DEPARTMENT] Error:', error);
    await ctx.editMessageText(formatError('Không thể tải danh sách phòng ban'), {
      parse_mode: 'Markdown',
      ...getRefreshBackKeyboard('employees_by_department', 'menu_employees')
    });
  }
}

// =============================================================================
// EMPLOYEES BY POSITION
// =============================================================================

export async function handleEmployeesByPosition(ctx: BotContext) {
  try {
    await ctx.answerCbQuery('⏳ Đang tải danh sách chức vụ...');

    const result = await sql`
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

    if (result.rows.length === 0) {
      await ctx.editMessageText(
        '👔 **NHÂN VIÊN THEO CHỨC VỤ**\n\n' + 'Chưa có dữ liệu.',
        {
          parse_mode: 'Markdown',
          ...getRefreshBackKeyboard('employees_by_position', 'menu_employees')
        }
      );
      return;
    }

    let message = `👔 **NHÂN VIÊN THEO CHỨC VỤ**\n\n`;

    result.rows.forEach((pos, index) => {
      message +=
        `${index + 1}. **${pos.chucVu}**\n` +
        `   👥 ${formatNumber(pos.total)} nhân viên\n\n`;
    });

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      ...getRefreshBackKeyboard('employees_by_position', 'menu_employees')
    });
  } catch (error) {
    console.error('[EMPLOYEES_BY_POSITION] Error:', error);
    await ctx.editMessageText(formatError('Không thể tải danh sách chức vụ'), {
      parse_mode: 'Markdown',
      ...getRefreshBackKeyboard('employees_by_position', 'menu_employees')
    });
  }
}

// =============================================================================
// EMPLOYEES LIST
// =============================================================================

export async function handleEmployeesList(ctx: BotContext) {
  try {
    await ctx.answerCbQuery('⏳ Đang tải danh sách nhân viên...');

    const result = await sql`
      SELECT
        ma_nhan_vien as "maNhanVien",
        ho_va_ten as "hoVaTen",
        phong_ban as "phongBan",
        chuc_vu as "chucVu",
        trang_thai as "trangThai"
      FROM nhan_vien
      WHERE is_active = true
      ORDER BY ma_nhan_vien
      LIMIT 20
    `;

    if (result.rows.length === 0) {
      await ctx.editMessageText(
        '📋 **DANH SÁCH NHÂN VIÊN**\n\n' + 'Chưa có nhân viên nào.',
        {
          parse_mode: 'Markdown',
          ...getRefreshBackKeyboard('employees_list', 'menu_employees')
        }
      );
      return;
    }

    let message =
      `📋 **DANH SÁCH NHÂN VIÊN**\n` +
      `Hiển thị ${result.rows.length} nhân viên\n\n`;

    result.rows.forEach((emp, index) => {
      const statusIcon = emp.trangThai === 'Đang làm việc' ? '✅' : '⏸️';
      message +=
        `${index + 1}. **${emp.hoVaTen}** (${emp.maNhanVien})\n` +
        `   🏢 ${emp.phongBan || 'N/A'}\n` +
        `   👔 ${emp.chucVu || 'N/A'}\n` +
        `   ${statusIcon} ${emp.trangThai || 'N/A'}\n\n`;
    });

    message += `💡 Dùng /nv <mã> để xem chi tiết`;

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      ...getRefreshBackKeyboard('employees_list', 'menu_employees')
    });
  } catch (error) {
    console.error('[EMPLOYEES_LIST] Error:', error);
    await ctx.editMessageText(formatError('Không thể tải danh sách nhân viên'), {
      parse_mode: 'Markdown',
      ...getRefreshBackKeyboard('employees_list', 'menu_employees')
    });
  }
}
