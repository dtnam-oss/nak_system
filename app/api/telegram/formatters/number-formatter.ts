/**
 * Format number with thousand separators
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('vi-VN').format(Math.round(num));
}

/**
 * Format as percentage
 */
export function formatPercentage(num: number): string {
  return `${num > 0 ? '+' : ''}${num.toFixed(1)}%`;
}

/**
 * Format currency (VND)
 */
export function formatCurrency(num: number): string {
  return `${formatNumber(num)} VNĐ`;
}

/**
 * Format large numbers with K/M/B suffix
 */
export function formatCompactNumber(num: number): string {
  if (num >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(1)}B`;
  }
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  }
  return num.toString();
}
