// Test query with aliases
import { sql } from './lib/db.ts';

async function test() {
  try {
    console.log('Testing SELECT with column aliases:\n');
    const result = await sql`
      SELECT 
        id,
        ngay_tao as transaction_date,
        loai_hinh as fuel_source
      FROM public.xuat_nhien_lieu
      LIMIT 2
    `;
    console.log('Result:', result.rows.length, 'rows');
    console.log(JSON.stringify(result.rows, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
  process.exit(0);
}

test();
