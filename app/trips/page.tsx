'use client';

import { useState, useEffect, useCallback } from 'react';
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
  Package,
  CheckCircle2,
  Clock,
  TrendingUp,
  Truck,
  AlertCircle,
  CalendarRange,
} from 'lucide-react';

// ── Constants ───────────────────────────────────────────────────────────────
const KHACH_HANG_OPTIONS = ['J&T', 'GHN', 'VIETTEL POST', 'YUNYI', 'Ninja Van'];
const DVVC_OPTIONS       = ['NAK', 'VENDOR'];
const LOAI_CHUYEN_OPTIONS = ['Một chiều', 'Hai chiều', 'Nhiều điểm'];
const LOAI_TUYEN_OPTIONS  = ['Nội thành', 'Liên tỉnh', 'Đường dài'];
const TRANG_THAI_OPTIONS  = [
  { value: 'Kết thúc',       label: 'Kết thúc' },
  { value: 'Đang thực hiện', label: 'Đang thực hiện' },
  { value: 'Chờ giao hàng',  label: 'Chờ giao hàng' },
  { value: 'Hủy',            label: 'Đã hủy' },
];

// ── Interfaces ──────────────────────────────────────────────────────────────
interface Summary {
  total: number;
  hoanThanh: number;
  dangXuLy: number;
  daHuy: number;
  tongDoanhThu: number;
  tongKm: number;
}

// ── Stat card ───────────────────────────────────────────────────────────────
function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: any;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-4">
        <div className={`rounded-xl p-3 ${color}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground font-medium">{label}</p>
          <p className="text-xl font-bold text-foreground truncate">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function formatCurrency(v: number) {
  if (v >= 1_000_000_000)
    return `${(v / 1_000_000_000).toFixed(1)} tỷ ₫`;
  if (v >= 1_000_000)
    return `${(v / 1_000_000).toFixed(0)} tr ₫`;
  return new Intl.NumberFormat('vi-VN').format(v) + ' ₫';
}

// ── Page component ───────────────────────────────────────────────────────────
export default function TripsPage() {
  const [trips, setTrips]         = useState<Trip[]>([]);
  const [summary, setSummary]     = useState<Summary | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // Filters
  const [search,         setSearch]         = useState('');
  const [fromDate,       setFromDate]       = useState('');
  const [toDate,         setToDate]         = useState('');
  const [khachHang,      setKhachHang]      = useState('all');
  const [donViVanChuyen, setDonViVanChuyen] = useState('all');
  const [loaiChuyen,     setLoaiChuyen]     = useState('all');
  const [loaiTuyen,      setLoaiTuyen]      = useState('all');
  const [trangThai,      setTrangThai]      = useState('all');

  // ── Fetch data ─────────────────────────────────────────────────────────
  const fetchTrips = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (search)                          params.append('search', search);
      if (fromDate)                        params.append('fromDate', fromDate);
      if (toDate)                          params.append('toDate', toDate);
      if (khachHang      !== 'all')        params.append('khachHang', khachHang);
      if (donViVanChuyen !== 'all')        params.append('donViVanChuyen', donViVanChuyen);
      if (loaiChuyen     !== 'all')        params.append('loaiChuyen', loaiChuyen);
      if (loaiTuyen      !== 'all')        params.append('loaiTuyen', loaiTuyen);
      if (trangThai      !== 'all')        params.append('trangThai', trangThai);

      const res = await fetch(`/api/trips?${params}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Lỗi tải dữ liệu');
      }
      const data = await res.json();
      setTrips(data.trips || []);
      setSummary(data.summary || null);
    } catch (err: any) {
      setError(err.message || 'Không thể tải dữ liệu chuyến đi');
    } finally {
      setLoading(false);
    }
  }, [search, fromDate, toDate, khachHang, donViVanChuyen, loaiChuyen, loaiTuyen, trangThai]);

  useEffect(() => { fetchTrips(); }, [fetchTrips]);

  // ── Export Excel ───────────────────────────────────────────────────────
  const handleExport = async () => {
    try {
      setExporting(true);
      const params = new URLSearchParams({ templateType: 'general' });
      if (fromDate)                        params.append('fromDate', fromDate);
      if (toDate)                          params.append('toDate', toDate);
      if (khachHang      !== 'all')        params.append('khachHang', khachHang);
      if (donViVanChuyen !== 'all')        params.append('donViVanChuyen', donViVanChuyen);
      if (loaiChuyen     !== 'all')        params.append('loaiChuyen', loaiChuyen);
      if (search)                          params.append('searchQuery', search);

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

  // ── Reset filters ──────────────────────────────────────────────────────
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
      <div className="space-y-4">

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard
            icon={Package}
            label="Tổng chuyến"
            value={loading ? '...' : (summary?.total ?? 0).toLocaleString('vi-VN')}
            color="bg-indigo-500"
          />
          <StatCard
            icon={CheckCircle2}
            label="Hoàn thành"
            value={loading ? '...' : (summary?.hoanThanh ?? 0).toLocaleString('vi-VN')}
            sub={summary ? `${Math.round((summary.hoanThanh / (summary.total || 1)) * 100)}%` : undefined}
            color="bg-green-500"
          />
          <StatCard
            icon={Clock}
            label="Đang xử lý"
            value={loading ? '...' : (summary?.dangXuLy ?? 0).toLocaleString('vi-VN')}
            color="bg-blue-500"
          />
          <StatCard
            icon={AlertCircle}
            label="Đã hủy"
            value={loading ? '...' : (summary?.daHuy ?? 0).toLocaleString('vi-VN')}
            color="bg-red-500"
          />
          <StatCard
            icon={TrendingUp}
            label="Doanh thu"
            value={loading ? '...' : formatCurrency(summary?.tongDoanhThu ?? 0)}
            color="bg-emerald-500"
          />
          <StatCard
            icon={Truck}
            label="Tổng KM"
            value={loading ? '...' : `${(summary?.tongKm ?? 0).toLocaleString('vi-VN')} km`}
            color="bg-orange-500"
          />
        </div>

        {/* ── Error ── */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* ── Filter panel ── */}
        <Card>
          <CardContent className="p-4 space-y-3">
            {/* Row 1: Search + Date range */}
            <div className="flex flex-wrap gap-2">
              {/* Search */}
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm mã chuyến, tên tuyến, tài xế..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Date from */}
              <div className="relative">
                <CalendarRange className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="pl-9 w-44"
                  title="Từ ngày"
                />
              </div>

              {/* Date to */}
              <div className="relative">
                <CalendarRange className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="pl-9 w-44"
                  title="Đến ngày"
                />
              </div>
            </div>

            {/* Row 2: Dropdowns + Actions */}
            <div className="flex flex-wrap gap-2 items-center">
              {/* Khách hàng */}
              <Select value={khachHang} onValueChange={setKhachHang}>
                <SelectTrigger className="w-40">
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
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Đơn vị VC" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả ĐVVC</SelectItem>
                  {DVVC_OPTIONS.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Loại chuyến */}
              <Select value={loaiChuyen} onValueChange={setLoaiChuyen}>
                <SelectTrigger className="w-40">
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
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Loại tuyến" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả tuyến</SelectItem>
                  {LOAI_TUYEN_OPTIONS.map((l) => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Trạng thái */}
              <Select value={trangThai} onValueChange={setTrangThai}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả trạng thái</SelectItem>
                  {TRANG_THAI_OPTIONS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Reset */}
              {hasFilter && (
                <Button variant="ghost" size="sm" onClick={handleReset}>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Xóa lọc
                </Button>
              )}

              {/* Refresh */}
              <Button variant="outline" size="sm" onClick={fetchTrips} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                Làm mới
              </Button>

              {/* Export */}
              <Button size="sm" onClick={handleExport} disabled={exporting || loading}>
                <Download className="h-4 w-4 mr-1" />
                {exporting ? 'Đang xuất...' : 'Xuất Excel'}
              </Button>
            </div>

            {/* Active filter chips */}
            {hasFilter && (
              <div className="flex flex-wrap gap-1 pt-1">
                {fromDate && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    Từ: {fromDate}
                  </span>
                )}
                {toDate && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    Đến: {toDate}
                  </span>
                )}
                {khachHang !== 'all' && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    KH: {khachHang}
                  </span>
                )}
                {donViVanChuyen !== 'all' && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    ĐVVC: {donViVanChuyen}
                  </span>
                )}
                {loaiChuyen !== 'all' && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    {loaiChuyen}
                  </span>
                )}
                {loaiTuyen !== 'all' && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    {loaiTuyen}
                  </span>
                )}
                {trangThai !== 'all' && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    {TRANG_THAI_OPTIONS.find(t => t.value === trangThai)?.label}
                  </span>
                )}
                {search && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    Tìm: "{search}"
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Data table ── */}
        <TripTable trips={trips} loading={loading} />
      </div>
    </DashboardLayout>
  );
}
