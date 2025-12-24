"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { FilterSidebar } from "@/components/reconciliation/filter-sidebar"
import { DataTable } from "@/components/reconciliation/data-table"
import { SummaryBar } from "@/components/reconciliation/summary-bar"
import { ReconciliationFilters } from "@/types/reconciliation"
import { useReconciliationData } from "@/hooks/use-reconciliation-data"
import { Card, CardContent } from "@/components/ui/card"

export default function ReconciliationPage() {
  const [filters, setFilters] = useState<ReconciliationFilters>({})

  // Fetch data from API
  const { data, isLoading, error } = useReconciliationData({ filters })

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Đối soát" },
      ]}
    >
      <div className="flex gap-6">
        {/* Filter Sidebar */}
        <FilterSidebar filters={filters} onFiltersChange={setFilters} />

        {/* Main Content */}
        <div className="flex-1">
          <h1 className="mb-6 text-2xl font-bold text-foreground">
            Đối soát vận chuyển
          </h1>

          {/* Loading State */}
          {isLoading && (
            <div className="space-y-6">
              <div className="grid grid-cols-5 gap-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4">
                      <div className="h-4 bg-muted rounded w-20 mb-2"></div>
                      <div className="h-6 bg-muted rounded w-24"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Card className="animate-pulse">
                <CardContent className="p-6">
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="h-12 bg-muted rounded"></div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Error State */}
          {error && (
            <Card className="border-destructive">
              <CardContent className="pt-6">
                <p className="text-destructive">
                  Lỗi khi tải dữ liệu: {error.message}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Vui lòng kiểm tra kết nối với Google Apps Script hoặc thử lại sau
                </p>
              </CardContent>
            </Card>
          )}

          {/* Data Display */}
          {data && (
            <>
              {/* Summary Bar */}
              <SummaryBar summary={data.summary} />

              {/* Data Table */}
              <DataTable data={data.records} />

              {/* Last Updated Info */}
              <div className="mt-4 text-center">
                <p className="text-xs text-muted-foreground">
                  Tổng số: {data.total} chuyến đi
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
