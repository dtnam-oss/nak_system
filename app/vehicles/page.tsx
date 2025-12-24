"use client"

import { DashboardLayout } from "@/components/dashboard-layout"

export default function VehiclesPage() {
  return (
    <DashboardLayout breadcrumbs={[{ label: "Dashboard" }, { label: "Phương tiện" }]}>
      <h1 className="text-2xl font-bold text-foreground">Quản lý phương tiện</h1>
      <p className="mt-4 text-muted-foreground">Trang này đang được phát triển.</p>
    </DashboardLayout>
  )
}
