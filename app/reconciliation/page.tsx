'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertCircle, Loader2, RefreshCw, Search, X,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
interface TongHopRow {
  ma_chuyen_di:     string;
  ngay_tao:         string;
  ma_khach_hang:    string;
  ten_khach_hang:   string;
  loai_chuyen:      string;
  ten_tuyen:        string;
  trang_thai:       string;
  so_dong:          number;
  lo_trinh:              string[];
  lo_trinh_chi_tiet:     string[];
  ma_chuyen_di_kh:       string[];
  bien_kiem_soat:        string[];
  tai_trong:             string[];
  quang_duong:           string[];
  so_chieu:              string[];
}

interface Filters {
  search:       string;
  from_date:    string;
  to_date:      string;
  ma_khach_hang: string;
  loai_chuyen:  string;
}

const STATUS_STYLE: Record<string, string> = {
  'Kết thúc':       'bg-green-100 text-green-800',
  'Đang thực hiện': 'bg-blue-100 text-blue-800',
  'Chờ giao hàng':  'bg-amber-100 text-amber-800',
  'Hủy':            'bg-red-100 text-red-800',
};

// ── Merged-value cell ─────────────────────────────────────────────────────────
function MergedCell({ values }: { values: string[] }) {
  const filtered = values.filter(Boolean);
  if (filtered.length === 0) return <span className="text-muted-foreground">—</span>;
  if (filtered.length === 1) return <span className="text-sm">{filtered[0]}</span>;
  return (
    <div className="space-y-0.5">
      {filtered.map((v, i) => (
        <div
          key={i}
          className="text-xs leading-snug border-l-2 border-primary/30 pl-1.5 text-foreground"
        >
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

  const [khachHangList,  setKhachHangList]  = useState<{ ma: string; ten: string }[]>([]);
  const [loaiChuyenList, setLoaiChuyenList] = useState<string[]>([]);

  const [filters, setFilters] = useState<Filters>({
    search: '', from_date: '', to_date: '',
    ma_khach_hang: 'all', loai_chuyen: 'all',
  });

  // Debounce search
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const handleSearchChange = (val: string) => {
    setFilters(f => ({ ...f, search: val }));
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => setDebouncedSearch(val), 400);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.from_date)                            params.set('from_date', filters.from_date);
      if (filters.to_date)                              params.set('to_date', filters.to_date);
      if (filters.ma_khach_hang !== 'all')              params.set('ma_khach_hang', filters.ma_khach_hang);
      if (filters.loai_chuyen   !== 'all')              params.set('loai_chuyen', filters.loai_chuyen);
      if (debouncedSearch)                              params.set('search', debouncedSearch);

      const res  = await fetch(`/api/reconciliation/tong-hop?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi tải dữ liệu');

      setRows(data.rows || []);
      if (data.filters?.khach_hang)  setKhachHangList(data.filters.khach_hang);
      if (data.filters?.loai_chuyen) setLoaiChuyenList(data.filters.loai_chuyen);
    } catch (err: any) {
      setError(err.message || 'Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }, [filters.from_date, filters.to_date, filters.ma_khach_hang, filters.loai_chuyen, debouncedSearch]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const resetFilters = () => {
    setFilters({ search: '', from_date: '', to_date: '', ma_khach_hang: 'all', loai_chuyen: 'all' });
    setDebouncedSearch('');
  };

  const hasActiveFilter =
    filters.search || filters.from_date || filters.to_date ||
    filters.ma_khach_hang !== 'all' || filters.loai_chuyen !== 'all';

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Đối soát' },
        { label: 'Tổng hợp' },
      ]}
    >
      <div className="space-y-4">

        {/* ── Filter bar ── */}
        <Card>
          <CardContent className="py-3 px-4">
            <div className="flex flex-wrap items-center gap-2">

              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Tìm mã chuyến, khách hàng, tên tuyến..."
                  value={filters.search}
                  onChange={e => handleSearchChange(e.target.value)}
                  className="pl-8 h-8 text-sm"
                />
              </div>

              {/* From date */}
              <Input
                type="date"
                value={filters.from_date}
                onChange={e => setFilters(f => ({ ...f, from_date: e.target.value }))}
                className="h-8 text-sm w-36"
                title="Từ ngày"
              />
              <span className="text-muted-foreground text-xs">→</span>
              {/* To date */}
              <Input
                type="date"
                value={filters.to_date}
                onChange={e => setFilters(f => ({ ...f, to_date: e.target.value }))}
                className="h-8 text-sm w-36"
                title="Đến ngày"
              />

              {/* Khách hàng */}
              <Select
                value={filters.ma_khach_hang}
                onValueChange={v => setFilters(f => ({ ...f, ma_khach_hang: v }))}
              >
                <SelectTrigger className="h-8 text-sm w-44">
                  <SelectValue placeholder="Khách hàng" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả KH</SelectItem>
                  {khachHangList.map(kh => (
                    <SelectItem key={kh.ma} value={kh.ma}>
                      {kh.ma}{kh.ten ? ` – ${kh.ten}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Loại chuyến */}
              <Select
                value={filters.loai_chuyen}
                onValueChange={v => setFilters(f => ({ ...f, loai_chuyen: v }))}
              >
                <SelectTrigger className="h-8 text-sm w-40">
                  <SelectValue placeholder="Loại chuyến" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả loại</SelectItem>
                  {loaiChuyenList.map(lc => (
                    <SelectItem key={lc} value={lc}>{lc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Reset */}
              {hasActiveFilter && (
                <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground" onClick={resetFilters}>
                  <X className="h-3.5 w-3.5 mr-1" />Xóa lọc
                </Button>
              )}

              {/* Refresh */}
              <Button variant="outline" size="sm" className="h-8 px-2 ml-auto" onClick={fetchData} disabled={loading}>
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              </Button>

              {/* Count badge */}
              {!loading && (
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {rows.length} chuyến đi
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── Error ── */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* ── Table ── */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-auto rounded-[inherit]" style={{ maxHeight: 'calc(100vh - 260px)' }}>
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

                  {!loading && rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={14} className="py-16 text-center text-sm text-muted-foreground">
                        Không có dữ liệu
                      </TableCell>
                    </TableRow>
                  )}

                  {!loading && rows.map((row, idx) => {
                    const statusCls = STATUS_STYLE[row.trang_thai] ?? 'bg-gray-100 text-gray-700';
                    return (
                      <TableRow key={row.ma_chuyen_di} className="align-top hover:bg-muted/20">
                        <TableCell className="text-center text-xs text-muted-foreground py-2">{idx + 1}</TableCell>

                        {/* Ngày */}
                        <TableCell className="text-xs whitespace-nowrap py-2 text-muted-foreground">
                          {row.ngay_tao}
                        </TableCell>

                        {/* Mã chuyến - group key */}
                        <TableCell className="py-2">
                          <div className="font-mono text-xs font-semibold text-primary whitespace-nowrap">
                            {row.ma_chuyen_di}
                          </div>
                          {row.so_dong > 0 && (
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              {row.so_dong} dòng CT
                            </div>
                          )}
                        </TableCell>

                        {/* Mã KH - group key */}
                        <TableCell className="py-2">
                          <div className="text-xs font-medium">{row.ma_khach_hang || '—'}</div>
                          {row.ten_khach_hang && row.ten_khach_hang !== row.ma_khach_hang && (
                            <div className="text-[10px] text-muted-foreground">{row.ten_khach_hang}</div>
                          )}
                        </TableCell>

                        {/* Loại chuyến - group key */}
                        <TableCell className="text-xs whitespace-nowrap py-2">{row.loai_chuyen || '—'}</TableCell>

                        {/* Tên tuyến - merged (thường 1 giá trị) */}
                        <TableCell className="py-2 max-w-[180px]">
                          <MergedCell values={[row.ten_tuyen]} />
                        </TableCell>

                        {/* Lộ trình - merged */}
                        <TableCell className="py-2 max-w-[200px]">
                          <MergedCell values={row.lo_trinh} />
                        </TableCell>

                        {/* LT chi tiết theo điểm - merged */}
                        <TableCell className="py-2 max-w-[220px]">
                          <MergedCell values={row.lo_trinh_chi_tiet} />
                        </TableCell>

                        {/* Mã CD KH - merged */}
                        <TableCell className="py-2">
                          <MergedCell values={row.ma_chuyen_di_kh} />
                        </TableCell>

                        {/* Biển KS - merged */}
                        <TableCell className="py-2">
                          <MergedCell values={row.bien_kiem_soat} />
                        </TableCell>

                        {/* Tải trọng - merged */}
                        <TableCell className="py-2 text-right">
                          <MergedCell values={row.tai_trong} />
                        </TableCell>

                        {/* Quãng đường - merged */}
                        <TableCell className="py-2 text-right">
                          <MergedCell values={row.quang_duong} />
                        </TableCell>

                        {/* Số chiều - merged */}
                        <TableCell className="py-2 text-right">
                          <MergedCell values={row.so_chieu} />
                        </TableCell>

                        {/* Trạng thái */}
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
          </CardContent>
        </Card>

      </div>
    </DashboardLayout>
  );
}
