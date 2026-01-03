"use client"

import * as React from "react"
import { addDays, subDays, format } from "date-fns"
import { vi } from "date-fns/locale"
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DateNavigatorProps {
  date: Date
  onDateChange: (date: Date) => void
}

export function DateNavigator({ date, onDateChange }: DateNavigatorProps) {
  // Helper functions
  const handlePrev = () => onDateChange(subDays(date, 1))
  const handleNext = () => onDateChange(addDays(date, 1))
  const handleToday = () => onDateChange(new Date())

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handlePrev}
        className="h-9 px-3"
      >
        <ChevronLeft className="mr-1 h-4 w-4" />
        Hôm trước
      </Button>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="h-10 min-w-[220px] justify-start text-left font-medium"
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {format(date, "EEEE, d 'tháng' MM yyyy", { locale: vi })}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="center">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(d) => d && onDateChange(d)}
            initialFocus
            locale={vi}
          />
        </PopoverContent>
      </Popover>

      <Button
        variant="outline"
        size="sm"
        onClick={handleNext}
        className="h-9 px-3"
      >
        Hôm sau
        <ChevronRight className="ml-1 h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={handleToday}
        className="h-9 px-3 hover:bg-accent"
      >
        Hôm nay
      </Button>
    </div>
  )
}
