# ⌨️ TELEGRAM CHATBOT - INLINE KEYBOARD MENU DESIGN

## OVERVIEW

Thiết kế hệ thống menu tương tác với Inline Keyboard cho Telegram Bot NAK Logistics.

**Features:**
- 📊 Dashboard queries
- 🚚 Trip management
- 👥 Employee directory
- ⛽ Fuel status
- 📈 Reports & Analytics

---

## MENU STRUCTURE

```
┌─────────────────────────────────┐
│       🏠 MAIN MENU              │
├─────────────────────────────────┤
│ 📊 Dashboard   │ 🚚 Chuyến đi   │
│ 👥 Nhân viên   │ ⛽ Nhiên liệu   │
│ 📈 Báo cáo     │ ⚙️ Cài đặt     │
└─────────────────────────────────┘
         ↓ (User clicks)
┌─────────────────────────────────┐
│    📊 DASHBOARD SUBMENU         │
├─────────────────────────────────┤
│ 📅 Hôm nay     │ 📆 Tháng này   │
│ 🔝 Top routes  │ 🚛 Top drivers │
│ 💰 Doanh thu   │ ⬅️ Quay lại    │
└─────────────────────────────────┘
         ↓ (User clicks "Hôm nay")
┌─────────────────────────────────┐
│      📊 DASHBOARD - HÔM NAY     │
├─────────────────────────────────┤
│ 🚚 Chuyến: 45                   │
│ 💰 Doanh thu: 125,500,000 VNĐ   │
│ 📏 Tổng km: 3,240 km            │
│ 👥 Tài xế: 28 người             │
├─────────────────────────────────┤
│ 🔄 Refresh     │ ⬅️ Quay lại    │
└─────────────────────────────────┘
```

---

## 1. MAIN MENU KEYBOARD

### Implementation:

```typescript
// /lib/telegram/keyboards.ts
import { InlineKeyboard } from 'telegraf/typings/markup';
import { Markup } from 'telegraf';

export function getMainMenuKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('📊 Dashboard', 'menu_dashboard'),
      Markup.button.callback('🚚 Chuyến đi', 'menu_trips')
    ],
    [
      Markup.button.callback('👥 Nhân viên', 'menu_employees'),
      Markup.button.callback('⛽ Nhiên liệu', 'menu_fuel')
    ],
    [
      Markup.button.callback('📈 Báo cáo', 'menu_reports'),
      Markup.button.callback('⚙️ Cài đặt', 'menu_settings')
    ],
    [
      Markup.button.callback('ℹ️ Trợ giúp', 'help')
    ]
  ]);
}
```

### Usage in Command:

```typescript
// /app/api/telegram/webhook/route.ts
bot.command('menu', requireAuth, async (ctx) => {
  const user = ctx.state.user as AuthenticatedUser;

  await ctx.reply(
    `🏠 **MENU CHÍNH**\n\n` +
    `Xin chào ${user.hoVaTen}!\n` +
    `Chọn chức năng bạn muốn sử dụng:`,
    {
      parse_mode: 'Markdown',
      ...getMainMenuKeyboard()
    }
  );
});
```

---

## 2. DASHBOARD SUBMENU

### A. Dashboard Menu Keyboard:

```typescript
export function getDashboardMenuKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('📅 Hôm nay', 'dashboard_today'),
      Markup.button.callback('📆 Tháng này', 'dashboard_month')
    ],
    [
      Markup.button.callback('🔝 Top routes', 'dashboard_top_routes'),
      Markup.button.callback('🚛 Top drivers', 'dashboard_top_drivers')
    ],
    [
      Markup.button.callback('💰 Doanh thu', 'dashboard_revenue'),
      Markup.button.callback('📏 Quãng đường', 'dashboard_distance')
    ],
    [
      Markup.button.callback('⬅️ Quay lại', 'menu_main')
    ]
  ]);
}
```

### B. Callback Handler:

```typescript
// Handle "Dashboard" button click
bot.action('menu_dashboard', requireAuth, async (ctx) => {
  await ctx.editMessageText(
    '📊 **DASHBOARD**\n\n' +
    'Chọn loại thống kê bạn muốn xem:',
    {
      parse_mode: 'Markdown',
      ...getDashboardMenuKeyboard()
    }
  );
  await ctx.answerCbQuery(); // Remove loading state
});
```

### C. Query Database and Display Results:

```typescript
// Handle "Hôm nay" button click
bot.action('dashboard_today', requireAuth, async (ctx) => {
  try {
    // Query database
    const today = new Date().toISOString().split('T')[0];

    const result = await sql`
      SELECT
        COUNT(*) as total_trips,
        SUM(tong_doanh_thu) as total_revenue,
        SUM(tong_quang_duong) as total_distance,
        COUNT(DISTINCT ten_tai_xe) as total_drivers
      FROM chuyen_di
      WHERE ngay_tao = ${today}
    `;

    const stats = result.rows[0];

    // Format numbers
    const formatNumber = (num: number) => {
      return new Intl.NumberFormat('vi-VN').format(num || 0);
    };

    // Build message
    const message =
      `📊 **DASHBOARD - HÔM NAY**\n` +
      `📅 Ngày: ${new Date().toLocaleDateString('vi-VN')}\n\n` +
      `🚚 **Tổng chuyến:** ${stats.total_trips}\n` +
      `💰 **Doanh thu:** ${formatNumber(stats.total_revenue)} VNĐ\n` +
      `📏 **Quãng đường:** ${formatNumber(stats.total_distance)} km\n` +
      `👥 **Tài xế:** ${stats.total_drivers} người\n\n` +
      `🕐 Cập nhật lúc: ${new Date().toLocaleTimeString('vi-VN')}`;

    // Update message with refresh button
    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback('🔄 Refresh', 'dashboard_today'),
          Markup.button.callback('⬅️ Quay lại', 'menu_dashboard')
        ]
      ])
    });

    await ctx.answerCbQuery('✅ Đã tải dữ liệu');

  } catch (error) {
    console.error('[DASHBOARD_TODAY] Error:', error);
    await ctx.answerCbQuery('❌ Lỗi khi tải dữ liệu', { show_alert: true });
  }
});
```

---

## 3. TRIPS SUBMENU

### A. Trips Menu Keyboard:

```typescript
export function getTripsMenuKeyboard(userPermissions: AuthenticatedUser['permissions']) {
  const buttons = [
    [
      Markup.button.callback('🔍 Tra cứu', 'trips_search'),
      Markup.button.callback('📋 Hôm nay', 'trips_today')
    ],
    [
      Markup.button.callback('📊 Theo khách hàng', 'trips_by_customer'),
      Markup.button.callback('🚛 Theo xe', 'trips_by_vehicle')
    ]
  ];

  // Only show "Thêm mới" if user has "them" permission
  if (userPermissions.them) {
    buttons.push([
      Markup.button.callback('➕ Thêm mới', 'trips_create')
    ]);
  }

  buttons.push([
    Markup.button.callback('⬅️ Quay lại', 'menu_main')
  ]);

  return Markup.inlineKeyboard(buttons);
}
```

### B. Search with Callback Data:

```typescript
// Handle "Tra cứu" button
bot.action('trips_search', requireAuth, async (ctx) => {
  await ctx.editMessageText(
    '🔍 **TRA CỨU CHUYẾN ĐI**\n\n' +
    'Nhập mã chuyến đi để tra cứu:\n' +
    'Ví dụ: `NAK2025010001`\n\n' +
    '💡 Sử dụng lệnh: `/search <mã_chuyến>`',
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('⬅️ Quay lại', 'menu_trips')]
      ])
    }
  );
  await ctx.answerCbQuery();
});

// Handle search command
bot.command('search', requireAuth, async (ctx) => {
  const args = ctx.message.text.split(' ').slice(1);

  if (args.length === 0) {
    await ctx.reply('❌ Vui lòng nhập mã chuyến đi.\nVí dụ: /search NAK2025010001');
    return;
  }

  const tripId = args[0].trim();

  try {
    const result = await sql`
      SELECT
        ma_chuyen_di,
        ngay_tao,
        ten_khach_hang,
        ten_tuyen,
        ten_tai_xe,
        bien_kiem_soat,
        trang_thai,
        tong_doanh_thu,
        tong_quang_duong,
        data_json
      FROM chuyen_di
      WHERE ma_chuyen_di = ${tripId}
      LIMIT 1
    `;

    if (result.rows.length === 0) {
      await ctx.reply(`❌ Không tìm thấy chuyến đi: ${tripId}`);
      return;
    }

    const trip = result.rows[0];
    const details = JSON.parse(trip.data_json || '{}');

    let message =
      `🚚 **THÔNG TIN CHUYẾN ĐI**\n\n` +
      `📋 Mã: \`${trip.ma_chuyen_di}\`\n` +
      `📅 Ngày: ${new Date(trip.ngay_tao).toLocaleDateString('vi-VN')}\n` +
      `👤 Khách hàng: ${trip.ten_khach_hang}\n` +
      `🛣️ Tuyến: ${trip.ten_tuyen}\n` +
      `🚛 Tài xế: ${trip.ten_tai_xe}\n` +
      `🚗 Biển số: ${trip.bien_kiem_soat}\n` +
      `📊 Trạng thái: ${trip.trang_thai}\n` +
      `💰 Doanh thu: ${formatNumber(trip.tong_doanh_thu)} VNĐ\n` +
      `📏 Quãng đường: ${formatNumber(trip.tong_quang_duong)} km\n`;

    // Add route details if available
    if (details.chiTietLoTrinh && details.chiTietLoTrinh.length > 0) {
      message += `\n📍 **Chi tiết lộ trình:**\n`;
      details.chiTietLoTrinh.forEach((item: any, index: number) => {
        message += `${index + 1}. ${item.loTrinhChiTiet || item.loTrinh}\n`;
      });
    }

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🔄 Refresh', `trip_refresh_${tripId}`)],
        [Markup.button.callback('⬅️ Quay lại', 'menu_trips')]
      ])
    });

  } catch (error) {
    console.error('[SEARCH] Error:', error);
    await ctx.reply('❌ Đã xảy ra lỗi khi tra cứu.');
  }
});
```

---

## 4. FUEL SUBMENU

### A. Fuel Menu Keyboard:

```typescript
export function getFuelMenuKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('📊 Tồn kho', 'fuel_inventory'),
      Markup.button.callback('📈 Hiệu suất', 'fuel_efficiency')
    ],
    [
      Markup.button.callback('🚛 Theo xe', 'fuel_by_vehicle'),
      Markup.button.callback('📅 Theo ngày', 'fuel_by_date')
    ],
    [
      Markup.button.callback('⬅️ Quay lại', 'menu_main')
    ]
  ]);
}
```

### B. Inventory Query:

```typescript
bot.action('fuel_inventory', requireAuth, async (ctx) => {
  try {
    // Call existing API endpoint
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const response = await fetch(`${apiUrl}/api/fuel/stats`);
    const stats = await response.json();

    const message =
      `⛽ **TỒN KHO NHIÊN LIỆU**\n\n` +
      `📊 **Tồn kho hiện tại:** ${formatNumber(stats.current_inventory)} lít\n` +
      `💰 **Giá bình quân:** ${formatNumber(stats.current_avg_price)} VNĐ/lít\n` +
      `📥 **Tổng nhập:** ${formatNumber(stats.total_imports)} lít\n` +
      `📤 **Tổng xuất:** ${formatNumber(stats.total_exports)} lít\n\n` +
      `🕐 Cập nhật: ${new Date().toLocaleString('vi-VN')}`;

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback('🔄 Refresh', 'fuel_inventory'),
          Markup.button.callback('⬅️ Quay lại', 'menu_fuel')
        ]
      ])
    });

    await ctx.answerCbQuery('✅ Đã tải dữ liệu tồn kho');

  } catch (error) {
    console.error('[FUEL_INVENTORY] Error:', error);
    await ctx.answerCbQuery('❌ Lỗi khi tải dữ liệu', { show_alert: true });
  }
});
```

### C. Efficiency by Vehicle (with pagination):

```typescript
bot.action(/^fuel_by_vehicle(?:_page_(\d+))?$/, requireAuth, async (ctx) => {
  try {
    const match = ctx.match;
    const page = match[1] ? parseInt(match[1]) : 1;
    const pageSize = 5;
    const offset = (page - 1) * pageSize;

    const result = await sql`
      SELECT
        license_plate,
        AVG(efficiency) as avg_efficiency,
        SUM(quantity) as total_fuel,
        SUM(km_traveled) as total_km,
        COUNT(*) as total_transactions
      FROM fuel_transactions
      WHERE efficiency IS NOT NULL
        AND is_full_tank = true
      GROUP BY license_plate
      ORDER BY avg_efficiency ASC
      LIMIT ${pageSize}
      OFFSET ${offset}
    `;

    const countResult = await sql`
      SELECT COUNT(DISTINCT license_plate) as total
      FROM fuel_transactions
      WHERE efficiency IS NOT NULL AND is_full_tank = true
    `;

    const totalVehicles = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(totalVehicles / pageSize);

    let message = `⛽ **HIỆU SUẤT THEO XE** (Trang ${page}/${totalPages})\n\n`;

    result.rows.forEach((vehicle, index) => {
      message +=
        `${offset + index + 1}. 🚛 **${vehicle.license_plate}**\n` +
        `   📊 Hiệu suất TB: ${vehicle.avg_efficiency?.toFixed(2)} L/100km\n` +
        `   ⛽ Tổng dầu: ${formatNumber(vehicle.total_fuel)} lít\n` +
        `   📏 Tổng km: ${formatNumber(vehicle.total_km)} km\n\n`;
    });

    // Pagination buttons
    const paginationButtons = [];
    if (page > 1) {
      paginationButtons.push(
        Markup.button.callback('◀️ Trước', `fuel_by_vehicle_page_${page - 1}`)
      );
    }
    if (page < totalPages) {
      paginationButtons.push(
        Markup.button.callback('Sau ▶️', `fuel_by_vehicle_page_${page + 1}`)
      );
    }

    const keyboard = [];
    if (paginationButtons.length > 0) {
      keyboard.push(paginationButtons);
    }
    keyboard.push([Markup.button.callback('⬅️ Quay lại', 'menu_fuel')]);

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(keyboard)
    });

    await ctx.answerCbQuery();

  } catch (error) {
    console.error('[FUEL_BY_VEHICLE] Error:', error);
    await ctx.answerCbQuery('❌ Lỗi khi tải dữ liệu', { show_alert: true });
  }
});
```

---

## 5. REPORTS SUBMENU

### A. Reports Menu with Date Range Picker:

```typescript
export function getReportsMenuKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('📅 Hôm nay', 'report_today'),
      Markup.button.callback('📆 Tuần này', 'report_week')
    ],
    [
      Markup.button.callback('📊 Tháng này', 'report_month'),
      Markup.button.callback('📈 Tùy chỉnh', 'report_custom')
    ],
    [
      Markup.button.callback('📥 Export Excel', 'report_export'),
      Markup.button.callback('⬅️ Quay lại', 'menu_main')
    ]
  ]);
}
```

### B. Custom Date Range (Multi-step conversation):

```typescript
// Step 1: Ask for start date
bot.action('report_custom', requireAuth, async (ctx) => {
  await ctx.editMessageText(
    '📅 **BÁO CÁO TÙY CHỈNH**\n\n' +
    'Nhập ngày bắt đầu (DD/MM/YYYY):\n' +
    'Ví dụ: 01/01/2025',
    {
      ...Markup.inlineKeyboard([
        [Markup.button.callback('❌ Hủy', 'menu_reports')]
      ])
    }
  );

  // Set conversation state
  ctx.session = { awaitingStartDate: true };
  await ctx.answerCbQuery();
});

// Step 2: Handle start date input
bot.on('text', async (ctx, next) => {
  if (ctx.session?.awaitingStartDate) {
    const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const match = ctx.message.text.match(dateRegex);

    if (!match) {
      await ctx.reply('❌ Định dạng ngày không hợp lệ. Vui lòng nhập lại (DD/MM/YYYY):');
      return;
    }

    ctx.session.startDate = ctx.message.text;
    ctx.session.awaitingStartDate = false;
    ctx.session.awaitingEndDate = true;

    await ctx.reply(
      `✅ Ngày bắt đầu: ${ctx.session.startDate}\n\n` +
      'Nhập ngày kết thúc (DD/MM/YYYY):',
      Markup.inlineKeyboard([
        [Markup.button.callback('❌ Hủy', 'menu_reports')]
      ])
    );
    return;
  }

  if (ctx.session?.awaitingEndDate) {
    // Process end date and generate report
    // ... (implementation)
  }

  await next();
});
```

---

## 6. ADVANCED FEATURES

### A. Inline Query (Search from any chat):

```typescript
bot.on('inline_query', async (ctx) => {
  const query = ctx.inlineQuery.query.trim();

  if (!query || query.length < 3) {
    await ctx.answerInlineQuery([]);
    return;
  }

  try {
    // Search trips
    const result = await sql`
      SELECT ma_chuyen_di, ngay_tao, ten_khach_hang, tong_doanh_thu
      FROM chuyen_di
      WHERE ma_chuyen_di ILIKE ${'%' + query + '%'}
         OR ten_khach_hang ILIKE ${'%' + query + '%'}
      LIMIT 10
    `;

    const results = result.rows.map((trip, index) => ({
      type: 'article',
      id: String(index),
      title: trip.ma_chuyen_di,
      description: `${trip.ten_khach_hang} - ${formatNumber(trip.tong_doanh_thu)} VNĐ`,
      input_message_content: {
        message_text: `/search ${trip.ma_chuyen_di}`
      }
    }));

    await ctx.answerInlineQuery(results as any);

  } catch (error) {
    console.error('[INLINE_QUERY] Error:', error);
    await ctx.answerInlineQuery([]);
  }
});
```

### B. Export to File:

```typescript
bot.action('report_export', requireAuth, requirePermission('xem'), async (ctx) => {
  try {
    await ctx.answerCbQuery('⏳ Đang tạo file Excel...');

    // Generate Excel file using exceljs
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Báo cáo');

    // Add headers
    worksheet.columns = [
      { header: 'Mã chuyến', key: 'ma_chuyen_di', width: 20 },
      { header: 'Ngày tạo', key: 'ngay_tao', width: 15 },
      { header: 'Khách hàng', key: 'ten_khach_hang', width: 30 },
      { header: 'Doanh thu', key: 'tong_doanh_thu', width: 15 }
    ];

    // Fetch data
    const result = await sql`
      SELECT ma_chuyen_di, ngay_tao, ten_khach_hang, tong_doanh_thu
      FROM chuyen_di
      ORDER BY ngay_tao DESC
      LIMIT 100
    `;

    // Add rows
    result.rows.forEach(row => {
      worksheet.addRow(row);
    });

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Send file
    await ctx.replyWithDocument({
      source: buffer,
      filename: `bao_cao_${new Date().toISOString().split('T')[0]}.xlsx`
    });

  } catch (error) {
    console.error('[REPORT_EXPORT] Error:', error);
    await ctx.reply('❌ Lỗi khi tạo file Excel.');
  }
});
```

---

## 7. ERROR HANDLING & UX

### A. Loading States:

```typescript
bot.action(/^menu_.*/, async (ctx, next) => {
  // Show loading indicator
  await ctx.answerCbQuery('⏳ Đang tải...');
  await next();
});
```

### B. User-friendly Error Messages:

```typescript
async function handleError(ctx: Context, error: Error, userMessage: string) {
  console.error('[ERROR]', error);

  await ctx.reply(
    `❌ ${userMessage}\n\n` +
    `💡 Vui lòng thử lại hoặc liên hệ Admin nếu lỗi vẫn tiếp diễn.\n` +
    `🆔 Error ID: ${Date.now()}`,
    getMainMenuKeyboard()
  );
}
```

### C. Session Timeout:

```typescript
// Clear old sessions after 15 minutes
setInterval(() => {
  const now = Date.now();
  for (const [chatId, session] of sessions.entries()) {
    if (now - session.lastActivity > 15 * 60 * 1000) {
      sessions.delete(chatId);
    }
  }
}, 60000); // Check every minute
```

---

## 8. TESTING COMMANDS

```typescript
// For development: Test all keyboards
bot.command('test_keyboards', requireAuth, requireRole(['admin']), async (ctx) => {
  await ctx.reply('Main Menu:', getMainMenuKeyboard());
  await ctx.reply('Dashboard Menu:', getDashboardMenuKeyboard());
  await ctx.reply('Trips Menu:', getTripsMenuKeyboard(ctx.state.user.permissions));
  await ctx.reply('Fuel Menu:', getFuelMenuKeyboard());
  await ctx.reply('Reports Menu:', getReportsMenuKeyboard());
});
```

---

## NEXT STEPS

1. ✅ Create keyboard helper functions
2. ✅ Implement main menu and submenus
3. ✅ Add callback handlers for each button
4. ✅ Integrate with database queries
5. ✅ Add pagination for long lists
6. ⏳ Implement export functionality
7. ⏳ Add inline query support
8. ⏳ Testing and error handling

---

**File Structure:**
```
/lib/telegram/
├── keyboards.ts        # All keyboard definitions
├── handlers/
│   ├── dashboard.ts    # Dashboard handlers
│   ├── trips.ts        # Trips handlers
│   ├── fuel.ts         # Fuel handlers
│   └── reports.ts      # Reports handlers
├── formatters.ts       # Message formatting utilities
└── auth.ts            # Authentication middleware
```
