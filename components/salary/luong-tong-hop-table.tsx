'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface LuongTongHopRecord {
  id: string;
  ma_nhan_vien: string;
  ten_nhan_vien: string;
  phong_ban: string;
  chuc_vu: string;
  thang: number;
  nam: number;
  luong_chuyen: number;
  cp_sua_chua: number;
  cp_do_dau: number;
  cp_phat_sinh: number;
  cp_ccdc: number;
  ho_tro: number;
  truy_thu: number;
  tru_coc: number;
  hoan_coc: number;
  tam_ung: number;
  phat_nguoi: number;
  bhxh: number;
  khac: number;
}

interface LuongTongHopTableProps {
  data: LuongTongHopRecord[];
  loading?: boolean;
}

export function LuongTongHopTable({ data, loading }: LuongTongHopTableProps) {
  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(num || 0);
  };

  // Calculate total salary = luong_chuyen - deductions + additions
  const calculateTotal = (record: LuongTongHopRecord) => {
    const income = (record.luong_chuyen || 0) + (record.ho_tro || 0) + (record.hoan_coc || 0);
    const deductions = (record.cp_sua_chua || 0) +
                      (record.cp_do_dau || 0) +
                      (record.cp_phat_sinh || 0) +
                      (record.cp_ccdc || 0) +
                      (record.truy_thu || 0) +
                      (record.tru_coc || 0) +
                      (record.tam_ung || 0) +
                      (record.phat_nguoi || 0) +
                      (record.bhxh || 0) +
                      (record.khac || 0);
    return income - deductions;
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Đang tải...</div>;
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Chưa có dữ liệu lương tổng hợp cho tháng này.
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

            {/* Thu nhập */}
            <TableHead className="text-right bg-green-50">Lương chuyến</TableHead>
            <TableHead className="text-right bg-green-50">Hỗ trợ</TableHead>
            <TableHead className="text-right bg-green-50">Hoàn cọc</TableHead>

            {/* Chi phí */}
            <TableHead className="text-right bg-red-50">CP Sửa chữa</TableHead>
            <TableHead className="text-right bg-red-50">CP Đổ dầu</TableHead>
            <TableHead className="text-right bg-red-50">CP Phát sinh</TableHead>
            <TableHead className="text-right bg-red-50">CP CCDC</TableHead>

            {/* Khấu trừ */}
            <TableHead className="text-right bg-orange-50">Truy thu</TableHead>
            <TableHead className="text-right bg-orange-50">Trừ cọc</TableHead>
            <TableHead className="text-right bg-orange-50">Tạm ứng</TableHead>
            <TableHead className="text-right bg-orange-50">Phạt người</TableHead>
            <TableHead className="text-right bg-orange-50">BHXH</TableHead>
            <TableHead className="text-right bg-orange-50">Khác</TableHead>

            {/* Tổng */}
            <TableHead className="text-right font-semibold bg-blue-50">Thực lãnh</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((record, index) => (
            <TableRow key={record.id}>
              <TableCell className="font-medium">{record.ma_nhan_vien}</TableCell>
              <TableCell>{record.ten_nhan_vien}</TableCell>
              <TableCell>{record.phong_ban || '-'}</TableCell>
              <TableCell>{record.chuc_vu || '-'}</TableCell>

              {/* Thu nhập */}
              <TableCell className="text-right text-green-600 font-semibold">
                {formatCurrency(record.luong_chuyen)}
              </TableCell>
              <TableCell className="text-right text-green-600">
                {formatCurrency(record.ho_tro)}
              </TableCell>
              <TableCell className="text-right text-green-600">
                {formatCurrency(record.hoan_coc)}
              </TableCell>

              {/* Chi phí */}
              <TableCell className="text-right text-red-600">
                {formatCurrency(record.cp_sua_chua)}
              </TableCell>
              <TableCell className="text-right text-red-600">
                {formatCurrency(record.cp_do_dau)}
              </TableCell>
              <TableCell className="text-right text-red-600">
                {formatCurrency(record.cp_phat_sinh)}
              </TableCell>
              <TableCell className="text-right text-red-600">
                {formatCurrency(record.cp_ccdc)}
              </TableCell>

              {/* Khấu trừ */}
              <TableCell className="text-right text-orange-600">
                {formatCurrency(record.truy_thu)}
              </TableCell>
              <TableCell className="text-right text-orange-600">
                {formatCurrency(record.tru_coc)}
              </TableCell>
              <TableCell className="text-right text-orange-600">
                {formatCurrency(record.tam_ung)}
              </TableCell>
              <TableCell className="text-right text-orange-600">
                {formatCurrency(record.phat_nguoi)}
              </TableCell>
              <TableCell className="text-right text-orange-600">
                {formatCurrency(record.bhxh)}
              </TableCell>
              <TableCell className="text-right text-orange-600">
                {formatCurrency(record.khac)}
              </TableCell>

              {/* Tổng */}
              <TableCell className="text-right font-bold text-blue-600 bg-blue-50">
                {formatCurrency(calculateTotal(record))}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Summary Footer */}
      <div className="border-t bg-gray-50 px-4 py-3">
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">
            Tổng: <span className="font-semibold text-foreground">{data.length}</span> bản ghi
          </span>
          <span className="text-lg font-bold text-blue-600">
            Tổng thực lãnh: {formatCurrency(data.reduce((sum, r) => sum + calculateTotal(r), 0))}
          </span>
        </div>
      </div>
    </div>
  );
}
