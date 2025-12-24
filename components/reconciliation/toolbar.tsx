"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ReconciliationFilters } from "@/types/reconciliation"
import { Search, X, Download, Loader2, Filter } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useDebounce } from "@/hooks/use-debounce"

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
  // Local state for pending filters (not yet applied)
  const [pendingFilters, setPendingFilters] = useState<ReconciliationFilters>({
    fromDate: filters.fromDate,
    toDate: filters.toDate,
    khachHang: filters.khachHang,
    donViVanChuyen: filters.donViVanChuyen,
    loaiTuyen: filters.loaiTuyen,
    trangThai: filters.trangThai,
  })

  // Separate state for search query (live with debounce)
  const [searchQuery, setSearchQuery] = useState(filters.searchQuery || "")
  const [isSearching, setIsSearching] = useState(false)

  // Debounce search query (500ms delay)
  const debouncedSearchQuery = useDebounce(searchQuery, 500)

  // Check if there are pending changes (filters not yet applied)
  const hasPendingChanges =
    pendingFilters.fromDate !== filters.fromDate ||
    pendingFilters.toDate !== filters.toDate ||
    pendingFilters.khachHang !== filters.khachHang ||
    pendingFilters.donViVanChuyen !== filters.donViVanChuyen ||
    pendingFilters.loaiTuyen !== filters.loaiTuyen ||
    pendingFilters.trangThai !== filters.trangThai

  // Apply debounced search query automatically (live search)
  useEffect(() => {
    setIsSearching(false)
    onFiltersChange({
      ...filters,
      searchQuery: debouncedSearchQuery || undefined,
    })
  }, [debouncedSearchQuery])

  // Show searching indicator when typing
  useEffect(() => {
    if (searchQuery !== debouncedSearchQuery) {
      setIsSearching(true)
    }
  }, [searchQuery])

  const hasActiveFilters = Object.values(filters).some((value) => value)

  const handleApplyFilters = () => {
    onFiltersChange({
      ...pendingFilters,
      searchQuery: debouncedSearchQuery || undefined,
    })
  }

  const handleResetAll = () => {
    setPendingFilters({})
    setSearchQuery("")
    onFiltersChange({})
  }

  const updatePendingFilter = (
    key: keyof ReconciliationFilters,
    value: string
  ) => {
    setPendingFilters((prev) => ({
      ...prev,
      [key]: value || undefined,
    }))
  }

  const handleExport = () => {
    // TODO: Implement Excel export logic
    console.log("Export to Excel")
  }

  return (
    <TooltipProvider>
      <div className="mb-4 space-y-3">
        {/* Single Unified Toolbar Row */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {/* Left Side: Search & Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Live Search with Debounce */}
            <div className="relative">
              {isSearching ? (
                <Loader2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground animate-spin" />
              ) : (
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              )}
              <Input
                placeholder="Tìm kiếm mã đơn, biển số..."
                className="pl-9 w-[280px]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Date Range (Manual Apply) */}
            <div className="flex items-center gap-1">
              <Input
                type="date"
                className="w-[140px] text-xs"
                value={pendingFilters.fromDate || ""}
                onChange={(e) => updatePendingFilter("fromDate", e.target.value)}
                placeholder="Từ ngày"
              />
              <span className="text-muted-foreground text-xs">-</span>
              <Input
                type="date"
                className="w-[140px] text-xs"
                value={pendingFilters.toDate || ""}
                onChange={(e) => updatePendingFilter("toDate", e.target.value)}
                placeholder="Đến ngày"
              />
            </div>

            {/* Transport Unit Filter (Manual Apply) */}
            <Select
              value={pendingFilters.donViVanChuyen || "all"}
              onValueChange={(value) =>
                updatePendingFilter("donViVanChuyen", value === "all" ? "" : value)
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

            {/* Customer Filter (Manual Apply) */}
            <Input
              placeholder="Khách hàng"
              className="w-[140px]"
              value={pendingFilters.khachHang || ""}
              onChange={(e) => updatePendingFilter("khachHang", e.target.value)}
            />

            {/* Status Filter (Manual Apply) */}
            <Input
              placeholder="Trạng thái"
              className="w-[120px]"
              value={pendingFilters.trangThai || ""}
              onChange={(e) => updatePendingFilter("trangThai", e.target.value)}
            />

            {/* Apply Button (Only for manual filters) */}
            {hasPendingChanges && (
              <Button
                variant="default"
                size="sm"
                onClick={handleApplyFilters}
                className="h-9 px-3"
              >
                <Filter className="h-4 w-4 mr-1" />
                Áp dụng
              </Button>
            )}

            {/* Reset All Button */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetAll}
                className="h-9 px-2"
              >
                <X className="h-4 w-4 mr-1" />
                <span className="hidden md:inline">Xóa tất cả</span>
                <span className="md:hidden">Xóa</span>
              </Button>
            )}
          </div>

          {/* Right Side: Export Button (Responsive) */}
          <div className="flex items-center gap-2">
            {/* Desktop: Icon + Text, Mobile/Tablet: Icon Only with Tooltip */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExport}
                  className="h-9"
                >
                  <Download className="h-4 w-4 lg:mr-2" />
                  <span className="hidden lg:inline">Xuất Excel</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="lg:hidden">
                <p>Xuất Excel</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Pending Changes Indicator */}
        {hasPendingChanges && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Filter className="h-3 w-3" />
            <span>Có thay đổi chưa áp dụng. Click "Áp dụng" để lọc dữ liệu.</span>
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}
