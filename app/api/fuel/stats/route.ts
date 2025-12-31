import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface FuelStats {
  total_import: number;
  total_export_internal: number;
  total_export_all: number;
  current_avg_price: number;
  current_inventory: number;
  inventory_value: number;
  monthly_consumption: number;
  tank_capacity: number;
  tank_percentage: number;
}

export async function GET() {
  try {
    console.log('========================================');
    console.log('📊 FUEL STATS API REQUEST');
    console.log('🕐 Timestamp:', new Date().toISOString());
    console.log('========================================');

    // 1. Tổng nhập kho
    const importResult = await sql`
      SELECT COALESCE(SUM(quantity), 0) as total_import
      FROM fuel_imports
    `;
    const totalImport = parseFloat(importResult.rows[0]?.total_import || '0');
    console.log('✓ Total Import:', totalImport);

    // 2. Tổng xuất tại Trụ nội bộ (fuel_source = 'Trụ nội bộ')
    const exportInternalResult = await sql`
      SELECT COALESCE(SUM(quantity), 0) as total_export
      FROM fuel_transactions
      WHERE LOWER(TRIM(fuel_source)) = 'trụ nội bộ'
    `;
    const totalExportInternal = parseFloat(exportInternalResult.rows[0]?.total_export || '0');
    console.log('✓ Total Export (Internal):', totalExportInternal);

    // 3. Tổng xuất tất cả (để tính tiêu thụ trong tháng)
    const exportAllResult = await sql`
      SELECT COALESCE(SUM(quantity), 0) as total_export
      FROM fuel_transactions
    `;
    const totalExportAll = parseFloat(exportAllResult.rows[0]?.total_export || '0');
    console.log('✓ Total Export (All):', totalExportAll);

    // 4. Giá bình quân từ bản ghi nhập gần nhất
    const avgPriceResult = await sql`
      SELECT COALESCE(avg_price, 0) as avg_price
      FROM fuel_imports
      WHERE avg_price IS NOT NULL
      ORDER BY import_date DESC, updated_at DESC
      LIMIT 1
    `;
    const currentAvgPrice = parseFloat(avgPriceResult.rows[0]?.avg_price || '0');
    console.log('✓ Current Avg Price:', currentAvgPrice);

    // 5. Tiêu thụ trong tháng hiện tại
    const monthlyResult = await sql`
      SELECT COALESCE(SUM(quantity), 0) as monthly_consumption
      FROM fuel_transactions
      WHERE DATE_TRUNC('month', transaction_date) = DATE_TRUNC('month', CURRENT_DATE)
    `;
    const monthlyConsumption = parseFloat(monthlyResult.rows[0]?.monthly_consumption || '0');
    console.log('✓ Monthly Consumption:', monthlyConsumption);

    // 6. Tính toán các chỉ số
    const currentInventory = totalImport - totalExportInternal;
    const inventoryValue = currentInventory * currentAvgPrice;
    const tankCapacity = 40590; // Lít
    const tankPercentage = tankCapacity > 0 ? (currentInventory / tankCapacity) * 100 : 0;

    console.log('📊 Calculated Stats:');
    console.log('  - Current Inventory:', currentInventory, 'liters');
    console.log('  - Inventory Value:', inventoryValue, 'VND');
    console.log('  - Tank Percentage:', tankPercentage.toFixed(2), '%');
    console.log('========================================');

    const stats: FuelStats = {
      total_import: totalImport,
      total_export_internal: totalExportInternal,
      total_export_all: totalExportAll,
      current_avg_price: currentAvgPrice,
      current_inventory: Math.max(0, currentInventory), // Không âm
      inventory_value: Math.max(0, inventoryValue),
      monthly_consumption: monthlyConsumption,
      tank_capacity: tankCapacity,
      tank_percentage: Math.max(0, Math.min(100, tankPercentage)) // 0-100%
    };

    return NextResponse.json({
      success: true,
      data: stats
    });

  } catch (error: any) {
    console.error('========================================');
    console.error('❌ FUEL STATS ERROR');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    console.error('========================================');

    return NextResponse.json({
      success: false,
      error: 'Failed to fetch fuel stats',
      message: error.message
    }, { status: 500 });
  }
}
