import { BotResponse } from '@/types/telegram';
import { formatNumber, formatPercentage } from '../formatters/number-formatter';

/**
 * Get today's statistics report
 */
export async function getTodayStats(): Promise<BotResponse> {
  try {
    // Fetch data from dashboard API
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/dashboard/stats`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch dashboard stats');
    }

    const data = await response.json();

    // Format the report
    const text = `
📊 <b>BÁO CÁO TỔNG QUAN - HÔM NAY</b>
${new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

━━━━━━━━━━━━━━━━━━━━━

💰 <b>Doanh thu:</b> ${formatNumber(data.revenue?.current || 0)} VNĐ
${data.revenue?.percentageChange ? `   ${data.revenue.percentageChange > 0 ? '↗️' : '↘️'} ${formatPercentage(data.revenue.percentageChange)} so với tháng trước` : ''}

🚛 <b>Chuyến đi:</b> ${data.pendingOrders || 0} chuyến

🚗 <b>Phương tiện:</b>
   • Tổng số: ${data.vehicles?.total || 0} xe
   • Đang hoạt động: ${data.vehicles?.active || 0} xe

⛽ <b>Nhiên liệu:</b>
   • Tồn kho: ${formatNumber(data.fuelTank?.currentLevel || 0)}L
   • Tỷ lệ: ${formatPercentage(data.fuelTank?.percentage || 0)}
   ${data.fuelTank?.percentage < 30 ? '⚠️ Cảnh báo: Mức nhiên liệu thấp!' : ''}

━━━━━━━━━━━━━━━━━━━━━

💡 Dùng /menu để xem chi tiết hơn
    `.trim();

    return {
      text,
      keyboard: {
        inline_keyboard: [
          [
            { text: '🚛 Chi tiết chuyến đi', callback_data: 'trips' },
            { text: '⛽ Chi tiết nhiên liệu', callback_data: 'fuel' },
          ],
          [
            { text: '🤝 Đối tác', callback_data: 'partners' },
            { text: '💼 Khách hàng', callback_data: 'customers' },
          ],
        ],
      },
    };
  } catch (error) {
    console.error('❌ Error fetching today stats:', error);
    return {
      text: '❌ Không thể lấy dữ liệu. Vui lòng thử lại sau.',
    };
  }
}
