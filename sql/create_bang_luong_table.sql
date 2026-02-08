-- Migration: Create bang_luong table for salary management
-- Date: 2026-02-08
-- Purpose: Store monthly salary records for employees and drivers

-- Drop existing table if exists (use with caution in production)
-- DROP TABLE IF EXISTS bang_luong CASCADE;

CREATE TABLE IF NOT EXISTS bang_luong (
  id SERIAL PRIMARY KEY,

  -- Employee information
  ma_nhan_vien VARCHAR(20) NOT NULL,
  ho_va_ten VARCHAR(100) NOT NULL,
  phong_ban VARCHAR(50),
  chuc_vu VARCHAR(50),
  loai_nhan_vien VARCHAR(20) NOT NULL, -- 'nhan_vien' | 'tai_xe'

  -- Salary period
  thang INTEGER NOT NULL CHECK (thang BETWEEN 1 AND 12),
  nam INTEGER NOT NULL,

  -- Base salary (for all employees)
  luong_co_ban DECIMAL(15,2) DEFAULT 0,

  -- Driver-specific fields (calculated from trips)
  so_chuyen_di INTEGER DEFAULT 0,
  tong_doanh_thu DECIMAL(15,2) DEFAULT 0,
  ty_le_chia_se DECIMAL(5,2) DEFAULT 15, -- % revenue share (default 15%)
  luong_theo_chuyen DECIMAL(15,2) DEFAULT 0,

  -- Allowances & bonuses
  phu_cap DECIMAL(15,2) DEFAULT 0,
  thuong DECIMAL(15,2) DEFAULT 0,

  -- Deductions
  bhxh DECIMAL(15,2) DEFAULT 0, -- Bảo hiểm xã hội (10.5%)
  bhyt DECIMAL(15,2) DEFAULT 0, -- Bảo hiểm y tế (1.5%)
  bhtn DECIMAL(15,2) DEFAULT 0, -- Bảo hiểm thất nghiệp (1%)
  thue_tncn DECIMAL(15,2) DEFAULT 0, -- Thuế thu nhập cá nhân
  khau_tru_khac DECIMAL(15,2) DEFAULT 0, -- Khấu trừ khác
  tien_coc_da_tru DECIMAL(15,2) DEFAULT 0, -- Tiền cọc đã trừ

  -- Calculated totals (GENERATED columns)
  tong_thu_nhap DECIMAL(15,2) GENERATED ALWAYS AS (
    COALESCE(luong_co_ban, 0) +
    COALESCE(luong_theo_chuyen, 0) +
    COALESCE(phu_cap, 0) +
    COALESCE(thuong, 0)
  ) STORED,

  tong_khau_tru DECIMAL(15,2) GENERATED ALWAYS AS (
    COALESCE(bhxh, 0) +
    COALESCE(bhyt, 0) +
    COALESCE(bhtn, 0) +
    COALESCE(thue_tncn, 0) +
    COALESCE(khau_tru_khac, 0) +
    COALESCE(tien_coc_da_tru, 0)
  ) STORED,

  thuc_lanh DECIMAL(15,2) GENERATED ALWAYS AS (
    (COALESCE(luong_co_ban, 0) +
     COALESCE(luong_theo_chuyen, 0) +
     COALESCE(phu_cap, 0) +
     COALESCE(thuong, 0)) -
    (COALESCE(bhxh, 0) +
     COALESCE(bhyt, 0) +
     COALESCE(bhtn, 0) +
     COALESCE(thue_tncn, 0) +
     COALESCE(khau_tru_khac, 0) +
     COALESCE(tien_coc_da_tru, 0))
  ) STORED,

  -- Payment status
  trang_thai VARCHAR(20) DEFAULT 'chua_thanh_toan', -- chua_thanh_toan | da_xac_nhan | da_thanh_toan
  ngay_thanh_toan DATE,

  -- Notes
  ghi_chu TEXT,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(100),

  -- Constraints
  CONSTRAINT uk_bang_luong_nhan_vien_period UNIQUE(ma_nhan_vien, thang, nam),
  CONSTRAINT fk_bang_luong_nhan_vien FOREIGN KEY (ma_nhan_vien)
    REFERENCES nhan_vien(ma_nhan_vien) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_bang_luong_nhan_vien ON bang_luong(ma_nhan_vien);
CREATE INDEX IF NOT EXISTS idx_bang_luong_thang_nam ON bang_luong(thang, nam);
CREATE INDEX IF NOT EXISTS idx_bang_luong_phong_ban ON bang_luong(phong_ban);
CREATE INDEX IF NOT EXISTS idx_bang_luong_loai ON bang_luong(loai_nhan_vien);
CREATE INDEX IF NOT EXISTS idx_bang_luong_trang_thai ON bang_luong(trang_thai);

-- Create or replace trigger function for auto-updating updated_at
CREATE OR REPLACE FUNCTION update_bang_luong_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_update_bang_luong_updated_at ON bang_luong;

-- Create trigger for updated_at
CREATE TRIGGER trigger_update_bang_luong_updated_at
  BEFORE UPDATE ON bang_luong
  FOR EACH ROW
  EXECUTE FUNCTION update_bang_luong_updated_at();

-- Add helpful comments
COMMENT ON TABLE bang_luong IS 'Bảng lưu trữ thông tin lương hàng tháng của nhân viên và tài xế';
COMMENT ON COLUMN bang_luong.loai_nhan_vien IS 'Loại nhân viên: nhan_vien (lương cố định) hoặc tai_xe (lương theo chuyến)';
COMMENT ON COLUMN bang_luong.ty_le_chia_se IS 'Tỷ lệ % chia sẻ doanh thu cho tài xế (mặc định 15%)';
COMMENT ON COLUMN bang_luong.trang_thai IS 'Trạng thái thanh toán: chua_thanh_toan | da_xac_nhan | da_thanh_toan';
COMMENT ON COLUMN bang_luong.tong_thu_nhap IS 'Tổng thu nhập = lương cơ bản + lương theo chuyến + phụ cấp + thưởng';
COMMENT ON COLUMN bang_luong.tong_khau_tru IS 'Tổng khấu trừ = BHXH + BHYT + BHTN + thuế + khác + tiền cọc';
COMMENT ON COLUMN bang_luong.thuc_lanh IS 'Thực lãnh = tổng thu nhập - tổng khấu trừ';

-- Sample data for testing (commented out - uncomment to use)
/*
INSERT INTO bang_luong (
  ma_nhan_vien, ho_va_ten, phong_ban, chuc_vu, loai_nhan_vien,
  thang, nam, luong_co_ban, bhxh, bhyt, bhtn, created_by
) VALUES (
  'NAK001', 'Nguyễn Văn A', 'Văn phòng', 'Nhân viên', 'nhan_vien',
  2, 2026, 10000000, 1050000, 150000, 100000, 'system'
);
*/

SELECT 'Migration completed: bang_luong table created successfully!' AS status;
