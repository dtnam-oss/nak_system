-- Email logs table for tracking payslip emails
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ma_nhan_vien VARCHAR(50) NOT NULL,
  ten_nhan_vien VARCHAR(255) NOT NULL,
  email_to VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  thang INTEGER NOT NULL,
  nam INTEGER NOT NULL,
  sent_at TIMESTAMP DEFAULT NOW(),
  status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'failed')),
  error_message TEXT,
  pdf_tong_hop_generated BOOLEAN DEFAULT false,
  pdf_chi_tiet_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_logs_thang_nam ON email_logs(thang, nam);
CREATE INDEX IF NOT EXISTS idx_email_logs_ma_nv ON email_logs(ma_nhan_vien);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at DESC);

-- Comments
COMMENT ON TABLE email_logs IS 'Logs of payslip emails sent to employees';
COMMENT ON COLUMN email_logs.status IS 'success or failed';
COMMENT ON COLUMN email_logs.pdf_tong_hop_generated IS 'Whether summary PDF was generated successfully';
COMMENT ON COLUMN email_logs.pdf_chi_tiet_generated IS 'Whether detailed PDF was generated successfully';
