"use client"

import { DashboardLayout } from "@/components/dashboard-layout"

export default function ReportsPage() {
  return (
    <DashboardLayout breadcrumbs={[{ label: "Dashboard" }, { label: "Báo cáo" }]}>
      <h1 className="text-2xl font-bold text-foreground">Báo cáo</h1>
      <p className="mt-4 text-muted-foreground">Trang này đang được phát triển.</p>
    </DashboardLayout>
  )
}
