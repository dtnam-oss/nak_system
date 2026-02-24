'use client';

import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { MapPin, TrendingUp } from 'lucide-react';

export interface Trip {
  ma_chuyen_di: string;
  ngay_tao: string;
  ten_khach_hang: string;
  ten_tuyen: string;
  ten_tai_xe: string;
  don_vi_van_chuyen: string;
  loai_chuyen: string;
  loai_tuyen: string;
  trang_thai: string;
  doanh_thu: number;
  so_km: number;
  so_diem_dung: number;
}

interface TripTableProps {
  trips: Trip[];
  loading?: boolean;
}

// ── Status helpers ──────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string }> = {
  'Kết thúc':         { label: 'Kết thúc',         variant: 'default',     className: 'bg-green-100 text-green-800 border-green-200' },
  'Đang thực hiện':   { label: 'Đang thực hiện',   variant: 'secondary',   className: 'bg-blue-100 text-blue-800 border-blue-200' },
  'Chờ giao hàng':    { label: 'Chờ giao hàng',    variant: 'outline',     className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  'Hủy':              { label: 'Đã hủy',            variant: 'destructive', className: 'bg-red-100 text-red-700 border-red-200' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || { label: status, className: 'bg-gray-100 text-gray-700 border-gray-200' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

function formatCurrency(value: number) {
  if (!value || value === 0) return '—';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
}

function formatDate(dateStr: string) {
  if (!dateStr) return '—';
  const [year, month, day] = dateStr.split('T')[0].split('-');
  return `${day}/${month}/${year}`;
}

// ── Loading skeleton ────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <TableRow>
      {Array.from({ length: 12 }).map((_, i) => (
        <TableCell key={i}>
          <div className="h-4 bg-muted rounded animate-pulse w-full" />
        </TableCell>
      ))}
    </TableRow>
  );
}

// ── Main component ──────────────────────────────────────────────────────────
export function TripTable({ trips, loading }: TripTableProps) {
  if (loading) {
    return (
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              {['STT', 'Mã chuyến', 'Ngày', 'Khách hàng', 'Tên tuyến', 'Tài xế', 'ĐVVC',
                'Loại chuyến', 'KM', 'Điểm dừng', 'Doanh thu', 'Trạng thái'].map((h) => (
                <TableHead key={h} className="font-semibold whitespace-nowrap">{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (trips.length === 0) {
    return (
      <div className="rounded-lg border flex flex-col items-center justify-center py-20 text-muted-foreground gap-2">
        <TrendingUp className="h-10 w-10 opacity-30" />
        <p className="text-sm font-medium">Không tìm thấy chuyến đi nào</p>
        <p className="text-xs">Thử thay đổi bộ lọc để tìm dữ liệu</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="w-12 font-semibold text-center">STT</TableHead>
            <TableHead className="font-semibold whitespace-nowrap">Mã chuyến đi</TableHead>
            <TableHead className="font-semibold whitespace-nowrap">Ngày</TableHead>
            <TableHead className="font-semibold whitespace-nowrap">Khách hàng</TableHead>
            <TableHead className="font-semibold whitespace-nowrap min-w-[200px]">Tên tuyến</TableHead>
            <TableHead className="font-semibold whitespace-nowrap">Tài xế</TableHead>
            <TableHead className="font-semibold whitespace-nowrap">Đơn vị VC</TableHead>
            <TableHead className="font-semibold whitespace-nowrap">Loại chuyến</TableHead>
            <TableHead className="font-semibold whitespace-nowrap text-right">KM</TableHead>
            <TableHead className="font-semibold whitespace-nowrap text-center">Điểm dừng</TableHead>
            <TableHead className="font-semibold whitespace-nowrap text-right">Doanh thu</TableHead>
            <TableHead className="font-semibold whitespace-nowrap">Trạng thái</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {trips.map((trip, index) => (
            <TableRow key={trip.ma_chuyen_di} className="hover:bg-muted/30 transition-colors">
              {/* STT */}
              <TableCell className="text-center text-muted-foreground text-sm">
                {index + 1}
              </TableCell>

              {/* Mã chuyến */}
              <TableCell className="font-mono text-sm font-medium text-primary">
                {trip.ma_chuyen_di}
              </TableCell>

              {/* Ngày */}
              <TableCell className="whitespace-nowrap text-sm">
                {formatDate(trip.ngay_tao)}
              </TableCell>

              {/* Khách hàng */}
              <TableCell className="whitespace-nowrap">
                <span className="font-medium text-sm">{trip.ten_khach_hang || '—'}</span>
              </TableCell>

              {/* Tên tuyến */}
              <TableCell className="text-sm text-muted-foreground max-w-[250px] truncate" title={trip.ten_tuyen}>
                {trip.ten_tuyen || '—'}
              </TableCell>

              {/* Tài xế */}
              <TableCell className="whitespace-nowrap text-sm">
                {trip.ten_tai_xe || '—'}
              </TableCell>

              {/* ĐVVC */}
              <TableCell>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold
                  ${trip.don_vi_van_chuyen?.toUpperCase() === 'NAK'
                    ? 'bg-indigo-100 text-indigo-700'
                    : trip.don_vi_van_chuyen?.toUpperCase() === 'VENDOR'
                      ? 'bg-orange-100 text-orange-700'
                      : 'bg-gray-100 text-gray-600'}`}>
                  {trip.don_vi_van_chuyen || '—'}
                </span>
              </TableCell>

              {/* Loại chuyến */}
              <TableCell className="text-sm whitespace-nowrap text-muted-foreground">
                {trip.loai_chuyen || '—'}
              </TableCell>

              {/* KM */}
              <TableCell className="text-right text-sm font-medium">
                {trip.so_km > 0 ? `${trip.so_km.toLocaleString('vi-VN')} km` : '—'}
              </TableCell>

              {/* Điểm dừng */}
              <TableCell className="text-center">
                {trip.so_diem_dung > 0 ? (
                  <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {trip.so_diem_dung}
                  </span>
                ) : '—'}
              </TableCell>

              {/* Doanh thu */}
              <TableCell className="text-right font-medium text-sm whitespace-nowrap">
                {formatCurrency(trip.doanh_thu)}
              </TableCell>

              {/* Trạng thái */}
              <TableCell>
                <StatusBadge status={trip.trang_thai} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Footer summary */}
      <div className="border-t px-4 py-2 bg-muted/30 flex items-center justify-between text-xs text-muted-foreground">
        <span>Hiển thị <strong>{trips.length}</strong> chuyến đi</span>
        <span>
          Tổng doanh thu:{' '}
          <strong className="text-foreground">
            {formatCurrency(trips.reduce((s, t) => s + t.doanh_thu, 0))}
          </strong>
        </span>
      </div>
    </div>
  );
}
