import { sql } from '@/lib/db';
import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';

// Remove force-dynamic to enable caching
// export const dynamic = 'force-dynamic';

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
  const getCachedStats = unstable_cache(
    async () => {
      try {
        console.log('========================================');
        console.log('📋 FUEL STATS API REQUEST');
        console.log('🕐 Timestamp:', new Date().toISOString());
        console.log('========================================');

    // 1. Tổng nhập kho
    const importResult = await sql`
      SELECT COALESCE(SUM(
        CASE
          WHEN so_luong::TEXT IS NULL OR so_luong::TEXT = '' THEN 0
          ELSE REPLACE(so_luong::TEXT, ',', '.')::NUMERIC
        END
      ), 0) as total_import
      FROM public.nhap_nhien_lieu
    `;
    const totalImport = parseFloat(importResult.rows[0]?.total_import || '0');
    console.log('✓ Total Import:', totalImport);

    // 2. Tổng xuất tại Trụ nội bộ (loai_hinh = 'Trụ nội bộ')
    const exportInternalResult = await sql`
      SELECT COALESCE(SUM(
        CASE
          WHEN so_luong::TEXT IS NULL OR so_luong::TEXT = '' THEN 0
          ELSE REPLACE(so_luong::TEXT, ',', '.')::NUMERIC
        END
      ), 0) as total_export
      FROM public.xuat_nhien_lieu
      WHERE id IS NOT NULL
        AND LOWER(TRIM(loai_hinh)) = 'trụ nội bộ'
    `;
    const totalExportInternal = parseFloat(exportInternalResult.rows[0]?.total_export || '0');
    console.log('✓ Total Export (Internal):', totalExportInternal);

    // 3. Tổng xuất tất cả (để tính tiêu thụ trong tháng)
    const exportAllResult = await sql`
      SELECT COALESCE(SUM(
        CASE
          WHEN so_luong::TEXT IS NULL OR so_luong::TEXT = '' THEN 0
          ELSE REPLACE(so_luong::TEXT, ',', '.')::NUMERIC
        END
      ), 0) as total_export
      FROM public.xuat_nhien_lieu
      WHERE id IS NOT NULL
    `;
    const totalExportAll = parseFloat(exportAllResult.rows[0]?.total_export || '0');
    console.log('✓ Total Export (All):', totalExportAll);

    // 4. Tính tồn kho và giá bình quân
    // Use simple calculation (Total Import - Internal Export)
    let currentInventory = totalImport - totalExportInternal;
    let currentAvgPrice = 0;
    let inventoryValue = 0;

    // Get avg price from latest import
    const avgPriceResult = await sql`
      SELECT COALESCE(
        CASE
          WHEN don_gia_xuat_binh_quan::TEXT IS NULL OR don_gia_xuat_binh_quan::TEXT = '' THEN 0
          ELSE REPLACE(don_gia_xuat_binh_quan::TEXT, ',', '.')::NUMERIC
        END
      , 0) as avg_price
      FROM public.nhap_nhien_lieu
      WHERE don_gia_xuat_binh_quan IS NOT NULL
      ORDER BY ngay_nhap DESC
      LIMIT 1
    `;
    currentAvgPrice = parseFloat(avgPriceResult.rows[0]?.avg_price || '0');
    inventoryValue = currentInventory * currentAvgPrice;

    console.log('✓ Final Current Inventory:', currentInventory);
    console.log('✓ Final Current Avg Price:', currentAvgPrice);

    // 5. Tiêu thụ trong tháng hiện tại
    const monthlyResult = await sql`
      SELECT COALESCE(SUM(
        CASE
          WHEN so_luong::TEXT IS NULL OR so_luong::TEXT = '' THEN 0
          ELSE REPLACE(so_luong::TEXT, ',', '.')::NUMERIC
        END
      ), 0) as monthly_consumption
      FROM public.xuat_nhien_lieu
      WHERE id IS NOT NULL
        AND ngay_tao IS NOT NULL
        AND DATE_TRUNC('month', ngay_tao::date) = DATE_TRUNC('month', CURRENT_DATE)
    `;
    const monthlyConsumption = parseFloat(monthlyResult.rows[0]?.monthly_consumption || '0');
    console.log('✓ Monthly Consumption:', monthlyConsumption);

    // 6. Tính toán các chỉ số
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

        return stats;

      } catch (error: any) {
        console.error('========================================');
        console.error('❌ FUEL STATS ERROR');
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);
        console.error('========================================');
        throw error;
      }
    },
    ['fuel-stats'],
    {
      revalidate: 30, // Cache for 30 seconds
      tags: ['fuel-stats'],
    }
  );

  try {
    const stats = await getCachedStats();
    
    return NextResponse.json({
      success: true,
      data: stats
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch fuel stats',
      message: error.message
    }, { status: 500 });
  }
}
