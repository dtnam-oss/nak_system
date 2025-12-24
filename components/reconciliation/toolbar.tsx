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
    loaiChuyen: filters.loaiChuyen,
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
    pendingFilters.loaiChuyen !== filters.loaiChuyen

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
        {/* Single Row Compact Toolbar with Horizontal Scroll */}
        <div className="w-full overflow-x-auto">
          <div className="flex flex-row items-center gap-2 w-full flex-nowrap min-w-max">
            {/* Live Search with Debounce - Priority Flex Grow */}
            <div className="relative flex-1 min-w-[200px]">
              {isSearching ? (
                <Loader2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground animate-spin" />
              ) : (
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              )}
              <Input
                placeholder="Tìm kiếm mã đơn, biển số..."
                className="pl-9 h-9 text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Date Range - Fixed Width */}
            <div className="flex items-center gap-1 shrink-0">
              <Input
                type="date"
                className="w-[130px] h-9 text-sm"
                value={pendingFilters.fromDate || ""}
                onChange={(e) => updatePendingFilter("fromDate", e.target.value)}
                placeholder="Từ ngày"
              />
              <span className="text-muted-foreground text-xs">-</span>
              <Input
                type="date"
                className="w-[130px] h-9 text-sm"
                value={pendingFilters.toDate || ""}
                onChange={(e) => updatePendingFilter("toDate", e.target.value)}
                placeholder="Đến ngày"
              />
            </div>

            {/* Transport Unit Filter - Fixed Width */}
            <Select
              value={pendingFilters.donViVanChuyen || "all"}
              onValueChange={(value: string) =>
                updatePendingFilter("donViVanChuyen", value === "all" ? "" : value)
              }
            >
              <SelectTrigger className="w-[140px] h-9 text-sm shrink-0">
                <SelectValue placeholder="Đơn vị" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả đơn vị</SelectItem>
                <SelectItem value="NAK">NAK</SelectItem>
                <SelectItem value="VENDOR">VENDOR</SelectItem>
              </SelectContent>
            </Select>

            {/* Customer Filter - Wider for Names */}
            <Input
              placeholder="Khách hàng"
              className="w-[160px] h-9 text-sm shrink-0"
              value={pendingFilters.khachHang || ""}
              onChange={(e) => updatePendingFilter("khachHang", e.target.value)}
            />

            {/* Trip Type Select - Compact */}
            <Select
              value={pendingFilters.loaiChuyen || "all"}
              onValueChange={(value: string) =>
                updatePendingFilter("loaiChuyen", value === "all" ? "" : value)
              }
            >
              <SelectTrigger className="w-[130px] h-9 text-sm shrink-0">
                <SelectValue placeholder="Loại chuyến" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả loại</SelectItem>
                <SelectItem value="Theo tuyến">Theo tuyến</SelectItem>
                <SelectItem value="Theo ca">Theo ca</SelectItem>
              </SelectContent>
            </Select>

            {/* Apply Button */}
            {hasPendingChanges && (
              <Button
                variant="default"
                size="sm"
                onClick={handleApplyFilters}
                className="h-9 px-3 whitespace-nowrap shrink-0"
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
                className="h-9 px-2 whitespace-nowrap shrink-0"
              >
                <X className="h-4 w-4 mr-1" />
                <span className="hidden md:inline">Xóa tất cả</span>
                <span className="md:hidden">Xóa</span>
              </Button>
            )}

            {/* Export Button - Auto Width */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleExport}
                  className="h-9 w-auto whitespace-nowrap shrink-0"
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
