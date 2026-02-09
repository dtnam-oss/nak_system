'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { SalaryTable } from '@/components/salary/salary-table';
import { LuongChuyenTable } from '@/components/salary/luong-chuyen-table';
import { LuongTongHopTable } from '@/components/salary/luong-tong-hop-table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { AlertCircle, Download, Calendar } from 'lucide-react';

interface SalaryRecord {
  id: number;
  ma_nhan_vien: string;
  ho_va_ten: string;
  phong_ban: string;
  chuc_vu: string;
  loai_nhan_vien: string;
  thang: number;
  nam: number;
  luong_co_ban: number;
  so_chuyen_di: number;
  tong_doanh_thu: number;
  luong_theo_chuyen: number;
  phu_cap: number;
  thuong: number;
  tong_thu_nhap: number;
  tong_khau_tru: number;
  thuc_lanh: number;
  trang_thai: string;
  ngay_thanh_toan: string;
}

interface LuongChuyenRecord {
  ma_chuyen_di: string;
  ngay_tao: string;
  nam: number;
  thang: number;
  ten_khach_hang: string;
  loai_chuyen: string;
  ten_tuyen: string;
  ma_tuyen: string;
  luong_tai_xe: number;
  ten_tai_xe: string;
  don_vi_van_chuyen: string;
}

interface LuongTongHopRecord {
  id: string;
  ma_nhan_vien: string;
  ten_nhan_vien: string;
  phong_ban: string;
  chuc_vu: string;
  thang: number;
  nam: number;
  luong_chuyen: number;
  cp_sua_chua: number;
  cp_do_dau: number;
  cp_phat_sinh: number;
  cp_ccdc: number;
  ho_tro: number;
  truy_thu: number;
  tru_coc: number;
  hoan_coc: number;
  tam_ung: number;
  phat_nguoi: number;
  bhxh: number;
  khac: number;
}

export default function SalaryPage() {
  // Tab states - 5 tabs mới
  const [activeTab, setActiveTab] = useState('tong-hop');

  // Data states cho 5 tabs
  const [tongHopData, setTongHopData] = useState<LuongTongHopRecord[]>([]);
  const [luongChuyenData, setLuongChuyenData] = useState<LuongChuyenRecord[]>([]);
  const [suaChuaData, setSuaChuaData] = useState<any[]>([]);
  const [vetcData, setVetcData] = useState<any[]>([]);
  const [truyThuData, setTruyThuData] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [selectedMonth, selectedYear, activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (activeTab === 'tong-hop') {
        // Lương tổng hợp - Lấy dữ liệu từ bảng luong_tong_hop
        console.log(`📊 Fetching luong-tong-hop data for month=${selectedMonth}, year=${selectedYear}`);
        const response = await fetch(
          `/api/salary/luong-tong-hop?month=${selectedMonth}&year=${selectedYear}`
        );
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('❌ API Error:', errorData);
          throw new Error(errorData.error || 'Không thể tải dữ liệu lương tổng hợp');
        }
        const data = await response.json();
        console.log('✅ Luong-tong-hop data received:', data);
        setTongHopData(data.data || []);
      } else if (activeTab === 'luong-chuyen') {
        // Lương chuyến - Lấy dữ liệu từ bảng luong_tai_xe
        console.log(`📊 Fetching luong-chuyen data for month=${selectedMonth}, year=${selectedYear}`);
        const response = await fetch(
          `/api/salary/luong-chuyen?month=${selectedMonth}&year=${selectedYear}`
        );
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('❌ API Error:', errorData);
          throw new Error(errorData.error || 'Không thể tải dữ liệu lương chuyến');
        }
        const data = await response.json();
        console.log('✅ Luong-chuyen data received:', data);
        setLuongChuyenData(data.data || []);
      } else if (activeTab === 'sua-chua') {
        // Chi phí sửa chữa - Empty state (chưa có data)
        setSuaChuaData([]);
      } else if (activeTab === 'vetc') {
        // Chi phí VETC - Empty state (chưa có data)
        setVetcData([]);
      } else if (activeTab === 'truy-thu') {
        // Truy thu - Empty state (chưa có data)
        setTruyThuData([]);
      }

    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);

      let endpoint = '';
      let filename = '';

      if (activeTab === 'tong-hop') {
        endpoint = `/api/salary/luong-tong-hop/export?month=${selectedMonth}&year=${selectedYear}`;
        filename = `luong_tong_hop_${selectedMonth}_${selectedYear}.xlsx`;
      } else if (activeTab === 'luong-chuyen') {
        endpoint = `/api/salary/luong-chuyen/export?month=${selectedMonth}&year=${selectedYear}`;
        filename = `luong_chuyen_${selectedMonth}_${selectedYear}.xlsx`;
      } else {
        // Các tabs khác chưa có export
        alert('Chức năng export cho tab này chưa có dữ liệu');
        return;
      }

      const response = await fetch(endpoint);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Export failed');
      }

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      console.error('Export error:', err);
      setError(err.message || 'Không thể xuất file Excel');
    } finally {
      setExporting(false);
    }
  };

  const EmptyState = ({ message }: { message: string }) => (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-gray-100 p-3 mb-4">
        <AlertCircle className="h-6 w-6 text-gray-400" />
      </div>
      <h3 className="text-sm font-medium text-gray-900 mb-1">Chưa có dữ liệu</h3>
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  );

  return (
    <DashboardLayout breadcrumbs={[{ label: 'Dashboard' }, { label: 'Data lương' }]}>
      <div className="space-y-4">
        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Filters Card - Compact */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-6">
              {/* Filter Title */}
              <div className="flex items-center gap-2 min-w-[80px]">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Bộ lọc</span>
              </div>

              {/* Month Filter */}
              <div className="w-[140px]">
                <Select
                  value={selectedMonth.toString()}
                  onValueChange={(v) => setSelectedMonth(parseInt(v))}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <SelectItem key={m} value={m.toString()}>
                        Tháng {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Year Filter */}
              <div className="w-[120px]">
                <Select
                  value={selectedYear.toString()}
                  onValueChange={(v) => setSelectedYear(parseInt(v))}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 5 }, (_, i) => currentYear - i).map((y) => (
                      <SelectItem key={y} value={y.toString()}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Spacer */}
              <div className="flex-1"></div>

              {/* Export Button */}
              <Button
                onClick={handleExport}
                disabled={exporting || (activeTab !== 'tong-hop' && activeTab !== 'luong-chuyen')}
                size="sm"
                variant="outline"
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                {exporting ? 'Đang xuất...' : 'Xuất Excel'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabs Section - 5 tabs mới */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="tong-hop">Lương tổng hợp</TabsTrigger>
            <TabsTrigger value="luong-chuyen">Lương chuyến</TabsTrigger>
            <TabsTrigger value="sua-chua">Chi phí sửa chữa</TabsTrigger>
            <TabsTrigger value="vetc">Chi phí VETC</TabsTrigger>
            <TabsTrigger value="truy-thu">Truy thu</TabsTrigger>
          </TabsList>

          {/* Tab 1: Lương tổng hợp */}
          <TabsContent value="tong-hop">
            <Card>
              <CardContent className="pt-6">
                <LuongTongHopTable
                  data={tongHopData}
                  loading={loading}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 2: Lương chuyến */}
          <TabsContent value="luong-chuyen">
            <Card>
              <CardContent className="pt-6">
                <LuongChuyenTable
                  data={luongChuyenData}
                  loading={loading}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3: Chi phí sửa chữa */}
          <TabsContent value="sua-chua">
            <Card>
              <CardContent className="pt-6">
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Đang tải...</div>
                ) : suaChuaData.length > 0 ? (
                  <div>Table chi phí sửa chữa (coming soon)</div>
                ) : (
                  <EmptyState message="Dữ liệu chi phí sửa chữa sẽ được cập nhật sau" />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 4: Chi phí VETC */}
          <TabsContent value="vetc">
            <Card>
              <CardContent className="pt-6">
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Đang tải...</div>
                ) : vetcData.length > 0 ? (
                  <div>Table chi phí VETC (coming soon)</div>
                ) : (
                  <EmptyState message="Dữ liệu chi phí VETC sẽ được cập nhật sau" />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 5: Truy thu */}
          <TabsContent value="truy-thu">
            <Card>
              <CardContent className="pt-6">
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Đang tải...</div>
                ) : truyThuData.length > 0 ? (
                  <div>Table truy thu (coming soon)</div>
                ) : (
                  <EmptyState message="Dữ liệu truy thu sẽ được cập nhật sau" />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
