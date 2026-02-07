// Test API route directly
import { sql } from './lib/db.ts';

async function test() {
  try {
    console.log('Testing fuel transactions query from lib/db...\n');
    
    const result = await sql`
      SELECT 
        id,
        ngay_tao as transaction_date,
        loai_hinh as fuel_source,
        doi_tuong as object,
        bien_so_xe as license_plate,
        ten_tai_xe as driver_name,
        loai_nhien_lieu as fuel_type,
        REPLACE(COALESCE(so_luong::TEXT, '0'), ',', '.')::NUMERIC as quantity,
        REPLACE(COALESCE(don_gia::TEXT, '0'), ',', '.')::NUMERIC as unit_price,
        REPLACE(COALESCE(thanh_tien::TEXT, '0'), ',', '.')::NUMERIC as total_amount,
        REPLACE(COALESCE(so_odo::TEXT, '0'), ',', '.')::NUMERIC as odo_number,
        trang_thai as status,
        hang_muc as category,
        thoi_gian_tao as created_at,
        nguoi_tao as created_by
      FROM public.xuat_nhien_lieu
      ORDER BY ngay_tao DESC
      LIMIT 2
    `;
    
    console.log('Query successful!');
    console.log('Rows:', result.rows.length);
    console.log('\nData:');
    console.log(JSON.stringify(result.rows, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
  process.exit(0);
}

test();
