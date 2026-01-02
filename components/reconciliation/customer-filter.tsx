"use client"

import * as React from "react"
import { Check, PlusCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"

interface CustomerFilterProps {
  options: { label: string; value: string }[]
  value: string | undefined // Giá trị từ URL filters (VD: "J&T,GHN")
  onChange: (val: string | undefined) => void
  isLoading?: boolean
}

export function CustomerFilter({ options, value, onChange, isLoading = false }: CustomerFilterProps) {
  // Convert string "A,B" thành Set {"A", "B"}
  const selectedValues = new Set(value ? value.split(",").map(v => v.trim()).filter(Boolean) : [])

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 border-dashed">
          <PlusCircle className="mr-2 h-4 w-4" />
          Khách hàng
          {selectedValues.size > 0 && (
            <>
              <Separator orientation="vertical" className="mx-2 h-4" />
              <Badge variant="secondary" className="rounded-sm px-1 font-normal lg:hidden">
                {selectedValues.size}
              </Badge>
              <div className="hidden space-x-1 lg:flex">
                {selectedValues.size > 2 ? (
                  <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                    {selectedValues.size} đã chọn
                  </Badge>
                ) : (
                  options
                    .filter((option) => selectedValues.has(option.value))
                    .map((option) => (
                      <Badge 
                        variant="secondary" 
                        key={option.value} 
                        className="rounded-sm px-1 font-normal"
                      >
                        {option.label}
                      </Badge>
                    ))
                )}
              </div>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Tìm khách hàng..." />
          <CommandList>
            <CommandEmpty>
              {isLoading ? "Đang tải..." : "Không tìm thấy"}
            </CommandEmpty>
            <CommandGroup className="max-h-[300px] overflow-auto">
              {options.map((option) => {
                const isSelected = selectedValues.has(option.value)
                return (
                  <CommandItem
                    key={option.value}
                    onSelect={() => {
                      // Toggle logic: thêm/xóa khỏi Set
                      if (isSelected) {
                        selectedValues.delete(option.value)
                      } else {
                        selectedValues.add(option.value)
                      }
                      
                      // Convert Set → string và trigger onChange
                      const filterValues = Array.from(selectedValues)
                      onChange(filterValues.length ? filterValues.join(",") : undefined)
                    }}
                    className="cursor-pointer"
                  >
                    <div
                      className={cn(
                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "opacity-50 [&_svg]:invisible"
                      )}
                    >
                      <Check className="h-4 w-4" />
                    </div>
                    <span>{option.label}</span>
                  </CommandItem>
                )
              })}
            </CommandGroup>
            {selectedValues.size > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={() => onChange(undefined)}
                    className="justify-center text-center cursor-pointer"
                  >
                    Xóa bộ lọc
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
