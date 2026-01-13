import { BotResponse } from '@/types/telegram';
import { formatNumber } from '../formatters/number-formatter';

/**
 * Get trips report
 */
export async function getTripsReport(groupBy?: string): Promise<BotResponse> {
  try {
    // TODO: Fetch real trips data from your API
    // For now, using mock data structure similar to your screenshot

    const mockData = {
      total: 174,
      processed: 0,
      processedPercent: 0,
      byStatus: {
        initializing: 0,
        new: 0,
        pending: 0,
        delivering: 0,
        completed: 78,
        done: 89,
        cancelled: 7,
      },
    };

    const text = `
🚛 <b>THỐNG KÊ CHUYẾN ĐI - HÔM NAY</b>
${new Date().toLocaleDateString('vi-VN')}

━━━━━━━━━━━━━━━━━━━━━

<b>Tổng quan:</b>
• Tổng số chuyến tạo: <b>${mockData.total}</b>
• Số chuyến đã xử lý: ${mockData.processed} (${mockData.processedPercent}%)
  (Hoàn tất: ${mockData.byStatus.done}, Hủy: ${mockData.byStatus.cancelled})

━━━━━━━━━━━━━━━━━━━━━

<b>Chi tiết theo trạng thái:</b>
• Đang khởi tạo: ${mockData.byStatus.initializing}
• Chuyến đi mới: ${mockData.byStatus.new}
• Chờ giao hàng: ${mockData.byStatus.pending}
• Đang giao hàng: ${mockData.byStatus.delivering}
• Giao thành công: ${mockData.byStatus.completed}
• Hoàn tất: ${mockData.byStatus.done}
• Hủy chuyến: ${mockData.byStatus.cancelled}

━━━━━━━━━━━━━━━━━━━━━

💡 Tip: Dùng menu bên dưới để xem chi tiết hơn
    `.trim();

    return {
      text,
      keyboard: {
        inline_keyboard: [
          [
            { text: '📈 Theo trạng thái', callback_data: 'trips_by_status' },
            { text: '🏢 Theo đơn vị', callback_data: 'trips_by_provider' },
          ],
          [
            { text: '⏱️ Chuyến trễ', callback_data: 'trips_delayed' },
            { text: '❌ Chuyến hủy', callback_data: 'trips_cancelled' },
          ],
          [
            { text: '« Menu chính', callback_data: 'back_main' },
          ],
        ],
      },
    };
  } catch (error) {
    console.error('❌ Error fetching trips report:', error);
    return {
      text: '❌ Không thể lấy dữ liệu chuyến đi. Vui lòng thử lại.',
    };
  }
}
