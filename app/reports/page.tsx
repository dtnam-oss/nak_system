"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { vi } from "date-fns/locale"
import { DateRange } from "react-day-picker"
import { RefreshCw, TrendingUp, Activity } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { CustomerFilter } from "@/components/reconciliation/customer-filter"
import { DashboardLayout } from "@/components/dashboard-layout"
import { DataIntegrityTab } from "@/components/reports/data-integrity-tab"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts"

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
  const [selectedCustomer, setSelectedCustomer] = useState<string | undefined>()
  const [customers, setCustomers] = useState<string[]>([])

  // Data state
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(false)
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

  // Auto-fetch on mount and when filters change
  useEffect(() => {
    fetchAnalytics()
  }, [dateRange, selectedCustomer])

  // Calculate data for charts
  const chartData = data?.statistics.by_customer || []

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Báo cáo & Kiểm soát</h1>
            <p className="text-muted-foreground">
              Thống kê vận hành và kiểm tra chất lượng dữ liệu
            </p>
          </div>
        </div>

      {/* Filters Toolbar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <DateRangePicker
              value={dateRange}
              onChange={setDateRange}
              placeholder="Chọn khoảng ngày"
              className="w-[280px]"
            />

            <CustomerFilter
              options={customers.map(c => ({ label: c, value: c }))}
              value={selectedCustomer}
              onChange={setSelectedCustomer}
            />

            <Button
              variant="outline"
              onClick={fetchAnalytics}
              disabled={loading}
              className="ml-auto"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
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
          <TabsTrigger value="overview">
            <TrendingUp className="h-4 w-4 mr-2" />
            Tổng hợp Vận hành
          </TabsTrigger>
          <TabsTrigger value="integrity">
            <Activity className="h-4 w-4 mr-2" />
            Kiểm soát Dữ liệu
            {data && data.data_integrity.total_errors > 0 && (
              <Badge variant="destructive" className="ml-2">
                {data.data_integrity.total_errors}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Overview */}
        <TabsContent value="overview" className="space-y-4">
          {/* KPI Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tổng số chuyến</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? '...' : data?.statistics.total_trips || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Trong khoảng thời gian đã chọn
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Chuyến Theo Tuyến</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? '...' : data?.statistics.by_trip_type['Theo tuyến'] || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {data && data.statistics.total_trips > 0
                    ? `${((((data.statistics.by_trip_type['Theo tuyến'] || 0) / data.statistics.total_trips) * 100).toFixed(1))}% tổng số`
                    : 'Không có dữ liệu'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Chuyến Theo Ca</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? '...' : data?.statistics.by_trip_type['Theo ca'] || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {data && data.statistics.total_trips > 0
                    ? `${((((data.statistics.by_trip_type['Theo ca'] || 0) / data.statistics.total_trips) * 100).toFixed(1))}% tổng số`
                    : 'Không có dữ liệu'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Phân bố theo Khách hàng</CardTitle>
              <CardDescription>Top 10 khách hàng có nhiều chuyến nhất</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-[300px] flex items-center justify-center">
                  <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="customer"
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      fontSize={12}
                    />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" fill="hsl(var(--primary))" name="Số chuyến" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  Không có dữ liệu để hiển thị
                </div>
              )}
            </CardContent>
          </Card>
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
