"use client"

import * as React from "react"
import { Check, ChevronDown, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

interface MultiSelectProps {
  options: { label: string; value: string }[]
  selected: string[]
  onChange: (values: string[]) => void
  placeholder?: string
  className?: string
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Chọn...",
  className,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)

  const handleSelect = (value: string) => {
    const newSelected = selected.includes(value)
      ? selected.filter((item) => item !== value)
      : [...selected, value]
    onChange(newSelected)
  }

  const handleClear = () => {
    onChange([])
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "h-9 justify-between text-sm font-normal",
            !selected.length && "text-muted-foreground",
            className
          )}
        >
          <div className="flex gap-1 flex-wrap flex-1 items-center">
            {selected.length === 0 && placeholder}
            {selected.length > 0 && selected.length <= 2 && (
              selected.map((value) => {
                const option = options.find((opt) => opt.value === value)
                return (
                  <Badge
                    key={value}
                    variant="secondary"
                    className="mr-1 rounded-sm px-1 font-normal"
                  >
                    {option?.label}
                  </Badge>
                )
              })
            )}
            {selected.length > 2 && (
              <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                {selected.length} đã chọn
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {selected.length > 0 && (
              <X
                className="h-4 w-4 opacity-50 hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation()
                  handleClear()
                }}
              />
            )}
            <ChevronDown className="h-4 w-4 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <ScrollArea className="max-h-[300px]">
          <div className="p-1">
            {options.map((option) => {
              const isSelected = selected.includes(option.value)
              return (
                <div
                  key={option.value}
                  onClick={() => handleSelect(option.value)}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1.5 cursor-pointer rounded-sm hover:bg-accent",
                    "transition-colors"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-4 w-4 items-center justify-center rounded border",
                      isSelected
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-input"
                    )}
                  >
                    {isSelected && <Check className="h-3 w-3" />}
                  </div>
                  <span className="text-sm">{option.label}</span>
                </div>
              )
            })}
          </div>
        </ScrollArea>
        {selected.length > 0 && (
          <div className="border-t p-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="w-full h-8 text-xs"
            >
              Xóa tất cả
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
