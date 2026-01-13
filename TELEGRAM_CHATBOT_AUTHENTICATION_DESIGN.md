# 🔐 TELEGRAM CHATBOT - USER AUTHENTICATION DESIGN

## OVERVIEW

Hệ thống xác thực người dùng cho Telegram Bot với 2 phương pháp:
1. **Auto-authentication via chat_id** (Recommended)
2. **Manual registration via employee code**

---

## METHOD 1: AUTO-AUTHENTICATION (RECOMMENDED) ⭐

### Flow:
```
User starts bot → Bot captures chat_id → Lookup in nhan_vien table → Grant access
```

### Database Schema:
```sql
-- Already exists in nhan_vien table:
nhan_vien (
  id SERIAL PRIMARY KEY,
  ma_nhan_vien VARCHAR(20) UNIQUE,
  ho_va_ten VARCHAR(100),
  chat_id VARCHAR(50),  -- ✅ Telegram chat_id
  phan_quyen VARCHAR(20),  -- admin, manager, staff, user
  xem BOOLEAN,
  them BOOLEAN,
  sua BOOLEAN,
  xoa BOOLEAN,
  is_active BOOLEAN
)
```

### Implementation:

#### Step 1: User sends `/start` command
```typescript
// /app/api/telegram/webhook/route.ts
bot.command('start', async (ctx) => {
  const chatId = ctx.chat.id.toString();
  const username = ctx.from?.username || 'Unknown';
  const firstName = ctx.from?.first_name || '';
  const lastName = ctx.from?.last_name || '';

  // Lookup user in database
  const user = await authenticateUser(chatId);

  if (user) {
    // ✅ Authenticated
    await ctx.reply(
      `🎉 Xin chào ${user.ho_va_ten}!\n\n` +
      `✅ Bạn đã được xác thực thành công.\n` +
      `📋 Mã nhân viên: ${user.ma_nhan_vien}\n` +
      `👤 Phân quyền: ${user.phan_quyen}\n\n` +
      `Sử dụng /menu để xem các tính năng.`,
      getMainMenuKeyboard()
    );
  } else {
    // ❌ Not registered
    await ctx.reply(
      `👋 Xin chào ${firstName} ${lastName}!\n\n` +
      `⚠️ Chat ID của bạn chưa được đăng ký trong hệ thống.\n` +
      `🔑 Chat ID: \`${chatId}\`\n\n` +
      `📝 Vui lòng liên hệ Admin để được cấp quyền truy cập.\n` +
      `Hoặc sử dụng lệnh: /register <mã_nhân_viên>`,
      { parse_mode: 'Markdown' }
    );
  }
});
```

#### Step 2: Authentication Helper Function
```typescript
// /lib/telegram/auth.ts
import { sql } from '@vercel/postgres';

export interface AuthenticatedUser {
  maNhanVien: string;
  hoVaTen: string;
  phongBan: string;
  chucVu: string;
  phanQuyen: string;
  chatId: string;
  permissions: {
    xem: boolean;
    them: boolean;
    sua: boolean;
    xoa: boolean;
  };
}

/**
 * Authenticate user by chat_id
 */
export async function authenticateUser(chatId: string): Promise<AuthenticatedUser | null> {
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
      phanQuyen: row.phanQuyen || 'user',
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
 * Check if user has permission for specific action
 */
export function hasPermission(
  user: AuthenticatedUser,
  action: 'xem' | 'them' | 'sua' | 'xoa'
): boolean {
  return user.permissions[action] === true;
}

/**
 * Check if user has role
 */
export function hasRole(
  user: AuthenticatedUser,
  roles: string[]
): boolean {
  return roles.includes(user.phanQuyen);
}
```

---

## METHOD 2: MANUAL REGISTRATION (FALLBACK)

### Flow:
```
User sends /register <employee_code> → Validate → Update chat_id → Grant access
```

### Implementation:

```typescript
// /app/api/telegram/webhook/route.ts
bot.command('register', async (ctx) => {
  const chatId = ctx.chat.id.toString();
  const args = ctx.message.text.split(' ').slice(1);

  if (args.length === 0) {
    await ctx.reply(
      '❌ Vui lòng nhập mã nhân viên.\n\n' +
      'Cú pháp: /register <mã_nhân_viên>\n' +
      'Ví dụ: /register NV001'
    );
    return;
  }

  const employeeCode = args[0].trim().toUpperCase();

  try {
    // Update chat_id in database
    const result = await sql`
      UPDATE nhan_vien
      SET chat_id = ${chatId},
          updated_at = NOW()
      WHERE ma_nhan_vien = ${employeeCode}
        AND is_active = true
      RETURNING
        ma_nhan_vien as "maNhanVien",
        ho_va_ten as "hoVaTen",
        phan_quyen as "phanQuyen"
    `;

    if (result.rows.length === 0) {
      await ctx.reply(
        `❌ Không tìm thấy nhân viên với mã: ${employeeCode}\n\n` +
        'Vui lòng kiểm tra lại mã nhân viên hoặc liên hệ Admin.'
      );
      return;
    }

    const employee = result.rows[0];

    await ctx.reply(
      `✅ Đăng ký thành công!\n\n` +
      `👤 Tên: ${employee.hoVaTen}\n` +
      `📋 Mã NV: ${employee.maNhanVien}\n` +
      `🔑 Phân quyền: ${employee.phanQuyen}\n\n` +
      `Sử dụng /menu để bắt đầu.`,
      getMainMenuKeyboard()
    );

  } catch (error) {
    console.error('[REGISTER] Error:', error);
    await ctx.reply('❌ Đã xảy ra lỗi. Vui lòng thử lại sau.');
  }
});
```

---

## ROLE-BASED ACCESS CONTROL (RBAC)

### Permission Matrix:

| Role      | Xem | Thêm | Sửa | Xóa | Menu Features                               |
|-----------|-----|------|-----|-----|---------------------------------------------|
| **admin** | ✅  | ✅   | ✅  | ✅  | All features + User management              |
| **manager** | ✅  | ✅   | ✅  | ❌  | Reports, Analytics, Trip approval           |
| **staff** | ✅  | ✅   | ❌  | ❌  | Basic queries, Create trips                 |
| **user**  | ✅  | ❌   | ❌  | ❌  | View-only (Dashboard, Reports)              |

### Usage in Command Handlers:

```typescript
// Middleware: Check authentication
async function requireAuth(ctx: Context, next: () => Promise<void>) {
  const chatId = ctx.chat?.id.toString();
  if (!chatId) {
    await ctx.reply('❌ Không thể xác thực người dùng.');
    return;
  }

  const user = await authenticateUser(chatId);
  if (!user) {
    await ctx.reply(
      '🔒 Bạn chưa được xác thực.\n\n' +
      'Sử dụng /start để bắt đầu hoặc /register <mã_NV> để đăng ký.'
    );
    return;
  }

  // Attach user to context
  ctx.state.user = user;
  await next();
}

// Middleware: Check permission
function requirePermission(action: 'xem' | 'them' | 'sua' | 'xoa') {
  return async (ctx: Context, next: () => Promise<void>) => {
    const user = ctx.state.user as AuthenticatedUser;

    if (!hasPermission(user, action)) {
      await ctx.reply(`❌ Bạn không có quyền "${action}" để thực hiện thao tác này.`);
      return;
    }

    await next();
  };
}

// Example usage:
bot.command('create_trip', requireAuth, requirePermission('them'), async (ctx) => {
  // Handler logic for creating trip
  const user = ctx.state.user as AuthenticatedUser;
  await ctx.reply(`✅ ${user.hoVaTen} đang tạo chuyến đi...`);
});
```

---

## SECURITY CONSIDERATIONS

### 1. **Rate Limiting**
```typescript
// Simple in-memory rate limiter
const rateLimiter = new Map<string, number[]>();

function checkRateLimit(chatId: string, maxRequests = 10, windowMs = 60000): boolean {
  const now = Date.now();
  const userRequests = rateLimiter.get(chatId) || [];

  // Clean old requests
  const validRequests = userRequests.filter(time => now - time < windowMs);

  if (validRequests.length >= maxRequests) {
    return false; // Rate limit exceeded
  }

  validRequests.push(now);
  rateLimiter.set(chatId, validRequests);
  return true;
}
```

### 2. **Input Validation**
```typescript
function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML
    .slice(0, 200); // Max length
}
```

### 3. **Logging**
```typescript
// Log all authentication attempts
await sql`
  INSERT INTO telegram_auth_logs (
    chat_id, username, action, success, ip_address, timestamp
  ) VALUES (
    ${chatId}, ${username}, 'login', ${success}, ${ip}, NOW()
  )
`;
```

---

## ADMIN COMMANDS

### View registered users:
```typescript
bot.command('users', requireAuth, requireRole(['admin']), async (ctx) => {
  const result = await sql`
    SELECT
      ma_nhan_vien, ho_va_ten, chat_id, phan_quyen, is_active
    FROM nhan_vien
    WHERE chat_id IS NOT NULL
    ORDER BY updated_at DESC
    LIMIT 20
  `;

  let message = '👥 **Danh sách người dùng đã đăng ký:**\n\n';

  result.rows.forEach((user, index) => {
    message += `${index + 1}. ${user.ho_va_ten} (${user.ma_nhan_vien})\n`;
    message += `   📱 Chat ID: \`${user.chat_id}\`\n`;
    message += `   🔑 Quyền: ${user.phan_quyen}\n`;
    message += `   ⚡ Trạng thái: ${user.is_active ? '✅ Active' : '❌ Inactive'}\n\n`;
  });

  await ctx.reply(message, { parse_mode: 'Markdown' });
});
```

---

## TESTING CHECKLIST

- [ ] Test `/start` command with registered user
- [ ] Test `/start` command with unregistered user
- [ ] Test `/register` with valid employee code
- [ ] Test `/register` with invalid employee code
- [ ] Test permission-based access (admin vs user)
- [ ] Test rate limiting (send 15 requests in 1 minute)
- [ ] Test error handling (database down, network issues)
- [ ] Test user logout/deactivation

---

## NEXT STEPS

1. ✅ Create authentication helper functions
2. ✅ Implement `/start` and `/register` commands
3. ✅ Add RBAC middleware
4. ⏳ Integrate with inline keyboard menu (next phase)
5. ⏳ Add admin user management commands
6. ⏳ Implement session management

---

**Recommended Approach**: Use **METHOD 1 (Auto-authentication)** as primary, with **METHOD 2 (Manual registration)** as fallback for users without pre-assigned chat_id.
