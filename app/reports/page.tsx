"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { vi } from "date-fns/locale"
import { DateRange } from "react-day-picker"
import { RefreshCw, TrendingUp, Activity, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DateRangePickerInput } from "@/components/ui/date-range-picker-input"
import { MultiSelect } from "@/components/ui/multi-select"
import { DashboardLayout } from "@/components/dashboard-layout"
import { DataIntegrityTab } from "@/components/reports/data-integrity-tab"
import { OperationSummaryTab } from "@/components/reports/operation-summary-tab"

interface AnalyticsData {
  statistics: {
    total_trips: number
    by_trip_type: Record<string, number>
    by_status: Record<string, number>
    by_customer: Array<{ customer: string; count: number }>
  }
  data_integrity: {
    total_errors: number
    error_rate: string
    errors: Array<{
      order_id: string
      date: string
      customer: string
      missing_fields: string[]
      detail_index: number
    }>
  }
}

export default function ReportsPage() {
  // Filters state
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([])
  const [customers, setCustomers] = useState<string[]>([])

  // Data state
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [trips, setTrips] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [tripsLoading, setTripsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch customers on mount
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const response = await fetch('/api/customers')
        const result = await response.json()
        if (result.success) {
          setCustomers(result.data)
        }
      } catch (err) {
        console.error('Failed to fetch customers:', err)
      }
    }
    fetchCustomers()
  }, [])

  // Fetch analytics data
  const fetchAnalytics = async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      
      if (dateRange?.from) {
        params.append('fromDate', format(dateRange.from, 'yyyy-MM-dd'))
      }
      if (dateRange?.to) {
        params.append('toDate', format(dateRange.to, 'yyyy-MM-dd'))
      }
      if (selectedCustomer) {
        params.append('customer', selectedCustomer)
      }

      const response = await fetch(`/api/reports/analytics?${params.toString()}`)
      const result = await response.json()

      if (result.success) {
        setData(result)
      } else {
        setError(result.error || 'Failed to fetch analytics')
      }
    } catch (err) {
      console.error('Analytics fetch error:', err)
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Fetch trip details for operation summary
  const fetchTrips = async () => {
    setTripsLoading(true)

    try {
      const params = new URLSearchParams()
      
      if (dateRange?.from) {
        params.append('fromDate', format(dateRange.from, 'yyyy-MM-dd'))
      }
      if (dateRange?.to) {
        params.append('toDate', format(dateRange.to, 'yyyy-MM-dd'))
      }
      if (selectedCustomers.length > 0) {
        params.append('customer', selectedCustomers.join(','))
      }

      const response = await fetch(`/api/reports/trips?${params.toString()}`)
      const result = await response.json()

      if (result.success) {
        setTrips(result.data)
      }
    } catch (err) {
      console.error('Trips fetch error:', err)
    } finally {
      setTripsLoading(false)
    }
  }

  // Auto-fetch on mount and when filters change
  useEffect(() => {
    fetchAnalytics()
    fetchTrips()
  }, [dateRange, selectedCustomers])

  // Calculate data for charts
  const chartData = data?.statistics.by_customer || []

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Báo cáo & Kiểm soát</h1>
            <p className="text-xs text-muted-foreground">
              Thống kê vận hành và kiểm tra chất lượng dữ liệu
            </p>
          </div>
        </div>

      {/* Filters Toolbar */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-wrap items-center gap-3">
            <DateRangePickerInput
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              className="shrink-0"
            />

            <MultiSelect
              options={customers.map(c => ({ label: c, value: c }))}
              selected={selectedCustomers}
              onChange={setSelectedCustomers}
              placeholder="Khách hàng"
              className="w-[180px]"
            />

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                fetchAnalytics()
                fetchTrips()
              }}
              disabled={loading || tripsLoading}
              className="ml-auto h-8 text-xs"
            >
              {(loading || tripsLoading) ? (
                <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              )}
              Làm mới
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error Message */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview" className="text-xs">
            <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
            Tổng hợp Vận hành
          </TabsTrigger>
          <TabsTrigger value="integrity" className="text-xs">
            <Activity className="h-3.5 w-3.5 mr-1.5" />
            Kiểm soát Dữ liệu
            {data && data.data_integrity.total_errors > 0 && (
              <Badge variant="destructive" className="ml-2 text-[10px] px-1.5 py-0">
                {data.data_integrity.total_errors}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Overview */}
        <TabsContent value="overview" className="space-y-4">
          <OperationSummaryTab 
            trips={trips} 
            loading={tripsLoading}
          />
        </TabsContent>

        {/* Tab 2: Data Integrity */}
        <TabsContent value="integrity" className="space-y-4">
          <DataIntegrityTab 
            errors={data?.data_integrity.errors || []} 
            loading={loading}
          />
        </TabsContent>
      </Tabs>
    </div>
    </DashboardLayout>
  )
}
