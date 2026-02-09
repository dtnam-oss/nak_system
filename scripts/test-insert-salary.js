const { Pool } = require('pg');
const crypto = require('crypto');

async function testInsert() {
  const pool = new Pool({
    connectionString: 'postgresql://nak_user:Nak_Str0ng_2026@163.223.12.189:5432/nak_vn',
  });

  try {
    console.log('🔌 Connecting to database...');
    const client = await pool.connect();
    console.log('✅ Connected');

    // Try to insert a test record
    const testId = crypto.randomUUID(); // Node.js built-in UUID generation

    console.log(`\n📝 Attempting to insert test record with ID: ${testId}`);

    const result = await client.query(`
      INSERT INTO luong_tong_hop (
        id,
        ma_nhan_vien,
        ten_nhan_vien,
        phong_ban,
        chuc_vu,
        thang,
        nam,
        luong_chuyen,
        cp_sua_chua,
        cp_do_dau,
        cp_phat_sinh,
        cp_ccdc,
        ho_tro,
        truy_thu,
        tru_coc,
        hoan_coc,
        tam_ung,
        phat_nguoi,
        bhxh,
        khac
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
      )
      RETURNING id, ma_nhan_vien, ten_nhan_vien
    `, [
      testId,
      'TEST001',
      'Test Driver',
      'Test Department',
      'Tài xế',
      2,
      2026
    ]);

    console.log('✅ Insert successful!');
    console.log('Inserted record:', result.rows[0]);

    // Clean up test record
    await client.query('DELETE FROM luong_tong_hop WHERE ma_nhan_vien = $1', ['TEST001']);
    console.log('\n🧹 Test record cleaned up');

    client.release();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

testInsert();
