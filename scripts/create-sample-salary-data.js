const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://nak_user:Nak_Str0ng_2026@163.223.12.189:5432/nak_vn',
  ssl: false
});

async function createSampleData() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Creating sample salary data for testing...\n');
    
    const month = 2;
    const year = 2026;
    
    // Sample data theo cấu trúc mới
    const sampleRecords = [
      {
        ma_nhan_vien: 'TX001',
        ten_nhan_vien: 'Nguyễn Văn A',
        chuc_vu: 'Tài xế',
        luong_bat_dau: 15000000,
        tong_chi_phi_sua_chua: 500000,
        hoan_coc: 1000000,
        chi_phi_do_dau_ngoai: 200000,
        chi_phi_phat_sinh_new: 100000,
        truy_thu_dau: 300000,
        truy_thu_ontime: 150000,
        tru_coc: 500000,
        tam_ung: 2000000,
        phat_che_tai: 100000,
        truy_thu_vetc: 250000,
        phat_nguoi: 50000,
        tien_lam_the: 100000,
        bhxh: 450000,
        khac: 0
      },
      {
        ma_nhan_vien: 'TX002',
        ten_nhan_vien: 'Trần Văn B',
        chuc_vu: 'Tài xế',
        luong_bat_dau: 18000000,
        tong_chi_phi_sua_chua: 750000,
        hoan_coc: 1500000,
        chi_phi_do_dau_ngoai: 300000,
        chi_phi_phat_sinh_new: 150000,
        truy_thu_dau: 0,
        truy_thu_ontime: 0,
        tru_coc: 0,
        tam_ung: 3000000,
        phat_che_tai: 0,
        truy_thu_vetc: 300000,
        phat_nguoi: 0,
        tien_lam_the: 0,
        bhxh: 540000,
        khac: 100000
      }
    ];
    
    for (const record of sampleRecords) {
      // Check if record exists
      const existing = await client.query(
        'SELECT id FROM luong_tong_hop WHERE ma_nhan_vien = $1 AND thang = $2 AND nam = $3',
        [record.ma_nhan_vien, month, year]
      );
      
      if (existing.rows.length > 0) {
        console.log(`⚠️  Record already exists for ${record.ma_nhan_vien}, skipping...`);
        continue;
      }
      
      // Insert new record
      await client.query(`
        INSERT INTO luong_tong_hop (
          ma_nhan_vien, ten_nhan_vien, chuc_vu, phong_ban,
          thang, nam,
          luong_bat_dau, tong_chi_phi_sua_chua, hoan_coc,
          chi_phi_do_dau_ngoai, chi_phi_phat_sinh_new,
          truy_thu_dau, truy_thu_ontime, tru_coc, tam_ung,
          phat_che_tai, truy_thu_vetc, phat_nguoi, tien_lam_the,
          bhxh, khac
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11,
          $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
        )
      `, [
        record.ma_nhan_vien,
        record.ten_nhan_vien,
        record.chuc_vu,
        'Vận tải',
        month,
        year,
        record.luong_bat_dau,
        record.tong_chi_phi_sua_chua,
        record.hoan_coc,
        record.chi_phi_do_dau_ngoai,
        record.chi_phi_phat_sinh_new,
        record.truy_thu_dau,
        record.truy_thu_ontime,
        record.tru_coc,
        record.tam_ung,
        record.phat_che_tai,
        record.truy_thu_vetc,
        record.phat_nguoi,
        record.tien_lam_the,
        record.bhxh,
        record.khac
      ]);
      
      console.log(`✅ Created record for ${record.ten_nhan_vien}`);
    }
    
    console.log(`\n✅ Sample data created for ${month}/${year}!`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

createSampleData();
