"use client"

import { ColumnDef } from "@tanstack/react-table"
import { ReconciliationRecord } from "@/types/reconciliation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Eye } from "lucide-react"

interface ColumnsProps {
  onViewDetails: (maChuyenDi: string) => void
}

export const createColumns = ({
  onViewDetails,
}: ColumnsProps): ColumnDef<ReconciliationRecord>[] => {
  return [
    {
      accessorKey: "maChuyenDi",
      header: () => <div className="font-bold">Mã chuyến</div>,
      cell: ({ row }) => (
        <div className="font-medium text-foreground min-w-[100px]">
          {row.getValue("maChuyenDi")}
        </div>
      ),
    },
    {
      accessorKey: "ngayTao",
      header: () => <div className="font-bold">Ngày</div>,
      cell: ({ row }) => (
        <div className="text-foreground min-w-[85px]">
          {row.getValue("ngayTao")}
        </div>
      ),
    },
    {
      accessorKey: "tenKhachHang",
      header: () => <div className="font-bold">Khách hàng</div>,
      cell: ({ row }) => (
        <div className="text-foreground max-w-[160px] truncate">
          {row.getValue("tenKhachHang")}
        </div>
      ),
    },
    {
      accessorKey: "loaiChuyen",
      header: () => <div className="font-bold">Loại chuyến</div>,
      cell: ({ row }) => {
        const loaiChuyen = row.getValue("loaiChuyen") as string

        // Determine badge variant based on trip type
        let variant: "default" | "secondary" | "outline" = "secondary"
        if (loaiChuyen?.toLowerCase().includes("nhanh")) {
          variant = "default"
        } else if (loaiChuyen?.toLowerCase().includes("thường")) {
          variant = "outline"
        }

        return (
          <Badge variant={variant} className="whitespace-nowrap text-[10px] px-1.5 py-0">
            {loaiChuyen || "-"}
          </Badge>
        )
      },
    },
    {
      accessorKey: "tenTuyen",
      header: () => <div className="font-bold">Tên tuyến</div>,
      cell: ({ row }) => (
        <div className="text-foreground max-w-[140px] truncate">
          {row.getValue("tenTuyen") || "-"}
        </div>
      ),
    },
    {
      accessorKey: "tenTaiXe",
      header: () => <div className="font-bold">Tài xế</div>,
      cell: ({ row }) => (
        <div className="text-foreground max-w-[120px] truncate">
          {row.getValue("tenTaiXe") || "-"}
        </div>
      ),
    },
    {
      accessorKey: "donViVanChuyen",
      header: () => <div className="font-bold">Đơn vị</div>,
      cell: ({ row }) => {
        const donVi = row.getValue("donViVanChuyen") as string
        return (
          <Badge
            variant={donVi === "NAK" ? "success" : "secondary"}
            className="whitespace-nowrap text-[10px] px-1.5 py-0"
          >
            {donVi}
          </Badge>
        )
      },
    },
    {
      accessorKey: "trangThai",
      header: () => <div className="font-bold">Trạng thái</div>,
      cell: ({ row }) => {
        const trangThai = row.getValue("trangThai") as string

        // Color coding for status
        let variant: "default" | "secondary" | "success" | "destructive" | "outline" = "secondary"

        if (
          trangThai?.toLowerCase().includes("kết thúc") ||
          trangThai?.toLowerCase().includes("hoàn thành") ||
          trangThai?.toLowerCase().includes("hoàn tất")
        ) {
          variant = "success"
        } else if (
          trangThai?.toLowerCase().includes("hủy") ||
          trangThai?.toLowerCase().includes("từ chối")
        ) {
          variant = "destructive"
        } else if (
          trangThai?.toLowerCase().includes("đang") ||
          trangThai?.toLowerCase().includes("chờ")
        ) {
          variant = "default"
        }

        return (
          <Badge variant={variant} className="whitespace-nowrap text-[10px] px-1.5 py-0">
            {trangThai}
          </Badge>
        )
      },
    },
    {
      id: "actions",
      header: () => <div className="font-bold text-center">Thao tác</div>,
      cell: ({ row }) => {
        const record = row.original

        return (
          <div className="flex justify-center min-w-[80px]">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                console.log('🔍 Opening detail for:', record.maChuyenDi)
                onViewDetails(record.maChuyenDi)
              }}
              className="gap-1.5 h-7 px-2 text-xs"
            >
              <Eye className="h-3.5 w-3.5" />
              Chi tiết
            </Button>
          </div>
        )
      },
    },
  ]
}
