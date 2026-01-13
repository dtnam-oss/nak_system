/**
 * CSV Transform & Mapping Functions
 * Ported from backend-gas/Code.gs
 */

import type {
  MasterCSVRow,
  MasterRecord,
  DetailCSVRow,
  DetailRecord,
  DatabaseRecord,
  FullPayload,
} from './types';

// ============================================================================
// HELPER FUNCTIONS (Ported from Code.gs)
// ============================================================================

/**
 * Format date to YYYY-MM-DD
 * Ported from Code.gs formatDate()
 */
export function formatDate(value: any): string {
  if (!value) {
    return '';
  }

  try {
    let date: Date;

    if (value instanceof Date) {
      date = value;
    } else if (typeof value === 'number') {
      // Excel serial date number
      date = new Date((value - 25569) * 86400 * 1000);
    } else if (typeof value === 'string') {
      const strValue = String(value).trim();

      // IMPORTANT: If string contains datetime (with space), extract only date part
      // Example: "2026-01-02 01:30:00" -> "2026-01-02"
      if (strValue.includes(' ')) {
        const datePart = strValue.split(' ')[0];
        date = new Date(datePart);
      } else {
        // Try different formats
        // DD/MM/YYYY
        if (strValue.includes('/')) {
          const parts = strValue.split('/');
          if (parts.length === 3) {
            const day = parseInt(parts[0]);
            const month = parseInt(parts[1]);
            const year = parseInt(parts[2]);
            date = new Date(year, month - 1, day);
          } else {
            date = new Date(strValue);
          }
        } else {
          date = new Date(strValue);
        }
      }
    } else {
      date = new Date(value);
    }

    // Check if valid date
    if (isNaN(date.getTime())) {
      return '';
    }

    // Format as YYYY-MM-DD (strips time if present)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  } catch (error) {
    console.warn(`Error formatting date: ${value}`, error);
    return '';
  }
}

/**
 * Parse number from Vietnamese format
 * Ported from Code.gs parseNumber()
 */
export function parseNumber(value: any): number {
  if (value === null || value === undefined || value === '') {
    return 0;
  }

  if (typeof value === 'number') {
    return value;
  }

  try {
    // Convert to string and clean
    let strValue = String(value).trim();

    // Remove Vietnamese thousand separator (.)
    strValue = strValue.replace(/\./g, '');

    // Replace Vietnamese decimal separator (,) with dot
    strValue = strValue.replace(/,/g, '.');

    // Remove any non-numeric characters except dot and minus
    strValue = strValue.replace(/[^\d.-]/g, '');

    const result = parseFloat(strValue);
    return isNaN(result) ? 0 : result;
  } catch (error) {
    console.warn(`Error parsing number: ${value}`, error);
    return 0;
  }
}

/**
 * Safe trim string
 */
export function safeTrim(value: any): string {
  if (!value) return '';
  return String(value).trim();
}

// ============================================================================
// COLUMN MAPPING CONFIGURATIONS
// ============================================================================

// Master columns mapping (Google Sheets → Database)
const MASTER_COLUMN_MAP: Record<string, keyof MasterRecord> = {
  'ma_chuyen_di': 'orderId',
  'ngay_tao': 'date',
  'khach_hang': 'customer',
  'loai_chuyen_di': 'tripType',
  'loai_tuyen': 'routeType',
  'tuyen': 'routeName',
  'tai_xe': 'driverName',
  'nha_cung_cap': 'provider',
  'tong_quang_duong': 'totalDistance',
  'tong_chi_phi': 'cost',
  'tong_doanh_thu': 'revenue',
  'trang_thai': 'status',
  'tai_trong': 'weight',
  'ghi_chu': 'note',
};

// Detail columns mapping
const DETAIL_COLUMN_MAP: Record<string, keyof DetailRecord> = {
  'Id': 'id',
  'ma_chuyen_di': 'maChuyenDi',
  'loai_tuyen_khach_hang': 'loaiTuyenKH',
  'lo_trinh': 'loTrinh',
  'lo_trinh_chi_tiet_theo_diem': 'loTrinhChiTiet',
  'ma_chuyen_di_kh': 'maTuyen',
  'bien_kiem_soat': 'bienKiemSoat',
  'tai_trong': 'taiTrong',
  'tai_trong_tinh_phi': 'taiTrongTinhPhi',
  'quang_duong': 'quangDuong',
  'so_chieu': 'soChieu',
  'don_gia': 'donGia',
  'thanh_tien': 'thanhTien',
  'loai_ca': 'loaiCa',
  'hinh_thuc_tinh_gia': 'hinhThucTinhGia',
  'ngay_tren_tem': 'ngayTrenTem',
  'ten_khach_hang_cap_1': 'tenKhachHangCap1',
};

// Number columns (need parseNumber)
const NUMBER_COLUMNS = [
  'tong_quang_duong',
  'tong_chi_phi',
  'tong_doanh_thu',
  'tai_trong',
  'quang_duong',
  'so_chieu',
  'don_gia',
  'thanh_tien',
  'tai_trong_tinh_phi',
];

// Date columns (need formatDate)
const DATE_COLUMNS = [
  'ngay_tao',
  'ngay_tren_tem',
];

// ============================================================================
// TRANSFORM FUNCTIONS
// ============================================================================

/**
 * Transform Master CSV row to MasterRecord
 */
export function transformMasterRow(csvRow: MasterCSVRow): MasterRecord {
  const record: any = {};

  for (const [csvColumn, recordKey] of Object.entries(MASTER_COLUMN_MAP)) {
    let value = csvRow[csvColumn];

    // Apply transformations based on column type
    if (DATE_COLUMNS.includes(csvColumn)) {
      record[recordKey] = formatDate(value);
    } else if (NUMBER_COLUMNS.includes(csvColumn)) {
      record[recordKey] = parseNumber(value);
    } else {
      record[recordKey] = safeTrim(value);
    }
  }

  return record as MasterRecord;
}

/**
 * Transform Detail CSV row to DetailRecord
 */
export function transformDetailRow(csvRow: DetailCSVRow): DetailRecord {
  const record: any = {};

  for (const [csvColumn, recordKey] of Object.entries(DETAIL_COLUMN_MAP)) {
    let value = csvRow[csvColumn];

    // Apply transformations based on column type
    if (DATE_COLUMNS.includes(csvColumn)) {
      record[recordKey] = formatDate(value);
    } else if (NUMBER_COLUMNS.includes(csvColumn)) {
      record[recordKey] = parseNumber(value);
    } else {
      record[recordKey] = safeTrim(value);
    }
  }

  return record as DetailRecord;
}

/**
 * Group detail records by ma_chuyen_di
 */
export function groupDetailsByTrip(
  details: DetailRecord[]
): Record<string, DetailRecord[]> {
  const grouped: Record<string, DetailRecord[]> = {};

  for (const detail of details) {
    const tripId = detail.maChuyenDi;
    if (!grouped[tripId]) {
      grouped[tripId] = [];
    }
    grouped[tripId].push(detail);
  }

  return grouped;
}

/**
 * Calculate totals from details (WAC logic from Code.gs)
 */
export function calculateTotalsFromDetails(
  details: DetailRecord[]
): {
  totalRevenue: number;
  totalCost: number;
  totalDistance: number;
  totalWeight: number;
} {
  let totalRevenue = 0;
  let totalCost = 0;
  let totalDistance = 0;
  let totalWeight = 0;

  for (const detail of details) {
    // Revenue calculation
    totalRevenue += detail.thanhTien || 0;

    // Distance: sum quang_duong * so_chieu
    const distance = (detail.quangDuong || 0) * (detail.soChieu || 0);
    totalDistance += distance;

    // Weight: use tai_trong_tinh_phi if available, otherwise tai_trong
    const weight = detail.taiTrongTinhPhi || detail.taiTrong || 0;
    totalWeight += weight;
  }

  // Cost calculation would need fuel price data
  // For now, keep the value from master CSV
  totalCost = 0; // Will use master CSV value

  return {
    totalRevenue,
    totalCost,
    totalDistance,
    totalWeight,
  };
}

/**
 * Build full payload for backend API
 * Combines master + details
 */
export function buildFullPayload(
  master: MasterRecord,
  details: DetailRecord[]
): FullPayload {
  // Calculate totals from details (override master values if needed)
  const calculated = calculateTotalsFromDetails(details);

  return {
    Action: 'TripMaster_Upsert',
    maChuyenDi: master.orderId,
    ngayTao: master.date,
    khachHang: master.customer,
    loaiChuyenDi: master.tripType,
    loaiTuyen: master.routeType,
    tuyen: master.routeName,
    taiXe: master.driverName,
    nhaCungCap: master.provider,
    tongQuangDuong: calculated.totalDistance || master.totalDistance,
    tongChiPhi: master.cost, // Use master value (has fuel cost)
    tongDoanhThu: calculated.totalRevenue || master.revenue,
    trangThai: master.status,
    taiTrong: calculated.totalWeight || master.weight,
    ghiChu: master.note,
    data_json: {
      chiTietLoTrinh: details,
    },
  };
}

/**
 * Convert payload to database record
 */
export function payloadToDatabaseRecord(payload: FullPayload): DatabaseRecord {
  return {
    order_id: payload.maChuyenDi,
    date: payload.ngayTao,
    customer: payload.khachHang,
    trip_type: payload.loaiChuyenDi,
    route_type: payload.loaiTuyen,
    route_name: payload.tuyen,
    driver_name: payload.taiXe,
    provider: payload.nhaCungCap,
    total_distance: payload.tongQuangDuong,
    cost: payload.tongChiPhi,
    revenue: payload.tongDoanhThu,
    status: payload.trangThai,
    weight: payload.taiTrong,
    note: payload.ghiChu,
    details: payload.data_json,
  };
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate master record has required fields
 */
export function validateMasterRecord(record: MasterRecord): string[] {
  const errors: string[] = [];

  if (!record.orderId || record.orderId.trim() === '') {
    errors.push('Missing order ID (ma_chuyen_di)');
  }

  if (!record.date || record.date === '') {
    errors.push('Missing or invalid date (ngay_tao)');
  }

  if (!record.customer || record.customer.trim() === '') {
    errors.push('Missing customer (khach_hang)');
  }

  return errors;
}

/**
 * Validate detail record has required fields
 */
export function validateDetailRecord(record: DetailRecord): string[] {
  const errors: string[] = [];

  if (!record.id || record.id.trim() === '') {
    errors.push('Missing detail ID');
  }

  if (!record.maChuyenDi || record.maChuyenDi.trim() === '') {
    errors.push('Missing trip ID (ma_chuyen_di)');
  }

  return errors;
}
