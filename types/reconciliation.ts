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
}

export interface ChiTietLoTrinh {
  thuTu: number
  id: string
  loaiTuyenKH: string
  maTuyen: string
  loTrinh: string
  maTem: string
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
