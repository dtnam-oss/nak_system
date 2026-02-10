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
  email: string;
  chuc_vu: string;
  thang: number;
  nam: number;
  
  // Thu nhập (Income items)
  luong_bat_dau: number;  // Lương chuyển
  tong_chi_phi_sua_chua: number;  // Hoàn phí sửa chữa
  hoan_coc: number;  // Hoàn cọc
  chi_phi_do_dau_ngoai: number;  // Hoàn phí đổ dầu ngoài
  chi_phi_phat_sinh_new: number;  // Hoàn chi phí phát sinh
  
  // Khấu trừ (Deduction items)
  truy_thu_dau: number;  // Truy thu đầu
  truy_thu_ontime: number;  // Truy thu ontime
  tru_coc: number;  // Trừ cọc
  tam_ung: number;  // Phí tạm ứng
  phat_che_tai: number;  // Phạt chế tài
  truy_thu_vetc: number;  // Truy thu VETC
  phat_nguoi: number;  // Phạt nguội
  tien_lam_the: number;  // Tiền làm thẻ
  bhxh: number;  // BHXH
  khac: number;  // Khác
  
  // Calculated fields
  tong_thu_nhap: number;
  tong_khau_tru: number;
  luong_thuc_lanh: number;
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
            <TableHead rowSpan={2} className="border-r font-semibold text-xs">STT</TableHead>
            <TableHead rowSpan={2} className="border-r font-semibold text-xs">Mã NV</TableHead>
            <TableHead rowSpan={2} className="border-r min-w-[180px] font-semibold text-xs">Họ và tên</TableHead>
            <TableHead rowSpan={2} className="border-r font-semibold text-xs">Chức danh</TableHead>

            <TableHead colSpan={5} className="text-center bg-green-100 border-r font-semibold text-xs">
              📈 CÁC KHOẢN THU NHẬP TRONG THÁNG (Cộng)
            </TableHead>

            <TableHead colSpan={10} className="text-center bg-red-100 border-r font-semibold text-xs">
              📉 CÁC KHOẢN KHẤU TRỪ TRONG THÁNG (Trừ)
            </TableHead>

            <TableHead rowSpan={2} className="text-center bg-blue-100 border-r font-bold text-xs">💰 THU NHẬP THỰC LĨNH</TableHead>

            <TableHead rowSpan={2} className="text-center font-semibold text-xs">Thao tác</TableHead>
          </TableRow>

          {/* Sub-header row */}
          <TableRow className="bg-gray-50">
            {/* Thu nhập */}
            <TableHead className="text-right text-xs bg-green-50">Lương chuyển</TableHead>
            <TableHead className="text-right text-xs bg-green-50">Hoàn phí sửa chữa</TableHead>
            <TableHead className="text-right text-xs bg-green-50">Hoàn cọc</TableHead>
            <TableHead className="text-right text-xs bg-green-50">Hoàn phí đổ dầu ngoài</TableHead>
            <TableHead className="text-right text-xs bg-green-50 border-r">Hoàn chi phí phát sinh</TableHead>

            {/* Khấu trừ */}
            <TableHead className="text-right text-xs bg-red-50">Truy thu đầu</TableHead>
            <TableHead className="text-right text-xs bg-red-50">Truy thu ontime</TableHead>
            <TableHead className="text-right text-xs bg-red-50">Trừ cọc</TableHead>
            <TableHead className="text-right text-xs bg-red-50">Phí tạm ứng</TableHead>
            <TableHead className="text-right text-xs bg-red-50">Phạt chế tài</TableHead>
            <TableHead className="text-right text-xs bg-red-50">Truy thu VETC</TableHead>
            <TableHead className="text-right text-xs bg-red-50">Phạt nguội</TableHead>
            <TableHead className="text-right text-xs bg-red-50">Tiền làm thẻ</TableHead>
            <TableHead className="text-right text-xs bg-red-50">BHXH</TableHead>
            <TableHead className="text-right text-xs bg-red-50 border-r">Khác</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((record, index) => {
            // Use calculated fields from database
            const thucLanh = record.luong_thuc_lanh || 0;

            return (
              <TableRow key={record.id} className="hover:bg-gray-50">
                <TableCell className="text-center border-r text-xs">{index + 1}</TableCell>
                <TableCell className="font-medium border-r text-xs">{record.ma_nhan_vien}</TableCell>
                <TableCell className="border-r text-xs">{record.ten_nhan_vien}</TableCell>
                <TableCell className="border-r text-xs">{record.chuc_vu || 'Tài xế'}</TableCell>

                {/* THU NHẬP */}
                <TableCell className="text-right text-green-700 font-semibold text-xs">
                  {formatCurrency(record.luong_bat_dau)}
                </TableCell>
                <TableCell className="text-right text-green-600 text-xs">
                  {formatCurrency(record.tong_chi_phi_sua_chua)}
                </TableCell>
                <TableCell className="text-right text-green-600 text-xs">
                  {formatCurrency(record.hoan_coc)}
                </TableCell>
                <TableCell className="text-right text-green-600 text-xs">
                  {formatCurrency(record.chi_phi_do_dau_ngoai)}
                </TableCell>
                <TableCell className="text-right text-green-600 border-r text-xs">
                  {formatCurrency(record.chi_phi_phat_sinh_new)}
                </TableCell>

                {/* KHẤU TRỪ */}
                <TableCell className="text-right text-red-600 text-xs">
                  {formatCurrency(record.truy_thu_dau)}
                </TableCell>
                <TableCell className="text-right text-red-600 text-xs">
                  {formatCurrency(record.truy_thu_ontime)}
                </TableCell>
                <TableCell className="text-right text-red-600 text-xs">
                  {formatCurrency(record.tru_coc)}
                </TableCell>
                <TableCell className="text-right text-red-600 text-xs">
                  {formatCurrency(record.tam_ung)}
                </TableCell>
                <TableCell className="text-right text-red-600 text-xs">
                  {formatCurrency(record.phat_che_tai)}
                </TableCell>
                <TableCell className="text-right text-red-600 text-xs">
                  {formatCurrency(record.truy_thu_vetc)}
                </TableCell>
                <TableCell className="text-right text-red-600 text-xs">
                  {formatCurrency(record.phat_nguoi)}
                </TableCell>
                <TableCell className="text-right text-red-600 text-xs">
                  {formatCurrency(record.tien_lam_the)}
                </TableCell>
                <TableCell className="text-right text-red-600 text-xs">
                  {formatCurrency(record.bhxh)}
                </TableCell>
                <TableCell className="text-right text-red-600 border-r text-xs">
                  {formatCurrency(record.khac)}
                </TableCell>

                {/* KẾT QUẢ */}
                <TableCell className="text-right font-bold text-blue-700 bg-blue-50 border-r text-xs">
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
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-600 text-xs mb-1">Số nhân viên</p>
            <p className="font-bold text-lg">{data.length} người</p>
          </div>
          <div>
            <p className="text-green-600 text-xs mb-1">📈 Tổng thu nhập</p>
            <p className="font-bold text-lg text-green-700">
              {formatCurrency(data.reduce((sum, r) => sum + (r.tong_thu_nhap || 0), 0))}
            </p>
          </div>
          <div className="bg-blue-100 px-3 py-2 rounded">
            <p className="text-blue-700 text-xs mb-1 font-semibold">💰 Tổng thực lãnh</p>
            <p className="font-bold text-xl text-blue-800">
              {formatCurrency(data.reduce((sum, r) => sum + (r.luong_thuc_lanh || 0), 0))}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
