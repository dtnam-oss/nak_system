import ExcelJS from 'exceljs';
import { format } from 'date-fns';

/**
 * YUNYI Excel Template Strategy
 *
 * Core Logic: Row Flattening (like GHN)
 * Creates SEPARATE ROWS for each item in chiTietLoTrinh array.
 *
 * Columns (9 total):
 * A - Ngày vận chuyển thực tế (from chuyen_di.ngay_chuyen_di)
 * B - Lái xe 1 (split ten_tai_xe by comma, first item)
 * C - Lái xe 2 (split ten_tai_xe by comma, second item)
 * D - Ngày vận chuyển quy hoạch (from chi_tiet.ngay_tren_tem)
 * E - Tuyến vận chuyển (from chi_tiet.ten_tuyen)
 * F - Tem xe chiều đi (from chi_tiet.ma_chuyen_di_kh)
 * G - Đơn giá cố định (from chi_tiet.don_gia)
 * H - Biển số (from chi_tiet.bien_kiem_soat)
 * I - URL (from chi_tiet.hinh_anh, converted to AppSheet public URL)
 */

interface OrderData {
  order_id: string;
  date: string | Date;
  customer: string;
  driver_name?: string;
  details?: {
    chiTietLoTrinh?: Array<{
      ngayTrenTem?: string;
      loTrinh?: string;
      maTuyen?: string;
      donGia?: string | number;
      bienKiemSoat?: string;
      hinhAnh?: string;
    }>;
  };
}

/**
 * Build AppSheet public URL from image filename
 * Format: https://www.appsheet.com/template/gettablefileurl?appName={appName}&tableName={tableName}&fileName={fileName}
 */
function buildAppSheetImageUrl(filename: string | undefined): string {
  if (!filename) return '';

  const appName = 'SYSTEMNAKLOGISTICS-906096635-26-01-22';
  const tableName = 'chi_tiet_chuyen_di';

  // Build URL with proper encoding
  const baseUrl = 'https://www.appsheet.com/template/gettablefileurl';
  const params = new URLSearchParams({
    appName: appName,
    tableName: tableName,
    fileName: filename
  });

  return `${baseUrl}?${params.toString()}`;
}

/**
 * Split driver names by comma
 */
function splitDriverNames(driverName: string | undefined): { driver1: string; driver2: string } {
  if (!driverName) return { driver1: '', driver2: '' };

  const drivers = driverName.split(',').map(d => d.trim());
  return {
    driver1: drivers[0] || '',
    driver2: drivers[1] || ''
  };
}

export async function generateYUNYIExcel(data: OrderData[]): Promise<ExcelJS.Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Bảng Kê YUNYI');

  // 1. Define Columns
  worksheet.columns = [
    { header: 'Ngày vận chuyển thực tế', key: 'actualDate', width: 20 },
    { header: 'Lái xe 1', key: 'driver1', width: 20 },
    { header: 'Lái xe 2', key: 'driver2', width: 20 },
    { header: 'Ngày vận chuyển quy hoạch', key: 'plannedDate', width: 22 },
    { header: 'Tuyến vận chuyển', key: 'route', width: 35 },
    { header: 'Tem xe chiều đi', key: 'stampCode', width: 25 },
    { header: 'Đơn giá cố định', key: 'fixedPrice', width: 18 },
    { header: 'Biển số', key: 'licensePlate', width: 15 },
    { header: 'URL', key: 'imageUrl', width: 50 },
  ];

  // 2. Style Header Row (Row 1)
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0070C0' } // Blue background
  };
  headerRow.alignment = {
    vertical: 'middle',
    horizontal: 'center',
    wrapText: true
  };
  headerRow.height = 30;

  // Apply borders to header
  headerRow.eachCell((cell) => {
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });

  // 3. Process Data (Flattening Logic - same as GHN)
  let globalSTT = 1;

  data.forEach((order) => {
    // Parse detail array
    const details = order.details?.chiTietLoTrinh || [];

    // Skip orders without detail items
    if (!Array.isArray(details) || details.length === 0) return;

    // Format parent date once (will be repeated for all detail rows)
    const formattedActualDate = order.date
      ? format(order.date instanceof Date ? order.date : new Date(order.date), 'dd/MM/yyyy')
      : '';

    // Split driver names from parent order
    const { driver1, driver2 } = splitDriverNames(order.driver_name);

    // Create one Excel row for each detail item
    details.forEach((item) => {
      // Format planned date from detail
      let formattedPlannedDate = '';
      if (item.ngayTrenTem) {
        try {
          formattedPlannedDate = format(new Date(item.ngayTrenTem), 'dd/MM/yyyy');
        } catch (error) {
          formattedPlannedDate = String(item.ngayTrenTem);
        }
      }

      // Build AppSheet URL from hinh_anh
      const imageUrl = buildAppSheetImageUrl(item.hinhAnh);

      const row = worksheet.addRow({
        actualDate: formattedActualDate,
        driver1: driver1,
        driver2: driver2,
        plannedDate: formattedPlannedDate,
        route: item.loTrinh || '',
        stampCode: item.maTuyen || '',
        fixedPrice: item.donGia || '',
        licensePlate: item.bienKiemSoat || '',
        imageUrl: imageUrl
      });

      // 4. Style Data Rows
      row.alignment = {
        vertical: 'middle',
        horizontal: 'center'
      };
      row.height = 25;

      // Apply borders to all cells
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });

      // Number formatting for price column
      const priceCell = row.getCell('fixedPrice');
      if (priceCell.value && !isNaN(Number(priceCell.value))) {
        priceCell.numFmt = '#,##0';
      }

      // Make URL column a clickable hyperlink
      const urlCell = row.getCell('imageUrl');
      if (imageUrl) {
        urlCell.value = {
          text: 'Xem ảnh',
          hyperlink: imageUrl
        };
        urlCell.font = { color: { argb: 'FF0563C1' }, underline: true };
        urlCell.alignment = { vertical: 'middle', horizontal: 'center' };
      }

      // Alternate row coloring
      if (row.number % 2 === 0) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF2F2F2' } // Light gray
        };
      }
    });
  });

  console.log('✓ Generated YUNYI Excel with', data.length, 'orders');

  // 5. Return buffer
  return await workbook.xlsx.writeBuffer();
}
