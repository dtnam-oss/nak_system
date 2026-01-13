import { BotResponse } from '@/types/telegram';
import { formatNumber } from '../formatters/number-formatter';

/**
 * Get customers report
 */
export async function getCustomersReport(): Promise<BotResponse> {
  try {
    // TODO: Fetch real customer data from your API
    // Mock data for now
    const mockData = {
      total: 32,
      totalTrips: 174,
      avgTripsPerCustomer: 5.4,
      topCustomers: [
        { name: 'Shopee Vietnam', trips: 45, revenue: 245000000 },
        { name: 'Lazada', trips: 38, revenue: 198000000 },
        { name: 'Tiki', trips: 32, revenue: 167000000 },
        { name: 'Sendo', trips: 28, revenue: 145000000 },
        { name: 'TikTok Shop', trips: 31, revenue: 156000000 },
      ],
    };

    const text = `
💼 <b>PHÂN TÍCH KHÁCH HÀNG - HÔM NAY</b>
${new Date().toLocaleDateString('vi-VN')}

━━━━━━━━━━━━━━━━━━━━━

📊 <b>Tổng quan:</b>
   • Tổng khách hàng: <b>${mockData.total}</b>
   • Tổng chuyến: ${mockData.totalTrips}
   • TB chuyến/KH: ${mockData.avgTripsPerCustomer}

━━━━━━━━━━━━━━━━━━━━━

🏆 <b>Top 5 khách hàng:</b>

1️⃣ <b>${mockData.topCustomers[0].name}</b>
   • Chuyến: ${mockData.topCustomers[0].trips}
   • DT: ${formatNumber(mockData.topCustomers[0].revenue)} VNĐ

2️⃣ <b>${mockData.topCustomers[1].name}</b>
   • Chuyến: ${mockData.topCustomers[1].trips}
   • DT: ${formatNumber(mockData.topCustomers[1].revenue)} VNĐ

3️⃣ <b>${mockData.topCustomers[2].name}</b>
   • Chuyến: ${mockData.topCustomers[2].trips}
   • DT: ${formatNumber(mockData.topCustomers[2].revenue)} VNĐ

4️⃣ <b>${mockData.topCustomers[3].name}</b>
   • Chuyến: ${mockData.topCustomers[3].trips}
   • DT: ${formatNumber(mockData.topCustomers[3].revenue)} VNĐ

5️⃣ <b>${mockData.topCustomers[4].name}</b>
   • Chuyến: ${mockData.topCustomers[4].trips}
   • DT: ${formatNumber(mockData.topCustomers[4].revenue)} VNĐ

━━━━━━━━━━━━━━━━━━━━━

💡 E-commerce chiếm 78% tổng chuyến
    `.trim();

    return {
      text,
      keyboard: {
        inline_keyboard: [
          [
            { text: '📊 Xem tất cả', callback_data: 'customers_all' },
            { text: '📈 Biểu đồ', callback_data: 'customers_chart' },
          ],
          [
            { text: '« Menu chính', callback_data: 'back_main' },
          ],
        ],
      },
    };
  } catch (error) {
    console.error('❌ Error fetching customers report:', error);
    return {
      text: '❌ Không thể lấy dữ liệu khách hàng. Vui lòng thử lại.',
    };
  }
}
