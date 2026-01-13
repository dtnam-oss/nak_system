/**
 * Bot Commands Configuration
 */

export interface BotCommand {
  command: string;
  description: string;
  category: 'general' | 'stats' | 'reports' | 'settings';
}

export const BOT_COMMANDS: BotCommand[] = [
  // General
  {
    command: 'start',
    description: '🚀 Khởi động trợ lý ảo',
    category: 'general',
  },
  {
    command: 'help',
    description: '❓ Hướng dẫn sử dụng',
    category: 'general',
  },
  {
    command: 'menu',
    description: '📱 Menu chính',
    category: 'general',
  },

  // Stats
  {
    command: 'today',
    description: '📊 Báo cáo hôm nay',
    category: 'stats',
  },
  {
    command: 'realtime',
    description: '⚡ Số liệu realtime',
    category: 'stats',
  },
  {
    command: 'compare',
    description: '📈 So sánh với hôm qua',
    category: 'stats',
  },

  // Reports
  {
    command: 'trips',
    description: '🚛 Thống kê chuyến đi',
    category: 'reports',
  },
  {
    command: 'partners',
    description: '🤝 Hiệu suất đối tác',
    category: 'reports',
  },
  {
    command: 'customers',
    description: '💼 Phân tích khách hàng',
    category: 'reports',
  },
  {
    command: 'fuel',
    description: '⛽ Tình trạng nhiên liệu',
    category: 'reports',
  },
  {
    command: 'reconciliation',
    description: '💰 Đối soát (GHN, J&T)',
    category: 'reports',
  },

  // Settings
  {
    command: 'alerts',
    description: '🔔 Cảnh báo hiện tại',
    category: 'settings',
  },
  {
    command: 'subscribe',
    description: '📬 Đăng ký nhận thông báo',
    category: 'settings',
  },
];

/**
 * Main Menu Keyboard
 */
export const MAIN_MENU_KEYBOARD = {
  inline_keyboard: [
    [
      { text: '📊 Tổng quan ngày', callback_data: 'stats_today' },
      { text: '⚡ Realtime', callback_data: 'stats_realtime' },
    ],
    [
      { text: '🚛 Chuyến đi', callback_data: 'trips' },
      { text: '🤝 Đối tác', callback_data: 'partners' },
      { text: '💼 Khách hàng', callback_data: 'customers' },
    ],
    [
      { text: '⛽ Nhiên liệu', callback_data: 'fuel' },
      { text: '💰 Đối soát', callback_data: 'reconciliation' },
    ],
    [
      { text: '🔔 Cảnh báo', callback_data: 'alerts' },
      { text: '📅 Tùy chỉnh', callback_data: 'custom_report' },
    ],
  ],
};

/**
 * Trips Menu Keyboard
 */
export const TRIPS_MENU_KEYBOARD = {
  inline_keyboard: [
    [
      { text: '📈 Theo trạng thái', callback_data: 'trips_by_status' },
      { text: '🏢 Theo đơn vị', callback_data: 'trips_by_provider' },
    ],
    [
      { text: '📍 Theo tuyến', callback_data: 'trips_by_route' },
      { text: '👤 Theo tài xế', callback_data: 'trips_by_driver' },
    ],
    [
      { text: '⏱️ Chuyến trễ', callback_data: 'trips_delayed' },
      { text: '❌ Chuyến hủy', callback_data: 'trips_cancelled' },
    ],
    [{ text: '« Quay lại', callback_data: 'back_main' }],
  ],
};

/**
 * Partners Menu Keyboard
 */
export const PARTNERS_MENU_KEYBOARD = {
  inline_keyboard: [
    [
      { text: 'Viettel Post', callback_data: 'partner_viettel' },
      { text: 'GHN', callback_data: 'partner_ghn' },
    ],
    [
      { text: 'J&T Express', callback_data: 'partner_jnt' },
      { text: 'Tất cả', callback_data: 'partner_all' },
    ],
    [{ text: '« Quay lại', callback_data: 'back_main' }],
  ],
};

/**
 * Fuel Menu Keyboard
 */
export const FUEL_MENU_KEYBOARD = {
  inline_keyboard: [
    [
      { text: '📊 Tồn kho hiện tại', callback_data: 'fuel_current' },
      { text: '📈 Lịch sử tiêu thụ', callback_data: 'fuel_history' },
    ],
    [
      { text: '📥 Lịch sử nhập', callback_data: 'fuel_imports' },
      { text: '📊 Biểu đồ', callback_data: 'fuel_chart' },
    ],
    [{ text: '« Quay lại', callback_data: 'back_main' }],
  ],
};
