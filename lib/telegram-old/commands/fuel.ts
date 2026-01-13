import { BotResponse } from '@/types/telegram';
import { formatNumber, formatPercentage } from '../formatters/number-formatter';

/**
 * Get fuel inventory report
 */
export async function getFuelReport(): Promise<BotResponse> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

    // Fetch fuel inventory data
    const response = await fetch(`${baseUrl}/api/fuel/inventory/fifo`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch fuel data');
    }

    const data = await response.json();

    // Calculate stats
    const totalInventory = data.totalInventory || 0;
    const capacity = 4000; // You can make this configurable
    const percentage = (totalInventory / capacity) * 100;
    const avgConsumption = 520; // Average daily consumption (you can calculate this from real data)
    const daysRemaining = totalInventory / avgConsumption;

    const text = `
⛽ <b>TÌNH TRẠNG NHIÊN LIỆU</b>
Cập nhật: ${new Date().toLocaleTimeString('vi-VN')}

━━━━━━━━━━━━━━━━━━━━━

📊 <b>Tồn kho hiện tại:</b>
   • ${formatNumber(totalInventory)}L / ${formatNumber(capacity)}L
   • Tỷ lệ: <b>${formatPercentage(percentage)}</b>
   ${getFuelStatusIcon(percentage)}

📈 <b>Dự báo:</b>
   • Tiêu thụ TB: ${formatNumber(avgConsumption)}L/ngày
   • Dự kiến đủ dùng: ~${Math.floor(daysRemaining)} ngày
   ${getRefuelRecommendation(percentage, daysRemaining)}

${getFuelWarningMessage(percentage)}

━━━━━━━━━━━━━━━━━━━━━

💡 Mức an toàn: > 30% (${formatNumber(capacity * 0.3)}L)
    `.trim();

    return {
      text,
      keyboard: {
        inline_keyboard: [
          [
            { text: '📊 Lịch sử nhập', callback_data: 'fuel_imports' },
            { text: '📈 Biểu đồ tiêu thụ', callback_data: 'fuel_chart' },
          ],
          [
            { text: '🔄 Làm mới', callback_data: 'fuel_current' },
            { text: '« Menu chính', callback_data: 'back_main' },
          ],
        ],
      },
    };
  } catch (error) {
    console.error('❌ Error fetching fuel report:', error);
    return {
      text: '❌ Không thể lấy dữ liệu nhiên liệu. Vui lòng thử lại.',
    };
  }
}

function getFuelStatusIcon(percentage: number): string {
  if (percentage >= 70) return '🟢 Tốt';
  if (percentage >= 50) return '🟡 Trung bình';
  if (percentage >= 30) return '🟠 Thấp';
  if (percentage >= 20) return '⚠️ Cảnh báo';
  return '🔴 Nguy hiểm';
}

function getRefuelRecommendation(percentage: number, daysRemaining: number): string {
  if (percentage < 20) {
    return '\n   ⚠️ <b>Khuyến nghị: NẠP NGAY!</b>';
  } else if (percentage < 30) {
    return `\n   💡 Khuyến nghị: Nạp trong ${Math.ceil(daysRemaining - 1)} ngày`;
  } else if (percentage < 50) {
    return '\n   ℹ️ Nên theo dõi và lên kế hoạch nạp';
  }
  return '\n   ✅ Không cần nạp ngay';
}

function getFuelWarningMessage(percentage: number): string {
  if (percentage < 20) {
    return `
⚠️ <b>CẢNH BÁO NGHIÊM TRỌNG</b>
Mức nhiên liệu dưới 20%!
Cần nạp ngay để đảm bảo hoạt động.
    `.trim();
  } else if (percentage < 30) {
    return `
⚠️ <b>CẢNH BÁO</b>
Mức nhiên liệu thấp. Nên nạp sớm.
    `.trim();
  }
  return '';
}
