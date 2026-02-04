"use client"

import { useQuery } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, Loader2, ExternalLink } from "lucide-react"
import type { ReconciliationRecord, ChiTietLoTrinh } from "@/types/reconciliation"
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'

interface TripDetailsDialogProps {
  maChuyenDi: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TripDetailsDialogNew({ maChuyenDi, open, onOpenChange }: TripDetailsDialogProps) {
  // Lazy load detail data when popup opens
  const { data, isLoading, error } = useQuery<ReconciliationRecord>({
    queryKey: ['trip-detail', maChuyenDi],
    queryFn: async () => {
      if (!maChuyenDi) throw new Error('Missing maChuyenDi')

      const response = await fetch(`/api/reconciliation/${maChuyenDi}`)

      if (!response.ok) {
        throw new Error('Failed to fetch trip details')
      }

      return response.json()
    },
    enabled: open && !!maChuyenDi, // Only fetch when popup is open
    staleTime: 10 * 60 * 1000, // Cache 10 minutes
  })

  // Export to Excel function
  const handleExportExcel = async () => {
    if (!data) return

    try {
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet('Chi tiết chuyến đi')

      // Section 1: Trip Info Header
      worksheet.addRow(['CHI TIẾT CHUYẾN ĐI'])
      worksheet.getRow(1).font = { bold: true, size: 14 }
      worksheet.addRow([])

      // Trip Information
      worksheet.addRow(['THÔNG TIN CHUYẾN ĐI'])
      worksheet.getRow(3).font = { bold: true, size: 12 }
      worksheet.addRow(['Mã chuyến:', data.maChuyenDi])
      worksheet.addRow(['Ngày:', formatDate(data.ngayTao)])
      worksheet.addRow(['Khách hàng:', data.tenKhachHang])
      worksheet.addRow(['Tài xế:', data.tenTaiXe])
      worksheet.addRow(['Loại chuyến:', data.loaiChuyen])
      worksheet.addRow(['Loại tuyến:', data.loaiTuyen])
      worksheet.addRow(['Tên tuyến:', data.tenTuyen])
      worksheet.addRow(['Đơn vị:', data.donViVanChuyen])
      worksheet.addRow(['Trạng thái:', data.trangThai])
      worksheet.addRow([])

      // Financial Summary
      worksheet.addRow(['TÀI CHÍNH'])
      worksheet.getRow(worksheet.lastRow!.number).font = { bold: true, size: 12 }
      worksheet.addRow(['Doanh thu:', data.tongDoanhThu])
      worksheet.addRow(['Chi phí:', data.tongChiPhi])
      worksheet.addRow(['Lợi nhuận:', data.tongDoanhThu - data.tongChiPhi])
      worksheet.addRow(['Tổng KM:', data.tongQuangDuong])
      worksheet.addRow([])

      // Section 2: Route Details Table
      if (data.chiTietLoTrinh && data.chiTietLoTrinh.length > 0) {
        worksheet.addRow(['CHI TIẾT LỘ TRÌNH'])
        worksheet.getRow(worksheet.lastRow!.number).font = { bold: true, size: 12 }

        // Table headers
        const headerRow = worksheet.addRow([
          '#',
          'Biển số',
          'Tuyến',
          'KM',
          'Tải trọng (tấn)',
          'Đơn giá',
          'Thành tiền',
          'Tem',
          'Ngày tem',
          'Loại ca'
        ])
        headerRow.font = { bold: true }
        headerRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFD3D3D3' }
        }

        // Data rows
        let totalDistance = 0
        let totalAmount = 0

        data.chiTietLoTrinh.forEach((item, index) => {
          worksheet.addRow([
            index + 1,
            item.bienKiemSoat,
            item.loTrinh,
            item.quangDuong,
            item.taiTrongTinhPhi,
            item.donGia,
            item.thanhTien,
            item.maTuyen,
            formatDate(item.ngayTrenTem),
            item.loaiCa
          ])

          totalDistance += item.quangDuong || 0
          totalAmount += item.thanhTien || 0
        })

        // Total row
        const totalRow = worksheet.addRow([
          'TỔNG',
          '',
          '',
          totalDistance,
          '',
          '',
          totalAmount,
          '',
          '',
          ''
        ])
        totalRow.font = { bold: true }
        totalRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF0F0F0' }
        }
      }

      // Auto-fit columns
      worksheet.columns.forEach(column => {
        if (column.values) {
          const lengths = column.values.map(v => v ? v.toString().length : 0)
          const maxLength = Math.max(...lengths)
          column.width = Math.min(maxLength + 2, 50)
        }
      })

      // Generate and download
      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      saveAs(blob, `ChiTiet_${data.maChuyenDi}_${formatDate(new Date())}.xlsx`)

      console.log('✅ Excel exported successfully')
    } catch (error) {
      console.error('❌ Export error:', error)
      alert('Xuất Excel thất bại. Vui lòng thử lại.')
    }
  }

  if (!open) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Chi tiết chuyến đi: {maChuyenDi}</span>
            <Button
              onClick={handleExportExcel}
              disabled={!data || isLoading}
              size="sm"
              variant="outline"
            >
              <Download className="h-4 w-4 mr-2" />
              Xuất Excel
            </Button>
          </DialogTitle>
        </DialogHeader>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">Đang tải dữ liệu...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-12 text-destructive">
            <p>Lỗi khi tải dữ liệu: {error.message}</p>
          </div>
        )}

        {/* Data Display */}
        {data && !isLoading && (
          <div className="space-y-4">
            {/* Section 1: Trip Information */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">THÔNG TIN CHUYẾN ĐI</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-x-8 gap-y-2.5 text-sm">
                  <InfoRow label="Mã chuyến" value={data.maChuyenDi} />
                  <InfoRow label="Ngày" value={formatDate(data.ngayTao)} />
                  <InfoRow label="Khách hàng" value={data.tenKhachHang} />
                  <InfoRow label="Tài xế" value={data.tenTaiXe} />
                  <InfoRow label="Loại chuyến" value={data.loaiChuyen} />
                  <InfoRow label="Loại tuyến" value={data.loaiTuyen} />
                  <InfoRow label="Tên tuyến" value={data.tenTuyen} />
                  <InfoRow label="Đơn vị" value={data.donViVanChuyen} />
                  <InfoRow label="Trạng thái" value={data.trangThai} />

                  {/* Financial Summary */}
                  <div className="col-span-2 border-t pt-2.5 mt-1" />

                  <InfoRow
                    label="Doanh thu"
                    value={formatCurrency(data.tongDoanhThu)}
                    className="text-emerald-600 font-semibold"
                  />
                  <InfoRow
                    label="Chi phí"
                    value={formatCurrency(data.tongChiPhi)}
                    className="text-orange-600"
                  />
                  <InfoRow
                    label="Lợi nhuận"
                    value={formatCurrency(data.tongDoanhThu - data.tongChiPhi)}
                    className="text-primary font-bold"
                  />
                  <InfoRow
                    label="Tổng KM"
                    value={`${formatNumber(data.tongQuangDuong)} km`}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Section 2: Route Details */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">
                  CHI TIẾT LỘ TRÌNH ({data.chiTietLoTrinh?.length || 0} điểm)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!data.chiTietLoTrinh || data.chiTietLoTrinh.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Không có dữ liệu chi tiết lộ trình
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b-2 border-border">
                          <th className="text-left p-2 font-semibold">#</th>
                          <th className="text-left p-2 font-semibold">Biển số</th>
                          <th className="text-left p-2 font-semibold">Tuyến</th>
                          <th className="text-right p-2 font-semibold">KM</th>
                          <th className="text-right p-2 font-semibold">Đơn giá</th>
                          <th className="text-right p-2 font-semibold">Thành tiền</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.chiTietLoTrinh.map((item, idx) => (
                          <RouteRow key={item.id || idx} item={item} index={idx} />
                        ))}
                      </tbody>
                      <tfoot className="bg-muted/30 border-t-2 border-border">
                        <tr>
                          <td colSpan={3} className="p-2 font-bold">TỔNG</td>
                          <td className="p-2 text-right font-bold">
                            {formatNumber(sumBy(data.chiTietLoTrinh, 'quangDuong'))} km
                          </td>
                          <td className="p-2"></td>
                          <td className="p-2 text-right font-bold">
                            {formatCurrency(sumBy(data.chiTietLoTrinh, 'thanhTien'))}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// Helper Components
function InfoRow({ label, value, className = '' }: { label: string; value: any; className?: string }) {
  return (
    <div className="flex justify-between items-baseline">
      <span className="text-muted-foreground">{label}:</span>
      <span className={`font-medium ${className}`}>{value || '-'}</span>
    </div>
  )
}

function RouteRow({ item, index }: { item: ChiTietLoTrinh; index: number }) {
  return (
    <>
      <tr className="border-b border-border hover:bg-muted/20">
        <td className="p-2 font-medium">{index + 1}</td>
        <td className="p-2">{item.bienKiemSoat || '-'}</td>
        <td className="p-2">{item.loTrinh || '-'}</td>
        <td className="p-2 text-right">{formatNumber(item.quangDuong)}</td>
        <td className="p-2 text-right">{formatCurrency(item.donGia)}</td>
        <td className="p-2 text-right font-medium">{formatCurrency(item.thanhTien)}</td>
      </tr>
      {/* Additional info row */}
      <tr className="border-b border-border bg-muted/5">
        <td colSpan={6} className="px-2 pb-2 text-xs text-muted-foreground">
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {item.maTuyen && <span>Tem: <strong>{item.maTuyen}</strong></span>}
            {item.ngayTrenTem && <span>Ngày: {formatDate(item.ngayTrenTem)}</span>}
            {item.taiTrongTinhPhi && <span>Tải: {item.taiTrongTinhPhi} tấn</span>}
            {item.loaiCa && <span>Ca: {item.loaiCa}</span>}
            {item.hinhAnh && (
              <a
                href={buildAppSheetUrl(item.hinhAnh)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                📸 Xem ảnh
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </td>
      </tr>
    </>
  )
}

// Helper Functions
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount)
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('vi-VN').format(num)
}

function formatDate(date: string | Date | undefined): string {
  if (!date) return ''

  try {
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return String(date)
  }
}

function sumBy(arr: any[], key: string): number {
  return arr.reduce((sum, item) => sum + (parseFloat(item[key]) || 0), 0)
}

function buildAppSheetUrl(filename: string): string {
  const appName = 'SYSTEMNAKLOGISTICS-906096635-26-01-22'
  const tableName = 'chi_tiet_chuyen_di'
  const params = new URLSearchParams({
    appName,
    tableName,
    fileName: filename
  })
  return `https://www.appsheet.com/template/gettablefileurl?${params.toString()}`
}
