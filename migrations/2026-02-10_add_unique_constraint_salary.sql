-- Add UNIQUE constraint on (ma_nhan_vien, thang, nam)
-- This allows ON CONFLICT upsert for salary recalculation

-- Drop old records if any duplicates exist
DELETE FROM luong_tong_hop a USING luong_tong_hop b
WHERE a.id > b.id 
  AND a.ma_nhan_vien = b.ma_nhan_vien 
  AND a.thang = b.thang 
  AND a.nam = b.nam;

-- Add UNIQUE constraint
ALTER TABLE luong_tong_hop 
ADD CONSTRAINT uq_luong_tong_hop_ma_thang_nam 
UNIQUE (ma_nhan_vien, thang, nam);

-- Verify
SELECT 
  constraint_name, 
  constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'luong_tong_hop' 
  AND constraint_type = 'UNIQUE';
