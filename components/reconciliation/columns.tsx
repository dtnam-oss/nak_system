"use client"

import { ColumnDef } from "@tanstack/react-table"
import { ReconciliationRecord } from "@/types/reconciliation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Eye } from "lucide-react"

interface ColumnsProps {
  onViewDetails: (record: ReconciliationRecord) => void
}

export const createColumns = ({
  onViewDetails,
}: ColumnsProps): ColumnDef<ReconciliationRecord>[] => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    } catch {
      return dateString
    }
  }

  return [
    {
      accessorKey: "maChuyenDi",
      header: "Mã chuyến",
      cell: ({ row }) => (
        <div className="font-medium text-foreground min-w-[120px]">
          {row.getValue("maChuyenDi")}
        </div>
      ),
    },
    {
      accessorKey: "ngayTao",
      header: "Ngày tạo",
      cell: ({ row }) => (
        <div className="text-foreground min-w-[100px]">
          {formatDate(row.getValue("ngayTao"))}
        </div>
      ),
    },
    {
      accessorKey: "tenKhachHang",
      header: "Khách hàng",
      cell: ({ row }) => (
        <div className="text-foreground max-w-[200px] truncate">
          {row.getValue("tenKhachHang")}
        </div>
      ),
    },
    {
      accessorKey: "loaiChuyen",
      header: "Loại chuyến",
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
          <Badge variant={variant} className="whitespace-nowrap">
            {loaiChuyen || "-"}
          </Badge>
        )
      },
    },
    {
      accessorKey: "tenTuyen",
      header: "Tên tuyến",
      cell: ({ row }) => (
        <div className="text-foreground max-w-[180px] truncate">
          {row.getValue("tenTuyen") || "-"}
        </div>
      ),
    },
    {
      accessorKey: "tenTaiXe",
      header: "Tài xế",
      cell: ({ row }) => (
        <div className="text-foreground max-w-[150px] truncate">
          {row.getValue("tenTaiXe") || "-"}
        </div>
      ),
    },
    {
      accessorKey: "donViVanChuyen",
      header: "Đơn vị",
      cell: ({ row }) => {
        const donVi = row.getValue("donViVanChuyen") as string
        return (
          <Badge
            variant={donVi === "NAK" ? "success" : "secondary"}
            className="whitespace-nowrap"
          >
            {donVi}
          </Badge>
        )
      },
    },
    {
      accessorKey: "trangThai",
      header: "Trạng thái",
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
          <Badge variant={variant} className="whitespace-nowrap">
            {trangThai}
          </Badge>
        )
      },
    },
    {
      accessorKey: "tongDoanhThu",
      header: "Doanh thu",
      cell: ({ row }) => (
        <div className="text-right font-medium text-foreground min-w-[120px]">
          {formatCurrency(row.getValue("tongDoanhThu"))}
        </div>
      ),
    },
    {
      id: "actions",
      header: "Thao tác",
      cell: ({ row }) => {
        const record = row.original

        return (
          <div className="flex justify-center min-w-[100px]">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewDetails(record)}
              className="gap-2"
            >
              <Eye className="h-4 w-4" />
              Chi tiết
            </Button>
          </div>
        )
      },
    },
  ]
}
