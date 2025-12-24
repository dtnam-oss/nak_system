"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { GitCompare, Truck, DollarSign, FileText, TrendingUp, Package } from "lucide-react"
import Link from "next/link"
import { useDashboardData } from "@/hooks/use-dashboard-data"

export default function DashboardPage() {
  const { data, isLoading, error } = useDashboardData()

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount)
  }

  // Format number
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('vi-VN').format(num)
  }

  return (
    <DashboardLayout breadcrumbs={[{ label: "Dashboard" }]}>
      <h1 className="mb-6 text-2xl font-bold text-foreground">
        Tổng quan hệ thống
      </h1>

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted rounded w-24"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-32"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <Card className="mb-8 border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">
              Lỗi khi tải dữ liệu: {error.message}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Vui lòng kiểm tra kết nối với Google Apps Script
            </p>
          </CardContent>
        </Card>
      )}

      {/* Real Data Stats */}
      {data && (
        <div className="grid grid-cols-4 gap-6 mb-8">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Tổng doanh thu
              </CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {formatCurrency(data.cards.tongDoanhThu)}
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Tổng chuyến đi
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {formatNumber(data.cards.soChuyen)}
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Xe NAK
              </CardTitle>
              <Truck className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">
                {formatNumber(data.cards.soXeNAK)}
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Xe Vendor
              </CardTitle>
              <Truck className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">
                {formatNumber(data.cards.soXeVendor)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts Section */}
      {data && (
        <div className="grid grid-cols-2 gap-6 mb-8">
          {/* Doanh thu theo tuyến */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Doanh thu theo tuyến
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.charts.doanhThuTheoTuyen.slice(0, 5).map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                      {item.label}
                    </span>
                    <span className="text-sm font-medium text-foreground">
                      {formatCurrency(item.value)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Doanh thu theo khách hàng */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Top khách hàng
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.charts.doanhThuTheoKhachHang.slice(0, 5).map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                      {item.label}
                    </span>
                    <span className="text-sm font-medium text-foreground">
                      {formatCurrency(item.value)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Access */}
      <div>
        <h2 className="mb-4 text-xl font-semibold text-foreground">
          Truy cập nhanh
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <Link href="/reconciliation">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="rounded-lg bg-primary/10 p-3">
                    <GitCompare className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Đối soát vận chuyển</h3>
                    <p className="text-sm text-muted-foreground">
                      Quản lý và duyệt đối soát
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/reports">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="rounded-lg bg-primary/10 p-3">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Báo cáo</h3>
                    <p className="text-sm text-muted-foreground">
                      Xem báo cáo chi tiết
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* Last Updated */}
      {data && (
        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground">
            Cập nhật lần cuối: {new Date(data.lastUpdated).toLocaleString('vi-VN')}
          </p>
        </div>
      )}
    </DashboardLayout>
  )
}
