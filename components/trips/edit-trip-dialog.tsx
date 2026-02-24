'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { Trip } from './trip-table';

const DVVC_OPTIONS        = ['NAK', 'VENDOR'];
const LOAI_CHUYEN_OPTIONS = ['Một chiều', 'Hai chiều', 'Nhiều điểm'];
const LOAI_TUYEN_OPTIONS  = ['Nội thành', 'Liên tỉnh', 'Đường dài'];
const TRANG_THAI_OPTIONS  = ['Kết thúc', 'Đang thực hiện', 'Chờ giao hàng', 'Hủy'];

interface EditTripDialogProps {
  trip: Trip | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditTripDialog({ trip, open, onClose, onSuccess }: EditTripDialogProps) {
  const [form, setForm] = useState({
    ten_tuyen:         '',
    ten_tai_xe:        '',
    don_vi_van_chuyen: '',
    loai_chuyen:       '',
    loai_tuyen:        '',
    trang_thai:        '',
    doanh_thu:         '',
    so_km:             '',
    ghi_chu:           '',
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Pre-fill form when trip changes
  useEffect(() => {
    if (!trip) return;
    setForm({
      ten_tuyen:         trip.ten_tuyen || '',
      ten_tai_xe:        trip.ten_tai_xe || '',
      don_vi_van_chuyen: trip.don_vi_van_chuyen || '',
      loai_chuyen:       trip.loai_chuyen || '',
      loai_tuyen:        trip.loai_tuyen || '',
      trang_thai:        trip.trang_thai || '',
      doanh_thu:         trip.doanh_thu ? String(trip.doanh_thu) : '',
      so_km:             trip.so_km ? String(trip.so_km) : '',
      ghi_chu:           '',
    });
    setError(null);
    setSuccess(false);
  }, [trip, open]);

  const set = (field: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    if (!trip) return;
    try {
      setSaving(true);
      setError(null);

      const payload: Record<string, any> = {
        ten_tuyen:         form.ten_tuyen,
        ten_tai_xe:        form.ten_tai_xe,
        don_vi_van_chuyen: form.don_vi_van_chuyen,
        loai_chuyen:       form.loai_chuyen,
        loai_tuyen:        form.loai_tuyen,
        trang_thai:        form.trang_thai,
        ghi_chu:           form.ghi_chu,
      };
      if (form.doanh_thu !== '') payload.doanh_thu = parseFloat(form.doanh_thu) || 0;
      if (form.so_km     !== '') payload.so_km     = parseFloat(form.so_km) || 0;

      const res = await fetch(`/api/trips/${encodeURIComponent(trip.ma_chuyen_di)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Cập nhật thất bại');
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Không thể cập nhật chuyến đi');
    } finally {
      setSaving(false);
    }
  };

  if (!trip) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">
            Chỉnh sửa chuyến đi{' '}
            <span className="font-mono text-primary">{trip.ma_chuyen_di}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Tên tuyến */}
          <div className="space-y-1.5">
            <Label htmlFor="ten_tuyen">Tên tuyến</Label>
            <Input
              id="ten_tuyen"
              value={form.ten_tuyen}
              onChange={(e) => set('ten_tuyen', e.target.value)}
              placeholder="Nhập tên tuyến..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Tài xế */}
            <div className="space-y-1.5">
              <Label htmlFor="ten_tai_xe">Tài xế</Label>
              <Input
                id="ten_tai_xe"
                value={form.ten_tai_xe}
                onChange={(e) => set('ten_tai_xe', e.target.value)}
                placeholder="Tên tài xế..."
              />
            </div>

            {/* Đơn vị VC */}
            <div className="space-y-1.5">
              <Label>Đơn vị vận chuyển</Label>
              <Select value={form.don_vi_van_chuyen} onValueChange={(v) => set('don_vi_van_chuyen', v)}>
                <SelectTrigger><SelectValue placeholder="Chọn..." /></SelectTrigger>
                <SelectContent>
                  {DVVC_OPTIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Loại chuyến */}
            <div className="space-y-1.5">
              <Label>Loại chuyến</Label>
              <Select value={form.loai_chuyen} onValueChange={(v) => set('loai_chuyen', v)}>
                <SelectTrigger><SelectValue placeholder="Chọn..." /></SelectTrigger>
                <SelectContent>
                  {LOAI_CHUYEN_OPTIONS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Loại tuyến */}
            <div className="space-y-1.5">
              <Label>Loại tuyến</Label>
              <Select value={form.loai_tuyen} onValueChange={(v) => set('loai_tuyen', v)}>
                <SelectTrigger><SelectValue placeholder="Chọn..." /></SelectTrigger>
                <SelectContent>
                  {LOAI_TUYEN_OPTIONS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Doanh thu */}
            <div className="space-y-1.5">
              <Label htmlFor="doanh_thu">Doanh thu (VNĐ)</Label>
              <Input
                id="doanh_thu"
                type="number"
                min={0}
                value={form.doanh_thu}
                onChange={(e) => set('doanh_thu', e.target.value)}
                placeholder="0"
              />
            </div>

            {/* Số KM */}
            <div className="space-y-1.5">
              <Label htmlFor="so_km">Số KM</Label>
              <Input
                id="so_km"
                type="number"
                min={0}
                value={form.so_km}
                onChange={(e) => set('so_km', e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          {/* Trạng thái */}
          <div className="space-y-1.5">
            <Label>Trạng thái</Label>
            <Select value={form.trang_thai} onValueChange={(v) => set('trang_thai', v)}>
              <SelectTrigger><SelectValue placeholder="Chọn trạng thái..." /></SelectTrigger>
              <SelectContent>
                {TRANG_THAI_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Ghi chú */}
          <div className="space-y-1.5">
            <Label htmlFor="ghi_chu">Ghi chú</Label>
            <Input
              id="ghi_chu"
              value={form.ghi_chu}
              onChange={(e) => set('ghi_chu', e.target.value)}
              placeholder="Nhập ghi chú..."
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-200 bg-green-50 text-green-800">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>Cập nhật thành công!</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Hủy</Button>
          <Button onClick={handleSave} disabled={saving || success}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Lưu thay đổi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
