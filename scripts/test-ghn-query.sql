-- Test GHN query to find the problematic value
SELECT 
  ma_chuyen_di,
  ten_khach_hang,
  doanh_thu,
  so_km_theo_odo,
  CASE 
    WHEN doanh_thu::TEXT ~ '1T9' THEN 'FOUND IN doanh_thu'
    WHEN so_km_theo_odo::TEXT ~ '1T9' THEN 'FOUND IN so_km_theo_odo'
    ELSE 'OK'
  END as check_result
FROM chuyen_di
WHERE ten_khach_hang ILIKE '%GHN%'
  AND (doanh_thu::TEXT ~ '1T9' OR so_km_theo_odo::TEXT ~ '1T9')
LIMIT 5;

-- Check chi_tiet fields
SELECT 
  ct.ma_chuyen_di,
  ct.quang_duong,
  ct.tai_trong,
  ct.so_chieu,
  ct.don_gia,
  ct.ket_qua,
  CASE 
    WHEN ct.quang_duong ~ '1T9' THEN 'quang_duong'
    WHEN ct.tai_trong ~ '1T9' THEN 'tai_trong'  
    WHEN ct.so_chieu ~ '1T9' THEN 'so_chieu'
    WHEN ct.don_gia ~ '1T9' THEN 'don_gia'
    WHEN ct.ket_qua ~ '1T9' THEN 'ket_qua'
    ELSE 'UNKNOWN'
  END as problem_field
FROM chi_tiet_chuyen_di ct
INNER JOIN chuyen_di cd ON cd.ma_chuyen_di = ct.ma_chuyen_di
WHERE cd.ten_khach_hang ILIKE '%GHN%'
  AND (ct.quang_duong ~ '1T9' 
    OR ct.tai_trong ~ '1T9'
    OR ct.so_chieu ~ '1T9' 
    OR ct.don_gia ~ '1T9'
    OR ct.ket_qua ~ '1T9')
LIMIT 5;
