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

interface JnTRouteTableProps {
  data: ReconciliationRecord[]
}

export function JnTRouteTable({ data }: JnTRouteTableProps) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-center font-bold w-[60px]">STT</TableHead>
                <TableHead className="text-center font-bold w-[120px]">Ngày</TableHead>
                <TableHead className="text-center font-bold w-[130px]">Biển số xe</TableHead>
                <TableHead className="text-center font-bold min-w-[250px]">Điểm đi - Điểm đến</TableHead>
                <TableHead className="text-center font-bold w-[180px]">Tem chiều đi</TableHead>
                <TableHead className="text-center font-bold w-[180px]">Tem chiều về</TableHead>
                <TableHead className="text-center font-bold w-[120px]">Thể tích</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Không có dữ liệu
                  </TableCell>
                </TableRow>
              ) : (
                data.map((record, index) => {
                  // Parse chiTietLoTrinh from data
                  const chiTietLoTrinh = record.chiTietLoTrinh || []

                  // Extract data following the same logic as export template
                  const licensePlate = chiTietLoTrinh[0]?.bienKiemSoat || ''
                  const routeName = record.tenTuyen || ''
                  const stampOut = chiTietLoTrinh[0]?.maTuyen || ''
                  const stampIn = chiTietLoTrinh.length > 0
                    ? chiTietLoTrinh[chiTietLoTrinh.length - 1]?.maTuyen || ''
                    : ''

                  // Volume: join all taiTrongTinhPhi with comma
                  const volumes = chiTietLoTrinh
                    .map(item => item.taiTrongTinhPhi)
                    .filter(value => value !== null && value !== undefined)
                  const volume = volumes.length > 0 ? volumes.join(', ') : ''

                  return (
                    <TableRow key={record.id} className="hover:bg-muted/30">
                      <TableCell className="text-center">{index + 1}</TableCell>
                      <TableCell className="text-center">
                        {record.ngayTao ? format(new Date(record.ngayTao), 'dd/MM/yyyy') : ''}
                      </TableCell>
                      <TableCell className="text-center">{licensePlate}</TableCell>
                      <TableCell className="text-center">{routeName}</TableCell>
                      <TableCell className="text-center font-mono text-sm">
                        {stampOut}
                      </TableCell>
                      <TableCell className="text-center font-mono text-sm">
                        {stampIn}
                      </TableCell>
                      <TableCell className="text-center">{volume}</TableCell>
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
