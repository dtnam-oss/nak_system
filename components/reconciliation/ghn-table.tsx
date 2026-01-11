"use client"

import { format } from "date-fns"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import { ReconciliationRecord } from "@/types/reconciliation"

interface GHNTableProps {
  data: ReconciliationRecord[]
}

export function GHNTable({ data }: GHNTableProps) {
  // Flatten data: create one row for each chiTietLoTrinh item
  let globalSTT = 1
  const flattenedRows: Array<{
    stt: number
    date: string
    licensePlate: string
    weight: string | number
    pricingMethod: string
    routeDetail: string
    distance: string | number
    unitPrice: string | number
    routeName: string
    tripCode: string
    recordId: string
  }> = []

  data.forEach((record) => {
    const chiTietLoTrinh = record.chiTietLoTrinh || []

    if (chiTietLoTrinh.length === 0) return

    const formattedDate = record.ngayTao
      ? format(new Date(record.ngayTao), 'dd/MM/yyyy')
      : ''

    chiTietLoTrinh.forEach((item) => {
      flattenedRows.push({
        stt: globalSTT++,
        date: formattedDate,
        licensePlate: item.bienKiemSoat || '',
        weight: item.taiTrongTinhPhi || '',
        pricingMethod: item.hinhThucTinhGia || '',
        routeDetail: item.loTrinhChiTiet || '',
        distance: item.quangDuong || '',
        unitPrice: item.donGia || '',
        routeName: item.loTrinh || '',
        tripCode: item.maTuyen || '',
        recordId: `${record.id}-${item.id || item.thuTu}`,
      })
    })
  })

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-center font-bold w-[60px]">STT</TableHead>
                <TableHead className="text-center font-bold w-[100px]">Ngày</TableHead>
                <TableHead className="text-center font-bold w-[120px]">Biển số xe</TableHead>
                <TableHead className="text-center font-bold w-[140px]">Trọng tải yêu cầu</TableHead>
                <TableHead className="text-center font-bold w-[160px]">Hình thức tính giá</TableHead>
                <TableHead className="text-center font-bold min-w-[280px]">Lộ trình</TableHead>
                <TableHead className="text-center font-bold w-[100px]">Số KM</TableHead>
                <TableHead className="text-center font-bold w-[120px]">Đơn giá khung</TableHead>
                <TableHead className="text-center font-bold w-[120px]">Vé cầu đường</TableHead>
                <TableHead className="text-center font-bold w-[120px]">Phí dừng tải</TableHead>
                <TableHead className="text-center font-bold w-[120px]">Tỷ lệ Ontime</TableHead>
                <TableHead className="text-center font-bold w-[140px]">Thành tiền (chưa VAT)</TableHead>
                <TableHead className="text-center font-bold w-[180px]">Tên tuyến</TableHead>
                <TableHead className="text-center font-bold w-[160px]">Mã chuyến</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {flattenedRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={14} className="text-center text-muted-foreground py-8">
                    Không có dữ liệu
                  </TableCell>
                </TableRow>
              ) : (
                flattenedRows.map((row) => (
                  <TableRow key={row.recordId} className="hover:bg-muted/30">
                    <TableCell className="text-center">{row.stt}</TableCell>
                    <TableCell className="text-center">{row.date}</TableCell>
                    <TableCell className="text-center">{row.licensePlate}</TableCell>
                    <TableCell className="text-center">{row.weight}</TableCell>
                    <TableCell className="text-center">{row.pricingMethod}</TableCell>
                    <TableCell className="text-left px-4">{row.routeDetail}</TableCell>
                    <TableCell className="text-center">{row.distance}</TableCell>
                    <TableCell className="text-right pr-4">
                      {typeof row.unitPrice === 'number'
                        ? row.unitPrice.toLocaleString('vi-VN')
                        : row.unitPrice}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">-</TableCell>
                    <TableCell className="text-center text-muted-foreground">-</TableCell>
                    <TableCell className="text-center text-muted-foreground">-</TableCell>
                    <TableCell className="text-center text-muted-foreground">-</TableCell>
                    <TableCell className="text-center">{row.routeName}</TableCell>
                    <TableCell className="text-center font-mono text-sm">{row.tripCode}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
