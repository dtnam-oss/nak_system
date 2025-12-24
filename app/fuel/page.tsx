"use client"

import { DashboardLayout } from "@/components/dashboard-layout"

export default function FuelPage() {
  return (
    <DashboardLayout breadcrumbs={[{ label: "Dashboard" }, { label: "Nhiên liệu" }]}>
      <h1 className="text-2xl font-bold text-foreground">Quản lý nhiên liệu</h1>
      <p className="mt-4 text-muted-foreground">Trang này đang được phát triển.</p>
    </DashboardLayout>
  )
}
