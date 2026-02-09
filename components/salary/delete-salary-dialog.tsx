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

interface LuongTongHopRecord {
  id: string;
  ma_nhan_vien: string;
  ten_nhan_vien: string;
  thang: number;
  nam: number;
}

interface DeleteSalaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: LuongTongHopRecord | null;
  onSuccess: () => void;
}

export function DeleteSalaryDialog({
  open,
  onOpenChange,
  record,
  onSuccess,
}: DeleteSalaryDialogProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!record) return;

    try {
      setDeleting(true);
      setError(null);

      const response = await fetch(`/api/salary/luong-tong-hop/${record.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
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

  if (!record) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-red-600">
            <Trash2 className="h-5 w-5" />
            Xác nhận xóa phiếu lương
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>Bạn có chắc chắn muốn xóa phiếu lương này không?</p>
            <div className="bg-gray-100 p-3 rounded mt-2">
              <p className="font-semibold">{record.ma_nhan_vien} - {record.ten_nhan_vien}</p>
              <p className="text-sm text-gray-600">Tháng {record.thang}/{record.nam}</p>
            </div>
            <p className="text-red-600 font-semibold mt-2">
              ⚠️ Hành động này không thể hoàn tác!
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
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {deleting ? 'Đang xóa...' : 'Xóa phiếu lương'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
