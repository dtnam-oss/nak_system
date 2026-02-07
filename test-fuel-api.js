const { sql } = require('./lib/db.ts');

async function test() {
  try {
    const result = await sql`
      SELECT 
        id,
        ngay_nhap,
        nha_cung_cap,
        ten_nhien_lieu,
        so_luong
      FROM public.nhap_nhien_lieu
      LIMIT 3
    `;
    
    console.log('Query result:');
    console.log(JSON.stringify(result.rows, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

test();
