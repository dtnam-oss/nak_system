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

interface SalaryRecord {
  id: number;
  ma_nhan_vien: string;
  ho_va_ten: string;
  phong_ban: string;
  chuc_vu: string;
  loai_nhan_vien: string;
  luong_co_ban: number;
  so_chuyen_di: number;
  tong_doanh_thu: number;
  luong_theo_chuyen: number;
  phu_cap: number;
  thuong: number;
  tong_thu_nhap: number;
  tong_khau_tru: number;
  thuc_lanh: number;
  trang_thai: string;
  ngay_thanh_toan: string;
}

interface SalaryTableProps {
  salaries: SalaryRecord[];
  loading?: boolean;
  type?: 'nhan_vien' | 'tai_xe';
}

export function SalaryTable({ salaries, loading, type }: SalaryTableProps) {
  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(num || 0);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'da_thanh_toan':
        return <Badge className="bg-green-100 text-green-800">Đã thanh toán</Badge>;
      case 'da_xac_nhan':
        return <Badge className="bg-blue-100 text-blue-800">Đã xác nhận</Badge>;
      case 'chua_thanh_toan':
        return <Badge className="bg-yellow-100 text-yellow-800">Chưa thanh toán</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Đang tải...</div>;
  }

  if (salaries.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Chưa có dữ liệu lương cho tháng này. Nhấn nút "Tính lương tháng này" để bắt đầu.
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Mã NV</TableHead>
            <TableHead className="min-w-[200px]">Họ tên</TableHead>
            <TableHead>Phòng ban</TableHead>
            <TableHead>Chức vụ</TableHead>
            {type === 'tai_xe' && (
              <>
                <TableHead className="text-right">Số chuyến</TableHead>
                <TableHead className="text-right">Doanh thu</TableHead>
                <TableHead className="text-right">Lương chuyến</TableHead>
              </>
            )}
            <TableHead className="text-right">Lương CB</TableHead>
            <TableHead className="text-right">Phụ cấp</TableHead>
            <TableHead className="text-right">Thưởng</TableHead>
            <TableHead className="text-right">Tổng TN</TableHead>
            <TableHead className="text-right">Khấu trừ</TableHead>
            <TableHead className="text-right font-semibold">Thực lãnh</TableHead>
            <TableHead>Trạng thái</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {salaries.map((salary) => (
            <TableRow key={salary.id}>
              <TableCell className="font-medium">{salary.ma_nhan_vien}</TableCell>
              <TableCell>{salary.ho_va_ten}</TableCell>
              <TableCell>{salary.phong_ban || '-'}</TableCell>
              <TableCell>{salary.chuc_vu || '-'}</TableCell>
              {type === 'tai_xe' && (
                <>
                  <TableCell className="text-right">{salary.so_chuyen_di || 0}</TableCell>
                  <TableCell className="text-right">{formatCurrency(salary.tong_doanh_thu)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(salary.luong_theo_chuyen)}</TableCell>
                </>
              )}
              <TableCell className="text-right">{formatCurrency(salary.luong_co_ban)}</TableCell>
              <TableCell className="text-right">{formatCurrency(salary.phu_cap)}</TableCell>
              <TableCell className="text-right">{formatCurrency(salary.thuong)}</TableCell>
              <TableCell className="text-right font-semibold">
                {formatCurrency(salary.tong_thu_nhap)}
              </TableCell>
              <TableCell className="text-right text-red-600">
                -{formatCurrency(salary.tong_khau_tru)}
              </TableCell>
              <TableCell className="text-right font-bold text-green-600">
                {formatCurrency(salary.thuc_lanh)}
              </TableCell>
              <TableCell>{getStatusBadge(salary.trang_thai)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
