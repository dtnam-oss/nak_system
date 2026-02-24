'use client';

import { useEffect, useRef, useState } from 'react';
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
import { Separator } from '@/components/ui/separator';
import {
  AlertCircle, Loader2, MapPin, Truck, User,
  Calendar, Hash, ImagePlus, X, ZoomIn,
} from 'lucide-react';
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
  loai_ca: string;
  tai_trong_tinh_phi: string;
  hinh_thuc_tinh_gia: string;
  hinh_anh: string;
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

// ── Image upload cell ─────────────────────────────────────────────────────────
function ImageUploadCell({ chiTietId, initialUrl }: { chiTietId: number; initialUrl: string }) {
  const inputRef                  = useRef<HTMLInputElement>(null);
  const [url, setUrl]             = useState(initialUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState('');
  const [preview, setPreview]     = useState(''); // lightbox

  const handleFile = async (file: File) => {
    setError('');
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('chi_tiet_id', String(chiTietId));
      const res  = await fetch('/api/trips/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload thất bại');
      // Thêm timestamp để tránh browser cache ảnh cũ
      setUrl(`${data.url}&t=${Date.now()}`);
    } catch (err: any) {
      setError(err.message || 'Upload thất bại');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    setError('');
    try {
      await fetch(`/api/trips/upload?chi_tiet_id=${chiTietId}`, { method: 'DELETE' });
      setUrl('');
    } catch {
      setError('Xóa ảnh thất bại');
    }
  };

  return (
    <div className="flex items-center justify-center gap-1">
      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />

      {uploading ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : url ? (
        <div className="flex items-center gap-1">
          {/* Thumbnail */}
          <button
            onClick={() => setPreview(url)}
            className="group relative h-8 w-8 rounded overflow-hidden border border-border hover:ring-2 hover:ring-primary transition-all"
            title="Xem ảnh"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="Hình ảnh" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <ZoomIn className="h-3 w-3 text-white" />
            </div>
          </button>
          {/* Re-upload */}
          <button
            onClick={() => inputRef.current?.click()}
            title="Thay ảnh"
            className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <ImagePlus className="h-3.5 w-3.5" />
          </button>
          {/* Remove */}
          <button
            onClick={handleRemove}
            title="Xóa ảnh"
            className="p-1 rounded hover:bg-red-50 transition-colors text-muted-foreground hover:text-red-500"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          title="Tải ảnh lên"
          className="flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground hover:text-foreground rounded hover:bg-muted transition-colors border border-dashed border-border hover:border-primary"
        >
          <ImagePlus className="h-3.5 w-3.5" />
          Tải ảnh
        </button>
      )}

      {error && <span className="text-xs text-destructive">{error}</span>}

      {/* Lightbox */}
      {preview && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center"
          onClick={() => setPreview('')}
        >
          <div className="relative max-w-3xl max-h-[90vh] p-2" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Hình ảnh" className="max-h-[85vh] max-w-full rounded-lg shadow-2xl object-contain" />
            <button
              onClick={() => setPreview('')}
              className="absolute top-0 right-0 m-3 p-1.5 bg-black/60 rounded-full text-white hover:bg-black/80 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main dialog ───────────────────────────────────────────────────────────────
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
          <InfoRow icon={<Hash className="h-3.5 w-3.5" />}     label="Mã chuyến"  value={trip.ma_chuyen_di} mono />
          <InfoRow icon={<Calendar className="h-3.5 w-3.5" />} label="Ngày tạo"   value={trip.ngay_tao} />
          <InfoRow icon={<User className="h-3.5 w-3.5" />}     label="Khách hàng" value={trip.ten_khach_hang || trip.ma_khach_hang || '—'} />
          <InfoRow icon={<User className="h-3.5 w-3.5" />}     label="Tài xế"     value={trip.ten_tai_xe || '—'} />
          <InfoRow icon={<Truck className="h-3.5 w-3.5" />}    label="Đơn vị VC"  value={trip.don_vi_van_chuyen || '—'} />
          <div className="flex items-start gap-2">
            <span className="text-muted-foreground shrink-0 pt-0.5">Trạng thái</span>
            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusCls}`}>
              {trip.trang_thai || '—'}
            </span>
          </div>
          <InfoRow icon={<MapPin className="h-3.5 w-3.5" />} label="Tên tuyến" value={trip.ten_tuyen || '—'} span />
        </div>

        <Separator />

        {/* ── Chi tiết table ── */}
        <div>
          <p className="text-sm font-semibold mb-2 text-foreground">
            Danh sách điểm dừng / chi tiết
            {chiTiet.length > 0 && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                ({chiTiet.length} bản ghi)
              </span>
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
            <p className="text-sm text-muted-foreground py-6 text-center">
              Không có dữ liệu chi tiết
            </p>
          )}

          {!loading && chiTiet.length > 0 && (
            <div className="overflow-auto rounded border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="text-xs font-semibold uppercase tracking-wide w-8 text-center">STT</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide whitespace-nowrap">Mã CD KH</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide whitespace-nowrap">Lộ trình</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide whitespace-nowrap">Biển KS</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide whitespace-nowrap text-right">Tải trọng</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide whitespace-nowrap text-right">Quãng đường</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide whitespace-nowrap text-right">Số chiều</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide whitespace-nowrap">Loại ca</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide whitespace-nowrap">HT tính giá</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide whitespace-nowrap text-center w-28">Hình ảnh</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {chiTiet.map((ct, idx) => (
                    <TableRow key={ct.id} className="hover:bg-muted/20 text-sm">
                      <TableCell className="text-center text-xs text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell className="font-mono text-xs whitespace-nowrap">{ct.ma_chuyen_di_kh || '—'}</TableCell>
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
                      <TableCell className="whitespace-nowrap">{ct.loai_ca || '—'}</TableCell>
                      <TableCell className="whitespace-nowrap">{ct.hinh_thuc_tinh_gia || '—'}</TableCell>
                      <TableCell>
                        <ImageUploadCell chiTietId={ct.id} initialUrl={ct.hinh_anh} />
                      </TableCell>
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

// ── Helper ────────────────────────────────────────────────────────────────────
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
