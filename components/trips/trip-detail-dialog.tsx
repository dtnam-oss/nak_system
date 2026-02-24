'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, Loader2, MapPin, Truck, User, Calendar, Hash } from 'lucide-react';
import type { Trip } from './trip-table';

interface ChiTiet {
  id: number;
  ma_chuyen_di: string;
  ma_chuyen_di_kh: string;
  lo_trinh: string;
  lo_trinh_chi_tiet_theo_diem: string;
  bien_kiem_soat: string;
  tai_trong: string;
  quang_duong: string;
  so_chieu: string;
  don_gia: string;
  loai_ca: string;
  tai_trong_tinh_phi: string;
  hinh_thuc_tinh_gia: string;
}

interface TripDetailDialogProps {
  trip: Trip | null;
  open: boolean;
  onClose: () => void;
}

const STATUS_STYLE: Record<string, string> = {
  'Kết thúc':       'bg-green-100 text-green-800',
  'Đang thực hiện': 'bg-blue-100 text-blue-800',
  'Chờ giao hàng':  'bg-amber-100 text-amber-800',
  'Hủy':            'bg-red-100 text-red-800',
};

function formatCurrency(val: string | number) {
  const n = typeof val === 'string' ? parseFloat(val) : val;
  if (!n || n === 0) return '—';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
}

export function TripDetailDialog({ trip, open, onClose }: TripDetailDialogProps) {
  const [chiTiet, setChiTiet] = useState<ChiTiet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!open || !trip) return;
    setChiTiet([]);
    setError(null);
    setLoading(true);

    fetch(`/api/trips/${encodeURIComponent(trip.ma_chuyen_di)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setChiTiet(data.chiTiet || []);
      })
      .catch((err) => setError(err.message || 'Không thể tải chi tiết'))
      .finally(() => setLoading(false));
  }, [open, trip]);

  if (!trip) return null;

  const statusCls = STATUS_STYLE[trip.trang_thai] ?? 'bg-gray-100 text-gray-700';

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4 text-primary" />
            Chi tiết chuyến đi
            <span className="font-mono text-primary">{trip.ma_chuyen_di}</span>
          </DialogTitle>
        </DialogHeader>

        {/* ── Trip header info ── */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3 text-sm py-2">
          <InfoRow icon={<Hash className="h-3.5 w-3.5" />}   label="Mã chuyến"  value={trip.ma_chuyen_di} mono />
          <InfoRow icon={<Calendar className="h-3.5 w-3.5" />} label="Ngày tạo" value={trip.ngay_tao} />
          <InfoRow icon={<User className="h-3.5 w-3.5" />}   label="Khách hàng" value={trip.ten_khach_hang || trip.ma_khach_hang || '—'} />
          <InfoRow icon={<User className="h-3.5 w-3.5" />}   label="Tài xế"    value={trip.ten_tai_xe || '—'} />
          <InfoRow icon={<Truck className="h-3.5 w-3.5" />}  label="Đơn vị VC" value={trip.don_vi_van_chuyen || '—'} />
          <div className="flex items-start gap-2">
            <span className="text-muted-foreground shrink-0 pt-0.5">Trạng thái</span>
            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusCls}`}>
              {trip.trang_thai || '—'}
            </span>
          </div>
          <InfoRow icon={<MapPin className="h-3.5 w-3.5" />} label="Tên tuyến" value={trip.ten_tuyen || '—'} span />
        </div>

        <Separator />

        {/* ── Chi tiết chuyến đi ── */}
        <div>
          <p className="text-sm font-semibold mb-2 text-foreground">
            Danh sách điểm dừng / chi tiết
            {chiTiet.length > 0 && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">({chiTiet.length} bản ghi)</span>
            )}
          </p>

          {loading && (
            <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Đang tải...</span>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive py-4">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {!loading && !error && chiTiet.length === 0 && (
            <p className="text-sm text-muted-foreground py-6 text-center">Không có dữ liệu chi tiết</p>
          )}

          {!loading && chiTiet.length > 0 && (
            <div className="overflow-auto rounded border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="text-xs font-semibold uppercase tracking-wide whitespace-nowrap w-8 text-center">STT</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide whitespace-nowrap">Mã CD KH</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide whitespace-nowrap">Lộ trình</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide whitespace-nowrap">Biển KS</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide whitespace-nowrap text-right">Tải trọng</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide whitespace-nowrap text-right">Quãng đường</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide whitespace-nowrap text-right">Số chiều</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide whitespace-nowrap text-right">Đơn giá</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide whitespace-nowrap">Loại ca</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide whitespace-nowrap">HT tính giá</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {chiTiet.map((ct, idx) => (
                    <TableRow key={ct.id} className="hover:bg-muted/20 text-sm">
                      <TableCell className="text-center text-xs text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell className="font-mono text-xs">{ct.ma_chuyen_di_kh || '—'}</TableCell>
                      <TableCell className="max-w-[200px]">
                        <div className="truncate" title={ct.lo_trinh}>{ct.lo_trinh || '—'}</div>
                        {ct.lo_trinh_chi_tiet_theo_diem && (
                          <div className="text-xs text-muted-foreground truncate mt-0.5" title={ct.lo_trinh_chi_tiet_theo_diem}>
                            {ct.lo_trinh_chi_tiet_theo_diem}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{ct.bien_kiem_soat || '—'}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">{ct.tai_trong || '—'}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">{ct.quang_duong || '—'}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">{ct.so_chieu || '—'}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">{formatCurrency(ct.don_gia)}</TableCell>
                      <TableCell className="whitespace-nowrap">{ct.loai_ca || '—'}</TableCell>
                      <TableCell className="whitespace-nowrap">{ct.hinh_thuc_tinh_gia || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InfoRow({
  icon, label, value, mono, span,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
  span?: boolean;
}) {
  return (
    <div className={span ? 'col-span-2 md:col-span-3 flex items-start gap-2' : 'flex items-start gap-2'}>
      {icon && <span className="text-muted-foreground mt-0.5 shrink-0">{icon}</span>}
      <span className="text-muted-foreground shrink-0">{label}:</span>
      <span className={`text-foreground font-medium truncate ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}
