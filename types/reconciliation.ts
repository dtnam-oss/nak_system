export type ReconciliationStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "processing"

export interface ReconciliationRecord {
  id: string
  maChuyenDi: string
  ngayTao: string
  tenKhachHang: string
  loaiChuyen: string
  loaiTuyen: string
  tenTuyen: string
  tenTaiXe: string
  donViVanChuyen: string
  trangThai: string
  tongQuangDuong: number
  tongDoanhThu: number
  soXe?: string
  chiTietLoTrinh?: ChiTietLoTrinh[]
  data_json?: string // Raw JSON string from Google Sheets
}

export interface ParsedDataJson {
  thongTinChuyenDi?: {
    soXe?: string
    khCap1?: string
    bienKiemSoat?: string
    taiTrong?: number
    quangDuong?: number
    soChieu?: number
    donGia?: number
    loaiCa?: string
    taiTrongTinhPhi?: number
    hinhThucTinhGia?: string
    taiXe?: string
  }
  chiTietLoTrinh?: ChiTietLoTrinh[]
}

// Database JSONB structure for details column
export interface ReconciliationDetails {
  thongTinChuyenDi?: {
    soXe?: string
    taiXe?: string
    quangDuong?: number
    donGia?: number
    taiTrong?: number
    soChieu?: number
  }
  chiTietLoTrinh?: ChiTietLoTrinh[]
}

export interface ChiTietLoTrinh {
  thuTu: number
  id: string
  loaiTuyenKH: string
  maTuyen: string
  bienKiemSoat: string
  loTrinh: string
  loTrinhChiTiet?: string  // Detailed route information from lo_trinh_chi_tiet_theo_diem
  quangDuong: number
  taiTrong: number
  taiTrongTinhPhi: number
  hinhThucTinhGia: string
  soChieu: number
  donGia: number
  thanhTien: number
}

export interface ReconciliationFilters {
  fromDate?: string
  toDate?: string
  khachHang?: string
  donViVanChuyen?: string
  loaiTuyen?: string
  loaiChuyen?: string
  searchQuery?: string
}

export interface ReconciliationSummary {
  totalOrders: number
  totalAmount: number
  totalDistance: number
  approvedOrders: number
  pendingOrders: number
}

export interface ReconciliationApiResponse {
  success: boolean
  data?: {
    records: ReconciliationRecord[]
    summary: ReconciliationSummary
    total: number
  }
  error?: string
}

// Database row type (mirrors Postgres table structure)
export interface ReconciliationDatabaseRow {
  id: number
  order_id: string
  date: Date | string
  customer: string | null
  weight: number | null
  cost: number | null
  status: string
  trip_type: string | null
  route_type: string | null
  route_name: string | null
  driver_name: string | null
  provider: string | null
  total_distance: number | null
  details: ReconciliationDetails | string | null
  created_at: Date | string
  updated_at: Date | string
}
