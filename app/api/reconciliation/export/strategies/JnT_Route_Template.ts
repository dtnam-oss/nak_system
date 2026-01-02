import ExcelJS from 'exceljs';
import { format } from 'date-fns';

/**
 * J&T Route Template - Mẫu Báo Cáo Theo Tuyến
 * 
 * Xuất báo cáo đối soát cho khách hàng J&T với format:
 * - 1 order = 1 row
 * - Multi-line cells: Gộp tất cả chiTietLoTrinh bằng ký tự xuống dòng (\n)
 * - wrapText enabled để hiển thị nội dung xuống dòng trong cell
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
  const worksheet = workbook.addWorksheet('Bang Ke J&T');

  // =====================
  // STEP 1: Define Columns & Width
  // =====================
  worksheet.columns = [
    { header: 'Ngày', key: 'date', width: 15 },
    { header: 'Biển số xe', key: 'licensePlate', width: 15 },
    { header: 'Mã tem', key: 'stampCode', width: 25 },
    { header: 'Điểm đi - Điểm đến', key: 'route', width: 45 },
    { header: 'Thể tích', key: 'volume', width: 15 },
    { header: 'Loại ca', key: 'shiftType', width: 20 },
  ];

  // =====================
  // STEP 2: Style Header Row
  // =====================
  const headerRow = worksheet.getRow(1);
  headerRow.height = 30;
  
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' }, // Light gray background
    };
    cell.font = { 
      bold: true, 
      color: { argb: 'FF000000' },
      size: 12
    };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
    cell.alignment = { 
      vertical: 'middle', 
      horizontal: 'center',
      wrapText: true
    };
  });

  // =====================
  // STEP 3: Process Data Loop
  // =====================
  data.forEach((order) => {
    // Parse details JSON safely (can be string or object)
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
    // Data Mapping Logic với Gộp Dòng
    // =====================

    // Cột A: Ngày (format dd/MM/yyyy)
    const dateValue = order.date ? format(new Date(order.date), 'dd/MM/yyyy') : '';

    // Cột B: Biển số xe (lấy unique values, nối bằng dấu phẩy)
    const licensePlates = chiTietLoTrinh
      .map((item: any) => item.bienKiemSoat)
      .filter((value: any, index: number, self: any[]) => 
        value && self.indexOf(value) === index // Unique only
      );
    const licensePlate = licensePlates.join(', ') || '';

    // Cột C: Mã tem (gộp tất cả bằng xuống dòng)
    const stampCodes = chiTietLoTrinh
      .map((item: any) => item.maTuyen)
      .filter((value: any) => value);
    const stampCode = stampCodes.join('\n') || '';

    // Cột D: Điểm đi - Điểm đến (gộp tất cả lộ trình bằng xuống dòng)
    const routes = chiTietLoTrinh
      .map((item: any) => item.loTrinhChiTiet)
      .filter((value: any) => value);
    const route = routes.join('\n') || order.route_name || '';

    // Cột E: Thể tích (gộp bằng xuống dòng)
    const volumes = chiTietLoTrinh
      .map((item: any) => item.taiTrongTinhPhi)
      .filter((value: any) => value !== null && value !== undefined);
    const volume = volumes.join('\n') || '';

    // Cột F: Loại ca (gộp bằng xuống dòng)
    const shiftTypes = chiTietLoTrinh
      .map((item: any) => item.loaiCa)
      .filter((value: any) => value);
    const shiftType = shiftTypes.join('\n') || '';

    // =====================
    // Add Row to Worksheet
    // =====================
    const row = worksheet.addRow({
      date: dateValue,
      licensePlate,
      stampCode,
      route,
      volume,
      shiftType,
    });

    // =====================
    // STEP 4: Style Data Cells (CRITICAL: wrapText for multi-line)
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
        wrapText: true, // CRITICAL: Enable text wrapping for \n
      };
    });

    // Auto-adjust row height based on content (estimate)
    const maxLines = Math.max(
      stampCodes.length,
      routes.length,
      volumes.length,
      shiftTypes.length,
      1
    );
    row.height = Math.max(20, maxLines * 15); // 15px per line
  });

  console.log('✓ Generated J&T Route Excel with', data.length, 'orders');
  
  return await workbook.xlsx.writeBuffer();
}
