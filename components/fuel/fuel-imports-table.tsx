'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Eye } from 'lucide-react';

interface FuelImport {
  id: string;
  import_date: string;
  supplier: string;
  fuel_type: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  avg_price: number;
  created_by: string;
}

interface FuelImportsTableProps {
  imports: FuelImport[];
  loading?: boolean;
}

export function FuelImportsTable({ imports, loading }: FuelImportsTableProps) {
  const [selectedRow, setSelectedRow] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <TableHead key={i}>
                  <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3, 4, 5].map((i) => (
              <TableRow key={i}>
                {[1, 2, 3, 4, 5, 6].map((j) => (
                  <TableCell key={j}>
                    <div className="h-4 w-full bg-gray-100 rounded animate-pulse" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (imports.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center">
        <p className="text-muted-foreground">Chưa có dữ liệu nhập kho</p>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('vi-VN', {
      maximumFractionDigits: 1,
    }).format(num);
  };

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('vi-VN').format(num);
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ngày nhập</TableHead>
            <TableHead>Nhà cung cấp</TableHead>
            <TableHead>Loại nhiên liệu</TableHead>
            <TableHead className="text-right">Số lượng (L)</TableHead>
            <TableHead className="text-right">Đơn giá nhập</TableHead>
            <TableHead className="text-right">Thành tiền</TableHead>
            <TableHead className="text-right">Giá xuất BQ</TableHead>
            <TableHead>Người tạo</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {imports.map((importRecord) => (
            <TableRow
              key={importRecord.id}
              className={selectedRow === importRecord.id ? 'bg-muted/50' : ''}
            >
              <TableCell className="font-medium">
                {formatDate(importRecord.import_date)}
              </TableCell>
              <TableCell>
                <span className="text-sm">{importRecord.supplier || '-'}</span>
              </TableCell>
              <TableCell>
                <span className="text-sm">{importRecord.fuel_type || '-'}</span>
              </TableCell>
              <TableCell className="text-right font-medium text-green-600">
                +{formatNumber(importRecord.quantity)}
              </TableCell>
              <TableCell className="text-right text-sm text-muted-foreground">
                {formatCurrency(importRecord.unit_price)}
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(importRecord.total_amount)}
              </TableCell>
              <TableCell className="text-right text-sm font-medium text-blue-600">
                {formatCurrency(importRecord.avg_price)}
              </TableCell>
              <TableCell>
                <span className="text-sm">{importRecord.created_by || '-'}</span>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setSelectedRow(importRecord.id)}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Thao tác</DropdownMenuLabel>
                    <DropdownMenuItem>
                      <Eye className="mr-2 h-4 w-4" />
                      Xem chi tiết
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="border-t p-4 bg-muted/50">
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">
            Tổng số phiếu nhập: <span className="font-medium text-foreground">{imports.length}</span>
          </span>
          <div className="flex gap-6">
            <span className="text-muted-foreground">
              Tổng số lượng:{' '}
              <span className="font-medium text-green-600">
                {formatNumber(imports.reduce((sum, item) => sum + item.quantity, 0))} L
              </span>
            </span>
            <span className="text-muted-foreground">
              Tổng giá trị:{' '}
              <span className="font-medium text-foreground">
                {formatCurrency(imports.reduce((sum, item) => sum + item.total_amount, 0))} đ
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
