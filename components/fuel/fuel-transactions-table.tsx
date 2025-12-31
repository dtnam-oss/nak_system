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
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, Eye } from 'lucide-react';

interface FuelTransaction {
  id: string;
  transaction_date: string;
  fuel_source: string;
  object: string;
  license_plate: string;
  driver_name: string;
  fuel_type: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  odo_number: number;
  status: string;
  category: string;
}

interface FuelTransactionsTableProps {
  transactions: FuelTransaction[];
  loading?: boolean;
}

export function FuelTransactionsTable({ transactions, loading }: FuelTransactionsTableProps) {
  const [selectedRow, setSelectedRow] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <TableHead key={i}>
                  <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3, 4, 5].map((i) => (
              <TableRow key={i}>
                {[1, 2, 3, 4, 5, 6, 7].map((j) => (
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

  if (transactions.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center">
        <p className="text-muted-foreground">Chưa có dữ liệu cấp dầu</p>
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

  const getCategoryBadge = (category: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'outline', color: string }> = {
      'Chốt đầu': { variant: 'default', color: 'bg-blue-100 text-blue-800' },
      'Đổ dặm': { variant: 'default', color: 'bg-green-100 text-green-800' },
      'Chốt cuối': { variant: 'default', color: 'bg-purple-100 text-purple-800' },
    };

    const config = variants[category] || { variant: 'outline' as const, color: '' };
    
    return (
      <Badge variant={config.variant} className={config.color}>
        {category || 'N/A'}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusLower = status?.toLowerCase() || '';
    
    if (statusLower.includes('duyệt') || statusLower.includes('approved')) {
      return <Badge variant="default" className="bg-green-100 text-green-800">Đã duyệt</Badge>;
    }
    if (statusLower.includes('chờ') || statusLower.includes('pending')) {
      return <Badge variant="default" className="bg-yellow-100 text-yellow-800">Chờ duyệt</Badge>;
    }
    if (statusLower.includes('hủy') || statusLower.includes('reject')) {
      return <Badge variant="default" className="bg-red-100 text-red-800">Đã hủy</Badge>;
    }
    
    return <Badge variant="outline">{status || 'N/A'}</Badge>;
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ngày</TableHead>
            <TableHead>Loại hình</TableHead>
            <TableHead>Đối tượng</TableHead>
            <TableHead>Biển số</TableHead>
            <TableHead>Tài xế</TableHead>
            <TableHead>Nhiên liệu</TableHead>
            <TableHead className="text-right">Số lượng (L)</TableHead>
            <TableHead className="text-right">Đơn giá</TableHead>
            <TableHead className="text-right">Thành tiền</TableHead>
            <TableHead className="text-right">ODO</TableHead>
            <TableHead>Hạng mục</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction) => (
            <TableRow
              key={transaction.id}
              className={selectedRow === transaction.id ? 'bg-muted/50' : ''}
            >
              <TableCell className="font-medium">
                {formatDate(transaction.transaction_date)}
              </TableCell>
              <TableCell>
                <span className="text-sm">{transaction.fuel_source || '-'}</span>
              </TableCell>
              <TableCell>
                <span className="text-sm">{transaction.object || '-'}</span>
              </TableCell>
              <TableCell>
                <span className="font-mono text-sm">{transaction.license_plate || '-'}</span>
              </TableCell>
              <TableCell>
                <span className="text-sm">{transaction.driver_name || '-'}</span>
              </TableCell>
              <TableCell>
                <span className="text-sm">{transaction.fuel_type || '-'}</span>
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatNumber(transaction.quantity)}
              </TableCell>
              <TableCell className="text-right text-sm text-muted-foreground">
                {formatCurrency(transaction.unit_price)}
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(transaction.total_amount)}
              </TableCell>
              <TableCell className="text-right text-sm">
                {formatNumber(transaction.odo_number)}
              </TableCell>
              <TableCell>
                {getCategoryBadge(transaction.category)}
              </TableCell>
              <TableCell>
                {getStatusBadge(transaction.status)}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setSelectedRow(transaction.id)}
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
    </div>
  );
}
