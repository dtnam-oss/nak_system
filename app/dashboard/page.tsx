"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { DashboardKpiCards } from "@/components/dashboard/dashboard-kpi-cards"
import { RevenueChart } from "@/components/dashboard/revenue-chart"
import { ProviderChart } from "@/components/dashboard/provider-chart"
import { RecentActivities } from "@/components/dashboard/recent-activities"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

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

export default function DashboardPage() {
  const [data, setData] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setIsLoading(true)
        const response = await fetch('/api/dashboard/stats')
        
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard data')
        }
        
        const stats = await response.json()
        setData(stats)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'))
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboardData()
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchDashboardData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <DashboardLayout breadcrumbs={[{ label: "Dashboard" }]}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Trung tâm chỉ huy</h1>
          <p className="text-muted-foreground">
            Tổng quan hoạt động và số liệu Real-time
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-6">
            {/* KPI Skeletons */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-4 w-24 mb-4" />
                    <Skeleton className="h-8 w-32 mb-2" />
                    <Skeleton className="h-3 w-40" />
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Chart Skeletons */}
            <div className="grid gap-6 md:grid-cols-3">
              <Card className="col-span-2">
                <CardContent className="p-6">
                  <Skeleton className="h-[300px] w-full" />
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <Skeleton className="h-[300px] w-full" />
                </CardContent>
              </Card>
            </div>

            {/* Activities Skeleton */}
            <Card>
              <CardContent className="p-6">
                <Skeleton className="h-[200px] w-full" />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Error State */}
        {error && (
          <Card className="border-destructive">
            <CardContent className="p-6">
              <p className="text-destructive font-semibold">
                Lỗi khi tải dữ liệu Dashboard
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {error.message}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Data Display */}
        {data && !isLoading && (
          <>
            {/* Tier 1: KPI Cards */}
            <DashboardKpiCards
              revenue={data.revenue}
              pendingOrders={data.pendingOrders}
              vehicles={data.vehicles}
              fuelTank={data.fuelTank}
            />

            {/* Tier 2: Charts */}
            <div className="grid gap-6 md:grid-cols-3">
              <RevenueChart data={data.revenueChart} />
              <ProviderChart data={data.providerBreakdown} />
            </div>

            {/* Tier 3: Recent Activities */}
            <RecentActivities activities={data.recentActivities} />
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
