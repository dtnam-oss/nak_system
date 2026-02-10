-- Migration: Restructure luong_tong_hop table to match new payroll structure
-- Date: 2026-02-10
-- Purpose: Add new salary fields according to new payroll template

-- Step 1: Add new columns for income items (Thu nhập)
ALTER TABLE luong_tong_hop
  ADD COLUMN IF NOT EXISTS luong_bat_dau NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tong_chi_phi_sua_chua NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS chi_phi_do_dau_ngoai NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS chi_phi_phat_sinh_new NUMERIC(15,2) DEFAULT 0;

-- Step 2: Add new columns for deductions (Khấu trừ)
ALTER TABLE luong_tong_hop
  ADD COLUMN IF NOT EXISTS truy_thu_dau NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS truy_thu_ontime NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS phat_che_tai NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS truy_thu_vetc NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tien_lam_the NUMERIC(15,2) DEFAULT 0;

-- Step 3: Add final payable amount field
ALTER TABLE luong_tong_hop
  ADD COLUMN IF NOT EXISTS tra_tai_xe NUMERIC(15,2) DEFAULT 0;

-- Step 4: Add comments for documentation
COMMENT ON COLUMN luong_tong_hop.luong_bat_dau IS 'Lương chuyển/Lương bắt đầu';
COMMENT ON COLUMN luong_tong_hop.tong_chi_phi_sua_chua IS 'Hoàn phí sửa chữa';
COMMENT ON COLUMN luong_tong_hop.hoan_coc IS 'Hoàn cọc';
COMMENT ON COLUMN luong_tong_hop.chi_phi_do_dau_ngoai IS 'Hoàn phí đổ dầu ngoài';
COMMENT ON COLUMN luong_tong_hop.chi_phi_phat_sinh_new IS 'Hoàn chi phí phát sinh';

COMMENT ON COLUMN luong_tong_hop.truy_thu_dau IS 'Truy thu đầu';
COMMENT ON COLUMN luong_tong_hop.truy_thu_ontime IS 'Truy thu ontime';
COMMENT ON COLUMN luong_tong_hop.tru_coc IS 'Trừ cọc';
COMMENT ON COLUMN luong_tong_hop.tam_ung IS 'Phí tạm ứng';
COMMENT ON COLUMN luong_tong_hop.phat_che_tai IS 'Phạt chế tài';
COMMENT ON COLUMN luong_tong_hop.truy_thu_vetc IS 'Truy thu VETC';
COMMENT ON COLUMN luong_tong_hop.phat_nguoi IS 'Phạt nguội';
COMMENT ON COLUMN luong_tong_hop.tien_lam_the IS 'Tiền làm thẻ';
COMMENT ON COLUMN luong_tong_hop.bhxh IS 'BHXH';
COMMENT ON COLUMN luong_tong_hop.khac IS 'Khác';

COMMENT ON COLUMN luong_tong_hop.tra_tai_xe IS 'Thu nhập thực lĩnh (Trả tài xế)';

-- Step 5: Create or replace view for easier querying
CREATE OR REPLACE VIEW v_luong_tong_hop_full AS
SELECT
  id,
  ma_nhan_vien,
  ten_nhan_vien,
  phong_ban,
  chuc_vu,
  thang,
  nam,
  
  -- Thu nhập (Income)
  COALESCE(luong_bat_dau, luong_chuyen, 0) as luong_chuyen,
  COALESCE(tong_chi_phi_sua_chua, 0) as hoan_phi_sua_chua,
  COALESCE(hoan_coc, 0) as hoan_coc,
  COALESCE(chi_phi_do_dau_ngoai, 0) as hoan_phi_do_dau_ngoai,
  COALESCE(chi_phi_phat_sinh_new, cp_phat_sinh, 0) as hoan_chi_phi_phat_sinh,
  
  -- Tổng thu nhập
  COALESCE(luong_bat_dau, luong_chuyen, 0) + 
  COALESCE(tong_chi_phi_sua_chua, 0) + 
  COALESCE(hoan_coc, 0) + 
  COALESCE(chi_phi_do_dau_ngoai, 0) + 
  COALESCE(chi_phi_phat_sinh_new, cp_phat_sinh, 0) AS tong_thu_nhap,
  
  -- Khấu trừ (Deductions)
  COALESCE(truy_thu_dau, 0) as truy_thu_dau,
  COALESCE(truy_thu_ontime, 0) as truy_thu_ontime,
  COALESCE(tru_coc, 0) as tru_coc,
  COALESCE(tam_ung, 0) as phi_tam_ung,
  COALESCE(phat_che_tai, 0) as phat_che_tai,
  COALESCE(truy_thu_vetc, 0) as truy_thu_vetc,
  COALESCE(phat_nguoi, 0) as phat_nguoi,
  COALESCE(tien_lam_the, 0) as tien_lam_the,
  COALESCE(bhxh, 0) as bhxh,
  COALESCE(khac, 0) as khac,
  
  -- Tổng khấu trừ
  COALESCE(truy_thu_dau, 0) + 
  COALESCE(truy_thu_ontime, 0) + 
  COALESCE(tru_coc, 0) + 
  COALESCE(tam_ung, 0) + 
  COALESCE(phat_che_tai, 0) + 
  COALESCE(truy_thu_vetc, 0) + 
  COALESCE(phat_nguoi, 0) + 
  COALESCE(tien_lam_the, 0) + 
  COALESCE(bhxh, 0) + 
  COALESCE(khac, 0) AS tong_khau_tru,
  
  -- Thực lãnh
  COALESCE(tra_tai_xe,
    (COALESCE(luong_bat_dau, luong_chuyen, 0) + 
     COALESCE(tong_chi_phi_sua_chua, 0) + 
     COALESCE(hoan_coc, 0) + 
     COALESCE(chi_phi_do_dau_ngoai, 0) + 
     COALESCE(chi_phi_phat_sinh_new, cp_phat_sinh, 0)) -
    (COALESCE(truy_thu_dau, 0) + 
     COALESCE(truy_thu_ontime, 0) + 
     COALESCE(tru_coc, 0) + 
     COALESCE(tam_ung, 0) + 
     COALESCE(phat_che_tai, 0) + 
     COALESCE(truy_thu_vetc, 0) + 
     COALESCE(phat_nguoi, 0) + 
     COALESCE(tien_lam_the, 0) + 
     COALESCE(bhxh, 0) + 
     COALESCE(khac, 0))
  ) AS thuc_lanh,
  
  created_at,
  updated_at
FROM luong_tong_hop;

-- Step 6: Grant permissions
GRANT SELECT ON v_luong_tong_hop_full TO nak_user;

COMMENT ON VIEW v_luong_tong_hop_full IS 'Complete view of luong_tong_hop with all income and deduction calculations';
