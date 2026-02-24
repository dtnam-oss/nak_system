'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { TripTable, Trip } from '@/components/trips/trip-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Search,
  Download,
  RefreshCw,
  AlertCircle,
  CalendarRange,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Constants ───────────────────────────────────────────────────────────────
const KHACH_HANG_OPTIONS  = ['J&T', 'GHN', 'VIETTEL POST', 'YUNYI', 'Ninja Van'];
const DVVC_OPTIONS        = ['NAK', 'VENDOR'];
const LOAI_CHUYEN_OPTIONS = ['Một chiều', 'Hai chiều', 'Nhiều điểm'];
const LOAI_TUYEN_OPTIONS  = ['Nội thành', 'Liên tỉnh', 'Đường dài'];
const TRANG_THAI_OPTIONS  = [
  { value: 'Kết thúc',       label: 'Kết thúc' },
  { value: 'Đang thực hiện', label: 'Đang thực hiện' },
  { value: 'Chờ giao hàng',  label: 'Chờ giao hàng' },
  { value: 'Hủy',            label: 'Đã hủy' },
];

const DAY_NAMES = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

// ── Helpers ──────────────────────────────────────────────────────────────────
/** "2026-02-24" → { display: "24/02", dayName: "T2" } */
function formatTabDate(iso: string) {
  const [year, month, day] = iso.split('T')[0].split('-');
  const d = new Date(Number(year), Number(month) - 1, Number(day));
  return {
    display: `${day}/${month}`,
    dayName: DAY_NAMES[d.getDay()],
    iso: `${year}-${month}-${day}`,
  };
}

// ── Page component ───────────────────────────────────────────────────────────
export default function TripsPage() {
  const [trips, setTrips]         = useState<Trip[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // Active date tab ('all' or ISO date string)
  const [activeTab, setActiveTab] = useState<string>('all');

  // API filters
  const [search,         setSearch]         = useState('');
  const [fromDate,       setFromDate]       = useState('');
  const [toDate,         setToDate]         = useState('');
  const [khachHang,      setKhachHang]      = useState('all');
  const [donViVanChuyen, setDonViVanChuyen] = useState('all');
  const [loaiChuyen,     setLoaiChuyen]     = useState('all');
  const [loaiTuyen,      setLoaiTuyen]      = useState('all');
  const [trangThai,      setTrangThai]      = useState('all');

  // ── Fetch ──────────────────────────────────────────────────────────────
  const fetchTrips = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setActiveTab('all'); // reset tab on new fetch

      const params = new URLSearchParams({ limit: '500' });
      if (search)                    params.append('search', search);
      if (fromDate)                  params.append('fromDate', fromDate);
      if (toDate)                    params.append('toDate', toDate);
      if (khachHang !== 'all')       params.append('khachHang', khachHang);
      if (donViVanChuyen !== 'all')  params.append('donViVanChuyen', donViVanChuyen);
      if (loaiChuyen !== 'all')      params.append('loaiChuyen', loaiChuyen);
      if (loaiTuyen !== 'all')       params.append('loaiTuyen', loaiTuyen);
      if (trangThai !== 'all')       params.append('trangThai', trangThai);

      const res = await fetch(`/api/trips?${params}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Lỗi tải dữ liệu');
      }
      const data = await res.json();
      setTrips(data.trips || []);
    } catch (err: any) {
      setError(err.message || 'Không thể tải dữ liệu chuyến đi');
    } finally {
      setLoading(false);
    }
  }, [search, fromDate, toDate, khachHang, donViVanChuyen, loaiChuyen, loaiTuyen, trangThai]);

  useEffect(() => { fetchTrips(); }, [fetchTrips]);

  // ── Derive date tabs from trips ────────────────────────────────────────
  const dateTabs = useMemo(() => {
    const countByDate: Record<string, number> = {};
    trips.forEach((t) => {
      const iso = t.ngay_tao?.split('T')[0] ?? '';
      if (iso) countByDate[iso] = (countByDate[iso] ?? 0) + 1;
    });
    // Sort newest first
    return Object.entries(countByDate)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([iso, count]) => ({ ...formatTabDate(iso), count }));
  }, [trips]);

  // ── Trips shown in table (filtered by active tab) ──────────────────────
  const visibleTrips = useMemo(() => {
    if (activeTab === 'all') return trips;
    return trips.filter((t) => t.ngay_tao?.split('T')[0] === activeTab);
  }, [trips, activeTab]);

  // ── Export ─────────────────────────────────────────────────────────────
  const handleExport = async () => {
    try {
      setExporting(true);
      const params = new URLSearchParams({ templateType: 'general' });
      // If a specific date tab is active, scope export to that date
      const exportFrom = activeTab !== 'all' ? activeTab : fromDate;
      const exportTo   = activeTab !== 'all' ? activeTab : toDate;
      if (exportFrom)               params.append('fromDate', exportFrom);
      if (exportTo)                 params.append('toDate', exportTo);
      if (khachHang !== 'all')      params.append('khachHang', khachHang);
      if (donViVanChuyen !== 'all') params.append('donViVanChuyen', donViVanChuyen);
      if (loaiChuyen !== 'all')     params.append('loaiChuyen', loaiChuyen);
      if (search)                   params.append('searchQuery', search);

      const res = await fetch(`/api/reconciliation/export?${params}`);
      if (!res.ok) throw new Error('Export thất bại');

      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      const label = activeTab !== 'all' ? activeTab : new Date().toISOString().split('T')[0];
      a.download = `chuyen_di_${label}.xlsx`;
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
    setTrangThai('all');
  };

  const hasFilter = search || fromDate || toDate
    || khachHang !== 'all' || donViVanChuyen !== 'all'
    || loaiChuyen !== 'all' || loaiTuyen !== 'all' || trangThai !== 'all';

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <DashboardLayout
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Chuyến đi' },
      ]}
    >
      <div className="space-y-3">

        {/* ── Error ── */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* ── Filter panel ── */}
        <Card>
          <CardContent className="p-3 space-y-2">
            {/* Row 1: Search + Date range */}
            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm mã chuyến, tên tuyến, tài xế..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
              <div className="relative">
                <CalendarRange className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="pl-9 w-42 h-9"
                  title="Từ ngày"
                />
              </div>
              <div className="relative">
                <CalendarRange className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="pl-9 w-42 h-9"
                  title="Đến ngày"
                />
              </div>
            </div>

            {/* Row 2: Dropdowns + Actions */}
            <div className="flex flex-wrap gap-2 items-center">
              <Select value={khachHang} onValueChange={setKhachHang}>
                <SelectTrigger className="w-36 h-9">
                  <SelectValue placeholder="Khách hàng" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả KH</SelectItem>
                  {KHACH_HANG_OPTIONS.map((k) => (
                    <SelectItem key={k} value={k}>{k}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={donViVanChuyen} onValueChange={setDonViVanChuyen}>
                <SelectTrigger className="w-32 h-9">
                  <SelectValue placeholder="Đơn vị VC" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả ĐVVC</SelectItem>
                  {DVVC_OPTIONS.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={loaiChuyen} onValueChange={setLoaiChuyen}>
                <SelectTrigger className="w-36 h-9">
                  <SelectValue placeholder="Loại chuyến" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả loại</SelectItem>
                  {LOAI_CHUYEN_OPTIONS.map((l) => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={loaiTuyen} onValueChange={setLoaiTuyen}>
                <SelectTrigger className="w-32 h-9">
                  <SelectValue placeholder="Loại tuyến" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả tuyến</SelectItem>
                  {LOAI_TUYEN_OPTIONS.map((l) => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={trangThai} onValueChange={setTrangThai}>
                <SelectTrigger className="w-40 h-9">
                  <SelectValue placeholder="Trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả trạng thái</SelectItem>
                  {TRANG_THAI_OPTIONS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex-1" />

              {hasFilter && (
                <Button variant="ghost" size="sm" onClick={handleReset} className="h-9">
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Xóa lọc
                </Button>
              )}

              <Button variant="outline" size="sm" onClick={fetchTrips} disabled={loading} className="h-9">
                <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                Làm mới
              </Button>

              <Button size="sm" onClick={handleExport} disabled={exporting || loading} className="h-9">
                <Download className="h-4 w-4 mr-1" />
                {exporting ? 'Đang xuất...' : 'Xuất Excel'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ── Date tabs ── */}
        <div className="relative">
          <div className="overflow-x-auto pb-0 scrollbar-thin scrollbar-thumb-muted">
            <div className="flex gap-1 min-w-max border-b border-border">

              {/* "Tất cả" tab */}
              <button
                onClick={() => setActiveTab('all')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-all',
                  activeTab === 'all'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
                )}
              >
                Tất cả
                <span className={cn(
                  'inline-flex items-center justify-center rounded-full text-xs font-semibold min-w-[20px] px-1.5 py-0.5',
                  activeTab === 'all'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                )}>
                  {loading ? '...' : trips.length}
                </span>
              </button>

              {/* One tab per unique date (newest first) */}
              {!loading && dateTabs.map(({ iso, display, dayName, count }) => (
                <button
                  key={iso}
                  onClick={() => setActiveTab(iso)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-all',
                    activeTab === iso
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
                  )}
                >
                  <span className="flex flex-col items-center leading-none gap-0.5">
                    <span className="text-[10px] font-normal opacity-60">{dayName}</span>
                    <span>{display}</span>
                  </span>
                  <span className={cn(
                    'inline-flex items-center justify-center rounded-full text-xs font-semibold min-w-[20px] px-1.5 py-0.5',
                    activeTab === iso
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  )}>
                    {count}
                  </span>
                </button>
              ))}

              {/* Loading placeholder tabs */}
              {loading && Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2 px-4 py-2.5">
                  <div className="h-4 w-10 bg-muted rounded animate-pulse" />
                  <div className="h-4 w-5 bg-muted rounded-full animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Data table ── */}
        <TripTable trips={visibleTrips} loading={loading} />

      </div>
    </DashboardLayout>
  );
}
