'use client';

import { useMemo, useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { MapPin, TrendingUp, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Trip {
  ma_chuyen_di: string;
  ngay_tao: string;
  ma_khach_hang: string;
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

// ── Constants ────────────────────────────────────────────────────────────────
const DAY_NAMES = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

const STATUS_STYLE: Record<string, string> = {
  'Kết thúc':        'bg-green-100 text-green-800 border-green-200',
  'Đang thực hiện':  'bg-blue-100 text-blue-800 border-blue-200',
  'Chờ giao hàng':   'bg-amber-100 text-amber-800 border-amber-200',
  'Hủy':             'bg-red-100 text-red-700 border-red-200',
};

const STATUS_DOT: Record<string, string> = {
  'Kết thúc':        'bg-green-500',
  'Đang thực hiện':  'bg-blue-500',
  'Chờ giao hàng':   'bg-amber-500',
  'Hủy':             'bg-red-500',
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function parseIso(iso: string) {
  const clean = iso.split('T')[0];
  const [year, month, day] = clean.split('-').map(Number);
  return { clean, year, month, day, date: new Date(year, month - 1, day) };
}

function formatDateHeader(iso: string) {
  const { day, month, year, date } = parseIso(iso);
  const dayName = DAY_NAMES[date.getDay()];
  return `${dayName}, ${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
}

function formatCurrency(value: number) {
  if (!value || value === 0) return '—';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
}

// ── Sub-components ────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_STYLE[status] ?? 'bg-gray-100 text-gray-600 border-gray-200';
  const dot = STATUS_DOT[status] ?? 'bg-gray-400';
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {status || '—'}
    </span>
  );
}

function DvvcBadge({ dvvc }: { dvvc: string }) {
  const upper = dvvc?.toUpperCase();
  const cls = upper === 'NAK'
    ? 'bg-indigo-100 text-indigo-700'
    : upper === 'VENDOR'
      ? 'bg-orange-100 text-orange-700'
      : 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${cls}`}>
      {dvvc || '—'}
    </span>
  );
}

// Date group separator row
function DateGroupRow({
  dateIso,
  count,
  isCollapsed,
  onToggle,
}: {
  dateIso: string;
  count: number;
  isCollapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <TableRow
      className="hover:bg-muted/30 cursor-pointer select-none"
      onClick={onToggle}
    >
      <TableCell
        colSpan={11}
        className="py-2 px-3 bg-muted/40 border-l-[3px] border-l-primary"
      >
        <div className="flex items-center gap-2">
          <ChevronRight
            className={cn(
              'h-3.5 w-3.5 text-primary shrink-0 transition-transform duration-150',
              !isCollapsed && 'rotate-90'
            )}
          />
          <span className="text-xs font-semibold text-foreground">
            Ngày: {formatDateHeader(dateIso)}
          </span>
          <span className="text-xs text-muted-foreground font-medium">
            — {count} chuyến
          </span>
        </div>
      </TableCell>
    </TableRow>
  );
}

// Loading skeleton
function SkeletonRow() {
  return (
    <TableRow>
      {Array.from({ length: 11 }).map((_, i) => (
        <TableCell key={i}>
          <div className="h-4 bg-muted rounded animate-pulse" />
        </TableCell>
      ))}
    </TableRow>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function TripTable({ trips, loading }: TripTableProps) {

  // Group trips by ngay_tao, sorted newest first
  const grouped = useMemo(() => {
    const map: Record<string, Trip[]> = {};
    trips.forEach((t) => {
      const key = t.ngay_tao?.split('T')[0] ?? 'unknown';
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a));
  }, [trips]);

  // All date groups collapsed by default; reset when trips data changes
  const [collapsedDates, setCollapsedDates] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const allDates = new Set(trips.map((t) => t.ngay_tao?.split('T')[0] ?? 'unknown'));
    setCollapsedDates(allDates);
  }, [trips]);

  const toggleDate = (dateIso: string) => {
    setCollapsedDates((prev) => {
      const next = new Set(prev);
      if (next.has(dateIso)) next.delete(dateIso);
      else next.add(dateIso);
      return next;
    });
  };

  // ── Loading state ──
  if (loading) {
    return (
      <div className="overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              {['STT', 'Mã chuyến đi', 'Khách hàng', 'Tên tuyến', 'Tài xế',
                'Đơn vị VC', 'Loại chuyến', 'KM', 'Điểm dừng', 'Doanh thu', 'Trạng thái'].map((h) => (
                <TableHead key={h} className="text-xs font-semibold uppercase tracking-wide whitespace-nowrap">
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}
          </TableBody>
        </Table>
      </div>
    );
  }

  // ── Empty state ──
  if (trips.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
        <TrendingUp className="h-10 w-10 opacity-20" />
        <p className="text-sm font-medium">Không tìm thấy chuyến đi nào</p>
        <p className="text-xs opacity-70">Thử thay đổi bộ lọc hoặc trạng thái</p>
      </div>
    );
  }

  // ── Table ──
  let globalIndex = 0;

  return (
    <div className="overflow-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableHead className="w-10 text-center text-xs font-semibold uppercase tracking-wide">STT</TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wide whitespace-nowrap">Mã chuyến đi</TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wide whitespace-nowrap">Khách hàng</TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wide min-w-[200px]">Tên tuyến</TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wide whitespace-nowrap">Tài xế</TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wide whitespace-nowrap">Đơn vị VC</TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wide whitespace-nowrap">Loại chuyến</TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wide text-right whitespace-nowrap">KM</TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wide text-center whitespace-nowrap">Điểm dừng</TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wide text-right whitespace-nowrap">Doanh thu</TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wide whitespace-nowrap">Trạng thái</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {grouped.map(([dateIso, dateTrips]) => (
            <>
              {/* ── Date group header ── */}
              <DateGroupRow
                key={`header-${dateIso}`}
                dateIso={dateIso}
                count={dateTrips.length}
                isCollapsed={collapsedDates.has(dateIso)}
                onToggle={() => toggleDate(dateIso)}
              />

              {/* ── Trips in this date (hidden when collapsed) ── */}
              {!collapsedDates.has(dateIso) && dateTrips.map((trip) => {
                globalIndex++;
                const idx = globalIndex;
                return (
                  <TableRow
                    key={trip.ma_chuyen_di}
                    className="hover:bg-muted/20 transition-colors border-b border-border/50"
                  >
                    {/* STT */}
                    <TableCell className="text-center text-xs text-muted-foreground w-10">
                      {idx}
                    </TableCell>

                    {/* Mã chuyến */}
                    <TableCell className="font-mono text-sm font-semibold text-primary whitespace-nowrap">
                      {trip.ma_chuyen_di}
                    </TableCell>

                    {/* Khách hàng */}
                    <TableCell className="whitespace-nowrap text-sm font-medium">
                      {trip.ten_khach_hang || '—'}
                    </TableCell>

                    {/* Tên tuyến */}
                    <TableCell
                      className="text-sm text-muted-foreground max-w-[260px] truncate"
                      title={trip.ten_tuyen}
                    >
                      {trip.ten_tuyen || '—'}
                    </TableCell>

                    {/* Tài xế */}
                    <TableCell className="text-sm whitespace-nowrap">
                      {trip.ten_tai_xe || '—'}
                    </TableCell>

                    {/* ĐVVC */}
                    <TableCell>
                      <DvvcBadge dvvc={trip.don_vi_van_chuyen} />
                    </TableCell>

                    {/* Loại chuyến */}
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {trip.loai_chuyen || '—'}
                    </TableCell>

                    {/* KM */}
                    <TableCell className="text-right text-sm font-medium whitespace-nowrap">
                      {trip.so_km > 0
                        ? `${trip.so_km.toLocaleString('vi-VN')} km`
                        : '—'}
                    </TableCell>

                    {/* Điểm dừng */}
                    <TableCell className="text-center">
                      {trip.so_diem_dung > 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {trip.so_diem_dung}
                        </span>
                      ) : '—'}
                    </TableCell>

                    {/* Doanh thu */}
                    <TableCell className="text-right text-sm font-medium whitespace-nowrap">
                      {formatCurrency(trip.doanh_thu)}
                    </TableCell>

                    {/* Trạng thái */}
                    <TableCell>
                      <StatusBadge status={trip.trang_thai} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </>
          ))}
        </TableBody>
      </Table>

      {/* ── Table footer ── */}
      <div className="border-t px-4 py-2.5 bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Hiển thị <strong className="text-foreground">{trips.length}</strong> chuyến
          trong <strong className="text-foreground">{grouped.length}</strong> ngày
        </span>
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
