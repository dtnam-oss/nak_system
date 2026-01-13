/**
 * TypeScript Types for CSV Import
 * Port from Google Apps Script logic
 */

// ============================================================================
// MASTER RECORD (chuyen_di table)
// ============================================================================

export interface MasterCSVRow {
  ma_chuyen_di: string;
  ngay_tao: string | Date;
  khach_hang: string;
  loai_chuyen_di: string;
  loai_tuyen: string;
  tuyen: string;
  tai_xe: string;
  nha_cung_cap: string;
  tong_quang_duong: string | number;
  tong_chi_phi: string | number;
  tong_doanh_thu: string | number;
  trang_thai: string;
  tai_trong: string | number;
  ghi_chu: string;
  [key: string]: any; // Allow additional columns
}

export interface MasterRecord {
  orderId: string;
  date: string; // YYYY-MM-DD
  customer: string;
  tripType: string;
  routeType: string;
  routeName: string;
  driverName: string;
  provider: string;
  totalDistance: number;
  cost: number;
  revenue: number;
  status: string;
  weight: number;
  note: string;
}

// ============================================================================
// DETAIL RECORD (chi_tiet_chuyen_di table)
// ============================================================================

export interface DetailCSVRow {
  Id: string;
  ma_chuyen_di: string;
  loai_tuyen_khach_hang: string;
  lo_trinh: string;
  lo_trinh_chi_tiet_theo_diem: string;
  ma_chuyen_di_kh: string;
  bien_kiem_soat: string;
  tai_trong: string | number;
  tai_trong_tinh_phi: string | number;
  quang_duong: string | number;
  so_chieu: string | number;
  don_gia: string | number;
  thanh_tien: string | number;
  loai_ca: string;
  hinh_thuc_tinh_gia: string;
  ngay_tren_tem: string | Date;
  ten_khach_hang_cap_1: string;
  [key: string]: any;
}

export interface DetailRecord {
  id: string;
  maChuyenDi: string;
  loaiTuyenKH: string;
  loTrinh: string;
  loTrinhChiTiet: string;
  maTuyen: string;
  bienKiemSoat: string;
  taiTrong: number;
  taiTrongTinhPhi: number;
  quangDuong: number;
  soChieu: number;
  donGia: number;
  thanhTien: number;
  loaiCa: string;
  hinhThucTinhGia: string;
  ngayTrenTem: string; // YYYY-MM-DD
  tenKhachHangCap1: string;
}

// ============================================================================
// FULL PAYLOAD (combined master + details)
// ============================================================================

export interface FullPayload {
  Action: 'TripMaster_Upsert';
  maChuyenDi: string;
  ngayTao: string;
  khachHang: string;
  loaiChuyenDi: string;
  loaiTuyen: string;
  tuyen: string;
  taiXe: string;
  nhaCungCap: string;
  tongQuangDuong: number;
  tongChiPhi: number;
  tongDoanhThu: number;
  trangThai: string;
  taiTrong: number;
  ghiChu: string;
  data_json: {
    chiTietLoTrinh: DetailRecord[];
  };
}

// ============================================================================
// DATABASE RECORD (PostgreSQL)
// ============================================================================

export interface DatabaseRecord {
  order_id: string;
  date: string;
  customer: string;
  trip_type: string;
  route_type: string;
  route_name: string;
  driver_name: string;
  provider: string;
  total_distance: number;
  cost: number;
  revenue: number;
  status: string;
  weight: number;
  note: string;
  details: {
    chiTietLoTrinh: DetailRecord[];
  };
}

// ============================================================================
// IMPORT RESULTS
// ============================================================================

export interface ImportResult {
  success: boolean;
  timestamp: string;
  totalRecords: number;
  imported: number;
  errors: number;
  errorRecords: string[];
  durationSeconds: number;
  details: {
    masterRecords: number;
    detailRecords: number;
    avgDetailsPerTrip: number;
  };
}

export interface ValidationError {
  row: number;
  orderId: string;
  field: string;
  message: string;
}

// ============================================================================
// CSV PARSE OPTIONS
// ============================================================================

export interface CSVParseOptions {
  delimiter?: string;
  encoding?: BufferEncoding;
  skipEmptyLines?: boolean;
  trimHeaders?: boolean;
  trimValues?: boolean;
}

// ============================================================================
// TRANSFORM OPTIONS
// ============================================================================

export interface TransformOptions {
  validateData?: boolean;
  strictMode?: boolean;
  skipInvalidRecords?: boolean;
  calculateTotals?: boolean; // Auto-calculate from details
}
