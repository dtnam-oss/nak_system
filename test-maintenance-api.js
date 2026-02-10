// Test API endpoints for chi_phi_sua_chua (Maintenance Cost)
const BASE_URL = 'http://localhost:3000';

async function testMaintenanceAPI() {
  console.log('🧪 Testing Maintenance Cost API\n');

  try {
    // Test 1: GET all maintenance records
    console.log('1️⃣ Testing GET /api/maintenance');
    const getResponse = await fetch(`${BASE_URL}/api/maintenance?limit=5`);
    const getData = await getResponse.json();
    console.log('✅ GET Response:', JSON.stringify(getData, null, 2));
    console.log('');

    // Test 2: GET with filters
    console.log('2️⃣ Testing GET /api/maintenance with filters');
    const today = new Date().toISOString().split('T')[0];
    const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const filterResponse = await fetch(
      `${BASE_URL}/api/maintenance?from_date=${lastMonth}&to_date=${today}&limit=10`
    );
    const filterData = await filterResponse.json();
    console.log('✅ Filtered Response:', JSON.stringify(filterData, null, 2));
    console.log('');

    // Test 3: CREATE new maintenance record
    console.log('3️⃣ Testing POST /api/maintenance/create');
    const newRecord = {
      ngay: '2026-02-10',
      loai_xe: 'Xe tải',
      bien_so_xe: '51C-12345',
      loai_phu_tung: 'Lốp xe',
      ma_phu_tung: 'LOP-001',
      ten_phu_tung: 'Lốp Bridgestone 295/80R22.5',
      so_luong: 2,
      don_gia: 5500000,
      thanh_tien: 11000000,
      km_sua_chua: 125000,
      so_tien: 11000000,
      ca_nhan_thanh_toan: 'Không',
      dia_chi_sua_chua: 'Garage Bình Dương',
      ma_nhan_vien: 'TX001',
      ten_nhan_vien: 'Nguyễn Văn A',
    };

    const createResponse = await fetch(`${BASE_URL}/api/maintenance/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRecord),
    });
    const createData = await createResponse.json();
    console.log('✅ CREATE Response:', JSON.stringify(createData, null, 2));
    console.log('');

    // Store created ID for update/delete tests
    const createdId = createData.data?.id;

    if (createdId) {
      // Test 4: UPDATE maintenance record
      console.log('4️⃣ Testing PATCH /api/maintenance/[id]');
      const updateData = {
        so_luong: 4,
        don_gia: 5200000,
        thanh_tien: 20800000,
        so_tien: 20800000,
      };

      const updateResponse = await fetch(`${BASE_URL}/api/maintenance/${createdId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });
      const updateResult = await updateResponse.json();
      console.log('✅ UPDATE Response:', JSON.stringify(updateResult, null, 2));
      console.log('');

      // Test 5: DELETE maintenance record
      console.log('5️⃣ Testing DELETE /api/maintenance/[id]');
      const deleteResponse = await fetch(`${BASE_URL}/api/maintenance/${createdId}`, {
        method: 'DELETE',
      });
      const deleteResult = await deleteResponse.json();
      console.log('✅ DELETE Response:', JSON.stringify(deleteResult, null, 2));
      console.log('');
    }

    // Test 6: GET summary statistics
    console.log('6️⃣ Testing GET /api/maintenance - Summary');
    const summaryResponse = await fetch(`${BASE_URL}/api/maintenance?limit=100`);
    const summaryData = await summaryResponse.json();
    console.log('✅ Summary:', {
      total_records: summaryData.summary.total_records,
      total_cost: summaryData.summary.total_cost.toLocaleString('vi-VN'),
      total_vehicles: summaryData.summary.total_vehicles,
      total_drivers: summaryData.summary.total_drivers,
    });
    console.log('');

    console.log('🎉 All tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run tests
testMaintenanceAPI();
