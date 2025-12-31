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
    DETAIL: 'chi_tiet_chuyen_di',  // Sheet chứa lộ trình chi tiết
    PRICING: 'bang_gia',           // Sheet chứa bảng giá cước
    VEHICLES: 'phuong_tien',       // Sheet chứa danh sách phương tiện
    FUEL_IMPORT: 'nhap_nhien_lieu',   // Sheet chứa nhập nhiên liệu
    FUEL_EXPORT: 'xuat_nhien_lieu'    // Sheet chứa xuất nhiên liệu
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
    'ma_chuyen_di': 'maChuyenDi',
    'loai_tuyen_khach_hang': 'loaiTuyenKH',
    'lo_trinh': 'loTrinh',
    'lo_trinh_chi_tiet_theo_diem': 'loTrinhChiTiet',  // Detailed route field
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
  // COLUMN MAPPINGS - Pricing Sheet (bang_gia)
  // =============================================================================
  PRICING_COLUMNS: {
    // Tên cột trong Sheet -> Key trong JSON
    'ma_tuyen': 'maTuyen',        // Mã tuyến (dùng cho "Theo tuyến")
    'ten_tuyen': 'tenTuyen',      // Tên tuyến (dùng cho "Theo ca")
    'don_gia': 'donGia'           // Đơn giá
  },

  // =============================================================================
  // COLUMN MAPPINGS - Vehicles Sheet (phuong_tien)
  // =============================================================================
  VEHICLES_COLUMNS: {
    // Tên cột trong Sheet -> Key trong JSON
    'bien_kiem_soat': 'licensePlate',       // Biển kiểm soát (Key duy nhất)
    'tai_trong': 'weightCapacity',          // Tải trọng (số)
    'don_vi': 'weightUnit',                 // Đơn vị tải trọng (kg, tấn...)
    'tai_trong_chu': 'weightText',          // Tải trọng bằng chữ
    'hieu_xe': 'brand',                     // Hiệu xe (Hino, Isuzu...)
    'loai_xe': 'bodyType',                  // Loại xe (Thùng kín, Mui bạt...)
    'tinh_trang': 'currentStatus',          // Tình trạng (Đang hoạt động, Bảo dưỡng...)
    'dinh_muc_d': 'fuelNorm',              // Định mức dầu (lít/100km)
    'tai_xe_theo_': 'assignedDriverCodes', // Mã tài xế phân công
    'loai_hinh': 'provider'                 // Loại hình (Xe thuê, Xe tự có...)
  },

  // =============================================================================
  // COLUMN MAPPINGS - Fuel Import Sheet (nhap_nhien_lieu)
  // =============================================================================
  FUEL_IMPORT_COLUMNS: {
    // Tên cột trong Sheet -> Key trong JSON
    'Id': 'id',
    'ngay_nhap': 'importDate',
    'nha_cung_cap': 'supplier',
    'ten_nhien_lieu': 'fuelType',
    'so_luong': 'quantity',
    'don_gia_nhap': 'unitPrice',
    'thanh_tien': 'totalAmount',
    'don_gia_xuat_binh_quan': 'avgPrice',
    'nguoi_tao': 'createdBy'
  },

  // =============================================================================
  // COLUMN MAPPINGS - Fuel Export Sheet (xuat_nhien_lieu)
  // =============================================================================
  FUEL_EXPORT_COLUMNS: {
    // Tên cột trong Sheet -> Key trong JSON
    'Id': 'id',
    'ngay_tao': 'transactionDate',
    'loai_hinh': 'fuelSource',
    'doi_tuong': 'object',
    'bien_so_xe': 'licensePlate',
    'ten_tai_xe': 'driverName',
    'loai_nhien_lieu': 'fuelType',
    'so_luong': 'quantity',
    'don_gia': 'unitPrice',
    'thanh_tien': 'totalAmount',
    'so_odo': 'odoNumber',
    'trang_thai': 'status',
    'hang_muc': 'category'  // Chốt đầu | Đổ dặm | Chốt cuối
  },

  // =============================================================================
  // PRICING CONFIGURATION
  // =============================================================================
  PRICING: {
    ENABLED: true,                   // Bật/tắt tính cước tự động
    TRIP_TYPE_THEO_TUYEN: 'theo tuyến',  // Loại chuyến tính theo chi tiết
    TRIP_TYPE_THEO_CA: 'theo ca'         // Loại chuyến tính khoán
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
    'tai_trong_tinh_phi',
    'dinh_muc_d',  // Định mức dầu trong sheet phuong_tien
    // Fuel columns
    'so_luong',
    'don_gia_nhap',
    'don_gia_xuat_binh_quan'
  ],

  // =============================================================================
  // DATE COLUMNS - Các cột cần format thành YYYY-MM-DD
  // =============================================================================
  DATE_COLUMNS: [
    'ngay_tao',
    'ngay_nhap'
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
