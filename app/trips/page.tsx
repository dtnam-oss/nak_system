'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { TripTable, Trip } from '@/components/trips/trip-table';
import { TripDetailDialog } from '@/components/trips/trip-detail-dialog';
import { EditTripDialog } from '@/components/trips/edit-trip-dialog';
import { DeleteTripDialog } from '@/components/trips/delete-trip-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Search, Download, RefreshCw, AlertCircle, CalendarRange } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Constants ────────────────────────────────────────────────────────────────
const DVVC_OPTIONS        = ['NAK', 'VENDOR'];
const LOAI_CHUYEN_OPTIONS = ['Một chiều', 'Hai chiều', 'Nhiều điểm'];
const LOAI_TUYEN_OPTIONS  = ['Nội thành', 'Liên tỉnh', 'Đường dài'];
const TRANG_THAI_OPTIONS  = [
  { value: 'Kết thúc',       label: 'Kết thúc' },
  { value: 'Đang thực hiện', label: 'Đang thực hiện' },
  { value: 'Chờ giao hàng',  label: 'Chờ giao hàng' },
  { value: 'Hủy',            label: 'Đã hủy' },
];

// Tab dot colors assigned to customers by index
const TAB_COLORS = [
  '#6366f1', // indigo
  '#f59e0b', // amber
  '#10b981', // emerald
  '#3b82f6', // blue
  '#f43f5e', // rose
  '#8b5cf6', // violet
  '#14b8a6', // teal
  '#f97316', // orange
];

// ── Page component ────────────────────────────────────────────────────────────
export default function TripsPage() {
  const [trips, setTrips]         = useState<Trip[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // Dialog states
  const [selectedTrip,   setSelectedTrip]   = useState<Trip | null>(null);
  const [detailOpen,     setDetailOpen]     = useState(false);
  const [editOpen,       setEditOpen]       = useState(false);
  const [deleteOpen,     setDeleteOpen]     = useState(false);

  const handleView   = (trip: Trip) => { setSelectedTrip(trip); setDetailOpen(true); };
  const handleEdit   = (trip: Trip) => { setSelectedTrip(trip); setEditOpen(true); };
  const handleDelete = (trip: Trip) => { setSelectedTrip(trip); setDeleteOpen(true); };

  // Active customer tab ('all' or ma_khach_hang)
  const [activeKhachHang, setActiveKhachHang] = useState<string>('all');

  // API filters
  const [search,         setSearch]         = useState('');
  const [fromDate,       setFromDate]       = useState('');
  const [toDate,         setToDate]         = useState('');
  const [donViVanChuyen, setDonViVanChuyen] = useState('all');
  const [loaiChuyen,     setLoaiChuyen]     = useState('all');
  const [loaiTuyen,      setLoaiTuyen]      = useState('all');
  const [trangThai,      setTrangThai]      = useState('all');

  // ── Fetch ──────────────────────────────────────────────────────────────
  const fetchTrips = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setActiveKhachHang('all');

      const params = new URLSearchParams({ limit: '500' });
      if (search)                   params.append('search', search);
      if (fromDate)                 params.append('fromDate', fromDate);
      if (toDate)                   params.append('toDate', toDate);
      if (donViVanChuyen !== 'all') params.append('donViVanChuyen', donViVanChuyen);
      if (loaiChuyen !== 'all')     params.append('loaiChuyen', loaiChuyen);
      if (loaiTuyen !== 'all')      params.append('loaiTuyen', loaiTuyen);
      if (trangThai !== 'all')      params.append('trangThai', trangThai);

      const res = await fetch(`/api/trips?${params}`);
      if (!res.ok) throw new Error((await res.json()).error || 'Lỗi tải dữ liệu');
      const data = await res.json();
      setTrips(data.trips || []);
    } catch (err: any) {
      setError(err.message || 'Không thể tải dữ liệu chuyến đi');
    } finally {
      setLoading(false);
    }
  }, [search, fromDate, toDate, donViVanChuyen, loaiChuyen, loaiTuyen, trangThai]);

  useEffect(() => { fetchTrips(); }, [fetchTrips]);

  // ── Derive customer tabs from trips (sorted by count desc) ────────────
  const customerTabs = useMemo(() => {
    const countMap: Record<string, number> = {};
    trips.forEach((t) => {
      const key = t.ma_khach_hang || '(Không có)';
      countMap[key] = (countMap[key] ?? 0) + 1;
    });
    return Object.entries(countMap)
      .sort(([, a], [, b]) => b - a) // sort by count desc
      .map(([maKh, count], idx) => ({
        value: maKh,
        label: maKh,
        count,
        color: TAB_COLORS[idx % TAB_COLORS.length],
      }));
  }, [trips]);

  // ── Trips filtered by active customer tab ─────────────────────────────
  const filteredTrips = useMemo(() => {
    if (activeKhachHang === 'all') return trips;
    return trips.filter((t) => (t.ma_khach_hang || '(Không có)') === activeKhachHang);
  }, [trips, activeKhachHang]);

  // ── Export ─────────────────────────────────────────────────────────────
  const handleExport = async () => {
    try {
      setExporting(true);
      const params = new URLSearchParams({ templateType: 'general' });
      if (fromDate)                 params.append('fromDate', fromDate);
      if (toDate)                   params.append('toDate', toDate);
      if (donViVanChuyen !== 'all') params.append('donViVanChuyen', donViVanChuyen);
      if (loaiChuyen !== 'all')     params.append('loaiChuyen', loaiChuyen);
      if (trangThai !== 'all')      params.append('trangThai', trangThai);
      if (search)                   params.append('searchQuery', search);
      if (activeKhachHang !== 'all') params.append('khachHang', activeKhachHang);

      const res = await fetch(`/api/reconciliation/export?${params}`);
      if (!res.ok) throw new Error('Export thất bại');

      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      const suffix = activeKhachHang !== 'all'
        ? `_${activeKhachHang.replace(/[^a-zA-Z0-9]/g, '_')}`
        : '';
      a.download = `chuyen_di${suffix}_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(err.message || 'Xuất Excel thất bại');
    } finally {
      setExporting(false);
    }
  };

  // ── Reset ──────────────────────────────────────────────────────────────
  const handleReset = () => {
    setSearch('');
    setFromDate('');
    setToDate('');
    setDonViVanChuyen('all');
    setLoaiChuyen('all');
    setLoaiTuyen('all');
    setTrangThai('all');
  };

  const hasFilter = !!(search || fromDate || toDate
    || donViVanChuyen !== 'all' || loaiChuyen !== 'all'
    || loaiTuyen !== 'all' || trangThai !== 'all');

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <DashboardLayout
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Chuyến đi' },
      ]}
    >
      <div className="space-y-0">

        {error && (
          <Alert variant="destructive" className="mb-3">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card className="overflow-hidden">

          {/* ── Customer tabs ── */}
          <div className="border-b border-border bg-background">
            <div className="flex items-center gap-0.5 px-4 overflow-x-auto scrollbar-none">

              {/* "Tất cả" tab */}
              <button
                onClick={() => setActiveKhachHang('all')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-3 text-sm font-medium whitespace-nowrap',
                  'border-b-2 transition-all duration-150 shrink-0',
                  activeKhachHang === 'all'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                Tất cả
                <span className={cn(
                  'inline-flex items-center justify-center rounded-full text-xs font-semibold min-w-[20px] h-5 px-1.5',
                  activeKhachHang === 'all'
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground'
                )}>
                  {loading ? '·' : trips.length}
                </span>
              </button>

              {/* One tab per customer (sorted by count) */}
              {!loading && customerTabs.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setActiveKhachHang(tab.value)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-3 text-sm font-medium whitespace-nowrap',
                    'border-b-2 transition-all duration-150 shrink-0',
                    activeKhachHang === tab.value
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  )}
                >
                  <span
                    className="inline-block w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: tab.color }}
                  />
                  {tab.label}
                  <span className={cn(
                    'inline-flex items-center justify-center rounded-full text-xs font-semibold min-w-[20px] h-5 px-1.5',
                    activeKhachHang === tab.value
                      ? 'bg-primary/10 text-primary'
                      : 'bg-muted text-muted-foreground'
                  )}>
                    {tab.count}
                  </span>
                </button>
              ))}

              {/* Loading skeleton tabs */}
              {loading && Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-3 shrink-0">
                  <div className="w-2 h-2 rounded-full bg-muted animate-pulse" />
                  <div className="h-4 w-14 bg-muted rounded animate-pulse" />
                  <div className="h-4 w-5 bg-muted rounded-full animate-pulse" />
                </div>
              ))}

              <div className="flex-1" />

              {/* Actions */}
              <div className="flex items-center gap-1 py-2 shrink-0">
                <Button
                  variant="ghost" size="sm"
                  onClick={fetchTrips} disabled={loading}
                  className="h-8 text-muted-foreground"
                >
                  <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
                  Làm mới
                </Button>
                <Button
                  size="sm"
                  onClick={handleExport} disabled={exporting || loading}
                  className="h-8"
                >
                  <Download className="h-3.5 w-3.5 mr-1" />
                  {exporting ? 'Đang xuất...' : 'Xuất Excel'}
                </Button>
              </div>
            </div>
          </div>

          {/* ── Filter bar ── */}
          <div className="px-4 py-2.5 border-b border-border bg-muted/20">
            <div className="flex flex-wrap gap-2 items-center">

              <div className="relative min-w-[200px] flex-1 max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Mã chuyến, tên tuyến, tài xế..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-8 text-sm"
                />
              </div>

              <div className="relative">
                <CalendarRange className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="date" value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="pl-8 h-8 text-sm w-40" title="Từ ngày"
                />
              </div>

              <div className="relative">
                <CalendarRange className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="date" value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="pl-8 h-8 text-sm w-40" title="Đến ngày"
                />
              </div>

              <Select value={donViVanChuyen} onValueChange={setDonViVanChuyen}>
                <SelectTrigger className="h-8 text-sm w-28">
                  <SelectValue placeholder="ĐVVC" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả ĐVVC</SelectItem>
                  {DVVC_OPTIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={loaiChuyen} onValueChange={setLoaiChuyen}>
                <SelectTrigger className="h-8 text-sm w-32">
                  <SelectValue placeholder="Loại chuyến" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả loại</SelectItem>
                  {LOAI_CHUYEN_OPTIONS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={loaiTuyen} onValueChange={setLoaiTuyen}>
                <SelectTrigger className="h-8 text-sm w-32">
                  <SelectValue placeholder="Loại tuyến" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả tuyến</SelectItem>
                  {LOAI_TUYEN_OPTIONS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={trangThai} onValueChange={setTrangThai}>
                <SelectTrigger className="h-8 text-sm w-36">
                  <SelectValue placeholder="Trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả trạng thái</SelectItem>
                  {TRANG_THAI_OPTIONS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {hasFilter && (
                <Button variant="ghost" size="sm" onClick={handleReset} className="h-8 text-xs text-muted-foreground">
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Xóa lọc
                </Button>
              )}
            </div>
          </div>

          {/* ── Table ── */}
          <TripTable
            trips={filteredTrips}
            loading={loading}
            onView={handleView}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />

        </Card>
      </div>

      {/* ── Dialogs ── */}
      <TripDetailDialog
        trip={selectedTrip}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
      />
      <EditTripDialog
        trip={selectedTrip}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSuccess={fetchTrips}
      />
      <DeleteTripDialog
        trip={selectedTrip}
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onSuccess={fetchTrips}
      />

    </DashboardLayout>
  );
}
