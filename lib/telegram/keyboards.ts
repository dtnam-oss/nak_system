/**
 * =============================================================================
 * TELEGRAM CHATBOT - KEYBOARD DEFINITIONS
 * =============================================================================
 *
 * All inline keyboard layouts for the bot
 */

import { Markup } from 'telegraf';
import { AuthenticatedUser } from './types';

// =============================================================================
// MAIN MENU
// =============================================================================

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
    [Markup.button.callback('ℹ️ Trợ giúp', 'help')]
  ]);
}

// =============================================================================
// DASHBOARD SUBMENU
// =============================================================================

export function getDashboardMenuKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('📅 Hôm nay', 'dashboard_today'),
      Markup.button.callback('📆 Tháng này', 'dashboard_month')
    ],
    [
      Markup.button.callback('🔝 Top tuyến', 'dashboard_top_routes'),
      Markup.button.callback('🚛 Top tài xế', 'dashboard_top_drivers')
    ],
    [
      Markup.button.callback('💰 Doanh thu', 'dashboard_revenue'),
      Markup.button.callback('📏 Quãng đường', 'dashboard_distance')
    ],
    [
      Markup.button.callback('◀️ Quay lại', 'dashboard_back')
    ]
  ]);
}

// =============================================================================
// TRIPS SUBMENU
// =============================================================================

export function getTripsMenuKeyboard(userPermissions?: AuthenticatedUser['permissions']) {
  const buttons: any[][] = [
    [
      Markup.button.callback('🔍 Tra cứu', 'trips_search'),
      Markup.button.callback('📋 Hôm nay', 'trips_today')
    ],
    [
      Markup.button.callback('📊 Theo KH', 'trips_by_customer'),
      Markup.button.callback('🚛 Theo xe', 'trips_by_vehicle')
    ]
  ];

  // Only show "Thêm mới" if user has "them" permission
  if (userPermissions?.them) {
    buttons.push([Markup.button.callback('➕ Thêm mới', 'trips_create')]);
  }

  buttons.push([Markup.button.callback('⬅️ Quay lại', 'menu_main')]);

  return Markup.inlineKeyboard(buttons);
}

// =============================================================================
// EMPLOYEES SUBMENU
// =============================================================================

export function getEmployeesMenuKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('🔍 Tra cứu', 'employees_search'),
      Markup.button.callback('📋 Danh sách', 'employees_list')
    ],
    [
      Markup.button.callback('🏢 Theo phòng ban', 'employees_by_department'),
      Markup.button.callback('👔 Theo chức vụ', 'employees_by_position')
    ],
    [Markup.button.callback('⬅️ Quay lại', 'menu_main')]
  ]);
}

// =============================================================================
// FUEL SUBMENU
// =============================================================================

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
    [Markup.button.callback('⬅️ Quay lại', 'menu_main')]
  ]);
}

// =============================================================================
// REPORTS SUBMENU
// =============================================================================

export function getReportsMenuKeyboard(userPermissions?: AuthenticatedUser['permissions']) {
  const buttons: any[][] = [
    [
      Markup.button.callback('📅 Hôm nay', 'report_today'),
      Markup.button.callback('📆 Tuần này', 'report_week')
    ],
    [
      Markup.button.callback('📊 Tháng này', 'report_month'),
      Markup.button.callback('📈 Tùy chỉnh', 'report_custom')
    ]
  ];

  // Only show export if user has "xem" permission
  if (userPermissions?.xem) {
    buttons.push([Markup.button.callback('📥 Export Excel', 'report_export')]);
  }

  buttons.push([Markup.button.callback('⬅️ Quay lại', 'menu_main')]);

  return Markup.inlineKeyboard(buttons);
}

// =============================================================================
// SETTINGS SUBMENU
// =============================================================================

export function getSettingsMenuKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('🔔 Thông báo', 'settings_notifications'),
      Markup.button.callback('🌐 Ngôn ngữ', 'settings_language')
    ],
    [
      Markup.button.callback('👤 Thông tin cá nhân', 'settings_profile'),
      Markup.button.callback('🔐 Bảo mật', 'settings_security')
    ],
    [Markup.button.callback('⬅️ Quay lại', 'menu_main')]
  ]);
}

// =============================================================================
// DETAIL VIEW KEYBOARDS (with Refresh & Back)
// =============================================================================

export function getRefreshBackKeyboard(
  refreshAction: string,
  backAction: string = 'menu_main'
) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('🔄 Refresh', refreshAction),
      Markup.button.callback('⬅️ Quay lại', backAction)
    ]
  ]);
}

// =============================================================================
// PAGINATION KEYBOARDS
// =============================================================================

export function getPaginationKeyboard(
  currentPage: number,
  totalPages: number,
  actionPrefix: string,
  backAction: string = 'menu_main'
) {
  const buttons: any[] = [];

  // Previous button
  if (currentPage > 1) {
    buttons.push(
      Markup.button.callback('◀️ Trước', `${actionPrefix}_page_${currentPage - 1}`)
    );
  }

  // Page indicator (non-clickable, just for display)
  buttons.push(
    Markup.button.callback(`📄 ${currentPage}/${totalPages}`, 'noop')
  );

  // Next button
  if (currentPage < totalPages) {
    buttons.push(
      Markup.button.callback('Sau ▶️', `${actionPrefix}_page_${currentPage + 1}`)
    );
  }

  return Markup.inlineKeyboard([
    buttons,
    [Markup.button.callback('⬅️ Quay lại', backAction)]
  ]);
}

// =============================================================================
// CONFIRMATION KEYBOARDS
// =============================================================================

export function getConfirmationKeyboard(
  confirmAction: string,
  cancelAction: string = 'menu_main'
) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('✅ Xác nhận', confirmAction),
      Markup.button.callback('❌ Hủy', cancelAction)
    ]
  ]);
}

// =============================================================================
// ADMIN KEYBOARDS
// =============================================================================

export function getAdminMenuKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('👥 Người dùng', 'admin_users'),
      Markup.button.callback('📊 Thống kê', 'admin_stats')
    ],
    [
      Markup.button.callback('🔧 Cấu hình', 'admin_config'),
      Markup.button.callback('📝 Logs', 'admin_logs')
    ],
    [Markup.button.callback('⬅️ Quay lại', 'menu_main')]
  ]);
}

// =============================================================================
// TRIP DETAIL KEYBOARD
// =============================================================================

export function getTripDetailKeyboard(
  tripId: string,
  userPermissions?: AuthenticatedUser['permissions']
) {
  const buttons: any[][] = [
    [Markup.button.callback('🔄 Refresh', `trip_refresh_${tripId}`)]
  ];

  // Add edit button if user has "sua" permission
  if (userPermissions?.sua) {
    buttons[0].push(Markup.button.callback('✏️ Sửa', `trip_edit_${tripId}`));
  }

  // Add delete button if user has "xoa" permission
  if (userPermissions?.xoa) {
    buttons.push([
      Markup.button.callback('🗑️ Xóa', `trip_delete_${tripId}`)
    ]);
  }

  buttons.push([Markup.button.callback('⬅️ Quay lại', 'menu_trips')]);

  return Markup.inlineKeyboard(buttons);
}

// =============================================================================
// VEHICLE EFFICIENCY DETAIL KEYBOARD
// =============================================================================

export function getVehicleDetailKeyboard(licensePlate: string) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('📊 Chi tiết', `vehicle_detail_${licensePlate}`),
      Markup.button.callback('📈 Lịch sử', `vehicle_history_${licensePlate}`)
    ],
    [Markup.button.callback('⬅️ Quay lại', 'fuel_by_vehicle')]
  ]);
}

// =============================================================================
// CANCEL KEYBOARD (for multi-step conversations)
// =============================================================================

export function getCancelKeyboard(cancelAction: string = 'menu_main') {
  return Markup.inlineKeyboard([
    [Markup.button.callback('❌ Hủy', cancelAction)]
  ]);
}

// =============================================================================
// EMPTY ACTION HANDLER (for non-clickable buttons)
// =============================================================================

export const NOOP_ACTION = 'noop';
