"use client"

import * as React from "react"
import { format } from "date-fns"
import { vi } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { SimpleCalendar } from "@/components/ui/simple-calendar"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DateRangePickerInputProps {
  dateRange: DateRange | undefined
  onDateRangeChange: (range: DateRange | undefined) => void
  className?: string
}

export function DateRangePickerInput({
  dateRange,
  onDateRangeChange,
  className
}: DateRangePickerInputProps) {
  const [isFromOpen, setIsFromOpen] = React.useState(false)
  const [isToOpen, setIsToOpen] = React.useState(false)

  const formatDateValue = (date: Date | undefined) => {
    if (!date) return ""
    return format(date, "dd/MM/yyyy", { locale: vi })
  }

  const handleFromDateSelect = (date: Date) => {
    onDateRangeChange({
      from: date,
      to: dateRange?.to,
    })
    setIsFromOpen(false)
  }

  const handleToDateSelect = (date: Date) => {
    onDateRangeChange({
      from: dateRange?.from,
      to: date,
    })
    setIsToOpen(false)
  }

  return (
    <div className={cn("grid grid-cols-2 gap-2", className)}>
      {/* Start Date Input */}
      <Popover open={isFromOpen} onOpenChange={setIsFromOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Input
              value={formatDateValue(dateRange?.from)}
              placeholder="dd/mm/yyyy"
              readOnly
              className="h-8 pl-9 pr-3 text-xs cursor-pointer hover:bg-accent/50 transition-colors"
            />
            <CalendarIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <div className="absolute -bottom-5 left-0 text-[0.7rem] text-muted-foreground">
              Từ ngày
            </div>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <SimpleCalendar
            mode="single"
            selected={dateRange?.from}
            onSelect={handleFromDateSelect}
            locale={vi}
          />
        </PopoverContent>
      </Popover>

      {/* End Date Input */}
      <Popover open={isToOpen} onOpenChange={setIsToOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Input
              value={formatDateValue(dateRange?.to)}
              placeholder="dd/mm/yyyy"
              readOnly
              className="h-8 pl-9 pr-3 text-xs cursor-pointer hover:bg-accent/50 transition-colors"
            />
            <CalendarIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <div className="absolute -bottom-5 left-0 text-[0.7rem] text-muted-foreground">
              Đến ngày
            </div>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <SimpleCalendar
            mode="single"
            selected={dateRange?.to}
            onSelect={handleToDateSelect}
            locale={vi}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
