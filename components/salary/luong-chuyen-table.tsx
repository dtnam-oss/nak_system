'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface LuongChuyenRecord {
  ma_chuyen_di: string;
  ngay_tao: string;
  nam: number;
  thang: number;
  ten_khach_hang: string;
  loai_chuyen: string;
  ten_tuyen: string;
  ma_tuyen: string;
  luong_tai_xe: number;
  ten_tai_xe: string;
  don_vi_van_chuyen: string;
}

interface LuongChuyenTableProps {
  data: LuongChuyenRecord[];
  loading?: boolean;
}

export function LuongChuyenTable({ data, loading }: LuongChuyenTableProps) {
  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(num || 0);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('vi-VN');
    } catch {
      return dateString;
    }
  };

  const getLoaiChuyenBadge = (loai: string) => {
    const colors: Record<string, string> = {
      'Một chiều': 'bg-blue-100 text-blue-800',
      'Hai chiều': 'bg-green-100 text-green-800',
      'Nhiều điểm': 'bg-purple-100 text-purple-800',
    };
    const colorClass = colors[loai] || 'bg-gray-100 text-gray-800';
    return <Badge className={colorClass}>{loai}</Badge>;
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Đang tải...</div>;
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Chưa có dữ liệu lương chuyến cho tháng này.
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[120px]">Mã chuyến</TableHead>
            <TableHead className="w-[100px]">Ngày</TableHead>
            <TableHead className="min-w-[150px]">Tài xế</TableHead>
            <TableHead className="min-w-[150px]">Khách hàng</TableHead>
            <TableHead>Loại chuyến</TableHead>
            <TableHead className="min-w-[200px]">Tuyến</TableHead>
            <TableHead>Đơn vị VC</TableHead>
            <TableHead className="text-right font-semibold">Lương chuyến</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((record, index) => (
            <TableRow key={`${record.ma_chuyen_di}-${index}`}>
              <TableCell className="font-medium">{record.ma_chuyen_di}</TableCell>
              <TableCell>{formatDate(record.ngay_tao)}</TableCell>
              <TableCell>{record.ten_tai_xe || '-'}</TableCell>
              <TableCell>{record.ten_khach_hang || '-'}</TableCell>
              <TableCell>{getLoaiChuyenBadge(record.loai_chuyen)}</TableCell>
              <TableCell>
                <div className="text-sm">
                  {record.ten_tuyen || record.ma_tuyen || '-'}
                </div>
                {record.ma_tuyen && record.ten_tuyen && (
                  <div className="text-xs text-muted-foreground">{record.ma_tuyen}</div>
                )}
              </TableCell>
              <TableCell>{record.don_vi_van_chuyen || '-'}</TableCell>
              <TableCell className="text-right font-bold text-green-600">
                {formatCurrency(record.luong_tai_xe)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Summary Footer */}
      <div className="border-t bg-gray-50 px-4 py-3">
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">
            Tổng: <span className="font-semibold text-foreground">{data.length}</span> chuyến
          </span>
          <span className="text-lg font-bold text-green-600">
            {formatCurrency(data.reduce((sum, r) => sum + (parseFloat(String(r.luong_tai_xe)) || 0), 0))}
          </span>
        </div>
      </div>
    </div>
  );
}
