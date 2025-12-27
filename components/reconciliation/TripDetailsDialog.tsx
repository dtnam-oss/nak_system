"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ReconciliationRecord } from "@/types/reconciliation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertCircle } from "lucide-react"

interface TripDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  record: ReconciliationRecord | null
}

export function TripDetailsDialog({
  open,
  onOpenChange,
  record,
}: TripDetailsDialogProps) {
  // 🔍 Debug - Log received props
  console.log('🔍 [TripDetailsDialog] Received record:', record)
  console.log('🔍 [TripDetailsDialog] Has chiTietLoTrinh:', !!record?.chiTietLoTrinh)
  console.log('🔍 [TripDetailsDialog] chiTietLoTrinh length:', record?.chiTietLoTrinh?.length || 0)
  console.log('🔍 [TripDetailsDialog] soXe:', record?.soXe)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("vi-VN").format(num)
  }

  // Early return if no record
  if (!record) return null

  // Access pre-parsed data directly from record
  // Backend already parses data_json and returns chiTietLoTrinh and soXe
  const chiTietLoTrinh = record.chiTietLoTrinh || []
  const soXe = record.soXe || ""

  console.log('✅ [TripDetailsDialog] Using chiTietLoTrinh:', chiTietLoTrinh.length, 'items')
  console.log('✅ [TripDetailsDialog] Using soXe:', soXe)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Chi tiết chuyến đi: {record.maChuyenDi}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Xem thông tin chi tiết về xe, tài xế và lộ trình di chuyển
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Section A: General Information */}
          <div className="bg-muted/30 p-4 rounded-lg border border-border">
            <h3 className="text-sm font-semibold mb-3 text-foreground">
              Thông tin chung
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Số xe</p>
                <p className="text-sm font-medium text-foreground">
                  {soXe || "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Khách hàng</p>
                <p className="text-sm font-medium text-foreground">
                  {record.tenKhachHang || "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tài xế</p>
                <p className="text-sm font-medium text-foreground">
                  {record.tenTaiXe || "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Loại chuyến</p>
                <p className="text-sm font-medium text-foreground">
                  {record.loaiChuyen || "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tên tuyến</p>
                <p className="text-sm font-medium text-foreground">
                  {record.tenTuyen || "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tổng doanh thu</p>
                <p className="text-sm font-semibold text-foreground">
                  {formatCurrency(record.tongDoanhThu || 0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tổng quãng đường</p>
                <p className="text-sm font-medium text-foreground">
                  {formatNumber(record.tongQuangDuong || 0)} km
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Đơn vị vận chuyển</p>
                <Badge
                  variant={record.donViVanChuyen === "NAK" ? "success" : "secondary"}
                  className="mt-1"
                >
                  {record.donViVanChuyen || "Không rõ"}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Trạng thái</p>
                <Badge
                  variant={
                    record.trangThai?.toLowerCase().includes("kết thúc") ||
                    record.trangThai?.toLowerCase().includes("hoàn thành")
                      ? "success"
                      : "secondary"
                  }
                  className="mt-1"
                >
                  {record.trangThai || "Không rõ"}
                </Badge>
              </div>
            </div>
          </div>

          {/* Section B: Route Details */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-foreground">
              Chi tiết lộ trình ({chiTietLoTrinh.length} điểm)
            </h3>

            {chiTietLoTrinh.length === 0 ? (
              // No route data - show empty state
              <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-lg border border-border">
                <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">Không có dữ liệu chi tiết lộ trình</p>
                <p className="text-xs mt-1">
                  Chuyến đi chưa có thông tin lộ trình hoặc dữ liệu chưa được cập nhật
                </p>
              </div>
            ) : (
              // Has route details - render table/cards
              <div className="space-y-3">
                {/* Desktop: Table View */}
                <div className="hidden md:block overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground border-b border-border">
                          Thứ tự
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground border-b border-border">
                          Mã Tem
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground border-b border-border min-w-[200px]">
                          Lộ trình
                        </th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground border-b border-border">
                          Quãng đường (km)
                        </th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground border-b border-border">
                          Tải trọng (tấn)
                        </th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground border-b border-border">
                          Thành tiền
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {chiTietLoTrinh.map((item, index) => (
                        <tr
                          key={item.id || index}
                          className={`${
                            index % 2 === 0 ? "bg-white" : "bg-muted/10"
                          } hover:bg-muted/30 transition-colors border-b border-border last:border-0`}
                        >
                          <td className="px-3 py-2 font-medium text-foreground">
                            {item.thuTu || index + 1}
                          </td>
                          <td className="px-3 py-2 text-foreground">
                            {item.maTem || "-"}
                          </td>
                          <td className="px-3 py-2">
                            <div className="font-medium text-primary">
                              {item.loTrinh || "-"}
                            </div>
                            {item.loaiTuyenKH && (
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {item.loaiTuyenKH}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right text-foreground">
                            {formatNumber(item.quangDuong || 0)}
                          </td>
                          <td className="px-3 py-2 text-right text-foreground">
                            {formatNumber(item.taiTrong || 0)}
                          </td>
                          <td className="px-3 py-2 text-right font-medium text-foreground">
                            {formatCurrency(item.thanhTien || 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-muted/30 border-t-2 border-border">
                      <tr>
                        <td colSpan={3} className="px-3 py-2 font-semibold text-foreground">
                          Tổng cộng
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-foreground">
                          {formatNumber(
                            chiTietLoTrinh.reduce(
                              (sum, item) => sum + (item.quangDuong || 0),
                              0
                            )
                          )}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-foreground">
                          {formatNumber(
                            chiTietLoTrinh.reduce(
                              (sum, item) => sum + (item.taiTrong || 0),
                              0
                            )
                          )}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-foreground">
                          {formatCurrency(
                            chiTietLoTrinh.reduce(
                              (sum, item) => sum + (item.thanhTien || 0),
                              0
                            )
                          )}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Mobile: Card View */}
                <div className="md:hidden space-y-3">
                  {chiTietLoTrinh.map((item, index) => (
                    <Card key={item.id || index} className="border-border">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center justify-between">
                          <span>Điểm {item.thuTu || index + 1}</span>
                          <Badge variant="outline" className="ml-2">
                            {item.maTem || "-"}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div className="font-medium text-primary">
                          {item.loTrinh || "-"}
                        </div>
                        {item.loaiTuyenKH && (
                          <div className="text-xs text-muted-foreground">
                            {item.loaiTuyenKH}
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
                          <div>
                            <p className="text-xs text-muted-foreground">Quãng đường</p>
                            <p className="font-medium text-foreground">
                              {formatNumber(item.quangDuong || 0)} km
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Tải trọng</p>
                            <p className="font-medium text-foreground">
                              {formatNumber(item.taiTrong || 0)} tấn
                            </p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-xs text-muted-foreground">Thành tiền</p>
                            <p className="font-semibold text-foreground">
                              {formatCurrency(item.thanhTien || 0)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {/* Mobile Total */}
                  <Card className="bg-muted/30 border-border">
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">Tổng quãng đường</p>
                          <p className="font-semibold text-foreground">
                            {formatNumber(
                              chiTietLoTrinh.reduce(
                                (sum, item) => sum + (item.quangDuong || 0),
                                0
                              )
                            )}{" "}
                            km
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Tổng tải trọng</p>
                          <p className="font-semibold text-foreground">
                            {formatNumber(
                              chiTietLoTrinh.reduce(
                                (sum, item) => sum + (item.taiTrong || 0),
                                0
                              )
                            )}{" "}
                            tấn
                          </p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-xs text-muted-foreground">Tổng thành tiền</p>
                          <p className="font-bold text-foreground">
                            {formatCurrency(
                              chiTietLoTrinh.reduce(
                                (sum, item) => sum + (item.thanhTien || 0),
                                0
                              )
                            )}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
