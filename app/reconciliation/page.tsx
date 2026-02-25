'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Input }  from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertCircle, Loader2, RefreshCw, Search, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Types ─────────────────────────────────────────────────────────────────────
interface TongHopRow {
  ma_chuyen_di:      string;
  ngay_tao:          string;
  ma_khach_hang:     string;
  ten_khach_hang:    string;
  loai_chuyen:       string;
  ten_tuyen:         string;
  trang_thai:        string;
  so_dong:           number;
  lo_trinh:          string[];
  lo_trinh_chi_tiet: string[];
  ma_chuyen_di_kh:   string[];
  bien_kiem_soat:    string[];
  tai_trong:         string[];
  quang_duong:       string[];
  so_chieu:          string[];
}

const STATUS_STYLE: Record<string, string> = {
  'Kết thúc':       'bg-green-100 text-green-800',
  'Đang thực hiện': 'bg-blue-100 text-blue-800',
  'Chờ giao hàng':  'bg-amber-100 text-amber-800',
  'Hủy':            'bg-red-100 text-red-800',
};

const TAB_COLORS = [
  '#6366f1', '#f59e0b', '#10b981', '#3b82f6',
  '#f43f5e', '#8b5cf6', '#14b8a6', '#f97316',
];

// ── Merged-value cell ─────────────────────────────────────────────────────────
function MergedCell({ values }: { values: string[] }) {
  const filtered = values.filter(Boolean);
  if (filtered.length === 0) return <span className="text-muted-foreground">—</span>;
  if (filtered.length === 1) return <span className="text-sm">{filtered[0]}</span>;
  return (
    <div className="space-y-0.5">
      {filtered.map((v, i) => (
        <div key={i} className="text-xs leading-snug border-l-2 border-primary/30 pl-1.5 text-foreground">
          {v}
        </div>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function TongHopPage() {
  const [rows,    setRows]    = useState<TongHopRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const [loaiChuyenList, setLoaiChuyenList] = useState<string[]>([]);

  // Active customer tab
  const [activeKhachHang, setActiveKhachHang] = useState<string>('all');

  // Filters (no ma_khach_hang — handled by tabs client-side)
  const [fromDate,    setFromDate]    = useState('');
  const [toDate,      setToDate]      = useState('');
  const [loaiChuyen,  setLoaiChuyen]  = useState('all');
  const [search,      setSearch]      = useState('');

  // Debounce search
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const handleSearchChange = (val: string) => {
    setSearch(val);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => setDebouncedSearch(val), 400);
  };

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setActiveKhachHang('all');
    try {
      const params = new URLSearchParams();
      if (fromDate)             params.set('from_date',   fromDate);
      if (toDate)               params.set('to_date',     toDate);
      if (loaiChuyen !== 'all') params.set('loai_chuyen', loaiChuyen);
      if (debouncedSearch)      params.set('search',      debouncedSearch);

      const res  = await fetch(`/api/reconciliation/tong-hop?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi tải dữ liệu');

      setRows(data.rows || []);
      if (data.filters?.loai_chuyen) setLoaiChuyenList(data.filters.loai_chuyen);
    } catch (err: any) {
      setError(err.message || 'Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, loaiChuyen, debouncedSearch]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Customer tabs ─────────────────────────────────────────────────────────
  const customerTabs = useMemo(() => {
    const countMap: Record<string, number> = {};
    rows.forEach((r) => {
      const key = r.ma_khach_hang || '(Không có)';
      countMap[key] = (countMap[key] ?? 0) + 1;
    });
    return Object.entries(countMap)
      .sort(([, a], [, b]) => b - a)
      .map(([maKh, count], idx) => ({
        value: maKh,
        label: maKh,
        count,
        color: TAB_COLORS[idx % TAB_COLORS.length],
      }));
  }, [rows]);

  // ── Rows filtered by active tab ───────────────────────────────────────────
  const filteredRows = useMemo(() => {
    if (activeKhachHang === 'all') return rows;
    return rows.filter((r) => (r.ma_khach_hang || '(Không có)') === activeKhachHang);
  }, [rows, activeKhachHang]);

  // ── Reset ─────────────────────────────────────────────────────────────────
  const hasFilter = !!(search || fromDate || toDate || loaiChuyen !== 'all');
  const handleReset = () => {
    setSearch(''); setDebouncedSearch('');
    setFromDate(''); setToDate('');
    setLoaiChuyen('all');
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Đối soát' },
        { label: 'Tổng hợp' },
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
                  {loading ? '·' : rows.length}
                </span>
              </button>

              {/* Per-customer tabs */}
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

              {/* Loading skeleton */}
              {loading && Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-3 shrink-0">
                  <div className="w-2 h-2 rounded-full bg-muted animate-pulse" />
                  <div className="h-4 w-14 bg-muted rounded animate-pulse" />
                  <div className="h-4 w-5 bg-muted rounded-full animate-pulse" />
                </div>
              ))}

              <div className="flex-1" />

              {/* Refresh */}
              <div className="flex items-center gap-1 py-2 shrink-0">
                <Button
                  variant="ghost" size="sm"
                  onClick={fetchData} disabled={loading}
                  className="h-8 text-muted-foreground"
                >
                  <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
                  Làm mới
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
                  placeholder="Mã chuyến, tên tuyến, khách hàng..."
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-8 h-8 text-sm"
                />
              </div>

              <Input
                type="date" value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="h-8 text-sm w-40" title="Từ ngày"
              />
              <span className="text-muted-foreground text-xs">→</span>
              <Input
                type="date" value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="h-8 text-sm w-40" title="Đến ngày"
              />

              <Select value={loaiChuyen} onValueChange={setLoaiChuyen}>
                <SelectTrigger className="h-8 text-sm w-36">
                  <SelectValue placeholder="Loại chuyến" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả loại</SelectItem>
                  {loaiChuyenList.map((lc) => (
                    <SelectItem key={lc} value={lc}>{lc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {hasFilter && (
                <Button variant="ghost" size="sm" onClick={handleReset} className="h-8 text-xs text-muted-foreground">
                  <X className="h-3 w-3 mr-1" />Xóa lọc
                </Button>
              )}

              <span className="ml-auto text-xs text-muted-foreground whitespace-nowrap">
                {filteredRows.length} chuyến đi
                {activeKhachHang !== 'all' && ` · ${activeKhachHang}`}
              </span>
            </div>
          </div>

          {/* ── Table ── */}
          <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 240px)' }}>
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-semibold uppercase tracking-wide w-10 text-center">STT</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide whitespace-nowrap">Ngày</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide whitespace-nowrap">Mã chuyến</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide whitespace-nowrap">Mã KH</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide whitespace-nowrap">Loại chuyến</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide whitespace-nowrap">Tên tuyến</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide whitespace-nowrap">Lộ trình</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide whitespace-nowrap">LT chi tiết theo điểm</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide whitespace-nowrap">Mã CD KH</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide whitespace-nowrap">Biển KS</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-right whitespace-nowrap">Tải trọng</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-right whitespace-nowrap">Quãng đường</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-right whitespace-nowrap">Số chiều</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-center whitespace-nowrap">Trạng thái</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={14} className="py-16 text-center">
                      <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Đang tải dữ liệu...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )}

                {!loading && filteredRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={14} className="py-16 text-center text-sm text-muted-foreground">
                      Không có dữ liệu
                    </TableCell>
                  </TableRow>
                )}

                {!loading && filteredRows.map((row, idx) => {
                  const statusCls = STATUS_STYLE[row.trang_thai] ?? 'bg-gray-100 text-gray-700';
                  return (
                    <TableRow key={row.ma_chuyen_di} className="align-top hover:bg-muted/20">
                      <TableCell className="text-center text-xs text-muted-foreground py-2">{idx + 1}</TableCell>

                      <TableCell className="text-xs whitespace-nowrap py-2 text-muted-foreground">
                        {row.ngay_tao}
                      </TableCell>

                      <TableCell className="py-2">
                        <div className="font-mono text-xs font-semibold text-primary whitespace-nowrap">
                          {row.ma_chuyen_di}
                        </div>
                        {row.so_dong > 0 && (
                          <div className="text-[10px] text-muted-foreground mt-0.5">{row.so_dong} dòng CT</div>
                        )}
                      </TableCell>

                      <TableCell className="py-2">
                        <div className="text-xs font-medium">{row.ma_khach_hang || '—'}</div>
                        {row.ten_khach_hang && row.ten_khach_hang !== row.ma_khach_hang && (
                          <div className="text-[10px] text-muted-foreground">{row.ten_khach_hang}</div>
                        )}
                      </TableCell>

                      <TableCell className="text-xs whitespace-nowrap py-2">{row.loai_chuyen || '—'}</TableCell>

                      <TableCell className="py-2 max-w-[180px]">
                        <MergedCell values={[row.ten_tuyen]} />
                      </TableCell>

                      <TableCell className="py-2 max-w-[200px]">
                        <MergedCell values={row.lo_trinh} />
                      </TableCell>

                      <TableCell className="py-2 max-w-[220px]">
                        <MergedCell values={row.lo_trinh_chi_tiet} />
                      </TableCell>

                      <TableCell className="py-2">
                        <MergedCell values={row.ma_chuyen_di_kh} />
                      </TableCell>

                      <TableCell className="py-2">
                        <MergedCell values={row.bien_kiem_soat} />
                      </TableCell>

                      <TableCell className="py-2 text-right">
                        <MergedCell values={row.tai_trong} />
                      </TableCell>

                      <TableCell className="py-2 text-right">
                        <MergedCell values={row.quang_duong} />
                      </TableCell>

                      <TableCell className="py-2 text-right">
                        <MergedCell values={row.so_chieu} />
                      </TableCell>

                      <TableCell className="py-2 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap ${statusCls}`}>
                          {row.trang_thai || '—'}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

        </Card>
      </div>
    </DashboardLayout>
  );
}
