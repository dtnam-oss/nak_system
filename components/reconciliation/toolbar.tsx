"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ReconciliationFilters } from "@/types/reconciliation"
import { Search, X, Download, Loader2, Filter } from "lucide-react"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { DateRange } from "react-day-picker"
import { format } from "date-fns"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useDebounce } from "@/hooks/use-debounce"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"

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

  // Date range state
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    if (filters.fromDate && filters.toDate) {
      return {
        from: new Date(filters.fromDate),
        to: new Date(filters.toDate),
      }
    }
    return undefined
  })

  // Separate state for search query (live with debounce) - SEARCH ONLY order_id
  const [searchQuery, setSearchQuery] = useState(filters.searchQuery || "")
  const [isSearching, setIsSearching] = useState(false)

  // Customer list state
  const [customers, setCustomers] = useState<string[]>([])
  const [customersLoading, setCustomersLoading] = useState(false)
  const [customerOpen, setCustomerOpen] = useState(false)

  // Debounce search query (500ms delay)
  const debouncedSearchQuery = useDebounce(searchQuery, 500)

  // Fetch unique customers on mount
  useEffect(() => {
    const fetchCustomers = async () => {
      setCustomersLoading(true)
      try {
        const response = await fetch('/api/customers')
        const data = await response.json()
        if (data.success) {
          setCustomers(data.data)
        }
      } catch (error) {
        console.error('Failed to fetch customers:', error)
      } finally {
        setCustomersLoading(false)
      }
    }
    fetchCustomers()
  }, [])

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

  // Sync date range with pending filters
  useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
      setPendingFilters((prev) => ({
        ...prev,
        fromDate: format(dateRange.from!, 'yyyy-MM-dd'),
        toDate: format(dateRange.to!, 'yyyy-MM-dd'),
      }))
    } else {
      setPendingFilters((prev) => ({
        ...prev,
        fromDate: undefined,
        toDate: undefined,
      }))
    }
  }, [dateRange])

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
    setDateRange(undefined)
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
            {/* Live Search - ONLY order_id */}
            <div className="relative flex-1 min-w-[200px]">
              {isSearching ? (
                <Loader2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground animate-spin" />
              ) : (
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              )}
              <Input
                placeholder="Tìm kiếm mã chuyến..."
                className="pl-9 h-9 text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Date Range Picker with Presets */}
            <DateRangePicker
              value={dateRange}
              onChange={setDateRange}
              placeholder="Chọn khoảng ngày"
              className="shrink-0"
            />

            {/* Customer Filter - Combobox with Search */}
            <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={customerOpen}
                  className="w-[200px] h-9 justify-between text-sm shrink-0"
                >
                  {pendingFilters.khachHang
                    ? customers.find((c) => c === pendingFilters.khachHang)
                    : "Khách hàng"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0">
                <Command>
                  <CommandInput placeholder="Tìm khách hàng..." />
                  <CommandEmpty>
                    {customersLoading ? "Đang tải..." : "Không tìm thấy"}
                  </CommandEmpty>
                  <CommandGroup className="max-h-[300px] overflow-auto">
                    <CommandItem
                      value=""
                      onSelect={() => {
                        updatePendingFilter("khachHang", "")
                        setCustomerOpen(false)
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          !pendingFilters.khachHang ? "opacity-100" : "opacity-0"
                        )}
                      />
                      Tất cả khách hàng
                    </CommandItem>
                    {customers.map((customer) => (
                      <CommandItem
                        key={customer}
                        value={customer}
                        onSelect={(currentValue: string) => {
                          updatePendingFilter("khachHang", currentValue)
                          setCustomerOpen(false)
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            pendingFilters.khachHang === customer
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        {customer}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>

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
