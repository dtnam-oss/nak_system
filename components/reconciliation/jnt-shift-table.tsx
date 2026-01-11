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

interface JnTShiftTableProps {
  data: ReconciliationRecord[]
}

export function JnTShiftTable({ data }: JnTShiftTableProps) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-center font-bold w-[120px]">Ngày</TableHead>
                <TableHead className="text-center font-bold w-[130px]">Biển số xe</TableHead>
                <TableHead className="text-center font-bold w-[200px]">Mã tem</TableHead>
                <TableHead className="text-center font-bold min-w-[300px]">Điểm đi - Điểm đến</TableHead>
                <TableHead className="text-center font-bold w-[120px]">Thể tích</TableHead>
                <TableHead className="text-center font-bold w-[150px]">Loại ca</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Không có dữ liệu
                  </TableCell>
                </TableRow>
              ) : (
                data.map((record) => {
                  // Parse chiTietLoTrinh from data
                  const chiTietLoTrinh = record.chiTietLoTrinh || []

                  // Extract data following the same logic as export template
                  // License plates: unique values, joined by comma
                  const licensePlates = chiTietLoTrinh
                    .map(item => item.bienKiemSoat)
                    .filter((value, index, self) =>
                      value && self.indexOf(value) === index
                    )
                  const licensePlate = licensePlates.join(', ') || ''

                  // Stamp codes: all maTuyen joined by newline (display as list)
                  const stampCodes = chiTietLoTrinh
                    .map(item => item.maTuyen)
                    .filter(value => value)

                  // Routes: all loTrinhChiTiet joined by newline
                  const routes = chiTietLoTrinh
                    .map(item => item.loTrinhChiTiet)
                    .filter(value => value)
                  const route = routes.length > 0 ? routes : [record.tenTuyen || '']

                  // Volumes: all taiTrongTinhPhi joined by newline
                  const volumes = chiTietLoTrinh
                    .map(item => item.taiTrongTinhPhi)
                    .filter(value => value !== null && value !== undefined)

                  // Shift types: all loaiCa values
                  const shiftTypes = chiTietLoTrinh
                    .map(item => {
                      // Try to get loaiCa from the item, might be in different places
                      return (item as any).loaiCa || ''
                    })
                    .filter(value => value)

                  // Calculate row height based on max items
                  const maxLines = Math.max(
                    stampCodes.length,
                    routes.length,
                    volumes.length,
                    shiftTypes.length,
                    1
                  )

                  return (
                    <TableRow key={record.id} className="hover:bg-muted/30">
                      <TableCell className="text-center align-top">
                        {record.ngayTao ? format(new Date(record.ngayTao), 'dd/MM/yyyy') : ''}
                      </TableCell>
                      <TableCell className="text-center align-top">{licensePlate}</TableCell>
                      <TableCell className="text-center align-top">
                        <div className="space-y-1 font-mono text-sm">
                          {stampCodes.map((code, idx) => (
                            <div key={idx}>{code}</div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-center align-top">
                        <div className="space-y-1 text-sm">
                          {route.map((r, idx) => (
                            <div key={idx}>{r}</div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-center align-top">
                        <div className="space-y-1">
                          {volumes.map((vol, idx) => (
                            <div key={idx}>{vol}</div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-center align-top">
                        <div className="space-y-1">
                          {shiftTypes.map((type, idx) => (
                            <div key={idx}>{type}</div>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
