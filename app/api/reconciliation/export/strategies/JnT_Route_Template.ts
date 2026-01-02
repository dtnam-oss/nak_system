import ExcelJS from 'exceljs';
import { format } from 'date-fns';

/**
 * J&T Route Template - Mẫu Báo Cáo Theo Tuyến
 * 
 * Xuất báo cáo đối soát cho khách hàng J&T theo TUYẾN với logic:
 * - 1 order = 1 row
 * - Tem chiều đi: maTuyen đầu tiên (index 0)
 * - Tem chiều về: maTuyen cuối cùng (index length-1)
 * - Route name: Lấy trực tiếp từ order.route_name
 */

interface ReconciliationDatabaseRow {
  id: string;
  order_id: string;
  date: Date;
  customer: string;
  route_name: string;
  driver_name: string;
  provider: string;
  status: string;
  cost: number;
  revenue: number;
  trip_type: string;
  route_type: string;
  weight: number;
  total_distance: number;
  details: any;
  created_at: Date;
}

export async function generateJnTRouteExcel(data: ReconciliationDatabaseRow[]): Promise<ExcelJS.Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('JnT Theo Tuyen');

  // =====================
  // STEP 1: Define Columns & Width
  // =====================
  worksheet.columns = [
    { header: 'STT', key: 'stt', width: 5 },
    { header: 'Ngày', key: 'date', width: 15 },
    { header: 'Biển số xe', key: 'licensePlate', width: 15 },
    { header: 'Điểm đi - Điểm đến', key: 'routeName', width: 40 },
    { header: 'Tem chiều đi', key: 'stampOut', width: 25 },
    { header: 'Tem chiều về', key: 'stampIn', width: 25 },
    { header: 'Thể tích', key: 'volume', width: 15 },
  ];

  // =====================
  // STEP 2: Style Header Row
  // =====================
  const headerRow = worksheet.getRow(1);
  headerRow.height = 25;
  
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFC0C0C0' }, // Silver gray
    };
    cell.font = { 
      bold: true, 
      color: { argb: 'FF000000' } // Black
    };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
    cell.alignment = { 
      vertical: 'middle', 
      horizontal: 'center' 
    };
  });

  // =====================
  // STEP 3: Process Data Loop
  // =====================
  data.forEach((order, index) => {
    // Parse details JSON safely
    let details: any = null;
    try {
      if (typeof order.details === 'string') {
        details = JSON.parse(order.details);
      } else if (typeof order.details === 'object' && order.details !== null) {
        details = order.details;
      }
    } catch (error) {
      console.error('Failed to parse details for order:', order.id, error);
    }

    // Extract chiTietLoTrinh array
    const chiTietLoTrinh = Array.isArray(details?.chiTietLoTrinh) 
      ? details.chiTietLoTrinh 
      : [];

    // =====================
    // Data Mapping Logic
    // =====================

    // Cột A: STT (1, 2, 3, ...)
    const stt = index + 1;

    // Cột B: Ngày (dd/MM/yyyy)
    const dateValue = order.date ? format(new Date(order.date), 'dd/MM/yyyy') : '';

    // Cột C: Biển số xe (Lấy từ phần tử đầu tiên)
    const licensePlate = chiTietLoTrinh[0]?.bienKiemSoat || '';

    // Cột D: Điểm đi - Điểm đến (Lấy trực tiếp từ order.route_name)
    const routeName = order.route_name || '';

    // Cột E: Tem chiều đi (maTuyen đầu tiên - index 0)
    const stampOut = chiTietLoTrinh[0]?.maTuyen || '';

    // Cột F: Tem chiều về (maTuyen cuối cùng - index length-1)
    const stampIn = chiTietLoTrinh.length > 0 
      ? chiTietLoTrinh[chiTietLoTrinh.length - 1]?.maTuyen || ''
      : '';

    // Cột G: Thể tích (Nối bằng dấu phẩy nếu có nhiều giá trị)
    const volumes = chiTietLoTrinh
      .map((item: any) => item.taiTrongTinhPhi)
      .filter((value: any) => value !== null && value !== undefined);
    const volume = volumes.length > 0 ? volumes.join(', ') : '';

    // =====================
    // Add Row to Worksheet
    // =====================
    const row = worksheet.addRow({
      stt,
      date: dateValue,
      licensePlate,
      routeName,
      stampOut,
      stampIn,
      volume,
    });

    // =====================
    // STEP 4: Style Data Cells
    // =====================
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center',
        wrapText: true, // Prevent text overflow
      };
    });

    // Set row height (standard)
    row.height = 20;
  });

  console.log('✓ Generated J&T Route Excel with', data.length, 'orders');
  
  return await workbook.xlsx.writeBuffer();
}
