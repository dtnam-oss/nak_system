"use client"

import * as React from "react"
import { addDays, subDays, format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns"
import { vi } from "date-fns/locale"
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react"
import { DateRange } from "react-day-picker"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface DateRangeNavigatorProps {
  dateRange: DateRange | undefined
  onDateRangeChange: (range: DateRange | undefined) => void
}

export function DateRangeNavigator({ dateRange, onDateRangeChange }: DateRangeNavigatorProps) {
  // Helper functions for navigation
  const handlePrevDay = () => {
    if (dateRange?.from && dateRange?.to) {
      const daysDiff = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24))
      onDateRangeChange({
        from: subDays(dateRange.from, daysDiff + 1),
        to: subDays(dateRange.to, daysDiff + 1),
      })
    }
  }

  const handleNextDay = () => {
    if (dateRange?.from && dateRange?.to) {
      const daysDiff = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24))
      onDateRangeChange({
        from: addDays(dateRange.from, daysDiff + 1),
        to: addDays(dateRange.to, daysDiff + 1),
      })
    }
  }

  const handleToday = () => {
    const today = new Date()
    onDateRangeChange({
      from: today,
      to: today,
    })
  }

  const handleThisWeek = () => {
    const today = new Date()
    onDateRangeChange({
      from: startOfWeek(today, { weekStartsOn: 1 }), // Monday
      to: endOfWeek(today, { weekStartsOn: 1 }),
    })
  }

  const handleThisMonth = () => {
    const today = new Date()
    onDateRangeChange({
      from: startOfMonth(today),
      to: endOfMonth(today),
    })
  }

  const formatDateRange = (range: DateRange | undefined) => {
    if (!range?.from) {
      return "Chọn khoảng ngày..."
    }

    if (!range.to) {
      return format(range.from, "d/MM/yyyy", { locale: vi })
    }

    if (range.from.toDateString() === range.to.toDateString()) {
      return format(range.from, "EEEE, d/MM/yyyy", { locale: vi })
    }

    return `${format(range.from, "d/MM", { locale: vi })} - ${format(range.to, "d/MM/yyyy", { locale: vi })}`
  }

  return (
    <div className="inline-flex items-center gap-2">
      {/* Main Date Range Selector */}
      <div className="inline-flex items-center rounded-md border border-input bg-background shadow-sm">
        {/* Prev Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handlePrevDay}
          disabled={!dateRange?.from || !dateRange?.to}
          className="h-9 w-9 rounded-none rounded-l-md border-r p-0 hover:bg-accent disabled:opacity-30"
          title="Khoảng trước"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Date Range Display with Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "h-9 min-w-[240px] justify-start rounded-none border-r px-3 font-medium hover:bg-accent",
                !dateRange?.from && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {formatDateRange(dateRange)}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 max-w-[520px]" align="center">
            <div className="flex flex-col sm:flex-row">
              {/* Quick Presets - Horizontal on mobile, Sidebar on desktop */}
              <div className="border-b sm:border-b-0 sm:border-r border-border p-3">
                <div className="text-xs font-semibold text-muted-foreground mb-2 px-2">
                  Chọn nhanh
                </div>
                <div className="flex flex-row sm:flex-col gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleToday}
                    className="flex-1 sm:w-full justify-start h-8 px-2 text-sm whitespace-nowrap"
                  >
                    Hôm nay
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleThisWeek}
                    className="flex-1 sm:w-full justify-start h-8 px-2 text-sm whitespace-nowrap"
                  >
                    Tuần này
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleThisMonth}
                    className="flex-1 sm:w-full justify-start h-8 px-2 text-sm whitespace-nowrap"
                  >
                    Tháng này
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDateRangeChange(undefined)}
                    className="flex-1 sm:w-full justify-start h-8 px-2 text-sm text-destructive whitespace-nowrap"
                  >
                    Xóa
                  </Button>
                </div>
              </div>

              {/* Calendar - Single month for compact size */}
              <div className="p-3">
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={onDateRangeChange}
                  numberOfMonths={1}
                  locale={vi}
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Next Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleNextDay}
          disabled={!dateRange?.from || !dateRange?.to}
          className="h-9 w-9 rounded-none rounded-r-md p-0 hover:bg-accent disabled:opacity-30"
          title="Khoảng sau"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
