"use client"

import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { DateRange } from "react-day-picker"
import { format } from "date-fns"
import { DashboardLayout } from "@/components/dashboard-layout"
import { DateRangePickerInput } from "@/components/ui/date-range-picker-input"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

// New Components
import { DataQualityStats } from "@/components/reports/quality-stats"
import { SmartFilterChips } from "@/components/reports/smart-filter-chips"
import { DataQualityTable } from "@/components/reports/data-quality-table"

// Types
interface QualityStats {
  totalOrders: number;
  qualityScore: number;
  errors: {
    missingRoute: number;
    missingWeight: number;
    missingMoney: number;
    missingPlate: number;
  };
}

interface SmartQueryResponse {
  data: any[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export default function ReportsPage() {
  // --- STATE ---
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [activeFilter, setActiveFilter] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [page, setPage] = useState(1)
  const pageSize = 20

  // Format Dates for API
  const fromDate = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : ''
  const toDate = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : ''

  // --- QUERIES ---

  // 1. Stats Counter (Header) - Fast
  const { data: stats, isLoading: statsLoading } = useQuery<QualityStats>({
    queryKey: ['report-stats', fromDate, toDate],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (fromDate) params.append('fromDate', fromDate)
      if (toDate) params.append('toDate', toDate)

      const res = await fetch(`/api/reports/quality-stats?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch stats')
      return res.json()
    },
    // Refresh stats every 1 min
    refetchInterval: 60000
  })

  // 2. Table Data - Smart Query (Debounced Search?)
  const { data: tableData, isLoading: tableLoading } = useQuery<SmartQueryResponse>({
    queryKey: ['report-data', page, activeFilter, searchTerm, fromDate, toDate],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.append('page', page.toString())
      params.append('pageSize', pageSize.toString())
      params.append('filter', activeFilter)
      if (searchTerm) params.append('search', searchTerm)
      if (fromDate) params.append('fromDate', fromDate)
      if (toDate) params.append('toDate', toDate)

      const res = await fetch(`/api/reports/smart-query?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch data')
      return res.json()
    },
    // Keep data fresh but don't over-fetch
    staleTime: 5000
  })

  // Reset page when filter changes
  useEffect(() => {
    setPage(1)
  }, [activeFilter, searchTerm, dateRange])

  return (
    <DashboardLayout breadcrumbs={[{ label: "Trung tâm Kiểm soát Dữ liệu" }]}>
      <div className="space-y-6 max-w-[1600px] mx-auto animate-in-fade">

        {/* 1. Header & Stats */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight">Kiểm soát Chất lượng Vận hành</h1>
            {/* Date Picker Right Aligned */}
            <DateRangePickerInput
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              className="w-[260px]"
            />
          </div>

          {/* Stats Cards */}
          <DataQualityStats
            stats={stats || {
              totalOrders: 0, qualityScore: 100,
              errors: { missingRoute: 0, missingWeight: 0, missingMoney: 0, missingPlate: 0 }
            }}
            isLoading={statsLoading}
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
          />
        </div>

        {/* 2. Smart Controls (Chips + Search) */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between bg-white p-3 rounded-lg border shadow-sm">
          {/* Filter Chips */}
          <div className="flex-1 min-w-0">
            <SmartFilterChips
              activeFilter={activeFilter}
              onFilterChange={setActiveFilter}
              stats={stats?.errors || { missingRoute: 0, missingWeight: 0, missingMoney: 0, missingPlate: 0 }}
            />
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-[300px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm theo Mã đơn, Khách hàng..."
              className="pl-9 h-9 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* 3. Main Data Table */}
        <DataQualityTable
          data={tableData?.data || []}
          isLoading={tableLoading}
          pageCount={tableData?.meta.totalPages || 0}
          pageIndex={page}
          onPageChange={setPage}
        />
      </div>
    </DashboardLayout>
  )
}
