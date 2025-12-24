"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function SettingsPage() {
  return (
    <DashboardLayout
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Cài đặt" },
      ]}
    >
      <h1 className="mb-6 text-2xl font-bold text-foreground">Cài đặt hệ thống</h1>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Thông tin ứng dụng</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Phiên bản</p>
              <p className="font-medium">1.0.0</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tên hệ thống</p>
              <p className="font-medium">NAK Logistics Management Dashboard</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>API Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Google Apps Script URL</p>
              <p className="font-mono text-xs text-foreground break-all">
                {process.env.NEXT_PUBLIC_GAS_API_URL || 'Not configured'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
