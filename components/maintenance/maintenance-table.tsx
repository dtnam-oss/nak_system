'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface MaintenanceRecord {
  id: string;
  ngay: string;
  loai_xe: string | null;
  bien_so_xe: string;
  loai_phu_tung: string | null;
  ma_phu_tung: string | null;
  ten_phu_tung: string | null;
  so_luong: number;
  don_gia: number;
  thanh_tien: number;
  km_sua_chua: number;
  so_tien: number;
  ca_nhan_thanh_toan: string | null;
  dia_chi_sua_chua: string | null;
  ma_nhan_vien: string | null;
  ten_nhan_vien: string | null;
}

interface MaintenanceTableProps {
  data: MaintenanceRecord[];
  loading?: boolean;
}

export function MaintenanceTable({ data, loading }: MaintenanceTableProps) {
  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(num || 0);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Đang tải...</div>;
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Chưa có dữ liệu chi phí sửa chữa cho tháng này.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-100">
              <TableHead className="font-semibold text-xs">STT</TableHead>
              <TableHead className="font-semibold text-xs">Ngày</TableHead>
              <TableHead className="font-semibold text-xs">Biển số xe</TableHead>
              <TableHead className="font-semibold text-xs">Tên phụ tùng/Dịch vụ</TableHead>
              <TableHead className="text-right font-semibold text-xs">Số lượng</TableHead>
              <TableHead className="text-right font-semibold text-xs">Đơn giá</TableHead>
              <TableHead className="text-right font-semibold text-xs">Thành tiền</TableHead>
              <TableHead className="text-right font-semibold text-xs">Tổng chi phí</TableHead>
              <TableHead className="font-semibold text-xs">Địa chỉ sửa chữa</TableHead>
              <TableHead className="font-semibold text-xs">Tài xế</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((record, index) => (
              <TableRow key={record.id} className="hover:bg-gray-50">
                <TableCell className="text-center text-xs">{index + 1}</TableCell>
                <TableCell className="text-xs whitespace-nowrap">
                  {formatDate(record.ngay)}
                </TableCell>
                <TableCell className="font-medium text-xs">{record.bien_so_xe}</TableCell>
                <TableCell className="text-xs min-w-[200px]">
                  {record.ten_phu_tung || '-'}
                </TableCell>
                <TableCell className="text-right text-xs">
                  {record.so_luong > 0 ? record.so_luong : '-'}
                </TableCell>
                <TableCell className="text-right text-xs">
                  {record.don_gia > 0 ? formatCurrency(record.don_gia) : '-'}
                </TableCell>
                <TableCell className="text-right text-xs">
                  {record.thanh_tien > 0 ? formatCurrency(record.thanh_tien) : '-'}
                </TableCell>
                <TableCell className="text-right font-semibold text-orange-600 text-xs">
                  {formatCurrency(record.so_tien)}
                </TableCell>
                <TableCell className="text-xs">{record.dia_chi_sua_chua || '-'}</TableCell>
                <TableCell className="text-xs">
                  {record.ten_nhan_vien ? (
                    <div>
                      <div className="font-medium">{record.ten_nhan_vien}</div>
                      <div className="text-muted-foreground text-[10px]">
                        {record.ma_nhan_vien}
                      </div>
                    </div>
                  ) : (
                    '-'
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Summary Footer */}
      <div className="border rounded-lg bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4">
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-600 text-xs mb-1">Tổng số records</p>
            <p className="font-bold text-lg">{data.length}</p>
          </div>
          <div>
            <p className="text-gray-600 text-xs mb-1">Số xe</p>
            <p className="font-bold text-lg">
              {new Set(data.map((r) => r.bien_so_xe)).size}
            </p>
          </div>
          <div>
            <p className="text-gray-600 text-xs mb-1">Số tài xế</p>
            <p className="font-bold text-lg">
              {new Set(data.filter((r) => r.ma_nhan_vien).map((r) => r.ma_nhan_vien)).size}
            </p>
          </div>
          <div className="bg-orange-100 px-3 py-2 rounded">
            <p className="text-orange-700 text-xs mb-1 font-semibold">💰 Tổng chi phí</p>
            <p className="font-bold text-xl text-orange-800">
              {formatCurrency(data.reduce((sum, r) => sum + (r.so_tien || 0), 0))}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
