/**
 * =============================================================================
 * TELEGRAM CHATBOT - MESSAGE FORMATTERS
 * =============================================================================
 *
 * Utilities for formatting messages, numbers, dates, etc.
 */

// =============================================================================
// NUMBER FORMATTERS
// =============================================================================

/**
 * Format number with Vietnamese locale (thousands separator)
 *
 * @param num - Number to format
 * @returns Formatted string (e.g., "1,234,567")
 */
export function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined || isNaN(num)) {
    return '0';
  }
  return new Intl.NumberFormat('vi-VN').format(num);
}

/**
 * Format currency (Vietnamese Dong)
 *
 * @param amount - Amount to format
 * @returns Formatted currency string (e.g., "1,234,567 VNĐ")
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '0 VNĐ';
  }
  return `${formatNumber(amount)} VNĐ`;
}

/**
 * Format distance (kilometers)
 *
 * @param km - Distance in kilometers
 * @returns Formatted string (e.g., "1,234 km")
 */
export function formatDistance(km: number | null | undefined): string {
  if (km === null || km === undefined || isNaN(km)) {
    return '0 km';
  }
  return `${formatNumber(km)} km`;
}

/**
 * Format fuel quantity (liters)
 *
 * @param liters - Quantity in liters
 * @returns Formatted string (e.g., "1,234.5 lít")
 */
export function formatFuel(liters: number | null | undefined): string {
  if (liters === null || liters === undefined || isNaN(liters)) {
    return '0 lít';
  }
  return `${formatNumber(liters)} lít`;
}

/**
 * Format efficiency (L/100km)
 *
 * @param efficiency - Efficiency value
 * @returns Formatted string (e.g., "12.34 L/100km")
 */
export function formatEfficiency(efficiency: number | null | undefined): string {
  if (efficiency === null || efficiency === undefined || isNaN(efficiency)) {
    return 'N/A';
  }
  return `${efficiency.toFixed(2)} L/100km`;
}

// =============================================================================
// DATE FORMATTERS
// =============================================================================

/**
 * Format date to Vietnamese locale
 *
 * @param date - Date object or string
 * @returns Formatted date (e.g., "01/01/2025")
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) {
    return 'N/A';
  }

  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('vi-VN');
  } catch (error) {
    return 'N/A';
  }
}

/**
 * Format time to Vietnamese locale
 *
 * @param date - Date object or string
 * @returns Formatted time (e.g., "14:30:45")
 */
export function formatTime(date: Date | string | null | undefined): string {
  if (!date) {
    return 'N/A';
  }

  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleTimeString('vi-VN');
  } catch (error) {
    return 'N/A';
  }
}

/**
 * Format datetime to Vietnamese locale
 *
 * @param date - Date object or string
 * @returns Formatted datetime (e.g., "01/01/2025 14:30:45")
 */
export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) {
    return 'N/A';
  }

  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString('vi-VN');
  } catch (error) {
    return 'N/A';
  }
}

/**
 * Get current date in YYYY-MM-DD format (for SQL queries)
 *
 * @returns Current date string
 */
export function getCurrentDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Get current month start/end dates
 *
 * @returns Object with startDate and endDate
 */
export function getCurrentMonth(): { startDate: string; endDate: string } {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split('T')[0];
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .split('T')[0];

  return { startDate, endDate };
}

/**
 * Get current week start/end dates (Monday to Sunday)
 *
 * @returns Object with startDate and endDate
 */
export function getCurrentWeek(): { startDate: string; endDate: string } {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday

  const monday = new Date(now.setDate(diff));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const startDate = monday.toISOString().split('T')[0];
  const endDate = sunday.toISOString().split('T')[0];

  return { startDate, endDate };
}

// =============================================================================
// TEXT FORMATTERS
// =============================================================================

/**
 * Escape Markdown special characters
 *
 * @param text - Text to escape
 * @returns Escaped text safe for Markdown
 */
export function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}

/**
 * Truncate text to max length
 *
 * @param text - Text to truncate
 * @param maxLength - Maximum length
 * @returns Truncated text with ellipsis
 */
export function truncate(text: string, maxLength: number = 50): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Create status badge with emoji
 *
 * @param status - Status text
 * @returns Formatted status with emoji
 */
export function formatStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'Hoàn thành': '✅ Hoàn thành',
    'Đang thực hiện': '🔄 Đang thực hiện',
    'Chờ duyệt': '⏳ Chờ duyệt',
    'Đã hủy': '❌ Đã hủy',
    'Mới tạo': '🆕 Mới tạo'
  };

  return statusMap[status] || `📋 ${status}`;
}

/**
 * Format trip type badge
 *
 * @param tripType - Trip type (Theo tuyến, Theo ca, etc.)
 * @returns Formatted trip type with emoji
 */
export function formatTripType(tripType: string): string {
  const typeMap: Record<string, string> = {
    'Theo tuyến': '🛣️ Theo tuyến',
    'Theo ca': '⏰ Theo ca',
    'Thuê ngoài': '🚛 Thuê ngoài'
  };

  return typeMap[tripType] || `📦 ${tripType}`;
}

// =============================================================================
// TABLE FORMATTERS
// =============================================================================

/**
 * Create a simple text table (for route details, etc.)
 *
 * @param headers - Array of header strings
 * @param rows - Array of row arrays
 * @returns Formatted table string
 */
export function createTable(headers: string[], rows: string[][]): string {
  let table = '';

  // Header
  table += headers.join(' | ') + '\n';
  table += headers.map(() => '---').join(' | ') + '\n';

  // Rows
  rows.forEach(row => {
    table += row.join(' | ') + '\n';
  });

  return table;
}

/**
 * Format route details as numbered list
 *
 * @param routes - Array of route detail objects
 * @returns Formatted route list
 */
export function formatRouteDetails(routes: any[]): string {
  if (!routes || routes.length === 0) {
    return 'Không có chi tiết lộ trình';
  }

  let message = '';
  routes.forEach((route, index) => {
    message += `${index + 1}. ${route.loTrinhChiTiet || route.loTrinh}\n`;
    if (route.quangDuong) {
      message += `   📏 ${formatDistance(route.quangDuong)}`;
    }
    if (route.donGia) {
      message += ` | 💰 ${formatCurrency(route.thanhTien || 0)}`;
    }
    message += '\n';
  });

  return message;
}

// =============================================================================
// PAGINATION HELPERS
// =============================================================================

/**
 * Create pagination info text
 *
 * @param currentPage - Current page number
 * @param totalPages - Total number of pages
 * @param totalItems - Total number of items
 * @returns Formatted pagination info
 */
export function formatPagination(
  currentPage: number,
  totalPages: number,
  totalItems: number
): string {
  return `📄 Trang ${currentPage}/${totalPages} • Tổng: ${totalItems} mục`;
}

// =============================================================================
// ERROR MESSAGES
// =============================================================================

/**
 * Format error message
 *
 * @param errorMessage - Error message
 * @returns Formatted error with emoji
 */
export function formatError(errorMessage: string): string {
  return `❌ **LỖI**\n\n${errorMessage}\n\n💡 Vui lòng thử lại hoặc liên hệ Admin.`;
}

/**
 * Format success message
 *
 * @param successMessage - Success message
 * @returns Formatted success with emoji
 */
export function formatSuccess(successMessage: string): string {
  return `✅ **THÀNH CÔNG**\n\n${successMessage}`;
}

/**
 * Format warning message
 *
 * @param warningMessage - Warning message
 * @returns Formatted warning with emoji
 */
export function formatWarning(warningMessage: string): string {
  return `⚠️ **CẢNH BÁO**\n\n${warningMessage}`;
}

// =============================================================================
// LOADING MESSAGES
// =============================================================================

/**
 * Get random loading message
 *
 * @returns Random loading message
 */
export function getLoadingMessage(): string {
  const messages = [
    '⏳ Đang tải dữ liệu...',
    '🔄 Đang xử lý...',
    '⏰ Vui lòng đợi...',
    '📊 Đang truy vấn dữ liệu...',
    '🚀 Đang chuẩn bị kết quả...'
  ];

  return messages[Math.floor(Math.random() * messages.length)];
}
