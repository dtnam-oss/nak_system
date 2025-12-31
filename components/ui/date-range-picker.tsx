"use client"

import * as React from "react"
import { addDays, format, startOfMonth, endOfMonth, startOfDay, endOfDay, subDays, subMonths } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DateRangePickerProps {
  value?: DateRange
  onChange?: (range: DateRange | undefined) => void
  placeholder?: string
  className?: string
}

const datePresets = [
  {
    label: "Hôm nay",
    getValue: () => ({
      from: startOfDay(new Date()),
      to: endOfDay(new Date()),
    }),
  },
  {
    label: "Hôm qua",
    getValue: () => ({
      from: startOfDay(subDays(new Date(), 1)),
      to: endOfDay(subDays(new Date(), 1)),
    }),
  },
  {
    label: "7 ngày trước",
    getValue: () => ({
      from: startOfDay(subDays(new Date(), 6)),
      to: endOfDay(new Date()),
    }),
  },
  {
    label: "30 ngày trước",
    getValue: () => ({
      from: startOfDay(subDays(new Date(), 29)),
      to: endOfDay(new Date()),
    }),
  },
  {
    label: "Tháng này",
    getValue: () => ({
      from: startOfDay(startOfMonth(new Date())),
      to: endOfDay(endOfMonth(new Date())),
    }),
  },
  {
    label: "Tháng trước",
    getValue: () => {
      const lastMonth = subMonths(new Date(), 1)
      return {
        from: startOfDay(startOfMonth(lastMonth)),
        to: endOfDay(endOfMonth(lastMonth)),
      }
    },
  },
]

export function DateRangePicker({
  value,
  onChange,
  placeholder = "Chọn khoảng ngày",
  className,
}: DateRangePickerProps) {
  const [date, setDate] = React.useState<DateRange | undefined>(value)
  const [isOpen, setIsOpen] = React.useState(false)

  React.useEffect(() => {
    setDate(value)
  }, [value])

  const handleSelect = (range: DateRange | undefined) => {
    setDate(range)
    onChange?.(range)
  }

  const handlePresetClick = (preset: typeof datePresets[0]) => {
    const range = preset.getValue()
    handleSelect(range)
  }

  const formatDateRange = (range: DateRange | undefined) => {
    if (!range?.from) {
      return placeholder
    }

    if (!range.to) {
      return format(range.from, "dd/MM/yyyy")
    }

    return `${format(range.from, "dd/MM/yyyy")} - ${format(
      range.to,
      "dd/MM/yyyy"
    )}`
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-[280px] justify-start text-left font-normal h-9 shrink-0",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formatDateRange(date)}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex">
            {/* Presets Sidebar */}
            <div className="flex flex-col gap-1 border-r p-3 bg-muted/50 min-w-[140px]">
              <div className="text-sm font-semibold mb-2 text-foreground">
                Lựa chọn nhanh
              </div>
              {datePresets.map((preset) => (
                <Button
                  key={preset.label}
                  variant="ghost"
                  size="sm"
                  className="justify-start h-8 px-2 text-xs font-normal"
                  onClick={() => handlePresetClick(preset)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>

            {/* Single Calendar */}
            <div className="p-3">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={handleSelect}
                numberOfMonths={1}
                showOutsideDays={false}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
