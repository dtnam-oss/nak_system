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
    <div className="inline-flex items-center gap-2">
      {/* Button Group: Prev + Date + Next */}
      <div className="inline-flex items-center rounded-md border border-input bg-background shadow-sm">
        {/* Prev Button - Icon Only */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handlePrev}
          className="h-9 w-9 rounded-none rounded-l-md border-r p-0 hover:bg-accent"
          title="Hôm trước"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Date Display Button with Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              className="h-9 min-w-[200px] rounded-none border-r px-3 font-medium hover:bg-accent"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(date, "EEEE, d/MM/yyyy", { locale: vi })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 min-w-[280px]" align="center">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(d) => d && onDateChange(d)}
              locale={vi}
            />
          </PopoverContent>
        </Popover>

        {/* Next Button - Icon Only */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleNext}
          className="h-9 w-9 rounded-none rounded-r-md p-0 hover:bg-accent"
          title="Hôm sau"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Today Button - Separate */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleToday}
        className="h-9 px-3"
      >
        Hôm nay
      </Button>
    </div>
  )
}
