import { neon } from '@neondatabase/serverless';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const sql = neon(process.env.DATABASE_URL!);

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
        SELECT COALESCE(SUM(cost), 0) as total
        FROM reconciliation_orders
        WHERE DATE_TRUNC('month', date) = DATE_TRUNC('month', CURRENT_DATE)
      `,
      
      // 2. Revenue previous month
      sql`
        SELECT COALESCE(SUM(cost), 0) as total
        FROM reconciliation_orders
        WHERE DATE_TRUNC('month', date) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
      `,
      
      // 3. Pending orders count
      sql`
        SELECT COUNT(*) as count
        FROM reconciliation_orders
        WHERE LOWER(TRIM(status)) IN ('pending', 'chờ duyệt', 'new')
      `,
      
      // 4. Total vehicles
      sql`
        SELECT COUNT(*) as count
        FROM vehicles
      `,
      
      // 5. Active vehicles
      sql`
        SELECT COUNT(*) as count
        FROM vehicles
        WHERE LOWER(TRIM(current_status)) IN ('đang hoạt động', 'active')
      `,
      
      // 6. Fuel imports total
      sql`
        SELECT COALESCE(SUM(quantity), 0) as total
        FROM fuel_imports
      `,
      
      // 7. Fuel exports internal
      sql`
        SELECT COALESCE(SUM(quantity), 0) as total
        FROM fuel_transactions
        WHERE LOWER(TRIM(fuel_source)) = 'trụ nội bộ'
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
            date::date as date,
            COALESCE(SUM(cost), 0) as revenue
          FROM reconciliation_orders
          WHERE date >= CURRENT_DATE - INTERVAL '6 days'
          GROUP BY date::date
        ),
        fuel_data AS (
          SELECT 
            transaction_date::date as date,
            COALESCE(SUM(total_amount), 0) as fuel_cost
          FROM fuel_transactions
          WHERE transaction_date >= CURRENT_DATE - INTERVAL '6 days'
          GROUP BY transaction_date::date
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
        FROM reconciliation_orders
        WHERE DATE_TRUNC('month', date) = DATE_TRUNC('month', CURRENT_DATE)
        AND LOWER(TRIM(provider)) IN ('nak', 'nội bộ')
      `,
      
      // 10. Provider breakdown - VENDOR
      sql`
        SELECT COUNT(*) as count
        FROM reconciliation_orders
        WHERE DATE_TRUNC('month', date) = DATE_TRUNC('month', CURRENT_DATE)
        AND LOWER(TRIM(provider)) IN ('vendor', 'thuê ngoài', 'thue ngoai')
      `,
      
      // 11. Recent activities
      sql`
        SELECT 
          id,
          order_id,
          customer,
          status,
          created_at
        FROM reconciliation_orders
        ORDER BY created_at DESC
        LIMIT 5
      `,
    ]);

    // Process revenue data (Neon returns array directly, not .rows)
    const currentRevenue = parseFloat(revenueCurrentMonth[0]?.total || '0');
    const previousRevenue = parseFloat(revenuePreviousMonth[0]?.total || '0');
    const percentageChange = previousRevenue > 0 
      ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 
      : 0;

    // Process pending orders
    const pendingOrders = parseInt(pendingOrdersResult[0]?.count || '0', 10);

    // Process vehicles
    const totalVehicles = parseInt(vehiclesTotal[0]?.count || '0', 10);
    const activeVehicles = parseInt(vehiclesActive[0]?.count || '0', 10);

    // Process fuel tank
    const fuelImports = parseFloat(fuelImportsTotal[0]?.total || '0');
    const fuelExports = parseFloat(fuelExportsInternal[0]?.total || '0');
    const currentFuelLevel = fuelImports - fuelExports;
    const fuelCapacity = 40590;
    const fuelPercentage = fuelCapacity > 0 ? (currentFuelLevel / fuelCapacity) * 100 : 0;

    // Process revenue chart
    const revenueChart = revenueChartData.map(row => ({
      date: new Date(row.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
      revenue: parseFloat(row.revenue || '0'),
      fuelCost: parseFloat(row.fuel_cost || '0'),
    }));

    // Process provider breakdown
    const nakCount = parseInt(providerNAK[0]?.count || '0', 10);
    const vendorCount = parseInt(providerVendor[0]?.count || '0', 10);

    // Process recent activities
    const recentActivities = recentActivitiesData.map(row => ({
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

    return NextResponse.json(stats);
  } catch (error) {
    console.error('❌ Dashboard Stats Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}
