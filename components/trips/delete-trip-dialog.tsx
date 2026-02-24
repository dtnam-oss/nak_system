'use client';

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle } from 'lucide-react';
import type { Trip } from './trip-table';

interface DeleteTripDialogProps {
  trip: Trip | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function DeleteTripDialog({ trip, open, onClose, onSuccess }: DeleteTripDialogProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const handleDelete = async () => {
    if (!trip) return;
    try {
      setDeleting(true);
      setError(null);

      const res = await fetch(`/api/trips/${encodeURIComponent(trip.ma_chuyen_di)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Xóa thất bại');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Không thể xóa chuyến đi');
      setDeleting(false);
    }
  };

  if (!trip) return null;

  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && !deleting && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Xác nhận xóa chuyến đi</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 pt-1">
              <p>
                Bạn có chắc chắn muốn xóa chuyến đi{' '}
                <strong className="font-mono text-foreground">{trip.ma_chuyen_di}</strong>?
              </p>
              <div className="rounded-md bg-muted/50 px-3 py-2 text-sm text-foreground space-y-1">
                <div><span className="text-muted-foreground">Tên tuyến:</span> {trip.ten_tuyen || '—'}</div>
                <div><span className="text-muted-foreground">Tài xế:</span> {trip.ten_tai_xe || '—'}</div>
                <div><span className="text-muted-foreground">Ngày:</span> {trip.ngay_tao}</div>
              </div>
              <p className="text-sm font-medium text-destructive">
                ⚠️ Hành động này sẽ xóa toàn bộ dữ liệu chi tiết và không thể khôi phục.
              </p>
              {error && (
                <Alert variant="destructive" className="py-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Hủy</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => { e.preventDefault(); handleDelete(); }}
            disabled={deleting}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Xóa chuyến đi
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
