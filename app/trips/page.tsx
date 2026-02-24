'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { TripTable, Trip } from '@/components/trips/trip-table';
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

// ── Constants ───────────────────────────────────────────────────────────────
const KHACH_HANG_OPTIONS  = ['J&T', 'GHN', 'VIETTEL POST', 'YUNYI', 'Ninja Van'];
const DVVC_OPTIONS        = ['NAK', 'VENDOR'];
const LOAI_CHUYEN_OPTIONS = ['Một chiều', 'Hai chiều', 'Nhiều điểm'];
const LOAI_TUYEN_OPTIONS  = ['Nội thành', 'Liên tỉnh', 'Đường dài'];

// Status tabs configuration with color dots (referencing CEFINEA UI pattern)
const STATUS_TABS = [
  { value: 'all',              label: 'Tất cả',          dot: null },
  { value: 'Kết thúc',        label: 'Kết thúc',         dot: '#22c55e' }, // green
  { value: 'Đang thực hiện',  label: 'Đang thực hiện',   dot: '#3b82f6' }, // blue
  { value: 'Chờ giao hàng',   label: 'Chờ giao hàng',    dot: '#f59e0b' }, // amber
  { value: 'Hủy',             label: 'Đã hủy',            dot: '#ef4444' }, // red
] as const;

// ── Page component ───────────────────────────────────────────────────────────
export default function TripsPage() {
  const [trips, setTrips]         = useState<Trip[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // Active status tab
  const [activeStatus, setActiveStatus] = useState<string>('all');

  // API filters
  const [search,         setSearch]         = useState('');
  const [fromDate,       setFromDate]       = useState('');
  const [toDate,         setToDate]         = useState('');
  const [khachHang,      setKhachHang]      = useState('all');
  const [donViVanChuyen, setDonViVanChuyen] = useState('all');
  const [loaiChuyen,     setLoaiChuyen]     = useState('all');
  const [loaiTuyen,      setLoaiTuyen]      = useState('all');

  // ── Fetch ──────────────────────────────────────────────────────────────
  const fetchTrips = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({ limit: '500' });
      if (search)                   params.append('search', search);
      if (fromDate)                 params.append('fromDate', fromDate);
      if (toDate)                   params.append('toDate', toDate);
      if (khachHang !== 'all')      params.append('khachHang', khachHang);
      if (donViVanChuyen !== 'all') params.append('donViVanChuyen', donViVanChuyen);
      if (loaiChuyen !== 'all')     params.append('loaiChuyen', loaiChuyen);
      if (loaiTuyen !== 'all')      params.append('loaiTuyen', loaiTuyen);

      const res = await fetch(`/api/trips?${params}`);
      if (!res.ok) throw new Error((await res.json()).error || 'Lỗi tải dữ liệu');
      const data = await res.json();
      setTrips(data.trips || []);
    } catch (err: any) {
      setError(err.message || 'Không thể tải dữ liệu chuyến đi');
    } finally {
      setLoading(false);
    }
  }, [search, fromDate, toDate, khachHang, donViVanChuyen, loaiChuyen, loaiTuyen]);

  useEffect(() => { fetchTrips(); }, [fetchTrips]);

  // ── Count per status (for tab badges) ─────────────────────────────────
  const countByStatus = useMemo(() => {
    const map: Record<string, number> = { all: trips.length };
    trips.forEach((t) => {
      map[t.trang_thai] = (map[t.trang_thai] ?? 0) + 1;
    });
    return map;
  }, [trips]);

  // ── Trips filtered by active status tab ───────────────────────────────
  const filteredTrips = useMemo(() => {
    if (activeStatus === 'all') return trips;
    return trips.filter((t) => t.trang_thai === activeStatus);
  }, [trips, activeStatus]);

  // ── Export ─────────────────────────────────────────────────────────────
  const handleExport = async () => {
    try {
      setExporting(true);
      const params = new URLSearchParams({ templateType: 'general' });
      if (fromDate)                 params.append('fromDate', fromDate);
      if (toDate)                   params.append('toDate', toDate);
      if (khachHang !== 'all')      params.append('khachHang', khachHang);
      if (donViVanChuyen !== 'all') params.append('donViVanChuyen', donViVanChuyen);
      if (loaiChuyen !== 'all')     params.append('loaiChuyen', loaiChuyen);
      if (search)                   params.append('searchQuery', search);
      if (activeStatus !== 'all')   params.append('trangThai', activeStatus);

      const res = await fetch(`/api/reconciliation/export?${params}`);
      if (!res.ok) throw new Error('Export thất bại');

      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `chuyen_di_${new Date().toISOString().split('T')[0]}.xlsx`;
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
    setKhachHang('all');
    setDonViVanChuyen('all');
    setLoaiChuyen('all');
    setLoaiTuyen('all');
  };

  const hasFilter = !!(search || fromDate || toDate
    || khachHang !== 'all' || donViVanChuyen !== 'all'
    || loaiChuyen !== 'all' || loaiTuyen !== 'all');

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <DashboardLayout
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Chuyến đi' },
      ]}
    >
      <div className="space-y-0">

        {/* ── Error ── */}
        {error && (
          <Alert variant="destructive" className="mb-3">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* ── Main card: tabs + filter + table in one container ── */}
        <Card className="overflow-hidden">

          {/* ── Status tabs ── */}
          <div className="border-b border-border bg-background">
            <div className="flex items-center gap-1 px-4 overflow-x-auto scrollbar-none">
              {STATUS_TABS.map((tab) => {
                const count = countByStatus[tab.value] ?? 0;
                const isActive = activeStatus === tab.value;

                return (
                  <button
                    key={tab.value}
                    onClick={() => setActiveStatus(tab.value)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-3 text-sm font-medium whitespace-nowrap',
                      'border-b-2 transition-all duration-150',
                      isActive
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {/* Colored dot */}
                    {tab.dot && (
                      <span
                        className="inline-block w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: tab.dot }}
                      />
                    )}

                    {tab.label}

                    {/* Count badge */}
                    {!loading && (
                      <span className={cn(
                        'inline-flex items-center justify-center rounded-full text-xs font-semibold',
                        'min-w-[20px] h-5 px-1.5',
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'bg-muted text-muted-foreground'
                      )}>
                        {count}
                      </span>
                    )}
                    {loading && (
                      <span className="inline-block w-6 h-4 bg-muted rounded animate-pulse" />
                    )}
                  </button>
                );
              })}

              {/* Push actions to the right */}
              <div className="flex-1" />

              {/* Quick actions inside tab bar */}
              <div className="flex items-center gap-1 py-2 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={fetchTrips}
                  disabled={loading}
                  className="h-8 text-muted-foreground"
                >
                  <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
                  Làm mới
                </Button>
                <Button
                  size="sm"
                  onClick={handleExport}
                  disabled={exporting || loading}
                  className="h-8"
                >
                  <Download className="h-3.5 w-3.5 mr-1" />
                  {exporting ? 'Đang xuất...' : 'Xuất Excel'}
                </Button>
              </div>
            </div>
          </div>

          {/* ── Filter bar ── */}
          <div className="px-4 py-3 border-b border-border bg-muted/20">
            <div className="flex flex-wrap gap-2 items-center">

              {/* Search */}
              <div className="relative min-w-[220px] flex-1 max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Mã chuyến, tên tuyến, tài xế..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-8 text-sm"
                />
              </div>

              {/* Date from */}
              <div className="relative">
                <CalendarRange className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="pl-8 h-8 text-sm w-40"
                  title="Từ ngày"
                />
              </div>

              {/* Date to */}
              <div className="relative">
                <CalendarRange className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="pl-8 h-8 text-sm w-40"
                  title="Đến ngày"
                />
              </div>

              {/* Khách hàng */}
              <Select value={khachHang} onValueChange={setKhachHang}>
                <SelectTrigger className="h-8 text-sm w-32">
                  <SelectValue placeholder="Khách hàng" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả KH</SelectItem>
                  {KHACH_HANG_OPTIONS.map((k) => (
                    <SelectItem key={k} value={k}>{k}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* ĐVVC */}
              <Select value={donViVanChuyen} onValueChange={setDonViVanChuyen}>
                <SelectTrigger className="h-8 text-sm w-28">
                  <SelectValue placeholder="ĐVVC" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  {DVVC_OPTIONS.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Loại chuyến */}
              <Select value={loaiChuyen} onValueChange={setLoaiChuyen}>
                <SelectTrigger className="h-8 text-sm w-32">
                  <SelectValue placeholder="Loại chuyến" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả loại</SelectItem>
                  {LOAI_CHUYEN_OPTIONS.map((l) => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Loại tuyến */}
              <Select value={loaiTuyen} onValueChange={setLoaiTuyen}>
                <SelectTrigger className="h-8 text-sm w-30">
                  <SelectValue placeholder="Loại tuyến" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả tuyến</SelectItem>
                  {LOAI_TUYEN_OPTIONS.map((l) => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {hasFilter && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  className="h-8 text-xs text-muted-foreground"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Xóa lọc
                </Button>
              )}
            </div>
          </div>

          {/* ── Table (with date group rows) ── */}
          <TripTable trips={filteredTrips} loading={loading} />

        </Card>
      </div>
    </DashboardLayout>
  );
}
