import { sql } from '@vercel/postgres';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function verify() {
    console.log('🔍 Verifying Migration Results...');
    console.log('========================================');

    try {
        // 1. Get Total Count
        const countResult = await sql`SELECT COUNT(*) FROM reconciliation_orders`;
        const total = countResult.rows[0].count;
        console.log(`📊 Total Records: ${total}`);

        // 2. Get Revenue/Cost Summary
        const sumResult = await sql`
      SELECT 
        SUM(revenue) as total_revenue,
        SUM(cost) as total_cost,
        SUM(weight) as total_weight
      FROM reconciliation_orders
    `;
        const { total_revenue, total_cost, total_weight } = sumResult.rows[0];
        console.log(`💰 Total Revenue: ${Number(total_revenue).toLocaleString('vi-VN')} VND`);
        console.log(`💸 Total Cost:    ${Number(total_cost).toLocaleString('vi-VN')} VND`);
        console.log(`⚖️  Total Weight:  ${Number(total_weight).toLocaleString('vi-VN')} kg`);

        // 3. Get Sample Data (Latest 3)
        console.log('\n📋 Latest 3 Records:');
        const latest = await sql`
      SELECT order_id, date, customer, revenue, status, route_name, details
      FROM reconciliation_orders 
      ORDER BY date DESC 
      LIMIT 3
    `;

        latest.rows.forEach(row => {
            console.log(`\n🔹 [${row.order_id}] ${new Date(row.date).toISOString().split('T')[0]}`);
            console.log(`   Customer: ${row.customer}`);
            console.log(`   Route:    ${row.route_name}`);
            console.log(`   Revenue:  ${Number(row.revenue).toLocaleString('vi-VN')} VND`);
            console.log(`   Status:   ${row.status}`);
            console.log(`   Details:  ${JSON.stringify(row.details || {}).substring(0, 100)}...`);
        });

    } catch (error: any) {
        console.error('❌ Verification Failed:', error.message);
    } finally {
        console.log('\n========================================');
        process.exit(0);
    }
}

verify();
