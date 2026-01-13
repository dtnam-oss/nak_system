import { BotResponse } from '@/types/telegram';
import { formatNumber } from '../formatters/number-formatter';

/**
 * Get partners performance report
 */
export async function getPartnersReport(partner?: string): Promise<BotResponse> {
  try {
    // TODO: Fetch real partner data from your API
    // Mock data for now
    const mockData = {
      total: 174,
      byPartner: {
        viettel: { trips: 52, percentage: 30 },
        ghn: { trips: 45, percentage: 26 },
        jnt: { trips: 38, percentage: 22 },
        other: { trips: 39, percentage: 22 },
      },
    };

    let text = '';

    if (partner && partner !== 'all') {
      // Specific partner report
      const partnerData = mockData.byPartner[partner as keyof typeof mockData.byPartner];
      text = `
🤝 <b>BÁO CÁO ĐỐI TÁC: ${partner.toUpperCase()}</b>
${new Date().toLocaleDateString('vi-VN')}

━━━━━━━━━━━━━━━━━━━━━

📊 <b>Hôm nay:</b>
   • Số chuyến: <b>${partnerData.trips}</b>
   • Tỷ trọng: ${partnerData.percentage}%

📈 <b>Hiệu suất:</b>
   • Hoàn thành: ${Math.floor(partnerData.trips * 0.9)}
   • Đang xử lý: ${Math.floor(partnerData.trips * 0.1)}
   • Trễ hạn: 0

✅ <b>Đánh giá:</b> Tốt

━━━━━━━━━━━━━━━━━━━━━
      `.trim();
    } else {
      // All partners overview
      text = `
🤝 <b>HIỆU SUẤT ĐỐI TÁC - HÔM NAY</b>
${new Date().toLocaleDateString('vi-VN')}

━━━━━━━━━━━━━━━━━━━━━

📊 <b>Tổng quan:</b>
   • Tổng số chuyến: <b>${mockData.total}</b>
   • Số đối tác: 4

━━━━━━━━━━━━━━━━━━━━━

🏆 <b>Top performers:</b>

1️⃣ <b>Viettel Post</b>
   • ${mockData.byPartner.viettel.trips} chuyến (${mockData.byPartner.viettel.percentage}%)
   • ✅ Hoạt động tốt

2️⃣ <b>GHN</b>
   • ${mockData.byPartner.ghn.trips} chuyến (${mockData.byPartner.ghn.percentage}%)
   • ✅ Hoạt động tốt

3️⃣ <b>J&T Express</b>
   • ${mockData.byPartner.jnt.trips} chuyến (${mockData.byPartner.jnt.percentage}%)
   • ✅ Hoạt động tốt

4️⃣ <b>Khác</b>
   • ${mockData.byPartner.other.trips} chuyến (${mockData.byPartner.other.percentage}%)

━━━━━━━━━━━━━━━━━━━━━

💡 Tất cả đối tác đều hoạt động ổn định
      `.trim();
    }

    return {
      text,
      keyboard: {
        inline_keyboard: [
          [
            { text: 'Viettel', callback_data: 'partner_viettel' },
            { text: 'GHN', callback_data: 'partner_ghn' },
          ],
          [
            { text: 'J&T', callback_data: 'partner_jnt' },
            { text: 'Tất cả', callback_data: 'partner_all' },
          ],
          [
            { text: '« Menu chính', callback_data: 'back_main' },
          ],
        ],
      },
    };
  } catch (error) {
    console.error('❌ Error fetching partners report:', error);
    return {
      text: '❌ Không thể lấy dữ liệu đối tác. Vui lòng thử lại.',
    };
  }
}
