/**
 * =============================================================================
 * TELEGRAM CHATBOT - AUTHENTICATION MODULE
 * =============================================================================
 *
 * User authentication, authorization, and permission management
 */

import { sql } from '@vercel/postgres';
import { AuthenticatedUser, BotContext } from './types';

// =============================================================================
// AUTHENTICATION FUNCTIONS
// =============================================================================

/**
 * Authenticate user by Telegram chat_id
 *
 * @param chatId - Telegram chat ID
 * @returns AuthenticatedUser object or null if not found
 */
export async function authenticateUser(
  chatId: string
): Promise<AuthenticatedUser | null> {
  try {
    const result = await sql`
      SELECT
        ma_nhan_vien as "maNhanVien",
        ho_va_ten as "hoVaTen",
        phong_ban as "phongBan",
        chuc_vu as "chucVu",
        phan_quyen as "phanQuyen",
        chat_id as "chatId",
        xem,
        them,
        sua,
        xoa,
        is_active as "isActive"
      FROM nhan_vien
      WHERE chat_id = ${chatId}
        AND is_active = true
      LIMIT 1
    `;

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];

    return {
      maNhanVien: row.maNhanVien,
      hoVaTen: row.hoVaTen,
      phongBan: row.phongBan || 'N/A',
      chucVu: row.chucVu || 'N/A',
      phanQuyen: (row.phanQuyen || 'user') as 'admin' | 'manager' | 'staff' | 'user',
      chatId: row.chatId,
      permissions: {
        xem: row.xem || false,
        them: row.them || false,
        sua: row.sua || false,
        xoa: row.xoa || false
      }
    };
  } catch (error) {
    console.error('[AUTH] Error authenticating user:', error);
    return null;
  }
}

/**
 * Register user manually by employee code
 * Updates chat_id in database
 *
 * @param chatId - Telegram chat ID
 * @param employeeCode - Employee code (ma_nhan_vien)
 * @returns AuthenticatedUser object or null if registration failed
 */
export async function registerUser(
  chatId: string,
  employeeCode: string
): Promise<AuthenticatedUser | null> {
  try {
    const result = await sql`
      UPDATE nhan_vien
      SET chat_id = ${chatId},
          updated_at = NOW()
      WHERE ma_nhan_vien = ${employeeCode}
        AND is_active = true
      RETURNING
        ma_nhan_vien as "maNhanVien",
        ho_va_ten as "hoVaTen",
        phong_ban as "phongBan",
        chuc_vu as "chucVu",
        phan_quyen as "phanQuyen",
        chat_id as "chatId",
        xem,
        them,
        sua,
        xoa
    `;

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];

    return {
      maNhanVien: row.maNhanVien,
      hoVaTen: row.hoVaTen,
      phongBan: row.phongBan || 'N/A',
      chucVu: row.chucVu || 'N/A',
      phanQuyen: (row.phanQuyen || 'user') as 'admin' | 'manager' | 'staff' | 'user',
      chatId: row.chatId,
      permissions: {
        xem: row.xem || false,
        them: row.them || false,
        sua: row.sua || false,
        xoa: row.xoa || false
      }
    };
  } catch (error) {
    console.error('[AUTH] Error registering user:', error);
    return null;
  }
}

// =============================================================================
// PERMISSION CHECKS
// =============================================================================

/**
 * Check if user has specific permission
 *
 * @param user - Authenticated user
 * @param action - Permission to check (xem, them, sua, xoa)
 * @returns true if user has permission
 */
export function hasPermission(
  user: AuthenticatedUser,
  action: 'xem' | 'them' | 'sua' | 'xoa'
): boolean {
  return user.permissions[action] === true;
}

/**
 * Check if user has specific role(s)
 *
 * @param user - Authenticated user
 * @param roles - Array of allowed roles
 * @returns true if user has one of the roles
 */
export function hasRole(
  user: AuthenticatedUser,
  roles: Array<'admin' | 'manager' | 'staff' | 'user'>
): boolean {
  return roles.includes(user.phanQuyen);
}

/**
 * Check if user is admin
 *
 * @param user - Authenticated user
 * @returns true if user is admin
 */
export function isAdmin(user: AuthenticatedUser): boolean {
  return user.phanQuyen === 'admin';
}

// =============================================================================
// MIDDLEWARE FUNCTIONS
// =============================================================================

/**
 * Middleware: Require authentication
 * Attaches user to ctx.state.user if authenticated
 *
 * Usage:
 * bot.command('menu', requireAuth, async (ctx) => { ... })
 */
export async function requireAuth(ctx: BotContext, next: () => Promise<void>) {
  const chatId = ctx.chat?.id.toString();

  if (!chatId) {
    await ctx.reply('❌ Không thể xác thực người dùng.');
    return;
  }

  const user = await authenticateUser(chatId);

  if (!user) {
    await ctx.reply(
      '🔒 **Bạn chưa được xác thực.**\n\n' +
      'Sử dụng /start để bắt đầu hoặc /register <mã_NV> để đăng ký.',
      { parse_mode: 'Markdown' }
    );
    return;
  }

  // Attach user to context
  if (!ctx.state) {
    ctx.state = {};
  }
  ctx.state.user = user;

  await next();
}

/**
 * Middleware factory: Require specific permission
 *
 * Usage:
 * bot.command('create', requireAuth, requirePermission('them'), async (ctx) => { ... })
 */
export function requirePermission(action: 'xem' | 'them' | 'sua' | 'xoa') {
  return async (ctx: BotContext, next: () => Promise<void>) => {
    const user = ctx.state?.user as AuthenticatedUser;

    if (!user) {
      await ctx.reply('❌ Bạn chưa được xác thực.');
      return;
    }

    if (!hasPermission(user, action)) {
      await ctx.reply(
        `❌ **Không đủ quyền hạn**\n\n` +
        `Bạn không có quyền "${action}" để thực hiện thao tác này.`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    await next();
  };
}

/**
 * Middleware factory: Require specific role(s)
 *
 * Usage:
 * bot.command('users', requireAuth, requireRole(['admin', 'manager']), async (ctx) => { ... })
 */
export function requireRole(roles: Array<'admin' | 'manager' | 'staff' | 'user'>) {
  return async (ctx: BotContext, next: () => Promise<void>) => {
    const user = ctx.state?.user as AuthenticatedUser;

    if (!user) {
      await ctx.reply('❌ Bạn chưa được xác thực.');
      return;
    }

    if (!hasRole(user, roles)) {
      await ctx.reply(
        `❌ **Không đủ quyền hạn**\n\n` +
        `Tính năng này chỉ dành cho: ${roles.join(', ')}`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    await next();
  };
}

// =============================================================================
// RATE LIMITING
// =============================================================================

const rateLimiter = new Map<string, number[]>();

/**
 * Check if user exceeded rate limit
 *
 * @param chatId - Telegram chat ID
 * @param maxRequests - Maximum requests allowed (default: 10)
 * @param windowMs - Time window in milliseconds (default: 60000 = 1 minute)
 * @returns true if within limits, false if exceeded
 */
export function checkRateLimit(
  chatId: string,
  maxRequests: number = 10,
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const userRequests = rateLimiter.get(chatId) || [];

  // Clean old requests outside the window
  const validRequests = userRequests.filter(time => now - time < windowMs);

  if (validRequests.length >= maxRequests) {
    return false; // Rate limit exceeded
  }

  validRequests.push(now);
  rateLimiter.set(chatId, validRequests);
  return true;
}

/**
 * Middleware: Rate limiting
 *
 * Usage:
 * bot.command('search', requireAuth, rateLimit(), async (ctx) => { ... })
 */
export function rateLimit(maxRequests: number = 10, windowMs: number = 60000) {
  return async (ctx: BotContext, next: () => Promise<void>) => {
    const chatId = ctx.chat?.id.toString();

    if (!chatId) {
      return;
    }

    if (!checkRateLimit(chatId, maxRequests, windowMs)) {
      await ctx.reply(
        '⚠️ **Rate limit exceeded**\n\n' +
        `Bạn đã gửi quá nhiều yêu cầu. Vui lòng đợi ${windowMs / 1000} giây.`
      );
      return;
    }

    await next();
  };
}

// =============================================================================
// ADMIN FUNCTIONS
// =============================================================================

/**
 * Get list of registered users (Admin only)
 *
 * @param limit - Maximum number of users to return (default: 20)
 * @returns Array of user records
 */
export async function getRegisteredUsers(limit: number = 20) {
  try {
    const result = await sql`
      SELECT
        ma_nhan_vien as "maNhanVien",
        ho_va_ten as "hoVaTen",
        phong_ban as "phongBan",
        chuc_vu as "chucVu",
        chat_id as "chatId",
        phan_quyen as "phanQuyen",
        is_active as "isActive",
        updated_at as "updatedAt"
      FROM nhan_vien
      WHERE chat_id IS NOT NULL
      ORDER BY updated_at DESC
      LIMIT ${limit}
    `;

    return result.rows;
  } catch (error) {
    console.error('[AUTH] Error fetching registered users:', error);
    return [];
  }
}

/**
 * Revoke user access (set chat_id to null)
 *
 * @param employeeCode - Employee code
 * @returns true if successful
 */
export async function revokeUserAccess(employeeCode: string): Promise<boolean> {
  try {
    await sql`
      UPDATE nhan_vien
      SET chat_id = NULL,
          updated_at = NOW()
      WHERE ma_nhan_vien = ${employeeCode}
    `;
    return true;
  } catch (error) {
    console.error('[AUTH] Error revoking user access:', error);
    return false;
  }
}
