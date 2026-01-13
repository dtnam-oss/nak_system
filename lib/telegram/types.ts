/**
 * =============================================================================
 * TELEGRAM CHATBOT - TYPE DEFINITIONS
 * =============================================================================
 *
 * TypeScript types and interfaces for Telegram Bot
 */

import { Context as TelegrafContext } from 'telegraf';

// =============================================================================
// USER & AUTHENTICATION
// =============================================================================

export interface AuthenticatedUser {
  maNhanVien: string;
  hoVaTen: string;
  phongBan: string;
  chucVu: string;
  phanQuyen: 'admin' | 'manager' | 'staff' | 'user';
  chatId: string;
  permissions: {
    xem: boolean;
    them: boolean;
    sua: boolean;
    xoa: boolean;
  };
}

export interface UserSession {
  user?: AuthenticatedUser;
  awaitingStartDate?: boolean;
  awaitingEndDate?: boolean;
  startDate?: string;
  endDate?: string;
  lastActivity?: number;
  [key: string]: any;
}

// =============================================================================
// CONTEXT (Extended Telegraf Context)
// =============================================================================

export interface BotContext extends TelegrafContext {
  session?: UserSession;
  state?: {
    user?: AuthenticatedUser;
    [key: string]: any;
  };
}

// =============================================================================
// DATABASE QUERY RESULTS
// =============================================================================

export interface DashboardStats {
  totalTrips: number;
  totalRevenue: number;
  totalDistance: number;
  totalDrivers: number;
}

export interface TripRecord {
  maChuyenDi: string;
  ngayTao: Date;
  tenKhachHang: string;
  tenTuyen: string;
  tenTaiXe: string;
  bienKiemSoat: string;
  trangThai: string;
  tongDoanhThu: number;
  tongQuangDuong: number;
  dataJson?: string;
}

export interface RouteDetail {
  thuTu: number;
  loTrinh: string;
  loTrinhChiTiet: string;
  quangDuong?: number;
  donGia?: number;
  thanhTien?: number;
}

export interface FuelInventoryStats {
  currentInventory: number;
  currentAvgPrice: number;
  totalImports: number;
  totalExports: number;
}

export interface VehicleEfficiency {
  licensePlate: string;
  avgEfficiency: number;
  totalFuel: number;
  totalKm: number;
  totalTransactions: number;
}

export interface TopRoute {
  tenTuyen: string;
  totalTrips: number;
  totalRevenue: number;
  totalDistance: number;
}

export interface TopDriver {
  tenTaiXe: string;
  totalTrips: number;
  totalRevenue: number;
  totalDistance: number;
}

// =============================================================================
// RATE LIMITING
// =============================================================================

export interface RateLimitEntry {
  count: number;
  resetTime: number;
}

export interface RateLimiter {
  limits: Map<string, RateLimitEntry>;
  maxRequests: number;
  windowMs: number;
}

// =============================================================================
// CALLBACK QUERY DATA
// =============================================================================

export type CallbackAction =
  | 'menu_main'
  | 'menu_dashboard'
  | 'menu_trips'
  | 'menu_employees'
  | 'menu_fuel'
  | 'menu_reports'
  | 'menu_settings'
  | 'dashboard_today'
  | 'dashboard_month'
  | 'dashboard_top_routes'
  | 'dashboard_top_drivers'
  | 'dashboard_revenue'
  | 'dashboard_distance'
  | 'trips_search'
  | 'trips_today'
  | 'trips_by_customer'
  | 'trips_by_vehicle'
  | 'trips_create'
  | 'fuel_inventory'
  | 'fuel_efficiency'
  | 'fuel_by_vehicle'
  | 'fuel_by_date'
  | 'report_today'
  | 'report_week'
  | 'report_month'
  | 'report_custom'
  | 'report_export'
  | 'help';

// =============================================================================
// EXPORT TYPES
// =============================================================================

export interface ExportConfig {
  filename: string;
  sheetName: string;
  columns: ExportColumn[];
  data: any[];
}

export interface ExportColumn {
  header: string;
  key: string;
  width: number;
  style?: any;
}
