"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ReconciliationFilters } from "@/types/reconciliation"
import { Search, X, Download, Calendar } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface ReconciliationToolbarProps {
  filters: ReconciliationFilters
  onFiltersChange: (filters: ReconciliationFilters) => void
  totalRecords?: number
}

export function ReconciliationToolbar({
  filters,
  onFiltersChange,
  totalRecords = 0,
}: ReconciliationToolbarProps) {
  const hasActiveFilters = Object.values(filters).some((value) => value)

  const handleReset = () => {
    onFiltersChange({})
  }

  const updateFilter = (key: keyof ReconciliationFilters, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value || undefined,
    })
  }

  const handleExport = () => {
    // TODO: Implement Excel export logic
    console.log("Export to Excel")
  }

  return (
    <div className="mb-4 space-y-3">
      {/* Main Toolbar Row */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Left Side: Search & Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm mã đơn, biển số..."
              className="pl-9 w-[280px]"
              value={filters.searchQuery || ""}
              onChange={(e) => updateFilter("searchQuery", e.target.value)}
            />
          </div>

          {/* Date Range */}
          <div className="flex items-center gap-1">
            <Input
              type="date"
              className="w-[140px] text-xs"
              value={filters.fromDate || ""}
              onChange={(e) => updateFilter("fromDate", e.target.value)}
              placeholder="Từ ngày"
            />
            <span className="text-muted-foreground text-xs">-</span>
            <Input
              type="date"
              className="w-[140px] text-xs"
              value={filters.toDate || ""}
              onChange={(e) => updateFilter("toDate", e.target.value)}
              placeholder="Đến ngày"
            />
          </div>

          {/* Transport Unit Filter */}
          <Select
            value={filters.donViVanChuyen || "all"}
            onValueChange={(value) =>
              updateFilter("donViVanChuyen", value === "all" ? "" : value)
            }
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Đơn vị" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả đơn vị</SelectItem>
              <SelectItem value="NAK">NAK</SelectItem>
              <SelectItem value="VENDOR">VENDOR</SelectItem>
            </SelectContent>
          </Select>

          {/* Customer Filter */}
          <Input
            placeholder="Khách hàng"
            className="w-[140px]"
            value={filters.khachHang || ""}
            onChange={(e) => updateFilter("khachHang", e.target.value)}
          />

          {/* Status Filter */}
          <Input
            placeholder="Trạng thái"
            className="w-[120px]"
            value={filters.trangThai || ""}
            onChange={(e) => updateFilter("trangThai", e.target.value)}
          />

          {/* Reset Button */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="h-9 px-2"
            >
              <X className="h-4 w-4 mr-1" />
              Xóa lọc
            </Button>
          )}
        </div>

        {/* Right Side: Actions */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {totalRecords} chuyến đi
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="h-9"
          >
            <Download className="h-4 w-4 mr-2" />
            Xuất Excel
          </Button>
        </div>
      </div>
    </div>
  )
}
