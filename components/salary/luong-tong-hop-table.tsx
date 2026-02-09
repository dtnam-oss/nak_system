'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';

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
  onEdit?: (record: LuongTongHopRecord) => void;
  onDelete?: (record: LuongTongHopRecord) => void;
}

export function LuongTongHopTable({ data, loading, onEdit, onDelete }: LuongTongHopTableProps) {
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
        Chưa có dữ liệu lương tổng hợp cho tháng này.
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          {/* Main header row with grouped columns */}
          <TableRow className="bg-gray-100">
            <TableHead rowSpan={2} className="border-r font-semibold">Mã NV</TableHead>
            <TableHead rowSpan={2} className="border-r min-w-[180px] font-semibold">Họ tên</TableHead>
            <TableHead rowSpan={2} className="border-r font-semibold">Phòng ban</TableHead>

            <TableHead colSpan={3} className="text-center bg-green-100 border-r font-semibold">
              📈 GIAI ĐOẠN 1: THU NHẬP (Cộng)
            </TableHead>

            <TableHead colSpan={8} className="text-center bg-red-100 border-r font-semibold">
              📉 GIAI ĐOẠN 2: CHI PHÍ & KHẤU TRỪ (Trừ)
            </TableHead>

            <TableHead colSpan={3} className="text-center bg-blue-100 border-r font-semibold">
              💰 GIAI ĐOẠN 3: KẾT QUẢ
            </TableHead>

            <TableHead rowSpan={2} className="text-center font-semibold">Thao tác</TableHead>
          </TableRow>

          {/* Sub-header row */}
          <TableRow className="bg-gray-50">
            {/* Thu nhập */}
            <TableHead className="text-right text-xs bg-green-50">Lương chuyến</TableHead>
            <TableHead className="text-right text-xs bg-green-50">Hỗ trợ</TableHead>
            <TableHead className="text-right text-xs bg-green-50 border-r">Hoàn cọc</TableHead>

            {/* Chi phí & Khấu trừ */}
            <TableHead className="text-right text-xs bg-red-50">CP Sửa chữa</TableHead>
            <TableHead className="text-right text-xs bg-red-50">CP Đổ dầu</TableHead>
            <TableHead className="text-right text-xs bg-red-50">CP Phát sinh</TableHead>
            <TableHead className="text-right text-xs bg-red-50">CP CCDC</TableHead>
            <TableHead className="text-right text-xs bg-orange-50">Truy thu</TableHead>
            <TableHead className="text-right text-xs bg-orange-50">Trừ cọc</TableHead>
            <TableHead className="text-right text-xs bg-orange-50">Tạm ứng</TableHead>
            <TableHead className="text-right text-xs bg-orange-50 border-r">Phạt & BHXH</TableHead>

            {/* Kết quả */}
            <TableHead className="text-right text-xs bg-blue-50 font-semibold">Tổng TN</TableHead>
            <TableHead className="text-right text-xs bg-blue-50 font-semibold">Tổng KT</TableHead>
            <TableHead className="text-right text-xs bg-blue-50 border-r font-bold">Thực lãnh</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((record, index) => {
            const tongThuNhap = (record.luong_chuyen || 0) + (record.ho_tro || 0) + (record.hoan_coc || 0);
            const tongKhauTru = (record.cp_sua_chua || 0) + (record.cp_do_dau || 0) + (record.cp_phat_sinh || 0) +
                               (record.cp_ccdc || 0) + (record.truy_thu || 0) + (record.tru_coc || 0) +
                               (record.tam_ung || 0) + (record.phat_nguoi || 0) + (record.bhxh || 0) + (record.khac || 0);
            const thucLanh = tongThuNhap - tongKhauTru;
            const phatVaBhxh = (record.phat_nguoi || 0) + (record.bhxh || 0) + (record.khac || 0);

            return (
              <TableRow key={record.id} className="hover:bg-gray-50">
                <TableCell className="font-medium border-r">{record.ma_nhan_vien}</TableCell>
                <TableCell className="border-r">{record.ten_nhan_vien}</TableCell>
                <TableCell className="border-r text-xs">{record.phong_ban || '-'}</TableCell>

                {/* GIAI ĐOẠN 1: Thu nhập */}
                <TableCell className="text-right text-green-700 font-semibold">
                  {formatCurrency(record.luong_chuyen)}
                </TableCell>
                <TableCell className="text-right text-green-600">
                  {formatCurrency(record.ho_tro)}
                </TableCell>
                <TableCell className="text-right text-green-600 border-r">
                  {formatCurrency(record.hoan_coc)}
                </TableCell>

                {/* GIAI ĐOẠN 2: Chi phí & Khấu trừ */}
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
                <TableCell className="text-right text-orange-600">
                  {formatCurrency(record.truy_thu)}
                </TableCell>
                <TableCell className="text-right text-orange-600">
                  {formatCurrency(record.tru_coc)}
                </TableCell>
                <TableCell className="text-right text-orange-600">
                  {formatCurrency(record.tam_ung)}
                </TableCell>
                <TableCell className="text-right text-orange-600 border-r">
                  {formatCurrency(phatVaBhxh)}
                </TableCell>

                {/* GIAI ĐOẠN 3: Kết quả */}
                <TableCell className="text-right font-semibold text-green-700 bg-green-50">
                  {formatCurrency(tongThuNhap)}
                </TableCell>
                <TableCell className="text-right font-semibold text-red-700 bg-red-50">
                  -{formatCurrency(tongKhauTru)}
                </TableCell>
                <TableCell className="text-right font-bold text-blue-700 bg-blue-50 border-r">
                  {formatCurrency(thucLanh)}
                </TableCell>

                {/* Action buttons */}
                <TableCell className="text-center">
                  <div className="flex gap-1 justify-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => onEdit?.(record)}
                    >
                      <Pencil className="h-4 w-4 text-blue-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => onDelete?.(record)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Summary Footer */}
      <div className="border-t bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4">
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-600 text-xs mb-1">Số nhân viên</p>
            <p className="font-bold text-lg">{data.length} người</p>
          </div>
          <div>
            <p className="text-green-600 text-xs mb-1">📈 Tổng thu nhập</p>
            <p className="font-bold text-lg text-green-700">
              {formatCurrency(data.reduce((sum, r) =>
                sum + (r.luong_chuyen || 0) + (r.ho_tro || 0) + (r.hoan_coc || 0), 0
              ))}
            </p>
          </div>
          <div>
            <p className="text-red-600 text-xs mb-1">📉 Tổng khấu trừ</p>
            <p className="font-bold text-lg text-red-700">
              -{formatCurrency(data.reduce((sum, r) =>
                sum + (r.cp_sua_chua || 0) + (r.cp_do_dau || 0) + (r.cp_phat_sinh || 0) +
                (r.cp_ccdc || 0) + (r.truy_thu || 0) + (r.tru_coc || 0) +
                (r.tam_ung || 0) + (r.phat_nguoi || 0) + (r.bhxh || 0) + (r.khac || 0), 0
              ))}
            </p>
          </div>
          <div className="bg-blue-100 px-3 py-2 rounded">
            <p className="text-blue-700 text-xs mb-1 font-semibold">💰 Tổng thực lãnh</p>
            <p className="font-bold text-xl text-blue-800">
              {formatCurrency(data.reduce((sum, r) => {
                const income = (r.luong_chuyen || 0) + (r.ho_tro || 0) + (r.hoan_coc || 0);
                const deduct = (r.cp_sua_chua || 0) + (r.cp_do_dau || 0) + (r.cp_phat_sinh || 0) +
                              (r.cp_ccdc || 0) + (r.truy_thu || 0) + (r.tru_coc || 0) +
                              (r.tam_ung || 0) + (r.phat_nguoi || 0) + (r.bhxh || 0) + (r.khac || 0);
                return sum + (income - deduct);
              }, 0))}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
