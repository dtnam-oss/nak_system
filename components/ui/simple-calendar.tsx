"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns"
import { vi } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface SimpleCalendarProps {
  selected?: Date
  onSelect?: (date: Date) => void
  mode?: "single"
  locale?: typeof vi
}

export function SimpleCalendar({
  selected,
  onSelect,
  mode = "single",
  locale = vi,
}: SimpleCalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(selected || new Date())

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1, locale })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1, locale })

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const weekDays = ["Th 2", "Th 3", "Th 4", "Th 5", "Th 6", "Th 7", "CN"]

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))

  const handleDayClick = (day: Date) => {
    if (onSelect) {
      onSelect(day)
    }
  }

  return (
    <div className="p-3">
      {/* Header */}
      <div className="flex items-center justify-center relative mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrevMonth}
          className="absolute left-1 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="text-sm font-medium">
          {format(currentMonth, "MMMM yyyy", { locale })}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleNextMonth}
          className="absolute right-1 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="w-full">
        {/* Weekday Headers - CSS Grid */}
        <div className="grid grid-cols-7 mb-1">
          {weekDays.map((day) => (
            <div
              key={day}
              className="h-8 flex items-center justify-center text-muted-foreground text-[0.65rem] font-normal"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Days Grid - CSS Grid */}
        <div className="grid grid-cols-7 gap-y-1">
          {days.map((day, index) => {
            const isCurrentMonth = isSameMonth(day, currentMonth)
            const isSelected = selected && isSameDay(day, selected)
            const isToday = isSameDay(day, new Date())

            return (
              <div key={index} className="h-8 flex items-center justify-center">
                <button
                  onClick={() => handleDayClick(day)}
                  disabled={!isCurrentMonth}
                  className={cn(
                    "h-8 w-8 rounded-md text-xs font-normal transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                    !isCurrentMonth && "text-muted-foreground opacity-50 cursor-not-allowed",
                    isSelected && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                    isToday && !isSelected && "bg-accent text-accent-foreground",
                    isCurrentMonth && !isSelected && !isToday && "text-foreground"
                  )}
                >
                  {format(day, "d")}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
