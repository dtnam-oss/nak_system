"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { ReconciliationFilters } from "@/types/reconciliation"
import { Filter, X } from "lucide-react"

interface FilterSidebarProps {
  filters: ReconciliationFilters
  onFiltersChange: (filters: ReconciliationFilters) => void
}

export function FilterSidebar({ filters, onFiltersChange }: FilterSidebarProps) {
  const handleReset = () => {
    onFiltersChange({})
  }

  const updateFilter = (key: keyof ReconciliationFilters, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value || undefined,
    })
  }

  return (
    <div className="w-72 space-y-4">
      <Card className="p-4 sticky top-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-foreground">Bộ lọc</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="h-8 text-xs"
          >
            <X className="h-3 w-3 mr-1" />
            Xóa
          </Button>
        </div>

        <div className="space-y-4">
          {/* Date Range */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Từ ngày
            </label>
            <Input
              type="date"
              value={filters.fromDate || ""}
              onChange={(e) => updateFilter("fromDate", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Đến ngày
            </label>
            <Input
              type="date"
              value={filters.toDate || ""}
              onChange={(e) => updateFilter("toDate", e.target.value)}
            />
          </div>

          {/* Customer */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Khách hàng
            </label>
            <Input
              placeholder="Nhập tên khách hàng"
              value={filters.khachHang || ""}
              onChange={(e) => updateFilter("khachHang", e.target.value)}
            />
          </div>

          {/* Route Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Loại tuyến
            </label>
            <Input
              placeholder="Nhập loại tuyến"
              value={filters.loaiTuyen || ""}
              onChange={(e) => updateFilter("loaiTuyen", e.target.value)}
            />
          </div>

          {/* Transport Unit */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Đơn vị vận chuyển
            </label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={filters.donViVanChuyen || ""}
              onChange={(e) => updateFilter("donViVanChuyen", e.target.value)}
            >
              <option value="">Tất cả</option>
              <option value="NAK">NAK</option>
              <option value="VENDOR">VENDOR</option>
            </select>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Trạng thái
            </label>
            <Input
              placeholder="Nhập trạng thái"
              value={filters.trangThai || ""}
              onChange={(e) => updateFilter("trangThai", e.target.value)}
            />
          </div>

          {/* Search Query */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Tìm kiếm
            </label>
            <Input
              placeholder="Tìm kiếm tổng quát..."
              value={filters.searchQuery || ""}
              onChange={(e) => updateFilter("searchQuery", e.target.value)}
            />
          </div>
        </div>
      </Card>
    </div>
  )
}
