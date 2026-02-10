-- Migration: Add email and calculated fields to luong_tong_hop
-- Date: 2026-02-10
-- Purpose: Add email field and store calculated fields in database

-- Step 1: Add email column (replaces phong_ban)
ALTER TABLE luong_tong_hop
  ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- Step 2: Add calculated fields for storing pre-computed values
ALTER TABLE luong_tong_hop
  ADD COLUMN IF NOT EXISTS tong_thu_nhap NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tong_khau_tru NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS luong_thuc_lanh NUMERIC(15,2) DEFAULT 0;

-- Step 3: Populate email from nhan_vien table
UPDATE luong_tong_hop lt
SET email = nv.email
FROM nhan_vien nv
WHERE lt.ma_nhan_vien = nv.ma_nhan_vien
  AND lt.email IS NULL;

-- Step 4: Calculate and populate tong_thu_nhap for existing records
UPDATE luong_tong_hop
SET tong_thu_nhap = 
  COALESCE(luong_bat_dau, 0) +
  COALESCE(tong_chi_phi_sua_chua, 0) +
  COALESCE(hoan_coc, 0) +
  COALESCE(chi_phi_do_dau_ngoai, 0) +
  COALESCE(chi_phi_phat_sinh_new, 0)
WHERE tong_thu_nhap = 0 OR tong_thu_nhap IS NULL;

-- Step 5: Calculate and populate tong_khau_tru for existing records
UPDATE luong_tong_hop
SET tong_khau_tru = 
  COALESCE(truy_thu_dau, 0) +
  COALESCE(truy_thu_ontime, 0) +
  COALESCE(tru_coc, 0) +
  COALESCE(tam_ung, 0) +
  COALESCE(phat_che_tai, 0) +
  COALESCE(truy_thu_vetc, 0) +
  COALESCE(phat_nguoi, 0) +
  COALESCE(tien_lam_the, 0) +
  COALESCE(bhxh, 0) +
  COALESCE(khac, 0)
WHERE tong_khau_tru = 0 OR tong_khau_tru IS NULL;

-- Step 6: Calculate and populate luong_thuc_lanh for existing records
UPDATE luong_tong_hop
SET luong_thuc_lanh = COALESCE(tong_thu_nhap, 0) - COALESCE(tong_khau_tru, 0)
WHERE luong_thuc_lanh = 0 OR luong_thuc_lanh IS NULL;

-- Step 7: Add comments for documentation
COMMENT ON COLUMN luong_tong_hop.email IS 'Email của nhân viên (thay thế phong_ban)';
COMMENT ON COLUMN luong_tong_hop.tong_thu_nhap IS 'Tổng thu nhập (sum of 5 income fields)';
COMMENT ON COLUMN luong_tong_hop.tong_khau_tru IS 'Tổng khấu trừ (sum of 10 deduction fields)';
COMMENT ON COLUMN luong_tong_hop.luong_thuc_lanh IS 'Lương thực lãnh = tong_thu_nhap - tong_khau_tru';

-- Step 8: Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_luong_tong_hop_email ON luong_tong_hop(email);
CREATE INDEX IF NOT EXISTS idx_luong_tong_hop_thang_nam ON luong_tong_hop(thang, nam);

-- Verification query
SELECT 
  COUNT(*) as total_records,
  COUNT(email) as records_with_email,
  COUNT(CASE WHEN tong_thu_nhap > 0 THEN 1 END) as records_with_income,
  COUNT(CASE WHEN luong_thuc_lanh != 0 THEN 1 END) as records_with_salary
FROM luong_tong_hop;
