const { Pool } = require('pg');

const pool = new Pool({
  host: '163.223.12.189',
  port: 5432,
  database: 'nak_vn',
  user: 'nak_user',
  password: 'Nak_Str0ng_2026'
});

async function checkTables() {
  try {
    // 1. Check chi_phi_sua_chua structure
    const maintenance = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'chi_phi_sua_chua' 
      ORDER BY ordinal_position
    `);
    
    console.log('📋 TABLE: chi_phi_sua_chua');
    console.table(maintenance.rows);
    
    // 2. Check luong_tai_xe structure
    const salary = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'luong_tai_xe' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 TABLE: luong_tai_xe');
    console.table(salary.rows);
    
    // 3. Sample aggregated data from chi_phi_sua_chua
    const maintenanceSample = await pool.query(`
      SELECT 
        ma_nhan_vien, 
        ten_nhan_vien,
        EXTRACT(MONTH FROM ngay)::INTEGER as thang,
        EXTRACT(YEAR FROM ngay)::INTEGER as nam,
        COUNT(*) as so_lan_sua_chua,
        SUM(so_tien)::NUMERIC as tong_chi_phi
      FROM chi_phi_sua_chua
      WHERE ma_nhan_vien IS NOT NULL
      GROUP BY ma_nhan_vien, ten_nhan_vien, thang, nam
      ORDER BY nam DESC, thang DESC, ma_nhan_vien
      LIMIT 5
    `);
    
    console.log('\n💰 Sample: chi_phi_sua_chua (aggregated by employee/month)');
    console.table(maintenanceSample.rows);
    
    // 4. Sample data from luong_tai_xe
    const salarySample = await pool.query(`
      SELECT * FROM luong_tai_xe 
      ORDER BY nam DESC, thang DESC 
      LIMIT 5
    `);
    
    console.log('\n💰 Sample: luong_tai_xe (latest records)');
    console.table(salarySample.rows);
    
    // 5. Check if ma_nhan_vien exists in luong_tai_xe
    const salaryColumns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'luong_tai_xe' 
        AND column_name LIKE '%nhan_vien%'
    `);
    
    console.log('\n🔍 Employee-related columns in luong_tai_xe:');
    console.log(salaryColumns.rows);
    
    await pool.end();
    console.log('\n✅ Analysis complete!');
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

checkTables();
