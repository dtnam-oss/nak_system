"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ReconciliationRecord, ParsedDataJson } from "@/types/reconciliation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useMemo } from "react"
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
  // 🔍 STEP 2: Debug - Log received props
  console.log('🔍 [STEP 2] TripDetailsDialog received record:', record)
  console.log('🔍 [STEP 2] Has data_json field:', record ? 'data_json' in record : 'NO RECORD')
  console.log('🔍 [STEP 2] data_json value:', record?.data_json)
  console.log('🔍 [STEP 2] data_json type:', typeof record?.data_json)
  console.log('🔍 [STEP 2] Record keys:', record ? Object.keys(record) : 'NO RECORD')

  // Safely parse data_json with comprehensive error handling
  const { parsedData, error } = useMemo<{
    parsedData: ParsedDataJson | null
    error: string | null
  }>(() => {
    // Guard clause: no record
    if (!record) {
      console.log('🔍 [STEP 2] Guard: No record provided')
      return { parsedData: null, error: null }
    }

    // Guard clause: no data_json field
    if (!record.data_json) {
      console.warn('🔍 [STEP 2] Guard: No data_json field for record:', record.maChuyenDi)
      console.warn('🔍 [STEP 2] Available fields:', Object.keys(record))
      return { parsedData: null, error: "Không có dữ liệu JSON" }
    }

    // Guard clause: empty string
    if (typeof record.data_json === "string" && record.data_json.trim() === "") {
      console.warn(`Empty data_json for record: ${record.maChuyenDi}`)
      return { parsedData: null, error: "Dữ liệu JSON trống" }
    }

    try {
      // Case 1: data_json is a string (from database)
      if (typeof record.data_json === "string") {
        const parsed = JSON.parse(record.data_json)

        // Validate parsed structure
        if (!parsed || typeof parsed !== "object") {
          throw new Error("Invalid JSON structure")
        }

        return { parsedData: parsed as ParsedDataJson, error: null }
      }

      // Case 2: data_json is already an object (pre-parsed)
      if (typeof record.data_json === "object") {
        return { parsedData: record.data_json as unknown as ParsedDataJson, error: null }
      }

      // Case 3: Unknown type
      throw new Error("Unknown data_json type")

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error"
      console.error(`Failed to parse data_json for ${record.maChuyenDi}:`, {
        error: errorMessage,
        data_json: record.data_json,
      })
      return {
        parsedData: null,
        error: `Lỗi parse JSON: ${errorMessage}`,
      }
    }
  }, [record])

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

  const thongTin = parsedData?.thongTinChuyenDi
  const chiTietLoTrinh = parsedData?.chiTietLoTrinh || []

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

        {/* Error State */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-semibold text-destructive mb-1">
                  Không thể tải dữ liệu chi tiết
                </h4>
                <p className="text-sm text-destructive/80">{error}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Đang hiển thị thông tin cơ bản từ dữ liệu chính.
                </p>
              </div>
            </div>
          </div>
        )}

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
                  {thongTin?.soXe || record.soXe || "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Khách hàng cấp 1</p>
                <p className="text-sm font-medium text-foreground">
                  {thongTin?.khCap1 || "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tài xế</p>
                <p className="text-sm font-medium text-foreground">
                  {record.tenTaiXe || "-"}
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
              {thongTin?.loaiCa && (
                <div>
                  <p className="text-xs text-muted-foreground">Loại ca</p>
                  <p className="text-sm font-medium text-foreground">
                    {thongTin.loaiCa}
                  </p>
                </div>
              )}
              {thongTin?.hinhThucTinhGia && (
                <div>
                  <p className="text-xs text-muted-foreground">Hình thức tính giá</p>
                  <p className="text-sm font-medium text-foreground">
                    {thongTin.hinhThucTinhGia}
                  </p>
                </div>
              )}
              {thongTin?.taiTrongTinhPhi !== undefined && thongTin.taiTrongTinhPhi !== null && (
                <div>
                  <p className="text-xs text-muted-foreground">Tải trọng tính phí</p>
                  <p className="text-sm font-medium text-foreground">
                    {formatNumber(thongTin.taiTrongTinhPhi)} tấn
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Section B: Route Details (Critical) */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-foreground">
              Chi tiết lộ trình ({chiTietLoTrinh.length} điểm)
            </h3>

            {!parsedData ? (
              // No parsed data - show error state
              <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-lg border border-border">
                <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">Không có dữ liệu chi tiết cho chuyến này</p>
                <p className="text-xs mt-1">
                  {error || "Dữ liệu JSON không khả dụng hoặc không hợp lệ"}
                </p>
              </div>
            ) : chiTietLoTrinh.length === 0 ? (
              // Parsed data exists but empty array
              <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-lg border border-border">
                <p>Không có điểm lộ trình nào được ghi nhận</p>
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
