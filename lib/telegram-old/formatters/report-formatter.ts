import { formatNumber, formatPercentage } from './number-formatter';

/**
 * Format morning report for KẾT QUẢ XỬ LÝ topic
 * Morning report shows YESTERDAY's data (hôm qua)
 * Purpose: Review previous day results and plan for today
 */
export function formatMorningKetQuaXuLy(data: any): string {
  const date = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return `
🌅 <b>BÁO CÁO TỔNG QUAN CHUYẾN ĐI - ${date.toUpperCase()}</b>
<i>📅 Dữ liệu: Ngày hôm qua</i>
<i>🎯 Mục đích: Tổng kết ngày hôm qua và lên kế hoạch hôm nay</i>

━━━━━━━━━━━━━━━━━━━━━

🎯 <b>Kế hoạch hôm nay:</b>
• Tổng số chuyến dự kiến: ${data.plannedTrips || 'Chưa có dữ liệu'}
• Xe NAK: ${data.nakTrips || 0} chuyến
• Thuê Vendor: ${data.vendorTrips || 0} chuyến

⛽ <b>Tình trạng nhiên liệu:</b>
• Tồn kho: ${formatNumber(data.fuel?.current || 0)}L (${formatPercentage(data.fuel?.percentage || 0)})
• Dự kiến tiêu thụ: ${formatNumber(data.fuel?.estimatedConsumption || 0)}L
${data.fuel?.percentage < 30 ? '⚠️ <b>CẢNH BÁO:</b> Nhiên liệu thấp!' : ''}

${data.priorities && data.priorities.length > 0 ? `📌 <b>Ưu tiên hôm nay:</b>
${formatPriorities(data.priorities)}

` : ''}━━━━━━━━━━━━━━━━━━━━━

💪 Chúc một ngày làm việc hiệu quả!
  `.trim();
}

/**
 * Format evening report for KẾT QUẢ XỬ LÝ topic
 * Evening report shows TODAY's data (hôm nay)
 * Purpose: Real-time progress tracking for current day
 */
export function formatEveningKetQuaXuLy(data: any): string {
  const date = new Date().toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const comparisonIcon = data.comparison > 0 ? '📈' : data.comparison < 0 ? '📉' : '➡️';
  const comparisonText = data.comparison > 0 ? 'tăng' : data.comparison < 0 ? 'giảm' : 'không đổi';

  return `
✅ <b>BÁO CÁO TỔNG QUAN CHUYẾN ĐI - ${date}</b>
<i>📅 Dữ liệu: Ngày hôm nay (cập nhật cuối ngày)</i>
<i>🎯 Mục đích: Theo dõi tiến độ thực tế trong ngày</i>

━━━━━━━━━━━━━━━━━━━━━

<b>Tổng quan:</b>
• Tổng số chuyến tạo: <b>${data.totalTrips || 0}</b>
• Số chuyến đã xử lý: ${data.processed || 0} (${formatPercentage(data.processedPercent || 0)})
  (Hoàn tất: ${data.completed || 0}, Hủy: ${data.cancelled || 0})

━━━━━━━━━━━━━━━━━━━━━

<b>Chi tiết theo trạng thái:</b>
• Đang khởi tạo: ${data.byStatus?.initializing || 0}
• Chuyến đi mới: ${data.byStatus?.new || 0}
• Chờ giao hàng: ${data.byStatus?.pending || 0}
• Đang giao hàng: ${data.byStatus?.delivering || 0}
• Giao thành công: ${data.byStatus?.completed || 0}
• Hoàn tất: ${data.byStatus?.done || 0}
• Hủy chuyến: ${data.byStatus?.cancelled || 0}

━━━━━━━━━━━━━━━━━━━━━

${comparisonIcon} <b>So với hôm qua:</b> ${comparisonText} ${Math.abs(data.comparison || 0)} chuyến

🎉 Tổng kết một ngày làm việc thành công!
  `.trim();
}

/**
 * Format morning report for ĐỐI TÁC VẬN CHUYỂN topic
 * Morning report shows YESTERDAY's data
 */
export function formatMorningDoiTac(data: any): string {
  const date = new Date().toLocaleDateString('vi-VN');

  return `
🚚 <b>BÁO CÁO HIỆU SUẤT ĐỐI TÁC - ${date}</b>
<i>📅 Dữ liệu: Ngày hôm qua</i>

━━━━━━━━━━━━━━━━━━━━━

<b>Kế hoạch hôm nay:</b>
• Tổng chuyến dự kiến: ${data.plannedTrips || 'Chưa có dữ liệu'}

<b>Phân bổ theo đối tác:</b>
${formatPartnerList(data.partners || [])}

━━━━━━━━━━━━━━━━━━━━━

🎯 <b>Mục tiêu:</b>
• Hoàn thành: > 95% chuyến
• Độ chính xác: > 98%
• Không vi phạm SLA

💪 Chúc các đối tác một ngày hoạt động hiệu quả!
  `.trim();
}

/**
 * Format evening report for ĐỐI TÁC VẬN CHUYỂN topic
 * Evening report shows TODAY's data
 */
export function formatEveningDoiTac(data: any): string {
  const date = new Date().toLocaleDateString('vi-VN');
  const totalVendorTrips = data.allVendors?.reduce((sum: number, v: any) => sum + v.total, 0) || 0;
  const nakTrips = data.nakTrips || 0;
  const vendorTrips = data.vendorTrips || 0;

  return `
📈 <b>HIỆU SUẤT ĐỐI TÁC - ${date}</b>
<i>📅 Dữ liệu: Ngày hôm nay</i>

━━━━━━━━━━━━━━━━━━━━━

<b>Phân bổ vận chuyển:</b>
• NAK: ${nakTrips} chuyến
• Thuê Vendor: ${vendorTrips} chuyến
• <b>Tổng:</b> ${totalVendorTrips} chuyến

━━━━━━━━━━━━━━━━━━━━━

<b>Chi tiết tất cả đối tác/tài xế:</b>
${formatAllVendorsDetails(data.allVendors || [])}

━━━━━━━━━━━━━━━━━━━━━

🏆 <b>Top 3 đối tác (theo số chuyến):</b>
${formatTopVendors(data.topPartners || [])}

${data.underperformers?.length > 0 ? `
⚠️ <b>Cần quan tâm:</b>
${formatUnderperformers(data.underperformers)}
` : '✅ Tất cả đối tác hoạt động tốt!'}
  `.trim();
}

/**
 * Format morning report for KHÁCH HÀNG topic
 * Morning report shows YESTERDAY's data
 */
export function formatMorningKhachHang(data: any): string {
  const date = new Date().toLocaleDateString('vi-VN');

  return `
💼 <b>BÁO CÁO XỬ LÝ THEO KHÁCH HÀNG - ${date}</b>
<i>📅 Dữ liệu: Ngày hôm qua</i>

━━━━━━━━━━━━━━━━━━━━━

<b>Kế hoạch hôm nay:</b>
• Tổng chuyến dự kiến: ${data.plannedTrips || 'Chưa có dữ liệu'}
• Khách hàng có chuyến: ${data.activeCustomers || 0}

<b>Top khách hàng hôm nay:</b>
${formatCustomerList(data.topCustomers || [])}

${data.specialRequests?.length > 0 ? `
⏰ <b>Yêu cầu đặc biệt:</b>
${formatSpecialRequests(data.specialRequests)}
` : ''}

━━━━━━━━━━━━━━━━━━━━━

🎯 Tập trung phục vụ tốt các khách hàng!
  `.trim();
}

/**
 * Format evening report for KHÁCH HÀNG topic
 * Evening report shows TODAY's data
 */
export function formatEveningKhachHang(data: any): string {
  const date = new Date().toLocaleDateString('vi-VN');
  const avgTrips = data.totalCustomers > 0 ? (data.totalTrips / data.totalCustomers).toFixed(1) : '0.0';

  return `
💰 <b>BÁO CÁO XỬ LÝ THEO KHÁCH HÀNG - ${date}</b>
<i>📅 Dữ liệu: Ngày hôm nay</i>

━━━━━━━━━━━━━━━━━━━━━

<b>Tổng quan:</b>
• Tổng khách hàng: ${data.totalCustomers || 0}
• Tổng chuyến: ${data.totalTrips || 0}
• Chuyến TB/KH: ${avgTrips}

<b>Top khách hàng (theo số chuyến):</b>
${formatTopCustomersByTrips(data.topCustomers || [])}

━━━━━━━━━━━━━━━━━━━━━

📊 <b>Phân tích:</b>
${formatComparison('So với hôm qua', data.comparisons?.vsYesterday || 0, 'khách hàng')}
${formatComparison('So với tuần trước', data.comparisons?.vsLastWeek || 0, 'khách hàng')}
${formatComparison('So với tháng trước', data.comparisons?.vsLastMonth || 0, 'khách hàng')}

✅ Cảm ơn đã phục vụ khách hàng tốt hôm nay!
  `.trim();
}

// Helper functions
function formatPriorities(priorities: string[]): string {
  if (priorities.length === 0) return '• Không có ưu tiên đặc biệt';
  return priorities.map(p => `• ${p}`).join('\n');
}

function formatPartnerList(partners: any[]): string {
  if (partners.length === 0) return '• Chưa có dữ liệu';
  return partners
    .map((p, i) => `${i + 1}. ${p.name}: ${p.trips} chuyến`)
    .join('\n');
}

function formatTopPartners(partners: any[]): string {
  if (partners.length === 0) return '• Chưa có dữ liệu';
  return partners
    .map((p, i) => {
      const icon = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
      return `${icon} ${p.name} - ${p.trips || p.total} chuyến (${formatPercentage(p.percentage)})`;
    })
    .join('\n');
}

function formatTopVendors(vendors: any[]): string {
  if (vendors.length === 0) return '• Chưa có dữ liệu';
  return vendors
    .slice(0, 3)
    .map((v, i) => {
      const icon = i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉';
      return `${icon} ${v.name} - ${v.total} chuyến`;
    })
    .join('\n');
}

function formatAllVendorsDetails(vendors: any[]): string {
  if (vendors.length === 0) return '• Chưa có dữ liệu';
  return vendors
    .map((v, i) => {
      const providerTag = v.provider === 'NAK' ? '🚛' : '🚚';
      return `${i + 1}. ${providerTag} <b>${v.name}</b>\n   • Đang xử lý: ${v.inProgress} | Hoàn tất: ${v.completed}`;
    })
    .join('\n');
}

function formatUnderperformers(partners: any[]): string {
  return partners.map(p => `• ${p.name}: ${p.reason}`).join('\n');
}

function formatCustomerList(customers: any[]): string {
  if (customers.length === 0) return '• Chưa có dữ liệu';
  return customers
    .slice(0, 5)
    .map((c, i) => `${i + 1}. ${c.name} - ${c.trips} chuyến`)
    .join('\n');
}

function formatTopCustomers(customers: any[]): string {
  if (customers.length === 0) return '• Chưa có dữ liệu';
  return customers
    .slice(0, 5)
    .map((c, i) => {
      const icon = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
      return `${icon} ${c.name}\n   • Chuyến: ${c.trips} | DT: ${formatNumber(c.revenue)} VNĐ`;
    })
    .join('\n\n');
}

function formatTopCustomersByTrips(customers: any[]): string {
  if (customers.length === 0) return '• Chưa có dữ liệu';
  // Sort by trips count (already sorted in data fetch)
  return customers
    .slice(0, 5)
    .map((c, i) => {
      const icon = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
      return `${icon} ${c.name} - ${c.trips} chuyến`;
    })
    .join('\n');
}

function formatSpecialRequests(requests: string[]): string {
  return requests.map(r => `• ${r}`).join('\n');
}

function formatComparison(label: string, value: number, unit: string): string {
  const icon = value > 0 ? '📈' : value < 0 ? '📉' : '➡️';
  const text = value > 0 ? 'tăng' : value < 0 ? 'giảm' : 'không đổi';
  const absValue = Math.abs(value);
  return `• ${label}: ${icon} ${text} ${absValue} ${unit}`;
}
