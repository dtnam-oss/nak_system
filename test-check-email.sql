-- Check email logs
SELECT 
  ma_nhan_vien,
  ten_nhan_vien,
  email_to,
  status,
  error_message,
  sent_at
FROM email_logs
ORDER BY sent_at DESC
LIMIT 10;
