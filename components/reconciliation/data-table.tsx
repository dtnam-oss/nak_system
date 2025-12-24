"use client"

import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  ColumnDef,
  SortingState,
} from "@tanstack/react-table"
import { useState } from "react"
import { ReconciliationRecord } from "@/types/reconciliation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"

interface DataTableProps {
  data: ReconciliationRecord[]
}

export function DataTable({ data }: DataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("vi-VN").format(num)
  }

  const columns: ColumnDef<ReconciliationRecord>[] = [
    {
      accessorKey: "maChuyenDi",
      header: "Mã chuyến đi",
      cell: ({ row }) => (
        <div className="font-medium text-foreground">{row.getValue("maChuyenDi")}</div>
      ),
    },
    {
      accessorKey: "ngayTao",
      header: "Ngày",
      cell: ({ row }) => {
        const date = new Date(row.getValue("ngayTao"))
        return (
          <div className="text-foreground">
            {date.toLocaleDateString("vi-VN")}
          </div>
        )
      },
    },
    {
      accessorKey: "soXe",
      header: "Biển số xe",
      cell: ({ row }) => (
        <div className="font-medium text-foreground">
          {row.original.soXe || "-"}
        </div>
      ),
    },
    {
      accessorKey: "tenTuyen",
      header: "Tuyến đường",
      cell: ({ row }) => (
        <div className="text-foreground max-w-[200px] truncate">
          {row.getValue("tenTuyen")}
        </div>
      ),
    },
    {
      accessorKey: "tenKhachHang",
      header: "Khách hàng",
      cell: ({ row }) => (
        <div className="text-foreground max-w-[150px] truncate">
          {row.getValue("tenKhachHang")}
        </div>
      ),
    },
    {
      accessorKey: "tongQuangDuong",
      header: "Quãng đường (km)",
      cell: ({ row }) => (
        <div className="text-right text-foreground">
          {formatNumber(row.getValue("tongQuangDuong"))}
        </div>
      ),
    },
    {
      accessorKey: "tongDoanhThu",
      header: "Doanh thu",
      cell: ({ row }) => (
        <div className="text-right font-medium text-foreground">
          {formatCurrency(row.getValue("tongDoanhThu"))}
        </div>
      ),
    },
    {
      accessorKey: "donViVanChuyen",
      header: "Đơn vị",
      cell: ({ row }) => {
        const donVi = row.getValue("donViVanChuyen") as string
        return (
          <Badge variant={donVi === "NAK" ? "success" : "secondary"}>
            {donVi}
          </Badge>
        )
      },
    },
    {
      accessorKey: "trangThai",
      header: "Trạng thái",
      cell: ({ row }) => {
        const status = row.getValue("trangThai") as string
        return (
          <Badge variant="secondary">
            {status}
          </Badge>
        )
      },
    },
  ]

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
    initialState: {
      pagination: {
        pageSize: 20,
      },
    },
  })

  return (
    <div className="rounded-lg border border-border bg-white">
      {/* Table */}
      <div className="overflow-auto max-h-[600px]">
        <table className="w-full">
          <thead className="sticky top-0 bg-muted/50 z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left text-sm font-medium text-muted-foreground border-b border-border"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-muted-foreground"
                >
                  Không có dữ liệu
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row, index) => (
                <tr
                  key={row.id}
                  className={`border-b border-border hover:bg-muted/30 transition-colors ${
                    index % 2 === 0 ? "bg-white" : "bg-muted/10"
                  }`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 text-sm">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-border">
        <div className="text-sm text-muted-foreground">
          Hiển thị {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} đến{" "}
          {Math.min(
            (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
            table.getFilteredRowModel().rows.length
          )}{" "}
          trong tổng số {table.getFilteredRowModel().rows.length} kết quả
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="text-sm text-foreground">
            Trang {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
