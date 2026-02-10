const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://nak_user:Nak_Str0ng_2026@163.223.12.189:5432/nak_vn',
  ssl: false
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting migration: Restructure luong_tong_hop table...\n');
    
    // Step 1: Add new income columns
    console.log('Step 1: Adding new income columns...');
    await client.query(`
      ALTER TABLE luong_tong_hop
        ADD COLUMN IF NOT EXISTS luong_bat_dau NUMERIC(15,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS tong_chi_phi_sua_chua NUMERIC(15,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS chi_phi_do_dau_ngoai NUMERIC(15,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS chi_phi_phat_sinh_new NUMERIC(15,2) DEFAULT 0
    `);
    console.log('✅ Income columns added\n');
    
    // Step 2: Add new deduction columns
    console.log('Step 2: Adding new deduction columns...');
    await client.query(`
      ALTER TABLE luong_tong_hop
        ADD COLUMN IF NOT EXISTS truy_thu_dau NUMERIC(15,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS truy_thu_ontime NUMERIC(15,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS phat_che_tai NUMERIC(15,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS truy_thu_vetc NUMERIC(15,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS tien_lam_the NUMERIC(15,2) DEFAULT 0
    `);
    console.log('✅ Deduction columns added\n');
    
    // Step 3: Add final payable column
    console.log('Step 3: Adding final payable column...');
    await client.query(`
      ALTER TABLE luong_tong_hop
        ADD COLUMN IF NOT EXISTS tra_tai_xe NUMERIC(15,2) DEFAULT 0
    `);
    console.log('✅ Payable column added\n');
    
    // Step 4: Add column comments
    console.log('Step 4: Adding column documentation...');
    await client.query(`
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
    `);
    console.log('✅ Documentation added\n');
    
    // Step 5: Verify columns
    console.log('Step 5: Verifying new columns...');
    const result = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'luong_tong_hop'
        AND column_name IN (
          'luong_bat_dau', 'tong_chi_phi_sua_chua', 'chi_phi_do_dau_ngoai',
          'chi_phi_phat_sinh_new', 'truy_thu_dau', 'truy_thu_ontime',
          'phat_che_tai', 'truy_thu_vetc', 'tien_lam_the', 'tra_tai_xe'
        )
      ORDER BY column_name
    `);
    
    console.log('New columns added:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });
    
    console.log('\n✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
