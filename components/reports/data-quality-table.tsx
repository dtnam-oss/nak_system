
"use client";

import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    useReactTable,
    getPaginationRowModel,
} from "@tanstack/react-table";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

interface DataQualityTableProps {
    data: any[];
    isLoading: boolean;
    pageCount: number;
    pageIndex: number;
    onPageChange: (page: number) => void;
}

export function DataQualityTable({
    data,
    isLoading,
    pageCount,
    pageIndex,
    onPageChange,
}: DataQualityTableProps) {

    const columns: ColumnDef<any>[] = [
        {
            accessorKey: "order_id",
            header: "Mã Đơn",
            cell: ({ row }) => <div className="font-medium text-xs">{row.getValue("order_id")}</div>,
        },
        {
            accessorKey: "date",
            header: "Ngày",
            cell: ({ row }) => (
                <div className="text-xs text-muted-foreground">
                    {format(new Date(row.getValue("date")), "dd/MM/yyyy", { locale: vi })}
                </div>
            ),
        },
        {
            accessorKey: "customer",
            header: "Khách hàng",
            cell: ({ row }) => <div className="text-xs">{row.getValue("customer")}</div>,
        },
        {
            accessorKey: "provider",
            header: "Đơn vị",
            cell: ({ row }) => <div className="text-xs">{row.getValue("provider") || "N/A"}</div>,
        },
        {
            accessorKey: "route_name",
            header: "Tuyến",
            cell: ({ row }) => {
                const val = row.getValue("route_name");
                return val
                    ? <div className="text-xs truncate max-w-[200px]" title={val as string}>{val as string}</div>
                    : <span className="text-xs text-destructive italic">Thiếu tuyến</span>
            },
        },
        {
            accessorKey: "license_plate",
            header: "Biển số",
            cell: ({ row }) => {
                const val = row.getValue("license_plate") as string;
                const isMissing = !val || val === '---' || val === '';
                return (
                    <div className={isMissing ? "text-xs text-destructive font-bold bg-destructive/10 px-2 py-1 rounded w-fit" : "text-xs"}>
                        {isMissing ? "Thiếu BS" : val}
                    </div>
                )
            },
        },
        {
            accessorKey: "weight",
            header: "Tải trọng",
            cell: ({ row }) => {
                const val = row.getValue("weight");
                return val ? <div className="text-xs text-right">{val as number}</div> : <span className="text-xs text-warning text-right block pr-2">0</span>
            }
        },
        {
            accessorKey: "revenue",
            header: () => <div className="text-right">Doanh thu</div>,
            cell: ({ row }) => {
                const val = row.getValue("revenue") as number;
                return <div className="text-xs text-right font-medium">{new Intl.NumberFormat('vi-VN').format(val)}</div>
            }
        }
    ];

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        manualPagination: true,
        pageCount: pageCount,
    });

    return (
        <div className="space-y-4">
            <div className="rounded-md border bg-white relative min-h-[400px]">

                {/* Loading Overlay */}
                {isLoading && (
                    <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center backdrop-blur-[1px]">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                )}

                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead key={header.id} className="h-10">
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                        </TableHead>
                                    );
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && "selected"}
                                    className="h-10"
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id} className="py-2">
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext()
                                            )}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length}
                                    className="h-24 text-center text-muted-foreground"
                                >
                                    {isLoading ? "Đang tải dữ liệu..." : "Không tìm thấy kết quả nào."}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-end space-x-2 py-2">
                <div className="flex-1 text-sm text-muted-foreground">
                    Trang {pageIndex} / {pageCount || 1}
                </div>
                <div className="space-x-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onPageChange(pageIndex - 1)}
                        disabled={pageIndex <= 1 || isLoading}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onPageChange(pageIndex + 1)}
                        disabled={pageIndex >= pageCount || isLoading}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
