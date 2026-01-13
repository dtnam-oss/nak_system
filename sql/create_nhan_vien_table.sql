-- Create employees (nhan_vien) table for Telegram bot authentication
-- This table stores employee information imported from Google Sheets

CREATE TABLE IF NOT EXISTS nhan_vien (
  id SERIAL PRIMARY KEY,
  
  -- Basic employee info
  ma_nhan_vien VARCHAR(20) UNIQUE NOT NULL, -- Employee code (NAK001, NAK002...)
  ho_va_ten VARCHAR(100) NOT NULL,          -- Full name
  phong_ban VARCHAR(50),                     -- Department
  chuc_vu VARCHAR(50),                       -- Position/Role
  hinh_anh TEXT,                             -- Avatar URL (https://...)
  
  -- Contact info
  so_dien_thoai VARCHAR(20),                 -- Phone number
  email VARCHAR(100),                        -- Email
  chat_id VARCHAR(50),                       -- Telegram chat ID (for bot)
  
  -- Work status
  tinh_trang_cong_tac VARCHAR(50),          -- Work status (Đang làm, Nghỉ việc...)
  ngay_vao_lam DATE,                         -- Join date
  ngay_ky_hdld DATE,                         -- Contract sign date
  ngay_tham_gia_cong_doan DATE,             -- Union join date
  ngay_tham_gia_bhxh DATE,                  -- Insurance join date
  ngay_thoi_viec DATE,                       -- Resignation date
  
  -- Financial info
  giam_tru_gia_canh INTEGER,                 -- Family deduction
  luong_thoa_thuan DECIMAL(12, 2),          -- Agreed salary
  tien_coc DECIMAL(12, 2),                  -- Deposit amount
  
  -- Permissions (for role-based access control)
  phan_quyen VARCHAR(20) DEFAULT 'user',    -- Role: admin, manager, staff, driver, user
  xem BOOLEAN DEFAULT true,                  -- View permission
  them BOOLEAN DEFAULT false,                -- Create permission
  sua BOOLEAN DEFAULT false,                 -- Edit permission
  xoa BOOLEAN DEFAULT false,                 -- Delete permission
  
  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP
);

-- Create indexes for faster queries
CREATE INDEX idx_nhan_vien_ma ON nhan_vien(ma_nhan_vien);
CREATE INDEX idx_nhan_vien_email ON nhan_vien(email);
CREATE INDEX idx_nhan_vien_chat_id ON nhan_vien(chat_id);
CREATE INDEX idx_nhan_vien_phong_ban ON nhan_vien(phong_ban);
CREATE INDEX idx_nhan_vien_phan_quyen ON nhan_vien(phan_quyen);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_nhan_vien_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_nhan_vien_updated_at
  BEFORE UPDATE ON nhan_vien
  FOR EACH ROW
  EXECUTE FUNCTION update_nhan_vien_updated_at();

-- Comments for documentation
COMMENT ON TABLE nhan_vien IS 'Employee information for Telegram bot authentication and authorization';
COMMENT ON COLUMN nhan_vien.ma_nhan_vien IS 'Employee code used for login (e.g., NAK001)';
COMMENT ON COLUMN nhan_vien.chat_id IS 'Telegram chat ID for bot communication';
COMMENT ON COLUMN nhan_vien.phan_quyen IS 'User role: admin, manager, staff, driver, user';
