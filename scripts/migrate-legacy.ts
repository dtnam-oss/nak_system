import { sql } from '@vercel/postgres';
import ExcelJS from 'exceljs';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

/**
 * CONFIGURATION
 */
const CONFIG = {
  BATCH_SIZE: 100, // Number of rows to insert per batch
  SHEET_NAME_MASTER: 'chuyen_di', // Master sheet
  SHEET_NAME_DETAIL: 'chi_tiet_chuyen_di', // Detail sheet
  START_ROW: 2, // Skip header row
};

// Types corresponding to DB Schema
interface NormalizedPayload {
  orderId: string;
  date: string;
  customer: string | null;
  revenue: number;
  cost: number;
  totalDistance: number;
  status: 'approved' | 'pending' | 'rejected';
  driverName: string | null;
  provider: 'NAK' | 'VENDOR' | 'OTHER';
  tripType: string | null;
  routeType: string | null;
  routeName: string;
  weight: number;
  note: string | null;
  details: any;
}

// ----------------------------------------------------------------------
// HELPER FUNCTIONS
// ----------------------------------------------------------------------

function parseNumber(val: any, max: number = 99999999.99): number {
  if (typeof val === 'number') return Math.min(val, max);
  if (!val || val === '') return 0;
  const str = String(val).replace(/[^0-9.-]+/g, '');
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : Math.min(parsed, max);
}

function formatDate(val: any): string {
  if (!val) return new Date().toISOString().split('T')[0];
  const str = String(val).trim();
  if (val instanceof Date) {
    return val.toISOString().split('T')[0];
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    const [day, month, year] = str.split('/');
    return `${year}-${month}-${day}`;
  }
  return new Date().toISOString().split('T')[0];
}

function normalizeStatus(val: any): 'approved' | 'pending' | 'rejected' {
  if (!val) return 'pending';
  const s = String(val).toLowerCase().trim();
  if (['kết thúc', 'ket thuc', 'hoàn tất', 'hoan tat', 'completed', 'finish', 'approved', 'đã duyệt', 'da duyet'].includes(s)) return 'approved';
  if (['hủy', 'huy', 'cancel', 'cancelled', 'rejected', 'từ chối', 'tu choi'].includes(s)) return 'rejected';
  return 'pending';
}

function normalizeProvider(val: any): 'NAK' | 'VENDOR' | 'OTHER' {
  if (!val) return 'OTHER';
  const s = String(val).toUpperCase().trim();
  if (s.includes('NAK')) return 'NAK';
  if (s.includes('VENDOR') || s.includes('XE NGOAI') || s.includes('ĐỐI TÁC')) return 'VENDOR';
  return 'OTHER';
}

function normalizeTripType(val: any): string | null {
  if (!val) return null;
  const s = String(val).toLowerCase().trim();

  // Valid DB Enums: 'Một chiều', 'Hai chiều', 'Nhiều điểm'
  if (s.includes('một chiều') || s.includes('1 chiều')) return 'Một chiều';
  if (s.includes('hai chiều') || s.includes('2 chiều') || s.includes('khứ hồi')) return 'Hai chiều';
  if (s.includes('nhiều điểm')) return 'Nhiều điểm';

  // These exist in Excel but NOT in DB Constraint -> Map to NULL to allow import
  // Alternatively, we could default to 'Một chiều' if business logic requires it, 
  // but NULL is safer for reconciliation.
  return null;
}

function normalizeRouteType(val: any): string | null {
  if (!val) return null;
  const s = String(val).toLowerCase().trim();
  if (s.includes('nội thành')) return 'Nội thành';
  if (s.includes('liên tỉnh')) return 'Liên tỉnh';
  if (s.includes('đường dài')) return 'Đường dài';
  // Strict check constraint in DB: ('Nội thành', 'Liên tỉnh', 'Đường dài')
  // Return null for others (e.g. Tăng cường, Cố định) to avoid insertion error
  return null;
}

function generateRouteName(routeType: string | null, customer: string | null, providedName?: string): string {
  if (providedName && String(providedName).trim()) return String(providedName).trim();
  const parts: string[] = [];
  if (routeType) parts.push(routeType);
  if (customer) parts.push(customer);
  return parts.length > 0 ? parts.join(' - ') : 'Chưa xác định';
}

// ----------------------------------------------------------------------
// MAIN SCRIPT
// ----------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const filePath = args[0];

  if (!filePath) {
    console.error('❌ Please provide the path to the .xlsx file.');
    console.error('Usage: tsx scripts/migrate-legacy.ts <path-to-file.xlsx>');
    process.exit(1);
  }

  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }

  console.log('========================================');
  console.log('🚀 LEGACY DATA MIGRATION JOIN (MASTER + DETAIL)');
  console.log(`📁 File: ${filePath}`);
  console.log('========================================');

  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.readFile(filePath);
  } catch (error) {
    console.error('❌ Failed to read Excel file:', error);
    process.exit(1);
  }

  // 1. Process Master Sheet
  const wsMaster = workbook.getWorksheet(CONFIG.SHEET_NAME_MASTER);
  if (!wsMaster) {
    console.error(`❌ Worksheet "${CONFIG.SHEET_NAME_MASTER}" not found.`);
    process.exit(1);
  }
  console.log(`✓ Found Master Sheet "${CONFIG.SHEET_NAME_MASTER}"`);

  // 2. Process Detail Sheet
  const wsDetail = workbook.getWorksheet(CONFIG.SHEET_NAME_DETAIL);
  if (!wsDetail) {
    console.error(`❌ Worksheet "${CONFIG.SHEET_NAME_DETAIL}" not found.`);
    process.exit(1);
  }
  console.log(`✓ Found Detail Sheet "${CONFIG.SHEET_NAME_DETAIL}"`);

  // -----------------------------------
  // READ DETAIL SHEET FIRST
  // -----------------------------------
  console.log('🔄 Indexing Details...');

  const getHeaderMap = (ws: ExcelJS.Worksheet) => {
    const headerRow = ws.getRow(1);
    const headers: Record<string, number> = {};
    headerRow.eachCell((cell, colNumber) => {
      headers[String(cell.value).trim()] = colNumber;
    });
    return headers;
  };

  const getCol = (headers: Record<string, number>, name: string, altNames: string[] = []): number | undefined => {
    if (headers[name]) return headers[name];
    for (const alt of altNames) {
      if (headers[alt]) return headers[alt];
    }
    return undefined;
  };

  const detailHeaders = getHeaderMap(wsDetail);
  const detailColMap = {
    id: getCol(detailHeaders, 'Id', ['ID', 'id']),
    maChuyenDi: getCol(detailHeaders, 'ma_chuyen_di', ['Mã chuyến đi', 'Order ID']),
    loTrinh: getCol(detailHeaders, 'lo_trinh', ['Lộ trình']),
    loTrinhChiTiet: getCol(detailHeaders, 'lo_trinh_chi_tiet_theo_diem', ['Lộ trình chi tiết']),
    bienKiemSoat: getCol(detailHeaders, 'bien_kiem_soat', ['Biển kiểm soát', 'BKS']),
    taiTrong: getCol(detailHeaders, 'tai_trong', ['Tải trọng']),
    quangDuong: getCol(detailHeaders, 'quang_duong', ['Quãng đường']),
    soChieu: getCol(detailHeaders, 'so_chieu', ['Số chiều']),
    donGia: getCol(detailHeaders, 'don_gia', ['Đơn giá']),
    thanhTien: getCol(detailHeaders, 'thanh_tien', ['Thành tiền']),
    ngayTrenTem: getCol(detailHeaders, 'ngay_tren_tem', ['Ngày trên tem'])
  };

  const detailsMap = new Map<string, any[]>();

  wsDetail.eachRow((row, rowNumber) => {
    if (rowNumber < CONFIG.START_ROW) return;

    const getVal = (idx?: number) => idx ? row.getCell(idx).value?.toString() || null : null;

    const maChuyenDi = getVal(detailColMap.maChuyenDi);
    if (!maChuyenDi) return;

    const detailItem = {
      id: getVal(detailColMap.id) || `migrated-${rowNumber}`,
      maChuyenDi: maChuyenDi,
      loTrinh: getVal(detailColMap.loTrinh),
      loTrinhChiTiet: getVal(detailColMap.loTrinhChiTiet),
      bienKiemSoat: getVal(detailColMap.bienKiemSoat),
      tai_trong: parseNumber(getVal(detailColMap.taiTrong), 99999999.99),
      quang_duong: parseNumber(getVal(detailColMap.quangDuong), 99999999.99),
      so_chieu: parseNumber(getVal(detailColMap.soChieu), 999),
      don_gia: parseNumber(getVal(detailColMap.donGia), 999999999999),
      thanh_tien: parseNumber(getVal(detailColMap.thanhTien), 999999999999),
      ngay_tren_tem: formatDate(getVal(detailColMap.ngayTrenTem))
    };

    const existing = detailsMap.get(maChuyenDi) || [];
    existing.push(detailItem);
    detailsMap.set(maChuyenDi, existing);
  });

  console.log(`✓ Indexed details for ${detailsMap.size} unique orders.`);


  // -----------------------------------
  // READ MASTER SHEET
  // -----------------------------------
  console.log('🔄 Processing Master rows...');

  const masterHeaders = getHeaderMap(wsMaster);
  const masterColMap = {
    maChuyenDi: getCol(masterHeaders, 'ma_chuyen_di', ['Mã chuyến đi', 'ID']),
    ngayTao: getCol(masterHeaders, 'ngay_tao', ['Ngày tạo', 'Date']),
    khachHang: getCol(masterHeaders, 'ten_khach_hang', ['Tên khách hàng', 'Khách hàng']),
    loaiChuyen: getCol(masterHeaders, 'loai_chuyen'),
    loaiTuyen: getCol(masterHeaders, 'loai_tuyen'),
    tenTuyen: getCol(masterHeaders, 'ten_tuyen'),
    taiXe: getCol(masterHeaders, 'ten_tai_xe', ['Tài xế']),
    donVi: getCol(masterHeaders, 'don_vi_van_chuyen', ['Đơn vị vận chuyển']),
    trangThai: getCol(masterHeaders, 'trang_thai_chuyen_di', ['Trạng thái']),
    odo: getCol(masterHeaders, 'so_km_theo_odo', ['Số KM', 'ODO']),
    doanhThu: getCol(masterHeaders, 'doanh_thu', ['Doanh thu', 'Tổng doanh thu']),
    chiPhi: getCol(masterHeaders, 'tong_chi_phi', ['Tổng chi phí', 'Chi phí']),
    ghiChu: getCol(masterHeaders, 'ghi_chu', ['Ghi chú'])
  };

  const records: NormalizedPayload[] = [];

  wsMaster.eachRow((row, rowNumber) => {
    if (rowNumber < CONFIG.START_ROW) return;

    const getVal = (idx?: number) => idx ? row.getCell(idx).value?.toString() || null : null;
    const getDateVal = (idx?: number) => idx ? row.getCell(idx).value : null;

    const maChuyenDi = getVal(masterColMap.maChuyenDi);
    if (!maChuyenDi) return;

    // Get associated details
    const orderDetails = detailsMap.get(maChuyenDi) || [];

    // Calculate total weight from details
    const totalWeight = orderDetails.reduce((sum, item) => sum + (item.tai_trong || 0), 0);

    // Normalize
    const normalized: NormalizedPayload = {
      orderId: String(maChuyenDi).trim(),
      date: formatDate(getDateVal(masterColMap.ngayTao)),
      customer: getVal(masterColMap.khachHang),
      revenue: parseNumber(getVal(masterColMap.doanhThu), 999999999999),
      cost: parseNumber(getVal(masterColMap.chiPhi), 999999999999),
      totalDistance: parseNumber(getVal(masterColMap.odo), 99999999.99),
      status: normalizeStatus(getVal(masterColMap.trangThai)),
      driverName: getVal(masterColMap.taiXe),
      provider: normalizeProvider(getVal(masterColMap.donVi)),
      tripType: normalizeTripType(getVal(masterColMap.loaiChuyen)),
      routeType: normalizeRouteType(getVal(masterColMap.loaiTuyen)),
      routeName: generateRouteName(
        normalizeRouteType(getVal(masterColMap.loaiTuyen)),
        getVal(masterColMap.khachHang),
        getVal(masterColMap.tenTuyen) || undefined
      ),
      weight: parseNumber(totalWeight, 99999999.99),
      note: getVal(masterColMap.ghiChu),
      details: {
        chiTietLoTrinh: orderDetails
      }
    };

    records.push(normalized);
  });

  console.log(`✓ Prepared ${records.length} Master-Detail records.`);

  // BATCH INSERT
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < records.length; i += CONFIG.BATCH_SIZE) {
    const batch = records.slice(i, i + CONFIG.BATCH_SIZE);
    console.log(`🔄 Processing batch ${Math.floor(i / CONFIG.BATCH_SIZE) + 1} (${batch.length} records)...`);

    await Promise.all(batch.map(async (record) => {
      try {
        await sql`
            INSERT INTO reconciliation_orders (
              order_id, date, customer, trip_type, route_type, route_name,
              driver_name, provider, total_distance, cost, revenue,
              status, weight, note, details, updated_at
            ) VALUES (
              ${record.orderId}, ${record.date}, ${record.customer}, 
              ${record.tripType}, ${record.routeType}, ${record.routeName},
              ${record.driverName}, ${record.provider}, ${record.totalDistance}, 
              ${record.cost}, ${record.revenue}, ${record.status}, 
              ${record.weight}, ${record.note}, ${JSON.stringify(record.details)},
              NOW()
            )
            ON CONFLICT (order_id) DO UPDATE SET
              date = EXCLUDED.date,
              customer = EXCLUDED.customer,
              trip_type = EXCLUDED.trip_type,
              route_type = EXCLUDED.route_type,
              route_name = EXCLUDED.route_name,
              driver_name = EXCLUDED.driver_name,
              provider = EXCLUDED.provider,
              total_distance = EXCLUDED.total_distance,
              cost = EXCLUDED.cost,
              revenue = EXCLUDED.revenue,
              status = EXCLUDED.status,
              weight = EXCLUDED.weight,
              note = EXCLUDED.note,
              details = EXCLUDED.details,
              updated_at = NOW()
            `;
        successCount++;
      } catch (err: any) {
        console.error(`❌ Error inserting ${record.orderId}:`, err.message);
        errorCount++;
      }
    }));
  }

  console.log('========================================');
  console.log('🏁 MIGRATION COMPLETE');
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log('========================================');
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal Error:', err);
  process.exit(1);
});
