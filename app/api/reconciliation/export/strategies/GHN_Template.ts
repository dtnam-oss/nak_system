import ExcelJS from 'exceljs';
import { format } from 'date-fns';

/**
 * GHN Excel Template Strategy
 * 
 * Core Logic: Row Flattening
 * Unlike J&T templates (consolidate into one row with multi-line cells),
 * GHN template creates SEPARATE ROWS for each item in chiTietLoTrinh array.
 * 
 * Example:
 * - Input: 1 order with 3 items in chiTietLoTrinh
 * - Output: 3 rows in Excel with repeated parent date
 * 
 * Columns (14 total):
 * A - STT (continuous counter)
 * B - Ngày (from order.date, repeated)
 * C - Biển số xe
 * D - Trọng tải yêu cầu
 * E - Hình thức tính giá
 * F - Lộ trình chi tiết
 * G - Số KM
 * H - Đơn giá khung
 * I - Vé cầu đường (empty)
 * J - Phí dừng tải (empty)
 * K - Tỷ lệ Ontime (empty)
 * L - Thành tiền (empty)
 * M - Tên tuyến
 * N - Mã chuyến
 */

interface OrderData {
  order_id: string;
  date: string | Date;
  customer: string;
  route_name?: string;
  details?: {
    chiTietLoTrinh?: Array<{
      bienKiemSoat?: string;
      taiTrongTinhPhi?: string;
      hinhThucTinhGia?: string;
      loTrinhChiTiet?: string;
      quangDuong?: string | number;
      donGia?: string | number;
      loTrinh?: string;
      maTuyen?: string;
    }>;
  };
}

export async function generateGHNExcel(data: OrderData[]): Promise<ExcelJS.Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Bảng Kê GHN');

  // 1. Define Columns
  worksheet.columns = [
    { header: 'STT', key: 'stt', width: 6 },
    { header: 'Ngày', key: 'date', width: 12 },
    { header: 'Biển số xe', key: 'licensePlate', width: 15 },
    { header: 'Trọng tải yêu cầu', key: 'weight', width: 18 },
    { header: 'Hình thức tính giá', key: 'pricingMethod', width: 22 },
    { header: 'Lộ trình', key: 'routeDetail', width: 40 },
    { header: 'Số KM', key: 'distance', width: 10 },
    { header: 'Đơn giá khung', key: 'unitPrice', width: 15 },
    { header: 'Vé cầu đường', key: 'tollFee', width: 15 },
    { header: 'Phí dừng tải', key: 'parkingFee', width: 15 },
    { header: 'Tỷ lệ Ontime', key: 'ontimeRate', width: 15 },
    { header: 'Thành tiền (chưa VAT)', key: 'amount', width: 18 },
    { header: 'Tên tuyến', key: 'routeName', width: 25 },
    { header: 'Mã chuyến', key: 'tripCode', width: 20 },
  ];

  // 2. Style Header Row (Row 1)
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, size: 11 };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFEEEEEE' } // Light gray
  };
  headerRow.alignment = {
    vertical: 'middle',
    horizontal: 'center'
  };
  headerRow.height = 25;

  // Apply borders to header
  headerRow.eachCell((cell) => {
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });

  // 3. Process Data (Flattening Logic)
  let globalSTT = 1;

  data.forEach((order) => {
    // Parse detail array
    const details = order.details?.chiTietLoTrinh || [];
    
    // Skip orders without detail items
    if (!Array.isArray(details) || details.length === 0) return;

    // Format parent date once (will be repeated for all detail rows)
    const formattedDate = order.date 
      ? format(order.date instanceof Date ? order.date : new Date(order.date), 'dd/MM/yyyy') 
      : '';

    // Create one Excel row for each detail item
    details.forEach((item) => {
      const row = worksheet.addRow({
        stt: globalSTT++,
        date: formattedDate,
        licensePlate: item.bienKiemSoat || '',
        weight: item.taiTrongTinhPhi || '',
        pricingMethod: item.hinhThucTinhGia || '',
        routeDetail: item.loTrinhChiTiet || '',
        distance: item.quangDuong || '',
        unitPrice: item.donGia || '',
        tollFee: '', // Empty as per requirements
        parkingFee: '', // Empty as per requirements
        ontimeRate: '', // Empty as per requirements
        amount: '', // Empty as per requirements
        routeName: item.loTrinh || '',
        tripCode: item.maTuyen || ''
      });

      // 4. Style Data Rows
      row.alignment = {
        vertical: 'middle',
        horizontal: 'center'
      };
      row.height = 20;

      // Apply borders to all cells
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });

      // Number formatting for price columns (if they contain numeric values)
      const unitPriceCell = row.getCell('unitPrice');
      if (unitPriceCell.value && !isNaN(Number(unitPriceCell.value))) {
        unitPriceCell.numFmt = '#,##0';
      }

      const amountCell = row.getCell('amount');
      if (amountCell.value && !isNaN(Number(amountCell.value))) {
        amountCell.numFmt = '#,##0';
      }
    });
  });

  // 5. Return buffer
  return await workbook.xlsx.writeBuffer();
}
