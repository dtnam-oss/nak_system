-- Migration: Add thuong column to luong_tong_hop
-- Date: 2026-02-10
-- Purpose: Add bonus/thuong field to income section

-- Add thuong column
ALTER TABLE luong_tong_hop
  ADD COLUMN IF NOT EXISTS thuong NUMERIC(15,2) DEFAULT 0;

-- Add comment
COMMENT ON COLUMN luong_tong_hop.thuong IS 'Thưởng (Bonus)';

-- Recalculate tong_thu_nhap to include thuong for existing records
UPDATE luong_tong_hop
SET tong_thu_nhap = 
  COALESCE(luong_bat_dau, 0) +
  COALESCE(tong_chi_phi_sua_chua, 0) +
  COALESCE(hoan_coc, 0) +
  COALESCE(chi_phi_do_dau_ngoai, 0) +
  COALESCE(chi_phi_phat_sinh_new, 0) +
  COALESCE(thuong, 0);

-- Recalculate luong_thuc_lanh
UPDATE luong_tong_hop
SET luong_thuc_lanh = COALESCE(tong_thu_nhap, 0) - COALESCE(tong_khau_tru, 0);

-- Verification
SELECT 
  COUNT(*) as total_records,
  COUNT(CASE WHEN thuong IS NOT NULL THEN 1 END) as records_with_thuong_column,
  SUM(COALESCE(thuong, 0)) as total_thuong
FROM luong_tong_hop;
