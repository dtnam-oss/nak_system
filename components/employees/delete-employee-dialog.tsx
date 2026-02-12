'use client';

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, Trash2 } from 'lucide-react';

interface Employee {
  ma_nhan_vien: string;
  ho_va_ten: string;
  phong_ban: string | null;
}

interface DeleteEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
  onSuccess: () => void;
}

export function DeleteEmployeeDialog({
  open,
  onOpenChange,
  employee,
  onSuccess,
}: DeleteEmployeeDialogProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!employee) return;

    try {
      setDeleting(true);
      setError(null);

      const response = await fetch(
        `/api/employees?ma_nhan_vien=${employee.ma_nhan_vien}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Xóa thất bại');
      }

      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  if (!employee) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-red-600">
            <Trash2 className="h-5 w-5" />
            Xác nhận xóa nhân viên
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>Bạn có chắc chắn muốn xóa nhân viên này không?</p>
            <div className="bg-gray-100 p-3 rounded mt-2">
              <p className="font-semibold">
                {employee.ma_nhan_vien} - {employee.ho_va_ten}
              </p>
              {employee.phong_ban && (
                <p className="text-sm text-gray-600">{employee.phong_ban}</p>
              )}
            </div>
            <p className="text-red-600 font-semibold mt-2">
              ⚠️ Hành động này không thể hoàn tác!
            </p>
            <p className="text-sm text-gray-600">
              Nhân viên sẽ được đánh dấu là "Đã nghỉ việc" và không thể đăng nhập hệ thống.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleting}
          >
            Hủy
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {deleting ? 'Đang xóa...' : 'Xóa nhân viên'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
