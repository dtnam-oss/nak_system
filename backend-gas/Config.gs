/**
 * =============================================================================
 * CONFIGURATION FILE - Centralized Settings
 * =============================================================================
 * File này chứa tất cả các cấu hình quan trọng
 * Thay đổi config ở đây thay vì sửa code chính
 */

const CONFIG = {
  // =============================================================================
  // SPREADSHEET CONFIGURATION
  // =============================================================================
  SPREADSHEET_ID: '1fzepYrS-o5zc01h7nQFzJSOwagoTvOgoiDQHrTLB12E',
  
  SHEET_NAMES: {
    MASTER: 'chuyen_di',           // Sheet chứa thông tin chuyến đi
    DETAIL: 'chi_tiet_chuyen_di'   // Sheet chứa lộ trình chi tiết
  },

  // =============================================================================
  // API CONFIGURATION
  // =============================================================================
  API: {
    ENDPOINT: 'https://nak-system.vercel.app/api/webhook/appsheet',  // Production
    // ENDPOINT: 'http://localhost:3000/api/webhook/appsheet',              // Development - THAY ĐỔI ĐỂ SỬ DỤNG
    TIMEOUT: 30000, // 30 seconds
    CONTENT_TYPE: 'application/json',
    KEY: 'nak_logistics_2025_secure_key'
  },

  // =============================================================================
  // COLUMN MAPPINGS - Master Sheet (chuyen_di)
  // =============================================================================
  MASTER_COLUMNS: {
    // Tên cột trong Sheet -> Key trong JSON
    'ma_chuyen_di': 'maChuyenDi',
    'ngay_tao': 'ngayTao',
    'ten_khach_hang': 'tenKhachHang',
    'loai_chuyen': 'loaiChuyen',
    'loai_tuyen': 'loaiTuyen',
    'ten_tuyen': 'tenTuyen',                 // NEW: Route name mapping
    'ten_tai_xe': 'tenTaiXe',
    'don_vi_van_chuyen': 'donViVanChuyen',
    'trang_thai_chuyen_di': 'trangThai',
    'so_km_theo_odo': 'tongQuangDuong',  // Lưu ý: mapping đặc biệt
    'doanh_thu': 'tongDoanhThu'
  },

  // =============================================================================
  // COLUMN MAPPINGS - Detail Sheet (chi_tiet_chuyen_di)
  // =============================================================================
  DETAIL_COLUMNS: {
    // Tên cột trong Sheet -> Key trong JSON (camelCase format for frontend)
    'Id': 'id',
    'loai_tuyen_khach_hang': 'loaiTuyenKH',
    'lo_trinh': 'loTrinh',
    'lo_trinh_chi_tiet_theo_diem': 'loTrinh',  // Use primary loTrinh field
    'ma_chuyen_di_kh': 'maTuyen',
    'bien_kiem_soat': 'bienKiemSoat',
    'tai_trong': 'taiTrong',
    'quang_duong': 'quangDuong',
    'so_chieu': 'soChieu',
    'don_gia': 'donGia',
    'thanh_tien': 'thanhTien',
    'loai_ca': 'loaiCa',
    'tai_trong_tinh_phi': 'taiTrongTinhPhi',
    'hinh_thuc_tinh_gia': 'hinhThucTinhGia',
    'ten_khach_hang_cap_1': 'tenKhachHangCap1'
  },

  // =============================================================================
  // FOREIGN KEY CONFIGURATION
  // =============================================================================
  FOREIGN_KEY: {
    MASTER_COLUMN: 'ma_chuyen_di',  // Tên cột khóa chính trong Master
    DETAIL_COLUMN: 'ma_chuyen_di'   // Tên cột khóa ngoại trong Detail
  },

  // =============================================================================
  // EVENT TYPES
  // =============================================================================
  EVENTS: {
    ADD: 'Add',
    EDIT: 'Edit',
    DELETE: 'Delete'
  },

  // =============================================================================
  // NUMBER COLUMNS - Các cột cần parse thành number
  // =============================================================================
  NUMBER_COLUMNS: [
    'doanh_thu',
    'so_km_theo_odo',
    'tai_trong',
    'quang_duong',
    'so_chieu',
    'don_gia',
    'thanh_tien',
    'tai_trong_tinh_phi'
  ],

  // =============================================================================
  // DATE COLUMNS - Các cột cần format thành YYYY-MM-DD
  // =============================================================================
  DATE_COLUMNS: [
    'ngay_tao'
  ],

  // =============================================================================
  // LOGGING CONFIGURATION
  // =============================================================================
  LOGGING: {
    ENABLED: true,
    VERBOSE: true  // Set false để giảm log khi production
  }
};

/**
 * Hàm tiện ích để lấy config
 */
function getConfig() {
  return CONFIG;
}
