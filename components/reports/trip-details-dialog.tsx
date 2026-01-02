"use client"

import { format } from "date-fns"
import { vi } from "date-fns/locale"
import { AlertTriangle, X, MapPin, Package, DollarSign } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { cn } from "@/lib/utils"
import { ValidationError, groupErrorsByDetail } from "@/lib/validation"

interface TripDetailsDialogProps {
  trip: any
  open: boolean
  onOpenChange: (open: boolean) => void
  errors?: ValidationError[]
}

export function TripDetailsDialog({ trip, open, onOpenChange, errors = [] }: TripDetailsDialogProps) {
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Chi tiết chuyến: {trip.order_id}</span>
            {hasErrors && (
              <Badge variant="destructive" className="ml-2">
                {errors.length} lỗi
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Ngày: {format(new Date(trip.date), 'dd/MM/yyyy', { locale: vi })} • 
            Khách hàng: {trip.customer} • 
            Loại: {trip.trip_type}
          </DialogDescription>
        </DialogHeader>

        {/* Error Alert */}
        {hasErrors && (
          <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
            <div className="flex gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-destructive mb-2">
                  Phát hiện {errors.length} lỗi thông tin bắt buộc
                </h4>
                <ul className="text-sm space-y-1 text-destructive/80">
                  {Object.entries(errorsByDetail).map(([index, errs]) => (
                    <li key={index}>
                      • Dòng {parseInt(index) + 1}: {errs.map(e => e.message).join(', ')}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Trip Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
          <div>
            <p className="text-xs text-muted-foreground">Tuyến đường</p>
            <p className="font-medium text-sm">{trip.route_name || 'N/A'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Tài xế</p>
            <p className="font-medium text-sm">{trip.driver_name || 'N/A'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Trạng thái</p>
            <Badge variant={trip.status === 'approved' ? 'default' : 'secondary'} className="text-xs">
              {trip.status === 'approved' ? 'Đã duyệt' : 'Chờ duyệt'}
            </Badge>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Doanh thu</p>
            <p className="font-semibold text-sm text-green-600">
              {formatCurrency(Number(trip.revenue) || Number(trip.cost) || 0)}
            </p>
          </div>
        </div>

        {/* Details Table */}
        <div className="border rounded-lg">
          <div className="p-4 border-b bg-muted/30">
            <h3 className="font-semibold flex items-center gap-2">
              <Package className="h-4 w-4" />
              Chi tiết lộ trình ({details.length} điểm)
            </h3>
          </div>
          
          {details.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Không có chi tiết lộ trình
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">#</TableHead>
                    <TableHead>Lộ trình</TableHead>
                    <TableHead>Chi tiết</TableHead>
                    <TableHead>Biển số</TableHead>
                    <TableHead className="text-right">Tải trọng (kg)</TableHead>
                    <TableHead className="text-right">Thành tiền</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {details.map((detail: any, index: number) => {
                    const rowHasError = errorsByDetail[index]?.length > 0
                    
                    return (
                      <TableRow 
                        key={index}
                        className={cn(
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
                          "font-mono text-sm",
                          hasFieldError(index, 'bienKiemSoat') && "bg-destructive/20 font-semibold text-destructive"
                        )}>
                          {detail.bienKiemSoat || (
                            <span className="text-destructive text-xs">⚠️ Thiếu</span>
                          )}
                        </TableCell>
                        <TableCell className={cn(
                          "text-right",
                          hasFieldError(index, 'taiTrongTinhPhi') && "bg-destructive/20 font-semibold text-destructive"
                        )}>
                          {detail.taiTrongTinhPhi ? (
                            `${Number(detail.taiTrongTinhPhi).toLocaleString('vi-VN')} kg`
                          ) : (
                            <span className="text-destructive text-xs">⚠️ Thiếu</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
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
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
          {hasErrors && (
            <Button variant="destructive">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Báo cáo lỗi
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
