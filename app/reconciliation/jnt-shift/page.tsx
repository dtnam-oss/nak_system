"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { ReconciliationToolbar } from "@/components/reconciliation/toolbar"
import { JnTShiftTable } from "@/components/reconciliation/jnt-shift-table"
import { ReconciliationFilters } from "@/types/reconciliation"
import { useReconciliationData } from "@/hooks/use-reconciliation-data"
import { Card, CardContent } from "@/components/ui/card"

export default function JnTShiftReconciliationPage() {
  const [filters, setFilters] = useState<ReconciliationFilters>({})

  // Fetch data from API
  const { data, isLoading, error } = useReconciliationData({ filters })

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Đối soát", href: "/reconciliation" },
        { label: "J&T - Theo Ca" },
      ]}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">J&T - Báo Cáo Theo Ca</h1>
          <p className="text-muted-foreground mt-2">
            Báo cáo đối soát theo ca làm việc với thông tin chi tiết lộ trình
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <Card className="animate-pulse">
            <CardContent className="p-6">
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-12 bg-muted rounded"></div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive">
                Lỗi khi tải dữ liệu: {error.message}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Vui lòng kiểm tra kết nối hoặc thử lại sau
              </p>
            </CardContent>
          </Card>
        )}

        {/* Data Display */}
        {data && (
          <div className="space-y-4">
            {/* Toolbar with filters */}
            <ReconciliationToolbar
              filters={filters}
              onFiltersChange={setFilters}
              totalRecords={data.total}
            />

            {/* J&T Shift Table */}
            <JnTShiftTable data={data.records} />
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
