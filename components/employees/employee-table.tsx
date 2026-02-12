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
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2 } from 'lucide-react';

interface Employee {
  id?: number;
  ma_nhan_vien: string;
  ho_va_ten: string;
  phong_ban: string | null;
  chuc_vu: string | null;
  so_dien_thoai: string | null;
  email: string | null;
  tinh_trang_cong_tac: string | null;
  is_active?: boolean;
  phan_quyen?: string | null;
}

interface EmployeeTableProps {
  data: Employee[];
  loading?: boolean;
  onEdit?: (employee: Employee) => void;
  onDelete?: (employee: Employee) => void;
}

export function EmployeeTable({
  data,
  loading,
  onEdit,
  onDelete,
}: EmployeeTableProps) {
  if (loading) {
    return (
      <div className="text-center py-8 text-muted-foreground">Đang tải...</div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Chưa có dữ liệu nhân viên.
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-100">
            <TableHead className="border-r font-semibold text-xs w-[50px]">
              STT
            </TableHead>
            <TableHead className="border-r font-semibold text-xs min-w-[100px]">
              Mã NV
            </TableHead>
            <TableHead className="border-r font-semibold text-xs min-w-[200px]">
              Họ và tên
            </TableHead>
            <TableHead className="border-r font-semibold text-xs min-w-[120px]">
              Phòng ban
            </TableHead>
            <TableHead className="border-r font-semibold text-xs min-w-[120px]">
              Chức vụ
            </TableHead>
            <TableHead className="border-r font-semibold text-xs min-w-[130px]">
              Điện thoại
            </TableHead>
            <TableHead className="border-r font-semibold text-xs min-w-[180px]">
              Email
            </TableHead>
            <TableHead className="border-r font-semibold text-xs min-w-[150px]">
              Tình trạng
            </TableHead>
            <TableHead className="border-r font-semibold text-xs min-w-[120px]">
              Trạng thái
            </TableHead>
            <TableHead className="text-center font-semibold text-xs w-[100px]">
              Thao tác
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((employee, index) => (
            <TableRow key={employee.ma_nhan_vien} className="hover:bg-gray-50">
              <TableCell className="text-center border-r text-xs">
                {index + 1}
              </TableCell>
              <TableCell className="font-medium border-r text-xs">
                {employee.ma_nhan_vien}
              </TableCell>
              <TableCell className="border-r text-xs font-semibold">
                {employee.ho_va_ten}
              </TableCell>
              <TableCell className="border-r text-xs">
                {employee.phong_ban || '-'}
              </TableCell>
              <TableCell className="border-r text-xs">
                {employee.chuc_vu || '-'}
              </TableCell>
              <TableCell className="border-r text-xs">
                {employee.so_dien_thoai || '-'}
              </TableCell>
              <TableCell className="border-r text-xs">
                {employee.email || '-'}
              </TableCell>
              <TableCell className="border-r text-xs">
                {employee.tinh_trang_cong_tac || '-'}
              </TableCell>
              <TableCell className="border-r text-xs">
                <Badge
                  variant={employee.is_active === false ? 'destructive' : 'default'}
                  className={
                    employee.is_active === false
                      ? 'bg-red-100 text-red-700'
                      : 'bg-green-100 text-green-700'
                  }
                >
                  {employee.is_active === false ? 'Đã nghỉ việc' : 'Đang làm việc'}
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                <div className="flex gap-1 justify-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => onEdit?.(employee)}
                    title="Sửa"
                  >
                    <Pencil className="h-4 w-4 text-blue-600" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => onDelete?.(employee)}
                    title="Xóa"
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Summary Footer */}
      <div className="border-t bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4">
        <div className="flex items-center gap-4 text-sm">
          <div>
            <p className="text-gray-600 text-xs mb-1">Tổng số nhân viên</p>
            <p className="font-bold text-lg">{data.length} người</p>
          </div>
          <div className="ml-4">
            <p className="text-green-600 text-xs mb-1">Đang làm việc</p>
            <p className="font-bold text-lg text-green-700">
              {data.filter((e) => e.is_active !== false).length} người
            </p>
          </div>
          <div className="ml-4">
            <p className="text-red-600 text-xs mb-1">Đã nghỉ việc</p>
            <p className="font-bold text-lg text-red-700">
              {data.filter((e) => e.is_active === false).length} người
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
