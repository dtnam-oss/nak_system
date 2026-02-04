"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { ProcessingResultsCard } from "@/components/dashboard/processing-results-card"
import { PartnerPerformanceCard } from "@/components/dashboard/partner-performance-card"
import { CustomerInsightsCard } from "@/components/dashboard/customer-insights-card"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Sun, Moon } from "lucide-react"

interface DashboardData {
  mode: "morning" | "evening";
  processing: any;
  partners: any;
  customers: any;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Default to evening (Results) as it's more data-rich usually, or auto-detect
  const [isEveningMode, setIsEveningMode] = useState(true)

  async function fetchDashboardData(mode: "morning" | "evening") {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/dashboard/telegram-stats?mode=${mode}`)

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

  useEffect(() => {
    fetchDashboardData(isEveningMode ? "evening" : "morning")

    // Refresh every 1 minute (improved from 5 minutes)
    const interval = setInterval(() => fetchDashboardData(isEveningMode ? "evening" : "morning"), 60 * 1000)
    return () => clearInterval(interval)
  }, [isEveningMode])

  const toggleMode = () => {
    setIsEveningMode(!isEveningMode)
  }

  return (
    <DashboardLayout breadcrumbs={[{ label: "Tổng quan (Dashboard)" }]}>
      <div className="space-y-6 animate-in-fade">
        {/* Header & Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Trung tâm Điều hành</h1>
            <p className="text-muted-foreground">
              {isEveningMode ? "Tổng kết kết quả vận hành hôm nay." : "Kế hoạch và dự kiến triển khai."}
            </p>
          </div>

          <div className="flex items-center space-x-2 bg-background/50 p-2 rounded-lg border border-border glass-subtle">
            <div className="flex items-center space-x-2">
              <Sun className={`h-4 w-4 ${!isEveningMode ? "text-orange-500" : "text-muted-foreground"}`} />
              <Label htmlFor="mode-toggle" className="text-sm cursor-pointer">Sáng (Kế hoạch)</Label>
            </div>
            <Switch
              id="mode-toggle"
              checked={isEveningMode}
              onCheckedChange={setIsEveningMode}
            />
            <div className="flex items-center space-x-2">
              <Label htmlFor="mode-toggle" className="text-sm cursor-pointer">Tối (Kết quả)</Label>
              <Moon className={`h-4 w-4 ${isEveningMode ? "text-indigo-500" : "text-muted-foreground"}`} />
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && !data && (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-32 w-full rounded-xl" />
              ))}
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <Skeleton className="h-[300px] w-full rounded-xl" />
              <Skeleton className="h-[300px] w-full rounded-xl" />
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <Card className="border-destructive bg-destructive/10">
            <CardContent className="p-6">
              <p className="text-destructive font-semibold">Lỗi tải dữ liệu</p>
              <p className="text-sm text-foreground/80 mt-1">{error.message}</p>
            </CardContent>
          </Card>
        )}

        {/* Data Display */}
        {data && (
          <>
            {/* KPI Cards (Processing Results) */}
            <ProcessingResultsCard
              data={data.processing}
              mode={isEveningMode ? "evening" : "morning"}
            />

            {/* Bottom Section: Partners & Customers */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <PartnerPerformanceCard data={data.partners} />
              </div>
              <div className="lg:col-span-5">
                <CustomerInsightsCard data={data.customers} />
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
