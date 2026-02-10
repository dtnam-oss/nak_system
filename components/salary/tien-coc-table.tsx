'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface TienCocRecord {
  id: string;
  ma_tai_xe: string;
  ten_tai_xe: string;
  email: string;
  tien_thu_coc: number;
  thang: number;
  nam: number;
}

interface TienCocTableProps {
  data: TienCocRecord[];
  loading?: boolean;
}

export function TienCocTable({ data, loading }: TienCocTableProps) {
  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(num || 0);
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Đang tải...</div>;
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Chưa có dữ liệu tiền cọc cho tháng này.
      </div>
    );
  }

  // Calculate totals
  const totalTienCoc = data.reduce((sum, record) => sum + record.tien_thu_coc, 0);

  return (
    <div className="space-y-4">
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">STT</TableHead>
              <TableHead className="w-[120px]">Mã tài xế</TableHead>
              <TableHead className="min-w-[200px]">Tên tài xế</TableHead>
              <TableHead className="min-w-[250px]">Email</TableHead>
              <TableHead className="text-right font-semibold w-[180px]">Tiền thu cọc</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((record, index) => (
              <TableRow key={record.id}>
                <TableCell className="text-center">{index + 1}</TableCell>
                <TableCell className="font-medium">{record.ma_tai_xe}</TableCell>
                <TableCell>{record.ten_tai_xe || '-'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{record.email || '-'}</TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(record.tien_thu_coc)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Summary Footer */}
      <div className="flex justify-end">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 min-w-[300px]">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-blue-900">Tổng tiền cọc:</span>
            <span className="text-xl font-bold text-blue-600">
              {formatCurrency(totalTienCoc)}
            </span>
          </div>
          <div className="text-sm text-blue-700 mt-1">
            {data.length} tài xế
          </div>
        </div>
      </div>
    </div>
  );
}
