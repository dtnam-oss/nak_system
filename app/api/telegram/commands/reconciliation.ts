import { BotResponse } from '@/types/telegram';
import { formatNumber } from '../formatters/number-formatter';

/**
 * Get reconciliation report
 */
export async function getReconciliationReport(partner?: string): Promise<BotResponse> {
  try {
    // TODO: Fetch real reconciliation data from your API
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

    // Mock data for now
    const mockData = {
      ghn: {
        totalTrips: 45,
        reconciled: 43,
        pending: 2,
        mismatch: 0,
        mismatchAmount: 0,
        status: 'good',
      },
      jnt: {
        totalTrips: 38,
        reconciled: 38,
        pending: 0,
        mismatch: 0,
        mismatchAmount: 0,
        status: 'good',
      },
    };

    const text = `
💰 <b>ĐỐI SOÁT ĐỐI TÁC - HÔM NAY</b>
${new Date().toLocaleDateString('vi-VN')}

━━━━━━━━━━━━━━━━━━━━━

📊 <b>GHN - Giao Hàng Nhanh:</b>
   • Tổng chuyến: ${mockData.ghn.totalTrips}
   • Đã đối soát: ${mockData.ghn.reconciled}
   • Chờ xử lý: ${mockData.ghn.pending}
   • Chênh lệch: ${formatNumber(mockData.ghn.mismatchAmount)} VNĐ
   ${mockData.ghn.status === 'good' ? '✅ Chính xác' : '⚠️ Cần kiểm tra'}

━━━━━━━━━━━━━━━━━━━━━

📊 <b>J&T Express:</b>
   • Tổng chuyến: ${mockData.jnt.totalTrips}
   • Đã đối soát: ${mockData.jnt.reconciled}
   • Chờ xử lý: ${mockData.jnt.pending}
   • Chênh lệch: ${formatNumber(mockData.jnt.mismatchAmount)} VNĐ
   ${mockData.jnt.status === 'good' ? '✅ Chính xác' : '⚠️ Cần kiểm tra'}

━━━━━━━━━━━━━━━━━━━━━

${getPendingActions(mockData)}
    `.trim();

    return {
      text,
      keyboard: {
        inline_keyboard: [
          [
            { text: '📊 Chi tiết GHN', callback_data: 'recon_ghn' },
            { text: '📊 Chi tiết J&T', callback_data: 'recon_jnt' },
          ],
          [
            { text: '📄 Export báo cáo', callback_data: 'recon_export' },
          ],
          [
            { text: '« Menu chính', callback_data: 'back_main' },
          ],
        ],
      },
    };
  } catch (error) {
    console.error('❌ Error fetching reconciliation report:', error);
    return {
      text: '❌ Không thể lấy dữ liệu đối soát. Vui lòng thử lại.',
    };
  }
}

function getPendingActions(data: any): string {
  const totalPending = data.ghn.pending + data.jnt.pending;
  const totalMismatch = data.ghn.mismatch + data.jnt.mismatch;

  if (totalPending === 0 && totalMismatch === 0) {
    return '✅ <b>Tất cả đối soát đã hoàn thành chính xác</b>';
  }

  let message = '';
  if (totalPending > 0) {
    message += `⏳ Có ${totalPending} chuyến chờ xử lý\n`;
  }
  if (totalMismatch > 0) {
    message += `⚠️ Có ${totalMismatch} chuyến chênh lệch cần kiểm tra`;
  }

  return message.trim();
}
