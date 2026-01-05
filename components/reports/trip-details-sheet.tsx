"use client"

import { format } from "date-fns"
import { vi } from "date-fns/locale"
import { AlertTriangle, MapPin, Package, DollarSign, X } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { cn } from "@/lib/utils"
import { ValidationError, groupErrorsByDetail } from "@/lib/validation"

interface TripDetailsSheetProps {
  trip: any
  open: boolean
  onOpenChange: (open: boolean) => void
  errors?: ValidationError[]
}

export function TripDetailsSheet({ trip, open, onOpenChange, errors = [] }: TripDetailsSheetProps) {
  const hasErrors = errors.length > 0
  const errorsByDetail = groupErrorsByDetail(errors)
  const details = trip.details?.chiTietLoTrinh || []

  // Helper to check if a field has error
  const hasFieldError = (detailIndex: number, fieldKey: string): boolean => {
    const detailErrors = errorsByDetail[detailIndex] || []
    return detailErrors.some(e => e.field === fieldKey)
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[540px] lg:w-[720px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <span>Chi tiết chuyến: {trip.order_id}</span>
            {hasErrors && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                {errors.length} lỗi
              </Badge>
            )}
          </SheetTitle>
          <SheetDescription>
            Ngày: {format(new Date(trip.date), 'dd/MM/yyyy', { locale: vi })} •
            Khách hàng: {trip.customer} •
            Loại: {trip.trip_type}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Error Alert */}
          {hasErrors && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Phát hiện {errors.length} lỗi thông tin bắt buộc</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-4 mt-2 space-y-1 text-sm">
                  {Object.entries(errorsByDetail).map(([index, errs]) => (
                    <li key={index}>
                      Dòng {parseInt(index) + 1}: {errs.map(e => e.message).join(', ')}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Trip Summary */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="text-xs text-muted-foreground">Tuyến đường</p>
              <p className="font-medium text-sm mt-1">{trip.route_name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tài xế</p>
              <p className="font-medium text-sm mt-1">{trip.driver_name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Trạng thái</p>
              <Badge variant={trip.status === 'approved' ? 'default' : 'secondary'} className="text-xs mt-1">
                {trip.status === 'approved' ? 'Đã duyệt' : 'Chờ duyệt'}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Doanh thu</p>
              <p className="font-semibold text-sm text-green-600 mt-1">
                {formatCurrency(Number(trip.revenue) || Number(trip.cost) || 0)}
              </p>
            </div>
            {trip.note && (
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">Ghi chú</p>
                <p className="font-medium text-sm mt-1 text-slate-700">{trip.note}</p>
              </div>
            )}
          </div>

          {/* Details Table */}
          <div className="border rounded-lg">
            <div className="p-4 border-b bg-muted/30">
              <h3 className="font-semibold flex items-center gap-2 text-sm">
                <Package className="h-4 w-4" />
                Chi tiết lộ trình ({details.length} điểm)
              </h3>
            </div>

            {details.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                Không có chi tiết lộ trình
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px] text-xs">#</TableHead>
                      <TableHead className="text-xs">Lộ trình</TableHead>
                      <TableHead className="text-xs">Chi tiết</TableHead>
                      <TableHead className="text-xs">Biển số</TableHead>
                      <TableHead className="text-xs">Ngày tem</TableHead>
                      <TableHead className="text-right text-xs">Tải trọng</TableHead>
                      <TableHead className="text-right text-xs">Thành tiền</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {details.map((detail: any, index: number) => {
                      const rowHasError = errorsByDetail[index]?.length > 0

                      return (
                        <TableRow
                          key={index}
                          className={cn(
                            "text-sm",
                            rowHasError && "bg-destructive/5 hover:bg-destructive/10"
                          )}
                        >
                          <TableCell className="font-medium">
                            {index + 1}
                            {rowHasError && (
                              <AlertTriangle className="h-3 w-3 text-destructive inline ml-1" />
                            )}
                          </TableCell>
                          <TableCell className={cn(
                            hasFieldError(index, 'loTrinh') && "bg-destructive/20 font-semibold text-destructive"
                          )}>
                            {detail.loTrinh || (
                              <span className="text-destructive text-xs">⚠️ Thiếu</span>
                            )}
                          </TableCell>
                          <TableCell className={cn(
                            hasFieldError(index, 'loTrinhChiTiet') && "bg-destructive/20 font-semibold text-destructive"
                          )}>
                            {detail.loTrinhChiTiet || (
                              <span className="text-destructive text-xs">⚠️ Thiếu</span>
                            )}
                          </TableCell>
                          <TableCell className={cn(
                            "font-mono text-xs",
                            hasFieldError(index, 'bienKiemSoat') && "bg-destructive/20 font-semibold text-destructive"
                          )}>
                            {detail.bienKiemSoat || (
                              <span className="text-destructive text-xs">⚠️ Thiếu</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {detail.ngayTrenTem || '-'}
                          </TableCell>
                          <TableCell className={cn(
                            "text-right",
                            hasFieldError(index, 'taiTrongTinhPhi') && "bg-destructive/20 font-semibold text-destructive"
                          )}>
                            {detail.taiTrongTinhPhi ? (
                              <span className="text-xs">{Number(detail.taiTrongTinhPhi).toLocaleString('vi-VN')} kg</span>
                            ) : (
                              <span className="text-destructive text-xs">⚠️ Thiếu</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium text-xs">
                            {detail.thanhTien ? formatCurrency(Number(detail.thanhTien)) : '-'}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          {hasErrors && (
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="destructive" size="sm">
                <AlertTriangle className="w-3.5 h-3.5 mr-2" />
                Báo cáo lỗi
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
