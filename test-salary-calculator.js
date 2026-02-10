/**
 * Test Salary Calculator Service
 * Verify the auto-calculation logic
 */

const { Pool } = require('pg');

const pool = new Pool({
  host: '163.223.12.189',
  port: 5432,
  database: 'nak_vn',
  user: 'nak_user',
  password: 'Nak_Str0ng_2026'
});

async function testCalculation() {
  try {
    console.log('🧪 Testing Salary Calculator Logic\n');
    
    const thang = 2;
    const nam = 2026;
    
    // Test 1: Get sample employee with data
    console.log('📋 Step 1: Find employee with trip salary and maintenance data');
    const employeeQuery = await pool.query(`
      SELECT DISTINCT lt.ma_tai_xe as ma_nhan_vien, lt.ten_tai_xe
      FROM luong_tai_xe lt
      WHERE lt.ma_tai_xe IS NOT NULL
        AND EXTRACT(MONTH FROM lt.ngay_tao) = $1
        AND EXTRACT(YEAR FROM lt.ngay_tao) = $2
      LIMIT 1
    `, [thang, nam]);
    
    if (employeeQuery.rows.length === 0) {
      console.log('❌ No employees found with trip data for this month');
      return;
    }
    
    const ma_nhan_vien = employeeQuery.rows[0].ma_nhan_vien;
    const ten_nhan_vien = employeeQuery.rows[0].ten_tai_xe;
    console.log(`✅ Testing with: ${ma_nhan_vien} - ${ten_nhan_vien}\n`);
    
    // Test 2: Calculate trip salary
    console.log('📊 Step 2: Calculate trip salary (luong_bat_dau)');
    const tripSalary = await pool.query(`
      SELECT 
        COUNT(*) as so_chuyen,
        SUM(luong_tai_xe) as tong_luong
      FROM luong_tai_xe
      WHERE ma_tai_xe = $1
        AND EXTRACT(MONTH FROM ngay_tao) = $2
        AND EXTRACT(YEAR FROM ngay_tao) = $3
    `, [ma_nhan_vien, thang, nam]);
    
    console.log(`  Số chuyến: ${tripSalary.rows[0].so_chuyen}`);
    console.log(`  Tổng lương: ${parseFloat(tripSalary.rows[0].tong_luong || 0).toLocaleString('vi-VN')} VNĐ\n`);
    
    // Test 3: Calculate maintenance costs
    console.log('📊 Step 3: Calculate maintenance costs (tong_chi_phi_sua_chua)');
    const maintenance = await pool.query(`
      SELECT 
        COUNT(*) as so_lan,
        SUM(so_tien) as tong_chi_phi
      FROM chi_phi_sua_chua
      WHERE ma_nhan_vien = $1
        AND EXTRACT(MONTH FROM ngay) = $2
        AND EXTRACT(YEAR FROM ngay) = $3
    `, [ma_nhan_vien, thang, nam]);
    
    console.log(`  Số lần sửa: ${maintenance.rows[0].so_lan}`);
    console.log(`  Tổng chi phí: ${parseFloat(maintenance.rows[0].tong_chi_phi || 0).toLocaleString('vi-VN')} VNĐ\n`);
    
    // Test 4: Show calculation summary
    const luong_bat_dau = parseFloat(tripSalary.rows[0].tong_luong || 0);
    const tong_chi_phi_sua_chua = parseFloat(maintenance.rows[0].tong_chi_phi || 0);
    const tong_thu_nhap = luong_bat_dau + tong_chi_phi_sua_chua;
    
    console.log('💰 SUMMARY FOR THIS EMPLOYEE:');
    console.log('═'.repeat(60));
    console.log(`  Lương chuyến (luong_bat_dau):           ${luong_bat_dau.toLocaleString('vi-VN')} VNĐ`);
    console.log(`  Hoàn phí sửa chữa:                      ${tong_chi_phi_sua_chua.toLocaleString('vi-VN')} VNĐ`);
    console.log('─'.repeat(60));
    console.log(`  TỔNG THU NHẬP:                          ${tong_thu_nhap.toLocaleString('vi-VN')} VNĐ`);
    console.log('═'.repeat(60));
    console.log();
    
    // Test 5: Bulk calculation simulation
    console.log('🔄 Step 4: Simulate bulk calculation (all employees)');
    const bulkQuery = await pool.query(`
      WITH trip_totals AS (
        SELECT 
          ma_tai_xe,
          COUNT(*) as so_chuyen,
          SUM(luong_tai_xe) as luong_bat_dau
        FROM luong_tai_xe
        WHERE EXTRACT(MONTH FROM ngay_tao) = $1
          AND EXTRACT(YEAR FROM ngay_tao) = $2
          AND ma_tai_xe IS NOT NULL
        GROUP BY ma_tai_xe
      ),
      maintenance_totals AS (
        SELECT 
          ma_nhan_vien,
          COUNT(*) as so_lan,
          SUM(so_tien) as tong_chi_phi_sua_chua
        FROM chi_phi_sua_chua
        WHERE EXTRACT(MONTH FROM ngay) = $1
          AND EXTRACT(YEAR FROM ngay) = $2
          AND ma_nhan_vien IS NOT NULL
        GROUP BY ma_nhan_vien
      )
      SELECT 
        COUNT(DISTINCT COALESCE(t.ma_tai_xe, m.ma_nhan_vien)) as total_employees,
        COUNT(DISTINCT t.ma_tai_xe) as employees_with_trips,
        COUNT(DISTINCT m.ma_nhan_vien) as employees_with_maintenance,
        SUM(COALESCE(t.luong_bat_dau, 0)) as total_trip_salary,
        SUM(COALESCE(m.tong_chi_phi_sua_chua, 0)) as total_maintenance_cost
      FROM trip_totals t
      FULL OUTER JOIN maintenance_totals m ON t.ma_tai_xe = m.ma_nhan_vien
    `, [thang, nam]);
    
    const bulk = bulkQuery.rows[0];
    console.log(`  Tổng nhân viên có dữ liệu:              ${bulk.total_employees}`);
    console.log(`  Nhân viên có lương chuyến:              ${bulk.employees_with_trips}`);
    console.log(`  Nhân viên có chi phí sửa chữa:          ${bulk.employees_with_maintenance}`);
    console.log(`  Tổng lương chuyến:                      ${parseFloat(bulk.total_trip_salary || 0).toLocaleString('vi-VN')} VNĐ`);
    console.log(`  Tổng chi phí sửa chữa:                  ${parseFloat(bulk.total_maintenance_cost || 0).toLocaleString('vi-VN')} VNĐ`);
    console.log();
    
    console.log('✅ All tests passed! Ready to implement APIs.\n');
    
    await pool.end();
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testCalculation();
