import { sql, query } from '@/lib/db';
import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';

// Remove force-dynamic to enable caching
// export const dynamic = 'force-dynamic';

interface DashboardStats {
  revenue: {
    current: number;
    previousMonth: number;
    percentageChange: number;
  };
  pendingOrders: number;
  vehicles: {
    total: number;
    active: number;
  };
  fuelTank: {
    currentLevel: number;
    capacity: number;
    percentage: number;
  };
  revenueChart: Array<{
    date: string;
    revenue: number;
    fuelCost: number;
  }>;
  providerBreakdown: {
    nak: number;
    vendor: number;
  };
  recentActivities: Array<{
    id: string;
    orderCode: string;
    customer: string;
    status: string;
    createdAt: string;
  }>;
}

export async function GET() {
  const getCachedStats = unstable_cache(
    async () => {
      try {
        console.log('========================================');
        console.log('📊 DASHBOARD STATS API REQUEST');
        console.log('🕐 Timestamp:', new Date().toISOString());
        console.log('========================================');

    // Run all queries in parallel for performance
    const [
      revenueCurrentMonth,
      revenuePreviousMonth,
      pendingOrdersResult,
      vehiclesTotal,
      vehiclesActive,
      fuelImportsTotal,
      fuelExportsInternal,
      revenueChartData,
      providerNAK,
      providerVendor,
      recentActivitiesData,
    ] = await Promise.all([
      // 1. Revenue current month
      sql`
        SELECT COALESCE(SUM(CAST(doanh_thu AS NUMERIC)), 0) as total
        FROM chuyen_di
        WHERE DATE_TRUNC('month', ngay_tao) = DATE_TRUNC('month', CURRENT_DATE)
      `,
      
      // 2. Revenue previous month
      sql`
        SELECT COALESCE(SUM(CAST(doanh_thu AS NUMERIC)), 0) as total
        FROM chuyen_di
        WHERE DATE_TRUNC('month', ngay_tao) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
      `,
      
      // 3. Pending orders count
      sql`
        SELECT COUNT(*) as count
        FROM chuyen_di
        WHERE LOWER(TRIM(trang_thai_chuyen_di)) IN ('pending', 'chờ duyệt', 'new', 'đang thực hiện')
      `,
      
      // 4. Total vehicles
      sql`
        SELECT COUNT(*) as count
        FROM phuong_tien
      `,
      
      // 5. Active vehicles
      sql`
        SELECT COUNT(*) as count
        FROM phuong_tien
        WHERE LOWER(TRIM(loai_hinh)) IN ('nak', 'nội bộ')
      `,
      
      // 6. Fuel imports total
      sql`
        SELECT COALESCE(SUM(
          REPLACE(COALESCE(so_luong::TEXT, '0'), ',', '.')::NUMERIC
        ), 0) as total
        FROM nhap_nhien_lieu
      `,
      
      // 7. Fuel exports internal
      sql`
        SELECT COALESCE(SUM(
          REPLACE(COALESCE(so_luong::TEXT, '0'), ',', '.')::NUMERIC
        ), 0) as total
        FROM xuat_nhien_lieu
        WHERE LOWER(TRIM(loai_hinh)) = 'trụ nội bộ'
      `,
      
      // 8. Revenue chart (7 days)
      sql`
        WITH dates AS (
          SELECT generate_series(
            CURRENT_DATE - INTERVAL '6 days',
            CURRENT_DATE,
            '1 day'::interval
          )::date AS date
        ),
        revenue_data AS (
          SELECT 
            ngay_tao::date as date,
            COALESCE(SUM(CAST(doanh_thu AS NUMERIC)), 0) as revenue
          FROM chuyen_di
          WHERE ngay_tao >= CURRENT_DATE - INTERVAL '6 days'
          GROUP BY ngay_tao::date
        ),
        fuel_data AS (
          SELECT 
            ngay_tao::date as date,
            COALESCE(SUM(
              REPLACE(COALESCE(thanh_tien::TEXT, '0'), ',', '.')::NUMERIC
            ), 0) as fuel_cost
          FROM xuat_nhien_lieu
          WHERE ngay_tao >= CURRENT_DATE - INTERVAL '6 days'
          GROUP BY ngay_tao::date
        )
        SELECT 
          d.date,
          COALESCE(r.revenue, 0) as revenue,
          COALESCE(f.fuel_cost, 0) as fuel_cost
        FROM dates d
        LEFT JOIN revenue_data r ON d.date = r.date
        LEFT JOIN fuel_data f ON d.date = f.date
        ORDER BY d.date ASC
      `,
      
      // 9. Provider breakdown - NAK
      sql`
        SELECT COUNT(*) as count
        FROM chuyen_di
        WHERE DATE_TRUNC('month', ngay_tao) = DATE_TRUNC('month', CURRENT_DATE)
        AND LOWER(TRIM(don_vi_van_chuyen)) IN ('nak', 'nội bộ')
      `,
      
      // 10. Provider breakdown - VENDOR
      sql`
        SELECT COUNT(*) as count
        FROM chuyen_di
        WHERE DATE_TRUNC('month', ngay_tao) = DATE_TRUNC('month', CURRENT_DATE)
        AND LOWER(TRIM(don_vi_van_chuyen)) IN ('vendor', 'thuê ngoài', 'thue ngoai')
      `,
      
      // 11. Recent activities
      sql`
        SELECT 
          id,
          ma_chuyen_di as order_id,
          ten_khach_hang as customer,
          trang_thai_chuyen_di as status,
          thoi_gian_tao as created_at
        FROM chuyen_di
        ORDER BY thoi_gian_tao DESC
        LIMIT 5
      `,
    ]);

    // Process revenue data (pg returns .rows array)
    const currentRevenue = parseFloat(revenueCurrentMonth.rows[0]?.total || '0');
    const previousRevenue = parseFloat(revenuePreviousMonth.rows[0]?.total || '0');
    const percentageChange = previousRevenue > 0 
      ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 
      : 0;

    // Process pending orders
    const pendingOrders = parseInt(pendingOrdersResult.rows[0]?.count || '0', 10);

    // Process vehicles
    const totalVehicles = parseInt(vehiclesTotal.rows[0]?.count || '0', 10);
    const activeVehicles = parseInt(vehiclesActive.rows[0]?.count || '0', 10);

    // Process fuel tank
    const fuelImports = parseFloat(fuelImportsTotal.rows[0]?.total || '0');
    const fuelExports = parseFloat(fuelExportsInternal.rows[0]?.total || '0');
    const currentFuelLevel = fuelImports - fuelExports;
    const fuelCapacity = 40590;
    const fuelPercentage = fuelCapacity > 0 ? (currentFuelLevel / fuelCapacity) * 100 : 0;

    // Process revenue chart
    const revenueChart = revenueChartData.rows.map(row => ({
      date: new Date(row.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
      revenue: parseFloat(row.revenue || '0'),
      fuelCost: parseFloat(row.fuel_cost || '0'),
    }));

    // Process provider breakdown
    const nakCount = parseInt(providerNAK.rows[0]?.count || '0', 10);
    const vendorCount = parseInt(providerVendor.rows[0]?.count || '0', 10);

    // Process recent activities
    const recentActivities = recentActivitiesData.rows.map(row => ({
      id: row.id,
      orderCode: row.order_id,
      customer: row.customer,
      status: row.status,
      createdAt: row.created_at,
    }));

    const stats: DashboardStats = {
      revenue: {
        current: currentRevenue,
        previousMonth: previousRevenue,
        percentageChange: Math.round(percentageChange * 100) / 100,
      },
      pendingOrders,
      vehicles: {
        total: totalVehicles,
        active: activeVehicles,
      },
      fuelTank: {
        currentLevel: currentFuelLevel,
        capacity: fuelCapacity,
        percentage: Math.round(fuelPercentage * 100) / 100,
      },
      revenueChart,
      providerBreakdown: {
        nak: nakCount,
        vendor: vendorCount,
      },
        recentActivities,
      };

      console.log('✓ Dashboard stats compiled successfully');
      console.log('========================================');

      return stats;
    } catch (error) {
      console.error('❌ Dashboard Stats Error:', error);
      throw error;
    }
  },
  ['dashboard-stats'],
  {
    revalidate: 60, // Cache for 60 seconds
    tags: ['dashboard-stats'],
  }
);

try {
  const stats = await getCachedStats();
  return NextResponse.json(stats, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
    },
  });
} catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}
