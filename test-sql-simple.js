// Test simple query
import { sql, query } from './lib/db.ts';

async function test() {
  try {
    console.log('1. Testing sql template tag:\n');
    const result1 = await sql`SELECT * FROM public.xuat_nhien_lieu LIMIT 2`;
    console.log('Result:', result1.rows.length, 'rows');
    console.log(JSON.stringify(result1.rows.map(r => ({
      id: r.id,
      ngay_tao: r.ngay_tao,
      loai_hinh: r.loai_hinh
    })), null, 2));
    
    console.log('\n2. Testing direct query function:\n');
    const result2 = await query('SELECT * FROM public.xuat_nhien_lieu LIMIT 2', []);
    console.log('Result:', result2.rows.length, 'rows');
    console.log(JSON.stringify(result2.rows.map(r => ({
      id: r.id,
      ngay_tao: r.ngay_tao,
      loai_hinh: r.loai_hinh
    })), null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  process.exit(0);
}

test();
