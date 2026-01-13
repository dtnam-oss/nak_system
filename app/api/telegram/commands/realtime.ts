import { BotResponse } from '@/types/telegram';
import { formatNumber, formatPercentage } from '../formatters/number-formatter';

/**
 * Get realtime statistics
 */
export async function getRealtimeStats(): Promise<BotResponse> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/dashboard/stats`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch realtime stats');
    }

    const data = await response.json();
    const now = new Date();
    const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    const text = `
⚡ <b>SỐ LIỆU REALTIME</b>
Cập nhật lúc: ${timeStr}

━━━━━━━━━━━━━━━━━━━━━

📊 <b>Chuyến đi hôm nay:</b>
   • Tổng: ${data.pendingOrders || 0} chuyến
   • Đang hoạt động: ${data.vehicles?.active || 0}/${data.vehicles?.total || 0} xe

💰 <b>Doanh thu:</b>
   • Hôm nay: ${formatNumber(data.revenue?.current || 0)} VNĐ
   • Trung bình/chuyến: ${data.pendingOrders ? formatNumber((data.revenue?.current || 0) / data.pendingOrders) : 0} VNĐ

⛽ <b>Nhiên liệu:</b>
   • ${formatNumber(data.fuelTank?.currentLevel || 0)}L / ${formatNumber(data.fuelTank?.capacity || 0)}L
   • ${formatPercentage(data.fuelTank?.percentage || 0)}
   ${getFuelWarning(data.fuelTank?.percentage || 0)}

━━━━━━━━━━━━━━━━━━━━━

🔄 Dữ liệu tự động cập nhật mỗi 5 phút
    `.trim();

    return {
      text,
      keyboard: {
        inline_keyboard: [
          [
            { text: '🔄 Làm mới', callback_data: 'stats_realtime' },
            { text: '📊 Xem chi tiết', callback_data: 'stats_today' },
          ],
        ],
      },
    };
  } catch (error) {
    console.error('❌ Error fetching realtime stats:', error);
    return {
      text: '❌ Không thể lấy dữ liệu realtime. Vui lòng thử lại.',
    };
  }
}

function getFuelWarning(percentage: number): string {
  if (percentage < 20) {
    return '🔴 <b>NGUY HIỂM:</b> Cần nạp ngay!';
  } else if (percentage < 30) {
    return '⚠️ <b>CẢNH BÁO:</b> Mức thấp';
  } else if (percentage < 50) {
    return '🟡 Nên theo dõi';
  } else {
    return '✅ Ổn định';
  }
}
