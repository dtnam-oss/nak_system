"use client"

import { useState, useMemo } from "react"
import { format, parse } from "date-fns"
import { vi } from "date-fns/locale"
import { CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface ErrorItem {
  order_id: string
  date: string
  customer: string
  missing_fields: string[]
  detail_index: number
}

interface DataIntegrityTabProps {
  errors: ErrorItem[]
  loading?: boolean
}

export function DataIntegrityTab({ errors, loading }: DataIntegrityTabProps) {
  // Group errors by date
  const groupedErrors = useMemo(() => {
    const groups: Record<string, ErrorItem[]> = {}
    
    errors.forEach((item) => {
      // Format date as DD/MM/YYYY
      const dateKey = format(new Date(item.date), 'dd/MM/yyyy', { locale: vi })
      
      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(item)
    })
    
    return groups
  }, [errors])

  // Sort dates descending (newest first)
  const sortedDates = useMemo(() => {
    return Object.keys(groupedErrors).sort((a, b) => {
      const dateA = parse(a, 'dd/MM/yyyy', new Date())
      const dateB = parse(b, 'dd/MM/yyyy', new Date())
      return dateB.getTime() - dateA.getTime()
    })
  }, [groupedErrors])

  const [selectedDate, setSelectedDate] = useState<string>(sortedDates[0] || '')

  // If no errors
  if (!loading && errors.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle2 className="h-16 w-16 text-green-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Dữ liệu hoàn hảo!</h3>
            <p className="text-muted-foreground text-base">
              Tất cả các chuyến đều có đầy đủ thông tin bắt buộc.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Đang kiểm tra dữ liệu...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const currentErrors = groupedErrors[selectedDate] || []

  return (
    <div className="space-y-6">
      {/* Horizontal Date Tabs */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Chọn ngày để xem chi tiết</CardTitle>
          <CardDescription>
            Phát hiện {errors.length} chuyến thiếu thông tin trên {sortedDates.length} ngày
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex w-max space-x-3 pb-4">
              {sortedDates.map((date) => (
                <Button
                  key={date}
                  variant={selectedDate === date ? "default" : "outline"}
                  onClick={() => setSelectedDate(date)}
                  className="h-auto py-3 px-4 flex flex-col items-start gap-1 min-w-[140px]"
                  size="lg"
                >
                  <span className="text-sm font-semibold">{date}</span>
                  <Badge 
                    variant={selectedDate === date ? "secondary" : "outline"}
                    className={selectedDate === date ? "bg-white/20 hover:bg-white/30 text-current border-0" : ""}
                  >
                    {groupedErrors[date].length} lỗi
                  </Badge>
                </Button>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Error Table for Selected Date */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách lỗi ngày {selectedDate}</CardTitle>
          <CardDescription>
            {currentErrors.length} chuyến thiếu thông tin bắt buộc trong chi tiết lộ trình
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Mã chuyến</TableHead>
                  <TableHead className="w-[150px]">Khách hàng</TableHead>
                  <TableHead>Lỗi phát hiện</TableHead>
                  <TableHead className="w-[120px]">Vị trí</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentErrors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      Không có dữ liệu lỗi
                    </TableCell>
                  </TableRow>
                ) : (
                  currentErrors.map((error, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono text-sm">
                        {error.order_id}
                      </TableCell>
                      <TableCell className="font-medium">
                        {error.customer}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">
                          {error.missing_fields.map((field, idx) => (
                            <Badge 
                              key={idx} 
                              variant="destructive" 
                              className="text-xs font-normal"
                            >
                              Thiếu {field}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        {error.detail_index >= 0 ? (
                          <span className="text-xs text-muted-foreground">
                            Item #{error.detail_index + 1}
                          </span>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            Toàn bộ
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
