// Dashboard Types based on ReportService.gs structure

export interface DashboardCards {
  tongDoanhThu: number
  soChuyen: number
  soXeNAK: number
  soXeVendor: number
}

export interface ChartDataPoint {
  date?: string // For time series
  label?: string // For categorical
  value: number
}

export interface DashboardCharts {
  doanhThuTheoNgay: ChartDataPoint[]
  doanhThuTheoTuyen: ChartDataPoint[]
  doanhThuTheoKhachHang: ChartDataPoint[]
  doanhThuTheoDonVi: ChartDataPoint[]
}

export interface DashboardData {
  cards: DashboardCards
  charts: DashboardCharts
  lastUpdated: string
}

export interface DashboardReportResponse {
  success: boolean
  data?: DashboardData
  error?: string
}

export interface DashboardFilters {
  fromDate?: string // YYYY-MM-DD
  toDate?: string // YYYY-MM-DD
  khachHang?: string
  loaiTuyen?: string
}

export interface DashboardReportWithFiltersResponse {
  success: boolean
  data?: DashboardData & {
    filters: DashboardFilters
    totalRecords: number
  }
  error?: string
}
