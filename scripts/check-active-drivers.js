const { Pool } = require('pg');

async function checkActiveDrivers() {
  const pool = new Pool({
    connectionString: 'postgresql://nak_user:123@163.223.12.189:5432/nak_vn',
  });

  try {
    console.log('🔌 Connecting to database...');
    const client = await pool.connect();
    console.log('✅ Connected');

    // Check for active drivers
    const result = await client.query(`
      SELECT
        ma_nhan_vien,
        ho_va_ten,
        phong_ban,
        chuc_vu,
        tinh_trang_cong_tac
      FROM nhan_vien
      WHERE chuc_vu = 'Tài xế'
        AND tinh_trang_cong_tac = 'Đang làm việc'
      LIMIT 10
    `);

    console.log(`\n📊 Found ${result.rows.length} active drivers with exact criteria`);

    if (result.rows.length > 0) {
      console.log('\n👥 Sample drivers:');
      result.rows.forEach((row, index) => {
        console.log(`${index + 1}. ${row.ma_nhan_vien} - ${row.ho_va_ten} - ${row.chuc_vu} - ${row.tinh_trang_cong_tac}`);
      });
    } else {
      console.log('❌ No active drivers found with exact criteria!');
      console.log('\n🔍 Let me check what values exist...\n');

      // Check all chuc_vu values
      const chucVuResult = await client.query(`
        SELECT DISTINCT chuc_vu, COUNT(*) as count
        FROM nhan_vien
        GROUP BY chuc_vu
        ORDER BY count DESC
      `);
      console.log('📋 All chuc_vu values in database:');
      chucVuResult.rows.forEach(row => {
        console.log(`  - "${row.chuc_vu}": ${row.count} employees`);
      });

      // Check all tinh_trang_cong_tac values
      const statusResult = await client.query(`
        SELECT DISTINCT tinh_trang_cong_tac, COUNT(*) as count
        FROM nhan_vien
        GROUP BY tinh_trang_cong_tac
        ORDER BY count DESC
      `);
      console.log('\n📋 All tinh_trang_cong_tac values in database:');
      statusResult.rows.forEach(row => {
        console.log(`  - "${row.tinh_trang_cong_tac}": ${row.count} employees`);
      });
    }

    client.release();
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkActiveDrivers();
